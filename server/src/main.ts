import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  // 创建 Fastify 应用
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // 安全配置
  app.use(helmet());

  // 跨域配置
  app.enableCors({
    origin: ['http://localhost:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  // Swagger 文档配置
  const config = new DocumentBuilder()
    .setTitle('立体课堂（3D-Classroom）API')
    .setDescription('中小学教师3D课件制作平台后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 启动服务器
  await app.listen(3000, '0.0.0.0');
  console.log(`应用运行在: ${await app.getUrl()}`);
}
bootstrap();
