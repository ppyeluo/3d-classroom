import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    }
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );

  const configService = app.get(ConfigService);
  const allowedOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',');

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 限制文件大小为 10MB
      files: 10 // 允许单次上传 2 个文件
    }
  });

  app.setGlobalPrefix('api');
  // 配置Swagger文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('立体课堂3D模型生成API')
    .setDescription('立体课堂后端API接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);


  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`立体课堂后端服务启动成功（Fastify）`);
  logger.log(`服务地址: http://localhost:${port}/api`);
  logger.log(`API文档: http://localhost:${port}/api/docs`);
  logger.log(`CORS允许域名: ${allowedOrigins.join(', ')}`);
}

bootstrap();
