// src/modules/user/services/user.service.ts
import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';

// 新增：导出用户信息类型（排除密码）
export type UserWithoutPassword = Omit<UserEntity, 'password'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  // 用户注册（保持不变）
  async register(createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    const existingUser = await this.userRepo.findOne({ where: { phone: createUserDto.phone } });
    if (existingUser) {
      throw new ConflictException('该手机号已注册');
    }
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(createUserDto.password, salt);
    const user = this.userRepo.create({
      ...createUserDto,
      password: encryptedPassword,
    });
    await this.userRepo.save(user);
    const { password, ...result } = user;
    return result;
  }

  // 用户登录（保持不变）
  async login(loginUserDto: LoginUserDto) {
    // 关键修改：显式指定需要查询 password 字段
    const user = await this.userRepo.findOne({ 
      where: { phone: loginUserDto.phone },
      select: ['id', 'phone', 'password', 'name', 'subject', 'grade', 'isEnabled'] // 必须包含 password
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.isEnabled) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 增加参数校验（双重保险）
    if (!loginUserDto.password || !user.password) {
      throw new UnauthorizedException('密码错误');
    }

    const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      subject: user.subject,
    });
    
    const { password, ...userInfo } = user;
    return {
      token,
      user: userInfo,
    };
  }

  // 根据手机号查询用户（保持不变）
  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { phone } });
  }

  /**
   * 内部使用：查询完整用户实体（包含密码）
   * 用于需要完整用户信息的场景（如任务关联）
   */
  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  /**
   * 外部使用：查询不含密码的用户信息
   * 用于返回给前端的场景
   */
  async findUserWithoutPassword(id: string): Promise<UserWithoutPassword> {
    const user = await this.findById(id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // 新增完整实体查询（保持不变）
  async findFullEntityById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }
}