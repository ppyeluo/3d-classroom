import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserModule } from '../user/user.module';
import { getJwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    // 注册Passport模块，用于处理认证逻辑
    PassportModule,
    // 异步注册JWT模块，通过配置服务获取JWT相关配置
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    // 导入用户模块，以便在认证过程中使用UserService
    UserModule,
  ],
  // 提供JWT策略和守卫，用于处理认证逻辑和权限控制
  providers: [JwtStrategy, JwtAuthGuard],
  // 导出JWT守卫，让其他模块可以直接使用该守卫进行接口保护
  exports: [JwtAuthGuard],
})
export class AuthModule {}