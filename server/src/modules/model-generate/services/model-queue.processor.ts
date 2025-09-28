import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ModelTaskService, MODEL_GENERATE_QUEUE, POLL_TASK_STATUS_JOB } from './model-task.service';

@Processor(MODEL_GENERATE_QUEUE)
export class ModelQueueProcessor {
  private readonly logger = new Logger(ModelQueueProcessor.name);

  constructor(private readonly modelTaskService: ModelTaskService) {}

  /**
   * 处理任务状态轮询的队列消费者
   * @param job 队列任务
   */
  @Process(POLL_TASK_STATUS_JOB)
  async handlePollTaskStatus(job: Job<{
    taskId: string;
    tripoTaskId: string;
    pollStartTime: number;
    unknownRetryCount: number;
  }>): Promise<void> {
    const { taskId, tripoTaskId } = job.data;
    this.logger.log(`开始处理轮询Job | jobId: ${job.id} | taskId: ${taskId} | tripoTaskId: ${tripoTaskId}`);

    try {
      // 调用服务层的轮询处理逻辑
      await this.modelTaskService.handlePollTaskStatus(job);
      this.logger.log(`轮询Job处理完成 | jobId: ${job.id} | taskId: ${taskId}`);
    } catch (error) {
      this.logger.error(`轮询Job处理失败 | jobId: ${job.id} | taskId: ${taskId}`, error.stack);
      throw error; // 抛出错误，Bull会根据重试配置处理
    }
  }
}