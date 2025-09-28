// src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

/**
 * HTTP异常过滤器
 * 捕获代码中主动抛出的NotFoundException，记录上下文并返回友好响应
 */
@Catch(NotFoundException) // 仅针对404类型异常进行处理
export class HttpExceptionFilter implements ExceptionFilter {
  // 日志实例，指定分类为'404ExceptionFilter'便于区分不同来源的404日志
  private readonly logger = new Logger('404ExceptionFilter');

  // 异常捕获处理方法
  catch(exception: NotFoundException, host: ArgumentsHost) {
    // 从请求上下文中获取Fastify的request和reply对象
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    // 生成请求唯一标识，用于前后端问题定位关联
    const requestTraceId = uuidv4();

    // 收集请求相关信息，为问题排查提供完整上下文
    const requestInfo = {
      traceId: requestTraceId,
      timestamp: new Date().toLocaleString('zh-CN', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
      method: request.method,
      url: request.url,
      query: request.query,
      
      // 客户端信息
      clientIp: request.ip,
      userAgent: request.headers['user-agent'] || '未知设备',
      
      // 用户身份信息
      userId: request || '未登录（无JWT令牌）', // 实际场景需从JWT解析用户ID
      authToken: request.headers.authorization 
        ? `${request.headers.authorization.slice(0, 10)}...${request.headers.authorization.slice(-10)}` 
        : '未携带令牌',
      
      // 异常详情
      exceptionMessage: exception.message, // 保留原始异常信息，便于定位具体原因
    };

    // 输出警告日志，包含异常详情和请求上下文
    this.logger.warn(`
      【404 异常拦截】
      请求唯一标识（traceId）：${requestInfo.traceId}
      1. 基础请求信息：
        - 时间：${requestInfo.timestamp}
        - 方法：${requestInfo.method}
        - 完整URL：${requestInfo.url}
        - 查询参数：${JSON.stringify(requestInfo.query, null, 2)}
      2. 客户端信息：
        - IP：${requestInfo.clientIp}
        - 设备/浏览器：${requestInfo.userAgent}
      3. 用户身份信息：
        - 用户ID：${requestInfo.userId}
        - 认证令牌：${requestInfo.authToken}
      4. 异常原因：
        - ${requestInfo.exceptionMessage}
    `);

    // 构建标准化响应，包含问题排查建议和追踪ID
    reply.statusCode = 404;
    reply.send({
      code: 404,
      message: `请求资源不存在：${exception.message}`,
      suggestion: `1. 检查接口路径/任务ID是否正确（参考立体课堂接口文档）；2. 若需排查，请提供traceId：${requestTraceId}`,
      traceId: requestTraceId,
    });
  }
}