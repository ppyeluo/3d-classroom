import { Injectable, Inject } from '@nestjs/common';
import type { RedisClientType } from 'redis';

@Injectable()
export class RedisUtil {
  private readonly keyPrefix = '3d_classroom:';

  constructor(@Inject('REDIS_CLIENT') private redisClient: RedisClientType) {}

  /**
   * 设置带前缀的键值对
   * @param key 键名
   * @param value 键值
   * @param options 额外选项（如过期时间）
   */
  async set<T>(key: string, value: T, options?: any): Promise<void> {
    const prefixedKey = this.addPrefix(key);
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redisClient.set(prefixedKey, stringValue, options);
  }

  /**
   * 获取带前缀的键值
   * @param key 键名
   * @returns 键值
   */
  async get<T>(key: string): Promise<T | null> {
    const prefixedKey = this.addPrefix(key);
    const value = await this.redisClient.get(prefixedKey);
    if (!value) return null;
    // 尝试解析 JSON
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * 删除带前缀的键
   * @param key 键名
   */
  async del(key: string): Promise<void> {
    const prefixedKey = this.addPrefix(key);
    await this.redisClient.del(prefixedKey);
  }

  /**
   * 为键添加前缀
   * @param key 原始键名
   * @returns 带前缀的键名
   */
  private addPrefix(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}
