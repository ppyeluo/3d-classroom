import { Module, Global } from '@nestjs/common';
import { QiniuUtil } from './utils/qiniu.util';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { getDatabaseConfig } from './config/database.config';
import { getJwtConfig } from './config/jwt.config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ModelGenerateModule } from './modules/model-generate/model-generate.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MaterialMarketModule } from './modules/material-market/material-market.module';

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
    
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    // Redis任务队列配置（用于模型生成任务管理）
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
    MaterialMarketModule,
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