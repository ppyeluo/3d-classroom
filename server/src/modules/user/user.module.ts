import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserEntity } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])], // 注册用户实体
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 导出 UserService，供 Auth 模块使用
})
export class UserModule {}