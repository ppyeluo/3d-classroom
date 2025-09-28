import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest } from 'express'; // 导入 Express Request 类型
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';

export interface RequestWithUser extends ExpressRequest {
  user: {
    sub: string;
    phone: string;
    subject: string;
  };
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  // 使用类型化的请求对象
  getProfile(@Request() req: RequestWithUser) {
    return this.userService.findById(req.user.sub);
  }
}