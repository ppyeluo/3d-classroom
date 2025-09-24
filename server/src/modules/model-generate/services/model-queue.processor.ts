import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ModelTaskService } from './model-task.service';

@Processor('model-generation')
export class ModelQueueProcessor {
  constructor(private modelTaskService: ModelTaskService) {}

  @Process('generate-model')
  async handleGenerateModel(job: Job) {
    const { taskId, prompt } = job.data;
    
    // 调用服务处理模型生成
    await this.modelTaskService.processModelGeneration(taskId, prompt);
    
    return { success: true, taskId };
  }
}
