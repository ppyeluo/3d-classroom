import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// 封装 JWT 守卫，便于控制器使用
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}