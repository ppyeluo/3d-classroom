import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis'; // 明确导入类型
import { getTypeOrmConfig } from './typeorm.config';
import { getRedisConfig } from './redis.config';
import { RedisUtil } from '../common/utils/redis.util';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getTypeOrmConfig,
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        // 明确指定 Redis 客户端的类型参数
        const client: RedisClientType = createClient(getRedisConfig(configService)) as RedisClientType;
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
    RedisUtil,
  ],
  exports: ['REDIS_CLIENT', RedisUtil],
})
export class DatabaseModule {}
