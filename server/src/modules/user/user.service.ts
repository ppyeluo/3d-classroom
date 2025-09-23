import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { RedisUtil } from '../../common/utils/redis.util';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private redisUtil: RedisUtil
  ) {}

  /**
   * 创建新用户
   * @param createUserDto 用户注册信息
   * @returns 新创建的用户（不含密码）
   */
  async create(createUserDto: CreateUserDto) {
    // 密码加密
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // 创建用户
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);
    // 存储到Redis缓存（30分钟）
    await this.redisUtil.set(`user:${savedUser.id}`, savedUser, { EX: 1800 });
    // 移除密码字段后返回
    const { password, ...result } = savedUser;
    return result;
  }

  /**
   * 查询所有用户
   * @returns 用户列表（不含密码）
   */
  async findAll() {
    const users = await this.usersRepository.find();
    return users.map(({ password, ...user }) => user);
  }

  /**
   * 根据ID查询用户
   * @param id 用户ID
   * @returns 用户信息（不含密码）
   */
  async findById(id: number) {
    // 先从缓存查询
    const cachedUser = await this.redisUtil.get<User>(`user:${id}`);
    if (cachedUser) {
      const { password, ...user } = cachedUser;
      return user;
    }

    // 缓存未命中，从数据库查询
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) return null;

    // 存入缓存
    await this.redisUtil.set(`user:${id}`, user, { EX: 1800 });
    // 移除密码字段后返回
    const { password, ...result } = user;
    return result;
  }

  /**
   * 根据邮箱查询用户（用于登录验证）
   * @param email 用户邮箱
   * @returns 完整用户信息（含密码，仅内部使用）
   */
  async findByEmail(email: string) {
    return this.usersRepository.findOneBy({ email });
  }
}
