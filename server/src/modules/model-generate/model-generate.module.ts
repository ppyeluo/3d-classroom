// src/modules/model-generate/model-generate.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ModelTaskEntity } from './entities/model-task.entity';
import { ModelTaskController } from './controllers/model-task.controller';
import { ModelTaskService, MODEL_GENERATE_QUEUE } from './services/model-task.service';
import { Tripo3dService } from './services/tripo3d.service';
import { ModelQueueProcessor } from './services/model-queue.processor';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // 注册实体
    TypeOrmModule.forFeature([ModelTaskEntity]),
    // 注册任务队列
    BullModule.registerQueue({
      name: MODEL_GENERATE_QUEUE,
    }),
    UserModule,
    AuthModule,
  ],
  controllers: [ModelTaskController], // 注册控制器
  providers: [ModelTaskService, Tripo3dService, ModelQueueProcessor], // 注册服务与处理器
  exports: [ModelTaskService], // 导出服务
})
export class ModelGenerateModule {}