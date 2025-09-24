import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProxyFactory, Transport } from '@nestjs/microservices'; // 修改导入
import { JwtModule } from '@nestjs/jwt';
import { getDatabaseConfig } from './config/database.config';
import { getJwtConfig } from './config/jwt.config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ModelGenerateModule } from './modules/model-generate/model-generate.module';
import { MaterialMarket } from './modules/material-market/material-market.module';

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
    UserModule,
    AuthModule,
    ModelGenerateModule,
    MaterialMarket,
  ],
  controllers: [],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const options = {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          db: 0,
        };
        
        return ClientProxyFactory.create({
          transport: Transport.REDIS,
          options,
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'], // 导出供其他模块使用
})
export class AppModule {}