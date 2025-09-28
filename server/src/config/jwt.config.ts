import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * JWT配置（用户认证）
 */
export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return {
    secret,
    signOptions: {
      expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
      algorithm: 'HS256',
      notBefore: '0s',
      // 建议在生产环境启用以下配置
      // audience: configService.get<string>('JWT_AUDIENCE'),
      // issuer: configService.get<string>('JWT_ISSUER'),
    },
  };
};