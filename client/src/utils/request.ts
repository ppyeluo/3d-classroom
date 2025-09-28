import axios, { type AxiosRequestConfig, type AxiosResponse, AxiosError } from 'axios';
import { message } from 'antd';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8' // 默认JSON格式请求
  }
});

// 请求拦截器：添加 token（用户认证接口需要）
request.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 从 localStorage 读取登录时存储的 token
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      // token 放在 Authorization 头，格式为 Bearer {token}
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    message.error('请求参数异常，请检查输入');
    return Promise.reject(error);
  }
);

// 响应拦截器：统一处理错误状态码、提取响应数据
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 直接返回响应体
    return response.data;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const errorMsg = error.response?.data?.message || '接口请求失败，请重试';

    switch (status) {
      case 400:
        message.error(`参数错误：${errorMsg}`);
        break;
      case 401: // 未认证/Token无效/密码错误
        message.error(`认证失败：${errorMsg || '请重新登录'}`);
        // Token失效时，清除本地存储并跳转登录页
        localStorage.removeItem('token');
        // window.location.href = '/login';
        break;
      case 403:
        message.error(`权限不足：${errorMsg || '账号已被禁用'}`);
        break;
      case 404:
        message.error(`资源不存在：${errorMsg}`);
        break;
      case 409:
        message.error(`冲突：${errorMsg || '该手机号已注册'}`);
        break;
      case 413:
        message.error(`文件过大：${errorMsg || '图片大小不能超过10MB'}`);
        break;
      case 500:
        message.error(`服务器错误：${errorMsg || '后端服务异常，请稍后再试'}`);
        break;
      default:
        message.error(errorMsg);
    }

    return Promise.reject(error);
  }
);

export default request;