import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@nestjs/common';

// 404请求拦截，调试bug
export function register404Filter(fastify: FastifyInstance) {
  // 初始化日志实例，指定分类为'404Filter'便于日志筛选
  const logger = new Logger('404Filter');

  // 注册Fastify全局未找到路由处理器
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    // 生成请求唯一标识，用于问题追踪（类似分布式追踪中的traceId）
    const requestTraceId = uuidv4();

    // 组装请求相关信息，涵盖排查问题所需的关键维度
    const requestInfo = {
      // 基础请求信息 - 用于定位接口路径相关问题
      traceId: requestTraceId,
      timestamp: new Date().toLocaleString('zh-CN', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }),
      method: request.method,
      url: request.url,
      path: request.routerPath || '未匹配路由',
      query: request.query,
      
      // 客户端信息 - 用于排查设备或网络环境相关问题
      clientIp: request.ip,
      userAgent: request.headers['user-agent'] || '未知设备',
      
      // 用户身份信息 - 用于关联具体用户的操作场景
      userId: '未登录（无身份令牌）', // 实际场景中可从JWT解析真实用户ID
      authToken: request.headers.authorization 
        ? `${request.headers.authorization.slice(0, 10)}...${request.headers.authorization.slice(-10)}` 
        : '未携带令牌', // 令牌脱敏处理，避免日志泄露敏感信息
      
      // 请求头信息 - 用于校验请求格式及第三方接口关联（如Tripo3D）
      headers: {
        authorization: request.headers.authorization ? '已携带（脱敏）' : '未携带',
        'content-type': request.headers['content-type'] || '未指定',
        'x-tripo-trace-id': request.headers['x-tripo-trace-id'] || '未传递（非Tripo3D直连请求）'
      }
    };

    // 打印警告级别日志，包含完整请求上下文，便于问题追溯
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

    // 设置响应状态码并返回标准化错误信息
    reply.statusCode = 404;
    return {
      code: 404,
      message: '请求的资源不存在（如接口路径错误、任务ID无效等）',
      suggestion: '1. 检查接口路径是否正确（参考立体课堂接口文档）；2. 确认任务ID是否存在；3. 若需排查，请提供请求唯一标识：' + requestInfo.traceId,
      traceId: requestInfo.traceId
    };
  });
}