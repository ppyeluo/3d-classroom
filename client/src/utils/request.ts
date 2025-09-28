import axios, { type AxiosRequestConfig, type AxiosResponse, AxiosError } from 'axios';
import { message } from 'antd'; // 假设项目使用 Ant Design，用于错误提示（可替换为其他UI库）

// 1. 创建 Axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // 从环境变量读取基础地址
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10000, // 超时时间
  headers: {
    'Content-Type': 'application/json;charset=utf-8' // 默认JSON格式请求
  }
});

// 2. 请求拦截器：添加 token（用户认证接口需要）
request.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 从 localStorage 读取登录时存储的 token（登录接口返回后存入）
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      // 按接口文档要求，token 放在 Authorization 头，格式为 Bearer {token}
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    // 请求发送前的错误（如参数格式错误）
    message.error('请求参数异常，请检查输入');
    return Promise.reject(error);
  }
);

// 3. 响应拦截器：统一处理错误状态码、提取响应数据
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 直接返回响应体（接口文档中后端返回的核心数据在 response.data 中）
    return response.data;
  },
  (error: AxiosError) => {
    // 按接口文档定义的错误状态码，针对性提示
    const status = error.response?.status;
    const errorMsg = error.response?.data?.message || '接口请求失败，请重试';

    switch (status) {
      case 400: // 参数不合法（接口文档模块一/二均定义）
        message.error(`参数错误：${errorMsg}`);
        break;
      case 401: // 未认证/Token无效/密码错误（模块一登录/个人信息、模块二创建任务）
        message.error(`认证失败：${errorMsg || '请重新登录'}`);
        // Token失效时，清除本地存储并跳转登录页（需配合路由，此处仅做清除）
        localStorage.removeItem('token');
        // window.location.href = '/login'; // 若有登录页，可添加跳转逻辑
        break;
      case 403: // 用户禁用（模块二创建任务）
        message.error(`权限不足：${errorMsg || '账号已被禁用'}`);
        break;
      case 404: // 用户不存在/任务不存在（模块一登录、模块三查询任务）
        message.error(`资源不存在：${errorMsg}`);
        break;
      case 409: // 手机号已注册（模块一注册）
        message.error(`冲突：${errorMsg || '该手机号已注册'}`);
        break;
      case 413: // 文件过大（模块二上传图片）
        message.error(`文件过大：${errorMsg || '图片大小不能超过10MB'}`);
        break;
      case 500: // 服务器错误（模块二调用Tripo3D API失败）
        message.error(`服务器错误：${errorMsg || '后端服务异常，请稍后再试'}`);
        break;
      default:
        message.error(errorMsg);
    }

    return Promise.reject(error);
  }
);

export default request;