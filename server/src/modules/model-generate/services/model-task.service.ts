import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm'; // 修复：移除TransactionManager引用
import { v4 as uuidv4 } from 'uuid';
import { Queue, Job } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CreateModelTaskDto, ModelGenerateType, GenerateStyle } from '../dto/create-model-task.dto';
import { QueryModelTasksDto } from '../dto/query-model-tasks.dto';
import { Tripo3dService, TripoTaskStatusResponse } from './tripo3d.service';
import { UserService } from '../../user/services/user.service';
import { ModelTaskEntity, TaskOutput } from '../entities/model-task.entity'; // 导入TaskOutput类型
import { TaskListResponse } from '../dto/task-list-response.dto';
import { QiniuUtil } from '../../../utils/qiniu.util';
import { HistoryModelItem, HistoryModelsResponse } from '../dto/history-models-response.dto';
import { QueryHistoryModelsDto } from '../dto/query-history-models.dto';

export const MODEL_GENERATE_QUEUE = 'model-generate-queue';
export const POLL_TASK_STATUS_JOB = 'poll-task-status';

const POLL_INTERVAL = 3000;
const MAX_POLL_DURATION = 10 * 60 * 1000;
const MAX_UNKNOWN_RETRIES = 3;

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

  async createTask(userId: string, createDto: CreateModelTaskDto): Promise<ModelTaskEntity> {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.isEnabled) throw new ForbiddenException('账号已禁用，无法创建模型任务');

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
      output: {} // 初始化output为对象
    } as ModelTaskEntity);

    try {
      const tripoTaskId = await this.tripo3dService.createGenerateTask(
        createDto.generateType,
        createDto.generateType === ModelGenerateType.TEXT_TO_MODEL ? createDto.prompt : undefined,
        createDto.generateType === ModelGenerateType.IMAGE_TO_MODEL ? createDto.imageToken : undefined,
        createDto.style,
      );
      task.tripoTaskId = tripoTaskId;

      // 修复：确保save方法接收单个实体
      const savedTask = await this.modelTaskRepo.save(task as ModelTaskEntity);
      this.logger.log(`本地任务创建成功 | taskId: ${savedTask.id} | tripoTaskId: ${tripoTaskId}`);

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

  async getUserTasks(userId: string, queryDto: QueryModelTasksDto): Promise<TaskListResponse> {
    this.logger.log(`查询用户任务列表 | userId: ${userId} | 分页: ${queryDto.page}/${queryDto.pageSize}`);
    // 修复：正确计算分页参数
    const skip = queryDto.page > 0 ? (queryDto.page - 1) * queryDto.pageSize : 0;
    
    // 修复：确保返回的是数组和总数的元组
    const [tasks, total] = await this.modelTaskRepo.findAndCount({
      where: { userId },
      skip,
      take: queryDto.pageSize,
      order: { createTime: 'DESC' },
    });

    // 修复：确保不把数组当作单个实体处理
    this.logger.log(`用户任务列表查询完成 | userId: ${userId} | 总数: ${total} | 当前页数量: ${tasks.length}`);
    return { total, page: queryDto.page, pageSize: queryDto.pageSize, list: tasks };
  }

  async getTaskDetail(userId: string, taskId: string): Promise<ModelTaskEntity> {
    this.logger.log(`查询任务详情 | userId: ${userId} | taskId: ${taskId}`);
    // 修复：正确查询单个任务
    const task = await this.modelTaskRepo.findOne({ 
      where: { tripoTaskId: taskId, userId } 
    });
    
    // 修复：处理可能的null值
    if (!task) {
      this.logger.warn(`任务不存在或无权限 | userId: ${userId} | taskId: ${taskId}`);
      throw new NotFoundException('任务不存在或无权限访问');
    }

    if (['queued', 'running'].includes(task.status)) {
      try {
        await this.syncTaskStatus(task.id, task.tripoTaskId);
        // 重新查询最新数据
        const updatedTask = await this.modelTaskRepo.findOne({ where: { id: taskId, userId } });
        return updatedTask as ModelTaskEntity; // 类型断言处理可能的null
      } catch (error) {
        this.logger.error(`同步任务状态失败 | taskId: ${taskId}`, error.stack);
        return task;
      }
    }

    return task;
  }

  async uploadImageToTripo(file: Express.Multer.File): Promise<string> {
    this.logger.log(`上传图片到Tripo3D | 文件名: ${file.originalname} | 格式: ${file.mimetype} | 大小: ${file.size}B`);
    try {
      return await this.tripo3dService.uploadImage(file.buffer, file.mimetype);
    } catch (error) {
      this.logger.error('图片上传Tripo3D失败', error.stack);
      throw new InternalServerErrorException(`图片上传失败：${error.message}`);
    }
  }

  async handlePollTaskStatus(job: Job<{
    taskId: string;
    tripoTaskId: string;
    pollStartTime: number;
    unknownRetryCount: number;
  }>): Promise<void> {
    const { taskId, tripoTaskId, pollStartTime, unknownRetryCount } = job.data;
    this.logger.log(`开始轮询任务状态 | jobId: ${job.id} | taskId: ${taskId} | 已轮询时长: ${(Date.now() - pollStartTime) / 1000}s`);

    try {
      if (Date.now() - pollStartTime > MAX_POLL_DURATION) {
        this.logger.warn(`任务轮询超时 | taskId: ${taskId} | 最大时长: ${MAX_POLL_DURATION / 60000}min`);
        await this.updateTaskToFailed(taskId, '任务处理超时（超过10分钟）');
        return;
      }

      const res = await this.syncTaskStatus(taskId, tripoTaskId);
      const { status, progress, output } = res
      if (['queued', 'running'].includes(status)) {
        this.logger.log(`任务未完成，继续轮询 | taskId: ${taskId} | 状态: ${status} | 进度: ${progress}%`);
        await this.modelQueue.add(
          POLL_TASK_STATUS_JOB,
          { taskId, tripoTaskId, pollStartTime, unknownRetryCount },
          { delay: POLL_INTERVAL, removeOnComplete: true },
        );
      } else if (status === 'success' && output?.pbr_model) {
        this.logger.log(`任务成功，开始转存模型 | taskId: ${taskId} | 模型URL: ${output.pbr_model}`);
        await this.saveModelToQiniu(taskId, output);
      } else if (status === 'unknown') {
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
        this.logger.log(`任务进入终态 | taskId: ${taskId} | 状态: ${status} | 模型URL: ${output}`);
        console.log(res)
      }
    } catch (error) {
      this.logger.error(`轮询任务处理失败 | jobId: ${job.id} | taskId: ${taskId}`, error.stack);
      if (job.attemptsMade < 3) {
        this.logger.log(`轮询任务重试 | jobId: ${job.id} | 重试次数: ${job.attemptsMade + 1}`);
        throw error;
      } else {
        this.logger.error(`轮询任务重试失败 | jobId: ${job.id} | taskId: ${taskId}`);
        await this.updateTaskToFailed(taskId, `轮询失败：${error.message}`);
      }
    }
  }

  private async syncTaskStatus(taskId: string, tripoTaskId: string): Promise<TripoTaskStatusResponse['data']> {
    // 修复：正确查询单个任务并处理null
    const task = await this.modelTaskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`本地任务不存在 | taskId: ${taskId}`);

    const tripoTaskData = await this.tripo3dService.getTaskStatus(tripoTaskId);

    if (task.status === tripoTaskData.status && task.progress === tripoTaskData.progress) {
      this.logger.log(`任务状态无变化 | taskId: ${taskId} | 状态: ${task.status}`);
      return tripoTaskData;
    }

    // 修复：update方法的正确参数格式（不包含id在更新对象中）
    const now = Math.floor(Date.now() / 1000);
    await this.modelTaskRepo.update(
      { id: taskId }, // 第一个参数是查询条件
      { // 第二个参数是要更新的字段
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

  private async saveModelToQiniu(taskId: string, tripoOutput: TripoTaskStatusResponse['data']['output'], manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(ModelTaskEntity) : this.modelTaskRepo;
    const task = await repo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`任务不存在 | taskId: ${taskId}`);

    try {
      const fileTypes = [
        { key: 'model', name: '主模型', suffix: 'glb' },
        { key: 'pbr_model', name: 'PBR模型', suffix: 'glb' },
        { key: 'rendered_image', name: '预览图', suffix: 'png' },
      ] as const;

      const qiniuOutput: Record<string, string> = {};

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

      // 修复：正确更新output字段
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

  private async updateTaskToFailed(taskId: string, errorMsg: string): Promise<void> {
    // 修复：update方法的正确参数格式
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

  // 1. 构建查询条件（仅查成功且有七牛云地址的任务）
  const queryBuilder = this.modelTaskRepo.createQueryBuilder('task')
    .where('task.userId = :userId', { userId })
    .andWhere('task.status = :status', { status: 'success' })
    .andWhere('task.output IS NOT NULL')
    .andWhere('task.output->>\'qiniu_output\' IS NOT NULL');

  if (generateType) {
    queryBuilder.andWhere('task.type = :generateType', { generateType });
  }

  // 2. 执行分页查询
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

  // 3. 格式化数据：严格匹配 HistoryModelItem 类型，过滤无效数据
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

    // 若prompt为null/undefined，用空字符串兜底（匹配 HistoryModelItem 的 prompt: string 类型）
    const prompt = task.prompt ?? '';

    // 返回严格符合 HistoryModelItem 类型的数据
    return {
      taskId: task.id,
      generateType: task.type as ModelGenerateType, // 断言为合法的生成类型
      prompt: prompt, // 已确保是string（非undefined）
      modelUrl: modelUrl, // 已确保是string（非undefined）
      thumbnailUrl: thumbnailUrl, // 已确保是string（非undefined）
      createTime: task.createTime, // 数据库是bigint，TypeORM自动转为number
    } as HistoryModelItem; // 显式断言为 HistoryModelItem，消除类型歧义
  });

  // 4. 过滤null，并用类型谓词明确告诉TS：过滤后是 HistoryModelItem[]
  const list: HistoryModelItem[] = formattedList.filter(
    (item): item is HistoryModelItem => item !== null
  );

  return { total, page, pageSize, list };
}
}
    