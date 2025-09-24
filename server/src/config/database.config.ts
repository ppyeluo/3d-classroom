import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USER'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'], // 自动扫描实体
  synchronize: configService.get<string>('NODE_ENV') === 'development', // 开发环境自动同步表结构（生产禁用）
  logging: configService.get<string>('NODE_ENV') === 'development', // 开发环境打印 SQL 日志
  autoLoadEntities: true,
  ssl: false, // 本地开发无需 SSL
});
