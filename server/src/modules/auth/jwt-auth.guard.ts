// jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT认证守卫
 * 继承自Passport的AuthGuard并指定使用'jwt'策略
 * 使用该守卫可实现JWT认证保护
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}