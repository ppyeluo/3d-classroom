import userApi from './userApi';
import modelApi from './modelApi';

// 导出所有接口模块（组件中通过 api.user.xxx / api.model.xxx 调用）
const api = {
  user: userApi,
  model: modelApi
};

export default api;