import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isDevelopment = nodeEnv === 'development';

  return {
    type: 'postgres',
    host: configService.getOrThrow<string>('DB_HOST'),
    port: configService.getOrThrow<number>('DB_PORT'),
    username: configService.getOrThrow<string>('DB_USER'),
    password: configService.getOrThrow<string>('DB_PASSWORD'),
    database: configService.getOrThrow<string>('DB_NAME'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: isDevelopment,
    logging: isDevelopment ? ['error', 'warn'] : false,
    autoLoadEntities: true,
    ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    retryAttempts: 3,
    retryDelay: 1000,
  };
};