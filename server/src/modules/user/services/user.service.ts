import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';

// 定义不包含密码的用户信息类型，用于对外返回用户数据时排除敏感字段
export type UserWithoutPassword = Omit<UserEntity, 'password'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  // 用户注册处理
  // 1. 检查手机号是否已注册
  // 2. 对密码进行加密处理
  // 3. 保存用户信息并返回不含密码的用户数据
  async register(createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    const existingUser = await this.userRepo.findOne({ where: { phone: createUserDto.phone } });
    if (existingUser) {
      throw new ConflictException('该手机号已注册');
    }
    // 生成盐值并加密密码，10为盐值强度
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(createUserDto.password, salt);
    const user = this.userRepo.create({
      ...createUserDto,
      password: encryptedPassword,
    });
    await this.userRepo.save(user);
    // 解构移除密码字段后返回
    const { password, ...result } = user;
    return result;
  }

  // 用户登录处理
  // 1. 验证用户是否存在及账号状态
  // 2. 校验密码正确性
  // 3. 生成JWT令牌并返回用户信息（不含密码）
  async login(loginUserDto: LoginUserDto) {
    // 显式指定查询字段，确保能获取到密码用于校验
    const user = await this.userRepo.findOne({ 
      where: { phone: loginUserDto.phone },
      select: ['id', 'phone', 'password', 'name', 'subject', 'grade', 'isEnabled']
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (!user.isEnabled) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 双重校验防止密码为空的异常情况
    if (!loginUserDto.password || !user.password) {
      throw new UnauthorizedException('密码错误');
    }

    // 比对输入密码与数据库中存储的加密密码
    const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    // 生成包含用户标识信息的JWT令牌
    const token = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      subject: user.subject,
    });
    
    // 移除密码字段后返回用户信息
    const { password, ...userInfo } = user;
    return {
      token,
      user: userInfo,
    };
  }

  // 根据手机号查询用户完整信息（包含密码）
  // 主要用于内部业务逻辑中的用户验证场景
  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { phone } });
  }

  /**
   * 内部使用：通过ID查询完整用户实体（包含密码）
   * 适用于需要完整用户信息的业务场景（如任务关联时的权限校验）
   * 当用户不存在时抛出异常
   */
  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  /**
   * 外部使用：通过ID查询不含密码的用户信息
   * 用于向前端返回用户数据，避免敏感信息泄露
   */
  async findUserWithoutPassword(id: string): Promise<UserWithoutPassword> {
    const user = await this.findById(id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // 通过ID查询完整用户实体（包含密码）
  // 功能与findById一致，用于兼容不同业务场景的命名习惯
  async findFullEntityById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }
}