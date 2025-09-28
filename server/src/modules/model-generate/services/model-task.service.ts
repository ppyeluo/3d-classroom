import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Queue, Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CreateModelTaskDto, ModelGenerateType } from '../dto/create-model-task.dto';
import { QueryModelTasksDto } from '../dto/query-model-tasks.dto';
import { Tripo3dService, TripoTaskStatusResponse } from './tripo3d.service';
import { UserService } from '../../user/services/user.service';
import { ModelTaskEntity, TaskOutput } from '../entities/model-task.entity';
import { TaskListResponse } from '../dto/task-list-response.dto';
import { QiniuUtil } from '../../../utils/qiniu.util';
import { HistoryModelItem, HistoryModelsResponse } from '../dto/history-models-response.dto';
import { QueryHistoryModelsDto } from '../dto/query-history-models.dto';

// 队列与任务名称常量
export const MODEL_GENERATE_QUEUE = 'model-generate-queue';
export const POLL_TASK_STATUS_JOB = 'poll-task-status';

// 轮询配置常量
const POLL_INTERVAL = 3000; // 轮询间隔(ms)
const MAX_POLL_DURATION = 10 * 60 * 1000; // 最大轮询时长(10分钟)
const MAX_UNKNOWN_RETRIES = 3; // 状态未知时最大重试次数

@Injectable()
export class ModelTaskService {
  private readonly logger = new Logger(ModelTaskService.name);

  constructor(
    @InjectRepository(ModelTaskEntity)
    private modelTaskRepo: Repository<ModelTaskEntity>,
    @InjectQueue(MODEL_GENERATE_QUEUE)
    private modelQueue: Queue,
    private tripo3dService: Tripo3dService,
    private userService: UserService,
    private qiniuUtil: QiniuUtil,
  ) {}

  /**
   * 创建模型生成任务
   * @param userId 用户ID
   * @param createDto 任务创建参数
   * @returns 创建的任务实体
   */
  async createTask(userId: string, createDto: CreateModelTaskDto): Promise<ModelTaskEntity> {
    // 验证用户状态
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.isEnabled) throw new ForbiddenException('账号已禁用，无法创建模型任务');

    // 初始化本地任务记录
    const task = this.modelTaskRepo.create({
      id: uuidv4(),
      userId,
      type: createDto.generateType,
      status: 'queued',
      progress: 0,
      prompt: createDto.generateType === ModelGenerateType.TEXT_TO_MODEL ? createDto.prompt : null,
      style: createDto.style || null,
      createTime: Math.floor(Date.now() / 1000),
      updateTime: Math.floor(Date.now() / 1000),
      output: {}
    } as ModelTaskEntity);

    try {
      // 调用Tripo3D创建任务
      const tripoTaskId = await this.tripo3dService.createGenerateTask(
        createDto.generateType,
        createDto.generateType === ModelGenerateType.TEXT_TO_MODEL ? createDto.prompt : undefined,
        createDto.generateType === ModelGenerateType.IMAGE_TO_MODEL ? createDto.imageToken : undefined,
        createDto.style,
      );
      task.tripoTaskId = tripoTaskId;

      // 保存本地任务记录
      const savedTask = await this.modelTaskRepo.save(task as ModelTaskEntity);
      this.logger.log(`本地任务创建成功 | taskId: ${savedTask.id} | tripoTaskId: ${tripoTaskId}`);

      // 添加轮询任务到队列
      await this.modelQueue.add(
        POLL_TASK_STATUS_JOB,
        {
          taskId: savedTask.id,
          tripoTaskId,
          pollStartTime: Date.now(),
          unknownRetryCount: 0,
        },
        { delay: 1000, removeOnComplete: true },
      );

      return savedTask;
    } catch (error) {
      this.logger.error(`任务创建失败 | 本地taskId: ${task.id}`, error.stack);
      throw new InternalServerErrorException(`任务创建失败：${error.message}`);
    }
  }

  /**
   * 查询用户任务列表
   * @param userId 用户ID
   * @param queryDto 分页参数
   * @returns 分页任务列表
   */
  async getUserTasks(userId: string, queryDto: QueryModelTasksDto): Promise<TaskListResponse> {
    this.logger.log(`查询用户任务列表 | userId: ${userId} | 分页: ${queryDto.page}/${queryDto.pageSize}`);
    // 计算分页偏移量
    const skip = queryDto.page > 0 ? (queryDto.page - 1) * queryDto.pageSize : 0;
    
    // 执行分页查询
    const [tasks, total] = await this.modelTaskRepo.findAndCount({
      where: { userId },
      skip,
      take: queryDto.pageSize,
      order: { createTime: 'DESC' },
    });

    this.logger.log(`用户任务列表查询完成 | userId: ${userId} | 总数: ${total} | 当前页数量: ${tasks.length}`);
    return { total, page: queryDto.page, pageSize: queryDto.pageSize, list: tasks };
  }

  /**
   * 查询任务详情
   * @param userId 用户ID
   * @param taskId 任务ID
   * @returns 任务详情
   */
  async getTaskDetail(userId: string, taskId: string): Promise<ModelTaskEntity> {
    this.logger.log(`查询任务详情 | userId: ${userId} | taskId: ${taskId}`);
    // 查询用户的指定任务
    const task = await this.modelTaskRepo.findOne({ 
      where: { tripoTaskId: taskId, userId } 
    });
    
    if (!task) {
      this.logger.warn(`任务不存在或无权限 | userId: ${userId} | taskId: ${taskId}`);
      throw new NotFoundException('任务不存在或无权限访问');
    }

    // 若任务未完成，同步最新状态
    if (['queued', 'running'].includes(task.status)) {
      try {
        await this.syncTaskStatus(task.id, task.tripoTaskId);
        // 重新查询最新数据
        const updatedTask = await this.modelTaskRepo.findOne({ where: { id: taskId, userId } });
        return updatedTask as ModelTaskEntity;
      } catch (error) {
        this.logger.error(`同步任务状态失败 | taskId: ${taskId}`, error.stack);
        return task;
      }
    }

    return task;
  }

  /**
   * 上传图片到Tripo3D
   * @param file 图片文件
   * @returns 图片令牌
   */
  async uploadImageToTripo(file: Express.Multer.File): Promise<string> {
    this.logger.log(`上传图片到Tripo3D | 文件名: ${file.originalname} | 格式: ${file.mimetype} | 大小: ${file.size}B`);
    try {
      return await this.tripo3dService.uploadImage(file.buffer, file.mimetype);
    } catch (error) {
      this.logger.error('图片上传Tripo3D失败', error.stack);
      throw new InternalServerErrorException(`图片上传失败：${error.message}`);
    }
  }

  /**
   * 处理任务状态轮询
   * @param job 队列任务
   */
  async handlePollTaskStatus(job: Job<{
    taskId: string;
    tripoTaskId: string;
    pollStartTime: number;
    unknownRetryCount: number;
  }>): Promise<void> {
    const { taskId, tripoTaskId, pollStartTime, unknownRetryCount } = job.data;
    this.logger.log(`开始轮询任务状态 | jobId: ${job.id} | taskId: ${taskId} | 已轮询时长: ${(Date.now() - pollStartTime) / 1000}s`);

    try {
      // 检查是否超过最大轮询时长
      if (Date.now() - pollStartTime > MAX_POLL_DURATION) {
        this.logger.warn(`任务轮询超时 | taskId: ${taskId} | 最大时长: ${MAX_POLL_DURATION / 60000}min`);
        await this.updateTaskToFailed(taskId, '任务处理超时（超过10分钟）');
        return;
      }

      // 同步任务状态
      const res = await this.syncTaskStatus(taskId, tripoTaskId);
      const { status, progress, output } = res;
      
      // 根据任务状态处理后续逻辑
      if (['queued', 'running'].includes(status)) {
        // 未完成，继续轮询
        this.logger.log(`任务未完成，继续轮询 | taskId: ${taskId} | 状态: ${status} | 进度: ${progress}%`);
        await this.modelQueue.add(
          POLL_TASK_STATUS_JOB,
          { taskId, tripoTaskId, pollStartTime, unknownRetryCount },
          { delay: POLL_INTERVAL, removeOnComplete: true },
        );
      } else if (status === 'success' && output?.pbr_model) {
        // 任务成功，转存模型到七牛云
        this.logger.log(`任务成功，开始转存模型 | taskId: ${taskId} | 模型URL: ${output.pbr_model}`);
        await this.saveModelToQiniu(taskId, output);
      } else if (status === 'unknown') {
        // 状态未知，根据重试次数决定继续或失败
        if (unknownRetryCount < MAX_UNKNOWN_RETRIES) {
          this.logger.warn(`任务状态未知，重试 | taskId: ${taskId} | 已重试: ${unknownRetryCount + 1}/${MAX_UNKNOWN_RETRIES}`);
          await this.modelQueue.add(
            POLL_TASK_STATUS_JOB,
            { taskId, tripoTaskId, pollStartTime, unknownRetryCount: unknownRetryCount + 1 },
            { delay: POLL_INTERVAL * 2, removeOnComplete: true },
          );
        } else {
          this.logger.error(`任务状态未知，重试次数用尽 | taskId: ${taskId}`);
          await this.updateTaskToFailed(taskId, '任务状态未知（重试3次失败）');
        }
      } else {
        // 其他终态（失败/取消等）
        this.logger.log(`任务进入终态 | taskId: ${taskId} | 状态: ${status} | 模型URL: ${output}`);
      }
    } catch (error) {
      this.logger.error(`轮询任务处理失败 | jobId: ${job.id} | taskId: ${taskId}`, error.stack);
      // 控制重试次数
      if (job.attemptsMade < 3) {
        this.logger.log(`轮询任务重试 | jobId: ${job.id} | 重试次数: ${job.attemptsMade + 1}`);
        throw error; // 抛出错误触发重试
      } else {
        this.logger.error(`轮询任务重试失败 | jobId: ${job.id} | taskId: ${taskId}`);
        await this.updateTaskToFailed(taskId, `轮询失败：${error.message}`);
      }
    }
  }

  /**
   * 同步任务状态（从Tripo3D到本地数据库）
   * @param taskId 本地任务ID
   * @param tripoTaskId Tripo3D任务ID
   * @returns 任务状态数据
   */
  private async syncTaskStatus(taskId: string, tripoTaskId: string): Promise<TripoTaskStatusResponse['data']> {
    // 查询本地任务
    const task = await this.modelTaskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`本地任务不存在 | taskId: ${taskId}`);

    // 查询Tripo3D任务状态
    const tripoTaskData = await this.tripo3dService.getTaskStatus(tripoTaskId);

    // 状态无变化则不更新
    if (task.status === tripoTaskData.status && task.progress === tripoTaskData.progress) {
      this.logger.log(`任务状态无变化 | taskId: ${taskId} | 状态: ${task.status}`);
      return tripoTaskData;
    }

    // 更新本地任务状态
    const now = Math.floor(Date.now() / 1000);
    await this.modelTaskRepo.update(
      { id: taskId },
      {
        status: tripoTaskData.status,
        progress: tripoTaskData.progress,
        output: { ...task.output, ...tripoTaskData.output } as TaskOutput,
        updateTime: now,
        errorMsg: tripoTaskData.status === 'failed' ? `Tripo3D任务失败：${JSON.stringify(tripoTaskData.output || '无详情')}` : task.errorMsg,
      },
    );

    this.logger.log(`任务状态更新 | taskId: ${taskId} | 旧状态: ${task.status} | 新状态: ${tripoTaskData.status} | 进度: ${tripoTaskData.progress}%`);
    return tripoTaskData;
  }

  /**
   * 将模型文件转存到七牛云
   * @param taskId 任务ID
   * @param tripoOutput Tripo3D输出数据
   * @param manager 事务管理器（可选）
   */
  private async saveModelToQiniu(taskId: string, tripoOutput: TripoTaskStatusResponse['data']['output'], manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(ModelTaskEntity) : this.modelTaskRepo;
    const task = await repo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`任务不存在 | taskId: ${taskId}`);

    try {
      // 需要转存的文件类型配置
      const fileTypes = [
        { key: 'model', name: '主模型', suffix: 'glb' },
        { key: 'pbr_model', name: 'PBR模型', suffix: 'glb' },
        { key: 'rendered_image', name: '预览图', suffix: 'png' },
      ] as const;

      const qiniuOutput: Record<string, string> = {};

      // 逐个转存文件
      for (const { key, name, suffix } of fileTypes) {
        const tripoUrl = tripoOutput[key];
        if (!tripoUrl) {
          this.logger.warn(`任务缺少${name} | taskId: ${taskId} | 类型: ${key}`);
          continue;
        }

        const qiniuKey = `model_tasks/${task.userId}/${taskId}/${key}.${suffix}`;
        const qiniuUrl = await this.qiniuUtil.uploadModelFromTripo(tripoUrl, qiniuKey);
        qiniuOutput[key] = qiniuUrl;
        this.logger.log(` ${name}转存成功 | taskId: ${taskId} | 七牛URL: ${qiniuUrl}`);
      }

      // 更新任务的七牛云地址
      await repo.update(
        { id: taskId },
        {
          output: {
            ...task.output,
            qiniu_output: qiniuOutput,
          } as TaskOutput,
          updateTime: Math.floor(Date.now() / 1000),
        },
      );

      this.logger.log(`模型转存七牛云完成 | taskId: ${taskId} | 转存文件数: ${Object.keys(qiniuOutput).length}`);
    } catch (error) {
      this.logger.error(`模型转存七牛云失败 | taskId: ${taskId}`, error.stack);
      // 转存失败标记任务为失败
      await repo.update(
        { id: taskId },
        {
          status: 'failed',
          errorMsg: `模型转存失败：${error.message}`,
          updateTime: Math.floor(Date.now() / 1000),
        },
      );
      throw new InternalServerErrorException(`模型转存失败：${error.message}`);
    }
  }

  /**
   * 将任务标记为失败状态
   * @param taskId 任务ID
   * @param errorMsg 错误信息
   */
  private async updateTaskToFailed(taskId: string, errorMsg: string): Promise<void> {
    await this.modelTaskRepo.update(
      { id: taskId },
      {
        status: 'failed',
        progress: 0,
        errorMsg,
        updateTime: Math.floor(Date.now() / 1000),
      },
    );
    this.logger.log(`任务标记为失败 | taskId: ${taskId} | 错误信息: ${errorMsg}`);
  }

  /**
   * 查询用户历史生成模型记录（仅返回成功的任务，含七牛云地址）
   * @param userId 用户ID（从JWT令牌提取）
   * @param queryDto 分页与筛选参数
   */
  async getUserHistoryModels(
    userId: string,
    queryDto: QueryHistoryModelsDto,
  ): Promise<HistoryModelsResponse> {
    const { page, pageSize, generateType } = queryDto;
    const skip = page * pageSize;

    // 构建查询条件（仅查成功且有七牛云地址的任务）
    const queryBuilder = this.modelTaskRepo.createQueryBuilder('task')
      .where('task.userId = :userId', { userId })
      .andWhere('task.status = :status', { status: 'success' })
      .andWhere('task.output IS NOT NULL')
      .andWhere('task.output->>\'qiniu_output\' IS NOT NULL');

    // 按生成类型筛选
    if (generateType) {
      queryBuilder.andWhere('task.type = :generateType', { generateType });
    }

    // 执行分页查询
    const [tasks, total] = await queryBuilder
      .select([
        'task.id',
        'task.type',
        'task.prompt',
        'task.output',
        'task.createTime',
      ])
      .orderBy('task.createTime', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    // 格式化数据：严格匹配 HistoryModelItem 类型，过滤无效数据
    const formattedList: (HistoryModelItem | null)[] = tasks.map(task => {
      const qiniuOutput = task.output?.qiniu_output || {};
      // 提取有效地址（确保非undefined）
      const modelUrl = qiniuOutput.pbr_model || qiniuOutput.model;
      const thumbnailUrl = qiniuOutput.rendered_image;

      // 若地址缺失，返回null（后续过滤）
      if (!modelUrl || !thumbnailUrl) {
        this.logger.warn(`任务地址缺失，跳过 | taskId: ${task.id}`);
        return null;
      }

      // 处理prompt默认值
      const prompt = task.prompt ?? '';

      return {
        taskId: task.id,
        generateType: task.type as ModelGenerateType,
        prompt: prompt,
        modelUrl: modelUrl,
        thumbnailUrl: thumbnailUrl,
        createTime: task.createTime,
      } as HistoryModelItem;
    });

    // 过滤无效数据
    const list: HistoryModelItem[] = formattedList.filter(
      (item): item is HistoryModelItem => item !== null
    );

    return { total, page, pageSize, list };
  }
}