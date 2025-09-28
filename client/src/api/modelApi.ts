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

/**
 * 模块二/三：3D模型生成接口集合
 * 接口路径、请求方法、参数完全对应接口文档
 */
const modelApi = {
  /**
   * 1. 上传图片（需认证，仅图片生成模型需调用）
   * @param file - 图片文件（支持webp/jpeg/png，最大10MB）
   * @returns 图片标识imageToken
   */
  uploadImage: (file: File): Promise<UploadImageResponse> => {
    // 接口文档要求：请求体为multipart/form-data格式
    const formData = new FormData();
    formData.append('file', file); // 键为file，值为图片文件

    return request({
      url: '/api/model-tasks/upload-image',
      method: 'POST',
      data: formData,
      headers: {
        // 覆盖默认的JSON格式，使用multipart/form-data（Axios会自动补全boundary）
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * 2. 创建模型生成任务（核心接口，需认证）
   * @param data - 任务请求参数（生成类型、提示词/图片token等）
   * @returns 本地任务信息（含taskId，用于后续查询进度）
   */
  createModelTask: (data: CreateModelTaskRequest): Promise<CreateModelTaskResponse> => {
    return request({
      url: '/api/model-tasks',
      method: 'POST',
      data
    });
  },

  /**
   * 3. 查询任务列表（分页，需认证）
   * @param params - 分页参数（页码、每页数量）
   * @returns 任务列表及分页信息（按创建时间倒序）
   */
  queryTaskList: (params?: QueryTaskListParams): Promise<QueryTaskListResponse> => {
    return request({
      url: '/api/model-tasks',
      method: 'GET',
      params // GET请求参数放在params中（Axios会自动拼接到URL）
    });
  },

  /**
   * 4. 查询任务详情（实时进度，需认证）
   * @param taskId - 本地任务ID（从创建任务接口获取）
   * @returns 任务最新状态、进度、结果（失败时含错误信息）
   */
  queryTaskDetail: (taskId: string): Promise<QueryTaskDetailResponse> => {
    return request({
      url: `/api/model-tasks/${taskId}`, // 路径参数：taskId
      method: 'GET'
    });
  },
   /**
   * 新增：查询用户历史模型列表（需认证）
   * @param params - 可选查询参数（页码、每页数量、生成类型筛选）
   * @returns 历史模型列表及分页信息
   */
  queryHistoryModels: (params?: QueryHistoryModelsParams): Promise<QueryHistoryModelsResponse> => {
    return request({
      url: '/api/model-tasks/history-models', // 目标接口地址
      method: 'GET',
      params // GET请求参数（Axios自动拼接到URL）
    });
  }
};

export default modelApi;