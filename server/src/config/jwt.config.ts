import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * JWT配置（用户认证）
 * 参考《立体课堂》需求文档3.3安全性需求的API安全要求
 */
export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  // 密钥：从环境变量获取（避免硬编码）
  secret: configService.get<string>('JWT_SECRET'),
  // 签名选项（符合安全最佳实践）
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'), // 令牌有效期（默认24小时）
    algorithm: 'HS256', // 显式指定签名算法（避免默认算法风险）
    // audience: configService.get<string>('JWT_AUDIENCE', 'https://3d-classroom-frontend.com'), // 前端受众
    // issuer: configService.get<string>('JWT_ISSUER', 'https://3d-classroom-backend.com'), // 后端签发者
    notBefore: '0s' // 令牌立即生效
  }
});