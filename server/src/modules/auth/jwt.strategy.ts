import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从请求头 Bearer Token 提取 JWT
      ignoreExpiration: false, // 不忽略 Token 过期
      secretOrKey: configService.get<string>('JWT_SECRET'), // JWT 密钥
    });
  }

  // 验证 Token 后，将用户信息挂载到 req.user
  async validate(payload: any) {
    // payload 是 JWT 解码后的内容（包含 sub、phone 等）
    const user = await this.userService.findByPhone(payload.phone);
    if (!user) {
      return null; // 若用户不存在，守卫会拒绝请求
    }
    return {
      sub: user.id,
      phone: user.phone,
      subject: user.subject,
    };
  }
}