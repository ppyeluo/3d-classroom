import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/services/user.service';
import { UserEntity } from '../user/entities/user.entity';

/**
 * JWT认证策略（Passport）
 * 参考《立体课堂》需求文档3.3安全性需求的用户认证要求
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService
  ) {
    super({
      // 从Authorization头提取Bearer Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 不忽略令牌过期（过期时自动抛出401）
      // 密钥与受众/签发者校验（与JWT配置一致）
      secretOrKey: configService.get<string>('JWT_SECRET'),
      audience: configService.get<string>('JWT_AUDIENCE'),
      issuer: configService.get<string>('JWT_ISSUER')
    });
  }

  /**
   * 令牌验证通过后，查询用户信息（挂载到req.user）
   * @param payload JWT解码后的 payload（包含userId）
   */
  async validate(payload: { sub: string }): Promise<UserEntity> {
    // 从payload提取用户ID（sub字段为JWT标准用户标识）
    const user = await this.userService.findById(payload.sub);

    // 验证用户状态（禁用用户无法登录）
    if (!user || !user.isEnabled) {
      throw new UnauthorizedException('用户不存在或已禁用');
    }

    // 返回用户信息（会自动挂载到Request对象的user属性）
    return user;
  }
}