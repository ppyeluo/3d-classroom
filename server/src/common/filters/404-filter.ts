// src/common/filters/404-filter.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid'; // 生成请求唯一标识（对齐 Tripo3D Trace ID 思想）
import { Logger } from '@nestjs/common'; // 复用 NestJS 日志工具，保持日志格式统一

/**
 * 404 请求拦截过滤器：拦截所有未匹配路由的请求，打印完整请求信息后返回 404 响应
 * @param fastify Fastify 实例
 */
export function register404Filter(fastify: FastifyInstance) {
  const logger = new Logger('404Filter'); // 日志分类标记，便于区分 404 相关日志

  // 注册 Fastify 全局 404 处理器
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    // 1. 生成请求唯一标识（类似 Tripo3D 接口的 X-Tripo-Trace-ID，用于问题定位）
    const requestTraceId = uuidv4();

    // 2. 解析请求核心信息（覆盖立体课堂需求文档“异常追溯”所需字段）
    const requestInfo = {
      // 基础请求信息（定位接口路径问题）
      traceId: requestTraceId, // 请求唯一标识（用于关联教师反馈）
      timestamp: new Date().toLocaleString('zh-CN', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }), // 格式化时间（便于定位时间范围问题）
      method: request.method, // HTTP 方法（GET/POST 等，如 Tripo3D 任务查询固定为 GET）
      url: request.url, // 完整请求路径（含查询参数，如 /api/model-tasks/xxx?param=1）
      path: request.routerPath || '未匹配路由', // 未匹配的路由路径（核心排查字段）
      query: request.query, // URL 查询参数（如任务查询时的额外参数）
      
      // 客户端信息（定位设备/网络问题）
      clientIp: request.ip, // 客户端 IP（如教师办公网络 IP）
      userAgent: request.headers['user-agent'] || '未知设备', // 客户端设备/浏览器信息（如 Chrome/Edge）
      
      // 用户身份信息（对齐立体课堂“用户数据隔离”需求，定位具体用户的异常请求）
      userId: '未登录（无身份令牌）', // 从 JWT 令牌解析用户 ID（登录用户）
      authToken: request.headers.authorization 
        ? `${request.headers.authorization.slice(0, 10)}...${request.headers.authorization.slice(-10)}` 
        : '未携带令牌', // JWT 令牌脱敏打印（避免泄露，符合立体课堂 3.3 安全性需求）
      
      // 请求头信息（关联 Tripo3D 接口规范，如是否携带正确的 Authorization 头）
      headers: {
        authorization: request.headers.authorization ? '已携带（脱敏）' : '未携带', // 认证头状态
        'content-type': request.headers['content-type'] || '未指定', // 请求体类型
        'x-tripo-trace-id': request.headers['x-tripo-trace-id'] || '未传递（非 Tripo3D 直连请求）' // 关联 Tripo3D 接口 Trace ID
      }
    };

    // 3. 打印 404 请求信息（使用 warn 级别日志，确保在终端醒目显示，便于快速发现）
    logger.warn(`
【404 请求拦截】
请求唯一标识（traceId）：${requestInfo.traceId}
1. 基础请求信息：
   - 时间：${requestInfo.timestamp}
   - 方法：${requestInfo.method}
   - 完整URL：${requestInfo.url}
   - 未匹配路径：${requestInfo.path}
   - 查询参数：${JSON.stringify(requestInfo.query, null, 2)}
2. 客户端信息：
   - IP：${requestInfo.clientIp}
   - 设备/浏览器：${requestInfo.userAgent}
3. 用户身份信息：
   - 用户ID：${requestInfo.userId}
   - 认证令牌：${requestInfo.authToken}
4. 请求头信息：
   ${JSON.stringify(requestInfo.headers, null, 2)}
    `);

    // 4. 返回 404 响应（对齐立体课堂“用户友好提示”需求，同时携带 traceId 便于反馈）
    reply.statusCode = 404;
    return {
      code: 404,
      message: '请求的资源不存在（如接口路径错误、任务ID无效等）',
      suggestion: '1. 检查接口路径是否正确（参考立体课堂接口文档）；2. 确认任务ID是否存在；3. 若需排查，请提供请求唯一标识：' + requestInfo.traceId,
      traceId: requestInfo.traceId // 携带 traceId，便于教师反馈时提供
    };
  });
}