import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UserEntity } from '../../user/entities/user.entity';
import { ModelTaskEntity, ModelTaskStatus } from '../entities/model-task.entity';
import { CreateModelTaskDto } from '../dto/create-model-task.dto';
import { QueryModelTasksDto } from '../dto/query-model-tasks.dto';
import { Tripo3dService } from './tripo3d.service';

@Injectable()
export class ModelTaskService {
  constructor(
    @InjectRepository(ModelTaskEntity)
    private modelTaskRepo: Repository<ModelTaskEntity>,
    @InjectQueue('model-generation') // 注入模型生成队列
    private modelQueue: Queue,
    private tripo3dService: Tripo3dService
  ) {}

  /**
   * 创建模型生成任务
   */
  async createTask(createDto: CreateModelTaskDto, user: UserEntity) {
    // 1. 创建本地任务记录
    const task = this.modelTaskRepo.create({
      ...createDto,
      user,
      status: ModelTaskStatus.PENDING
    });
    await this.modelTaskRepo.save(task);

    // 2. 将任务加入队列
    await this.modelQueue.add('generate-model', {
      taskId: task.id,
      prompt: createDto.description,
      userId: user.id
    });

    return task;
  }

  /**
   * 获取用户的任务列表
   */
  async getUserTasks(user: Omit<UserEntity, 'password'>, queryDto: QueryModelTasksDto) {
    // 确保page和limit是数字并设置默认值
    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;
    
    // 确保skip是有效的非负整数
    const skip = Math.max(0, (page - 1) * limit);

    // 构建查询条件
    const query = this.modelTaskRepo.createQueryBuilder('task')
      .where('task.user.id = :userId', { userId: user.id })
      .orderBy('task.createdAt', 'DESC');

    // 如果有状态筛选，添加条件
    if (queryDto.status) {
      query.andWhere('task.status = :status', { status: queryDto.status });
    }

    // 执行分页查询
    const [tasks, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: tasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }


  /**
   * 获取任务详情
   */
  async getTaskDetail(id: string, userId: string) {
    const task = await this.modelTaskRepo.findOne({
      where: { id, user: { id: userId } }
    });

    if (!task) {
      throw new NotFoundException('任务不存在或无权访问');
    }

    return task;
  }

  /**
   * 更新任务状态（供队列处理器调用）
   */
  async updateTaskStatus(
    taskId: string, 
    status: ModelTaskStatus, 
    data?: { modelUrl?: string; errorMessage?: string; thumbnailUrl?: string }
  ) {
    const task = await this.modelTaskRepo.findOne({ where: { id: taskId } });
    
    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    task.status = status;
    
    if (data?.modelUrl) task.modelUrl = data.modelUrl;
    if (data?.errorMessage) task.errorMessage = data.errorMessage;
    if (data?.thumbnailUrl) task.thumbnailUrl = data.thumbnailUrl;

    return this.modelTaskRepo.save(task);
  }

  /**
   * 处理模型生成（队列处理器）
   */
  async processModelGeneration(taskId: string, prompt: string) {
    try {
      // 1. 更新任务状态为处理中
      await this.updateTaskStatus(taskId, ModelTaskStatus.PROCESSING);

      // 2. 调用Tripo3D API创建任务
      const tripoTaskId = await this.tripo3dService.createModelTask(prompt);
      
      // 3. 保存Tripo任务ID
      const task = await this.modelTaskRepo.findOne({ where: { id: taskId } });
      if (!task) {
        throw new NotFoundException(`任务ID ${taskId} 不存在`);
      }
      task.tripoTaskId = tripoTaskId;
      await this.modelTaskRepo.save(task);

      // 4. 轮询等待任务完成（实际项目中可使用WebHook）
      let statusResponse;
      let retries = 0;
      const maxRetries = 30; // 最多轮询30次
      const interval = 10000; // 每10秒查询一次

      do {
        await new Promise(resolve => setTimeout(resolve, interval));
        statusResponse = await this.tripo3dService.getTaskStatus(tripoTaskId);
        retries++;
      } while (
        statusResponse.status !== 'succeeded' && 
        statusResponse.status !== 'failed' && 
        retries < maxRetries
      );

      // 5. 处理结果
      if (statusResponse.status === 'succeeded') {
        await this.updateTaskStatus(taskId, ModelTaskStatus.COMPLETED, {
          modelUrl: statusResponse.model_url,
          thumbnailUrl: statusResponse.thumbnail_url
        });
      } else if (statusResponse.status === 'failed') {
        await this.updateTaskStatus(taskId, ModelTaskStatus.FAILED, {
          errorMessage: statusResponse.error || '模型生成失败'
        });
      } else {
        await this.updateTaskStatus(taskId, ModelTaskStatus.FAILED, {
          errorMessage: '模型生成超时'
        });
      }

    } catch (error) {
      console.error('模型生成处理失败:', error);
      await this.updateTaskStatus(taskId, ModelTaskStatus.FAILED, {
        errorMessage: error.message
      });
    }
  }
}
