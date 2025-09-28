import request from '../utils/request';
import type {
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ProfileResponse
} from '../types/userType';

/**
 * 模块一：用户认证接口集合
 * 接口路径、请求方法、参数完全对应接口文档
 */
const userApi = {
  /**
   * 1. 注册用户（无需认证）
   * @param data - 注册请求参数（手机号、姓名、学科等）
   * @returns 注册成功后的用户信息
   */
  register: (data: RegisterRequest): Promise<RegisterResponse> => {
    return request({
      url: '/api/user/register',
      method: 'POST',
      data
    });
  },

  /**
   * 2. 用户登录（无需认证）
   * @param data - 登录请求参数（手机号、密码）
   * @returns 登录成功后的token和用户信息
   */
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return request({
      url: '/api/user/login',
      method: 'POST',
      data
    });
  },

  /**
   * 3. 获取个人信息（需认证，请求头带token）
   * @returns 当前登录用户的完整信息
   */
  getProfile: (): Promise<ProfileResponse> => {
    return request({
      url: '/api/user/profile',
      method: 'GET'
    });
  }
};

export default userApi;