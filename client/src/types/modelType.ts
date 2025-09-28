
export interface UploadImageResponse {
  imageToken: string;
  message: string;
}

export type GenerateType = 'text_to_model' | 'image_to_model';
export type ModelStyle = 'cartoon' | 'realistic' | 'wireframe';
export type ModelVersion = 'v2.5-20250123' | 'Turbo-v1.0-20250506';

export interface CreateModelTaskRequest {
  generateType: GenerateType;
  prompt?: string;
  imageToken?: string;
  style?: ModelStyle;
  modelVersion?: ModelVersion; // 可选：模型版本（默认v2.5-20250123）
}

export type TaskStatus = 'queued' | 'running' | 'success' | 'failed';
export interface CreateModelTaskResponse {
  id: string;
  userId: string;
  type: GenerateType;
  tripoTaskId: string; // Tripo3D平台任务ID
  status: TaskStatus; // 初始状态：queued（排队）
  progress: number; // 进度（0-100）
  style?: ModelStyle; // 生成风格
  output: {
    pbr_model?: string; // Tripo3D原始模型地址
    qiniu_output?: {
      pbr_model?: string; // 七牛云转存地址
    };
  };
  createTime: number;
  updateTime: number;
}

export interface QueryTaskListParams {
  page?: number;
  pageSize?: number;
}

export interface QueryTaskListResponse {
  total: number;
  page: number;
  pageSize: number;
  list: Omit<CreateModelTaskResponse, 'userId'>[];
}

export interface QueryTaskDetailResponse extends CreateModelTaskResponse {
  errorMsg?: string;
}

export interface QueryHistoryModelsParams {
  page?: number;
  pageSize?: number;
  generateType?: GenerateType;
}

export interface HistoryModelItem {
  taskId: string;
  generateType: GenerateType;
  prompt: string | null;
  modelUrl: string;
  thumbnailUrl: string;
  createTime: number;
}

export interface QueryHistoryModelsResponse {
  total: number;
  page: number;
  pageSize: number;
  list: HistoryModelItem[];
}