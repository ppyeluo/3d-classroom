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
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    UserModule, // 导入 UserModule，使用 UserService
  ],
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard], // 导出守卫，供其他模块使用
})
export class AuthModule {}