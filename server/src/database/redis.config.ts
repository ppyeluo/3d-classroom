import { ConfigService } from '@nestjs/config';
import { RedisClientOptions } from 'redis';

export const getRedisConfig = (configService: ConfigService): RedisClientOptions => {
  const password = configService.get<string>('REDIS_PASSWORD');
  const host = configService.get<string>('REDIS_HOST');
  const port = configService.get<number>('REDIS_PORT');
  // 构建 Redis 连接 URL
  const urlParts = [`redis://`];
  if (password) {
    urlParts.push(`${password}@`);
  }
  urlParts.push(`${host}:${port}`);
  return {
    url: urlParts.join(''),
    database: 0,
  };
};
