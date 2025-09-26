// src/app.module.ts
import { Module, Global } from '@nestjs/common'; // 新增Global导入
// ...其他原有导入
import { QiniuUtil } from './utils/qiniu.util'; // 导入七牛云工具
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull'; // 新增：导入任务队列模块
import { JwtModule } from '@nestjs/jwt';
import { getDatabaseConfig } from './config/database.config';
import { getJwtConfig } from './config/jwt.config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ModelGenerateModule } from './modules/model-generate/model-generate.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// 全局注册七牛云工具
@Global()
@Module({
  providers: [QiniuUtil],
  exports: [QiniuUtil],
})
class QiniuGlobalModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 修复：TypeOrm配置（保持不变）
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    // 修复：Jwt配置（保持不变）
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    // 新增：Redis任务队列配置（用于模型生成任务管理）
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          db: 0,
        },
      }),
    }),
    QiniuGlobalModule,
    UserModule,
    AuthModule,
    ModelGenerateModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [],
})
export class AppModule {}