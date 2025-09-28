import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/services/user.service';
import { UserEntity } from '../user/entities/user.entity';

/**
 * JWT认证策略实现
 * 基于Passport的JWT认证逻辑，负责验证请求中的JWT令牌
 * 并从令牌中提取用户信息进行有效性校验
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService
  ) {
    super({
      // 从请求头的Authorization字段中提取Bearer Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略令牌过期，过期时Passport会自动抛出401错误
      ignoreExpiration: false,
      // JWT验证密钥，从配置中获取
      secretOrKey: configService.get<string>('JWT_SECRET'),
      // 验证令牌的受众，需与签发时一致
      audience: configService.get<string>('JWT_AUDIENCE'),
      // 验证令牌的签发者，需与签发时一致
      issuer: configService.get<string>('JWT_ISSUER')
    });
  }

  /**
   * 令牌验证通过后的后续处理
   * 从令牌 payload 中提取用户ID，查询数据库获取完整用户信息
   * @param payload JWT解码后的负载数据，包含用户标识sub
   * @returns 用户实体信息，会被自动挂载到请求对象的user属性上
   */
  async validate(payload: { sub: string }): Promise<UserEntity> {
    // 通过sub字段（用户ID）查询用户信息
    const user = await this.userService.findById(payload.sub);

    // 校验用户状态：用户不存在或已被禁用时拒绝访问
    if (!user || !user.isEnabled) {
      throw new UnauthorizedException('用户不存在或已禁用');
    }

    // 返回用户信息，供后续业务逻辑使用
    return user;
  }
}