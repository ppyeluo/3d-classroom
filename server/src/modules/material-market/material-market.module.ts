import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialController } from './controllers/material.controller';
import { MaterialService } from './services/material.service';
import { MaterialEntity } from './entities/material.entity';
import { MaterialCategoryEntity } from './entities/material-category.entity';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // 注册数据库实体
    TypeOrmModule.forFeature([MaterialEntity, MaterialCategoryEntity]),
    // 导入依赖模块（用户服务、JWT认证）
    UserModule,
    AuthModule,
  ],
  controllers: [MaterialController],
  providers: [MaterialService],
  exports: [MaterialService], // 如需外部模块调用，可导出服务
})
export class MaterialMarketModule {}