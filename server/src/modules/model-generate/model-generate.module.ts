import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ModelTaskEntity } from './entities/model-task.entity';
import { ModelTaskController } from './controllers/model-task.controller';
import { ModelTaskService } from './services/model-task.service';
import { Tripo3dService } from './services/tripo3d.service';
import { ModelQueueProcessor } from './services/model-queue.processor';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModelTaskEntity]),
    // 注册模型生成队列
    BullModule.registerQueue({
      name: 'model-generation',
    }),
    UserModule
  ],
  controllers: [ModelTaskController],
  providers: [ModelTaskService, Tripo3dService, ModelQueueProcessor],
  exports: [ModelTaskService]
})
export class ModelGenerateModule {}
