import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();

    response.status(status).send({
      code: status,
      message: typeof errorResponse === 'object' ? (errorResponse as any).message || '请求失败' : errorResponse,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
