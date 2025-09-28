import request from '../utils/request';
import type {
    UploadImageResponse,
    CreateModelTaskRequest,
    CreateModelTaskResponse,
    QueryTaskListParams,
    QueryTaskListResponse,
    QueryTaskDetailResponse,
    QueryHistoryModelsParams,
    QueryHistoryModelsResponse
} from '../types/modelType';

// 3D模型生成相关接口集合
const modelApi = {
  // 上传图片（需认证，仅图片生成模型时调用）
  // 支持webp/jpeg/png格式，最大10MB
  // 返回图片标识imageToken用于后续接口调用
  uploadImage: (file: File): Promise<UploadImageResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    return request({
      url: '/api/model-tasks/upload-image',
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // 创建模型生成任务（核心接口，需认证）
  // 参数包含生成类型、提示词或图片token等信息
  // 返回本地任务信息，含taskId用于查询进度
  createModelTask: (data: CreateModelTaskRequest): Promise<CreateModelTaskResponse> => {
    return request({
      url: '/api/model-tasks',
      method: 'POST',
      data
    });
  },

  // 查询任务列表（分页，需认证）
  // 参数为页码、每页数量等分页信息
  // 返回任务列表及分页数据，按创建时间倒序排列
  queryTaskList: (params?: QueryTaskListParams): Promise<QueryTaskListResponse> => {
    return request({
      url: '/api/model-tasks',
      method: 'GET',
      params
    });
  },

  // 查询任务详情（实时进度，需认证）
  // 参数为创建任务时获取的taskId
  // 返回任务最新状态、进度、结果，失败时包含错误信息
  queryTaskDetail: (taskId: string): Promise<QueryTaskDetailResponse> => {
    return request({
      url: `/api/model-tasks/${taskId}`,
      method: 'GET'
    });
  },

  // 查询用户历史模型列表（需认证）
  // 参数可选，包含页码、每页数量、生成类型筛选条件
  // 返回历史模型列表及分页信息
  queryHistoryModels: (params?: QueryHistoryModelsParams): Promise<QueryHistoryModelsResponse> => {
    return request({
      url: '/api/model-tasks/history-models',
      method: 'GET',
      params
    });
  }
};

export default modelApi;