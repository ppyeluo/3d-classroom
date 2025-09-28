/**
 * 模块一：用户认证相关类型（注册/登录/个人信息）
 * 完全对应接口文档定义的字段和格式
 */

// 1. 注册接口 - 请求体类型（POST /api/user/register）
export interface RegisterRequest {
  phone: string; // 手机号（中国大陆格式）
  name: string; // 姓名（非空）
  subject: string; // 学科（如“数学”“物理”，非空）
  grade: string; // 学段（如“初中”“高中”，非空）
  password: string; // 密码（6-20位）
}

// 2. 注册接口 - 响应体类型
export interface RegisterResponse {
  id: string; // 用户唯一ID（UUID）
  phone: string; // 手机号
  name: string; // 姓名
  subject: string; // 学科
  grade: string; // 学段
  isEnabled: boolean; // 账号是否启用
  createTime: number; // 创建时间（秒级时间戳）
}

// 3. 登录接口 - 请求体类型（POST /api/user/login）
export interface LoginRequest {
  phone: string; // 手机号（中国大陆格式）
  password: string; // 密码（6-20位）
}

// 4. 登录接口 - 响应体类型（含token和用户信息）
export interface LoginResponse {
  token: string; // JWT令牌（有效期7天）
  user: {
    id: string;
    phone: string;
    name: string;
    subject: string;
    grade: string;
    isEnabled: boolean;
    createTime: number;
  };
}

// 5. 个人信息接口 - 响应体类型（GET /api/user/profile）
export type ProfileResponse = LoginResponse['user']; // 与登录返回的user结构一致