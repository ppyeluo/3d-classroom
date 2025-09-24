import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  // 用户注册
  async register(createUserDto: CreateUserDto) {
    // 1. 检查手机号是否已注册
    const existingUser = await this.userRepo.findOne({ where: { phone: createUserDto.phone } });
    if (existingUser) {
      throw new ConflictException('该手机号已注册');
    }

    // 2. 密码加密（BCrypt 加盐）
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(createUserDto.password, salt);

    // 3. 保存用户信息
    const user = this.userRepo.create({
      ...createUserDto,
      password: encryptedPassword,
    });
    await this.userRepo.save(user);

    // 4. 返回用户信息（排除密码）
    const { password, ...result } = user;
    return result;
  }

  // 用户登录（生成 JWT Token）
  async login(loginUserDto: LoginUserDto) {
    // 1. 检查用户是否存在
    const user = await this.userRepo.findOne({ where: { phone: loginUserDto.phone } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 2. 检查账号是否启用
    if (!user.isEnabled) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 3. 验证密码
    const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('密码错误');
    }

    // 4. 生成 JWT Token
    const token = this.jwtService.sign({
      sub: user.id, // 用户 ID（标准 Claim）
      phone: user.phone,
      subject: user.subject,
    });

    // 5. 返回 Token 和用户信息
    const { password, ...userInfo } = user;
    return {
      token,
      user: userInfo,
    };
  }

  // 根据手机号查询用户（内部使用，如权限验证）
  async findByPhone(phone: string) {
    return this.userRepo.findOne({ where: { phone } });
  }

  // 修改返回类型，明确返回完整实体但不包含密码
  async findById(id: string): Promise<Omit<UserEntity, 'password'>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const { password, ...result } = user;
    return result;
  }
  // 新增一个方法用于获取完整用户实体（包含密码，但仅内部使用）
  async findFullEntityById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }
}