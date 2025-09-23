import axios from 'axios';
import { message } from 'antd';

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // 后端接口基础地址（环境变量配置）
  timeout: 30000, // 超时时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 可添加token等请求头（登录后从localStorage获取）
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    message.error('请求参数错误');
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, message: resMsg, data } = response.data;
    // 假设后端统一返回格式：{ code: number, message: string, data: any }
    if (code === 200) {
      return data;
    } else {
      message.error(resMsg || '请求失败');
      return Promise.reject(new Error(resMsg || '请求失败'));
    }
  },
  (error) => {
    message.error('网络错误，请稍后重试');
    return Promise.reject(error);
  }
);

export default request;