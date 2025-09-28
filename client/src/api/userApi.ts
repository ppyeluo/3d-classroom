import request from '../utils/request';
import type {
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ProfileResponse
} from '../types/userType';

// 用户相关接口集合
const userApi = {
  // 注册用户（无需认证）
  // 参数包含手机号、姓名、学科等注册信息
  // 返回注册成功后的用户基本信息
  register: (data: RegisterRequest): Promise<RegisterResponse> => {
    return request({
      url: '/api/user/register',
      method: 'POST',
      data
    });
  },

  // 用户登录（无需认证）
  // 参数为手机号和密码
  // 返回登录凭证token及用户信息
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return request({
      url: '/api/user/login',
      method: 'POST',
      data
    });
  },

  // 获取个人信息（需认证，请求头携带token）
  // 返回当前登录用户的完整信息
  getProfile: (): Promise<ProfileResponse> => {
    return request({
      url: '/api/user/profile',
      method: 'GET'
    });
  }
};

export default userApi;