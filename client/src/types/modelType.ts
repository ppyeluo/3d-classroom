/**
 * 模块二/三：3D模型生成相关类型（上传图片/创建任务/查询进度）
 * 完全对应接口文档定义的字段和格式
 */

// 1. 上传图片接口 - 响应体类型（POST /api/model-tasks/upload-image）
export interface UploadImageResponse {
  imageToken: string; // 图片标识（用于创建图片生成任务）
  message: string; // 提示信息（如“图片上传成功”）
}

// 2. 创建模型任务 - 请求体类型（POST /api/model-tasks）
export type GenerateType = 'text_to_model' | 'image_to_model'; // 生成类型枚举
export type ModelStyle = 'cartoon' | 'realistic' | 'wireframe'; // 生成风格枚举（仅图片生成可用）
export type ModelVersion = 'v2.5-20250123' | 'Turbo-v1.0-20250506'; // 模型版本枚举（默认v2.5）

export interface CreateModelTaskRequest {
  generateType: GenerateType; // 必传：生成类型
  prompt?: string; // 可选：文本提示词（仅text_to_model必传，最大1024字符）
  imageToken?: string; // 可选：图片标识（仅image_to_model必传）
  style?: ModelStyle; // 可选：生成风格（仅image_to_model可用）
  modelVersion?: ModelVersion; // 可选：模型版本（默认v2.5-20250123）
}

// 3. 创建模型任务 - 响应体类型
export type TaskStatus = 'queued' | 'running' | 'success' | 'failed'; // 任务状态枚举（接口文档定义）
export interface CreateModelTaskResponse {
  id: string; // 本地任务ID（前端需存储，用于查询详情）
  userId: string; // 所属用户ID（后端自动填充）
  type: GenerateType; // 生成类型
  tripoTaskId: string; // Tripo3D平台任务ID（后端调用返回）
  status: TaskStatus; // 初始状态：queued（排队）
  progress: number; // 进度（0-100）
  style?: ModelStyle; // 生成风格（仅图片生成有值）
  output: {
    pbr_model?: string; // Tripo3D原始模型地址（成功后有值）
    qiniu_output?: {
      pbr_model?: string; // 七牛云转存地址（成功后有值，前端优先使用）
    };
  }; // 输出结果（初始为空）
  createTime: number; // 创建时间（秒级时间戳）
  updateTime: number; // 更新时间（秒级时间戳）
}

// 4. 查询任务列表 - 请求参数类型（GET /api/model-tasks）
export interface QueryTaskListParams {
  page?: number; // 页码（从0开始，默认0）
  pageSize?: number; // 每页数量（默认10）
}

// 5. 查询任务列表 - 响应体类型
export interface QueryTaskListResponse {
  total: number; // 总任务数
  page: number; // 当前页码
  pageSize: number; // 每页数量
  list: Omit<CreateModelTaskResponse, 'userId'>[]; // 任务列表（剔除userId，前端无需展示）
}

// 6. 查询任务详情 - 响应体类型（GET /api/model-tasks/{taskId}）
export interface QueryTaskDetailResponse extends CreateModelTaskResponse {
  errorMsg?: string; // 错误信息（失败时非空，如“模型生成超时”）
}
/**
 * 新增：历史模型列表接口（GET /api/model-tasks/history-models）
 */
// 请求参数类型（可选）
export interface QueryHistoryModelsParams {
  page?: number; // 页码（默认0）
  pageSize?: number; // 每页数量（默认10）
  generateType?: GenerateType; // 生成类型筛选（text_to_model/image_to_model）
}

// 单条历史模型数据类型
export interface HistoryModelItem {
  taskId: string; // 任务ID（对应原ModelInfo的id）
  generateType: GenerateType; // 生成类型
  prompt: string | null; // 提示词（text_to_model有值，image_to_model为null）
  modelUrl: string; // 模型文件地址
  thumbnailUrl: string; // 缩略图地址
  createTime: number; // 创建时间（秒级时间戳）
}

// 接口响应类型
export interface QueryHistoryModelsResponse {
  total: number; // 总条数
  page: number; // 当前页码
  pageSize: number; // 每页数量
  list: HistoryModelItem[]; // 历史模型列表
}