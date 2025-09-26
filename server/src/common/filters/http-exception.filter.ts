// src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid'; // 生成请求唯一标识（对齐 Tripo3D Trace ID 思想）

/**
 * 全局 HTTP 异常过滤器：重点拦截 404（NotFoundException），打印请求信息并返回友好响应
 * 对齐文档需求：
 * 1. 《立体课堂需求文档》3.4：记录异常请求上下文，便于问题追溯
 * 2. 《tripo3d》接口：返回 traceId，支持跨系统问题定位
 */
@Catch(NotFoundException) // 仅拦截 404 相关异常（NotFoundException）
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('404ExceptionFilter'); // 日志分类，便于识别 404 相关日志

  catch(exception: NotFoundException, host: ArgumentsHost) {
    // 1. 获取 Fastify 请求/响应对象（适配 Fastify 技术栈）
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    // 2. 生成请求唯一标识（类似 Tripo3D 接口的 X-Tripo-Trace-ID）
    const requestTraceId = uuidv4();

    // 3. 解析请求核心信息（覆盖立体课堂“异常追溯”所需字段）
    const requestInfo = {
      traceId: requestTraceId, // 唯一标识，用于教师反馈定位
      timestamp: new Date().toLocaleString('zh-CN', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }), // 格式化时间，便于定位时间范围问题
      method: request.method, // HTTP 方法（如 Tripo3D 任务查询固定为 GET）
      url: request.url, // 完整请求路径（含查询参数，如 /api/model-tasks/xxx?param=1）
      query: request.query, // URL 查询参数（避免因参数错误导致的 404 遗漏）
      
      // 客户端信息（定位设备/网络问题）
      clientIp: request.ip, // 教师客户端 IP（如办公网络 IP）
      userAgent: request.headers['user-agent'] || '未知设备', // 浏览器/设备信息（如 Chrome/Edge）
      
      // 用户身份信息（对齐立体课堂“用户数据隔离”需求）
      userId: request || '未登录（无 JWT 令牌）', // 从 JWT 解析教师 ID（登录用户）
      authToken: request.headers.authorization 
        ? `${request.headers.authorization.slice(0, 10)}...${request.headers.authorization.slice(-10)}` 
        : '未携带令牌', // JWT 脱敏打印（符合立体课堂 3.3 安全性需求）
      
      // 异常信息（关联具体 404 原因）
      exceptionMessage: exception.message, // 框架返回的 404 原因（如“任务不存在”）
    };

    // 4. 打印 404 请求信息（warn 级别日志，确保终端醒目显示）
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

    // 5. 返回 404 响应（对齐立体课堂“用户友好提示”需求，携带 traceId 便于反馈）
    reply.statusCode = 404;
    reply.send({
      code: 404,
      message: `请求资源不存在：${exception.message}`, // 结合异常原因，提示更精准
      suggestion: `1. 检查接口路径/任务ID是否正确（参考立体课堂接口文档）；2. 若需排查，请提供 traceId：${requestTraceId}`,
      traceId: requestTraceId, // 传递唯一标识，便于教师反馈时使用
    });
  }
}