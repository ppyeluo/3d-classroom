import { Injectable, CanActivate, ExecutionContext, applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard'; // 复用已有的JWT守卫

// 定义角色装饰器
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// 角色守卫（继承JWT守卫确保先验证身份）
@Injectable()
export class RolesGuard extends JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 先执行JWT守卫的验证（确保用户已登录）
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    // 获取控制器/方法上定义的角色
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // 没有定义角色要求时默认允许访问
    }

    // 获取用户信息（从JWT守卫验证后的req.user中）
    const { user } = context.switchToHttp().getRequest();
    // 假设用户信息中有subject字段表示角色，根据实际情况调整
    return requiredRoles.includes(user.subject);
  }
}

// 组合装饰器：同时应用JWT认证和角色验证
export const Auth = (...roles: string[]) => {
  return applyDecorators(
    Roles(...roles),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
};