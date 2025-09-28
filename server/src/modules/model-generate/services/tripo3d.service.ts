import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as FormData from 'form-data';
import { ModelGenerateType, GenerateStyle } from '../dto/create-model-task.dto';
import { Logger } from '@nestjs/common';

// Tripo3D任务状态响应数据结构定义
export interface TripoTaskStatusResponseData {
  task_id: string;
  type: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'banned' | 'expired' | 'cancelled' | 'unknown';
  progress: number;
  input: any;
  output: {
    model?: string;
    base_model?: string;
    pbr_model?: string;
    rendered_image?: string;
  };
  create_time: number;
  message?: string; // 任务相关消息（如错误信息）
}

// Tripo3D API响应结构定义
export interface TripoTaskStatusResponse {
  code: number;
  data: TripoTaskStatusResponseData;
  message?: string; // 接口层面的消息
}

@Injectable()
export class Tripo3dService {
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(Tripo3dService.name);

  constructor(private configService: ConfigService) {
    // 从配置中获取API密钥和地址
    this.apiKey = this.configService.get<string>('TRIPO3D_API_KEY') ?? '';
    const apiUrl = this.configService.get<string>('TRIPO3D_API_URL') ?? '';
    this.baseUrl = apiUrl.replace('/task', '');

    // 检查必要配置是否存在
    if (!this.apiKey) {
      throw new InternalServerErrorException('Tripo3D API密钥未配置（TRIPO3D_API_KEY）');
    }
    if (!this.baseUrl) {
      throw new InternalServerErrorException('Tripo3D API地址未配置（TRIPO3D_API_URL）');
    }

    // 创建axios实例并配置基础信息
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    // 配置响应拦截器统一处理响应
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<TripoTaskStatusResponse>): AxiosResponse<TripoTaskStatusResponse> => 
        this.handleSuccessResponse(response),
      (error) => this.handleErrorResponse(error)
    );
  }

  // 处理成功响应（非2xx状态码会进入错误拦截器）
  private handleSuccessResponse(response: AxiosResponse<TripoTaskStatusResponse>): AxiosResponse<TripoTaskStatusResponse> {
    // 业务错误处理（接口返回非0状态码）
    if (response.data?.code !== 0) {
      const errorMessage = response.data?.message || '未知错误';
      this.logger.error(`Tripo3D API业务错误：${errorMessage}`);
      throw new InternalServerErrorException(`Tripo3D业务错误：${errorMessage}`);
    }
    return response;
  }

  // 处理请求/响应错误
  private handleErrorResponse(error: any): never {
    if (error.response) {
      // 服务器返回错误响应
      const tripoTraceId = error.response.headers['x-tripo-trace-id'] || '未知';
      const errorMessage = error.response.data?.message || '服务端异常';
      this.logger.error(
        `Tripo3D API响应错误 | 状态码: ${error.response.status} | TraceID: ${tripoTraceId} | 数据: ${JSON.stringify(error.response.data)}`
      );
      throw new InternalServerErrorException(
        `Tripo3D服务错误（TraceID: ${tripoTraceId}）：${errorMessage}`
      );
    } else if (error.request) {
      // 请求已发出但无响应
      this.logger.error('Tripo3D API请求超时或无响应');
      throw new InternalServerErrorException('Tripo3D服务请求超时，请稍后重试');
    } else {
      // 请求配置错误
      this.logger.error(`Tripo3D API请求配置错误：${error.message}`);
      throw new InternalServerErrorException('请求配置错误，请联系技术支持');
    }
  }

  /**
   * 上传图片到Tripo3D获取imageToken
   * @param buffer 图片二进制数据
   * @param mimeType 图片类型（如image/png）
   * @returns 图片令牌
   */
  async uploadImage(buffer: Buffer, mimeType: string): Promise<string> {
    this.logger.log(`上传图片到Tripo3D | 格式: ${mimeType} | 大小: ${buffer.length}B`);
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: `tripo_upload_${Date.now()}.${mimeType.split('/')[1]}`,
      contentType: mimeType,
    });

    // 调用上传接口（单独设置form-data头）
    const response = await this.axiosInstance.post<{
      code: 0;
      data: { image_token: string };
    }>('/upload/sts', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    this.logger.log(`图片上传成功 | imageToken: ${response.data.data.image_token}`);
    return response.data.data.image_token;
  }

  /**
   * 创建3D模型生成任务
   * @param generateType 生成类型（文本转模型/图片转模型）
   * @param prompt 文本描述（文本生成时必填）
   * @param imageToken 图片令牌（图片生成时必填）
   * @param style 生成风格
   * @returns 任务ID
   */
  async createGenerateTask(
    generateType: ModelGenerateType,
    prompt?: string,
    imageToken?: string,
    style?: GenerateStyle,
  ): Promise<string> {
    this.logger.log(`创建Tripo3D任务 | 类型: ${generateType} | 风格: ${style || '默认'}`);
    const requestBody: any = { type: generateType };

    // 文本生成模型参数处理
    if (generateType === ModelGenerateType.TEXT_TO_MODEL) {
      if (!prompt) {
        this.logger.error('文本生成任务缺少prompt参数');
        throw new InternalServerErrorException('文本生成模型必须提供prompt参数');
      }
      requestBody.prompt = prompt;
    }

    // 图片生成模型参数处理
    if (generateType === ModelGenerateType.IMAGE_TO_MODEL) {
      if (!imageToken) {
        this.logger.error('图片生成任务缺少imageToken参数');
        throw new InternalServerErrorException('图片生成模型必须提供imageToken参数');
      }
      requestBody.file = { type: 'image', file_token: imageToken };
      
      // 风格参数映射
      if (style) {
        const styleMap: Record<GenerateStyle, string> = {
          [GenerateStyle.CARTOON]: 'person:person2cartoon',
          [GenerateStyle.CLAY]: 'object:clay',
          [GenerateStyle.STEAMPUNK]: 'object:steampunk',
          [GenerateStyle.VENOM]: 'animal:venom',
          [GenerateStyle.BARBIE]: 'object:barbie',
          [GenerateStyle.CHRISTMAS]: 'object:christmas',
          [GenerateStyle.GOLD]: 'gold',
          [GenerateStyle.ANCIENT_BRONZE]: 'ancient_bronze'
        };
        requestBody.style = styleMap[style];
        this.logger.log(`图片生成任务设置风格 | 风格: ${requestBody.style}`);
      }
    }

    // 调用创建任务接口
    const response = await this.axiosInstance.post<{
      code: 0;
      data: { task_id: string };
    }>('/task', requestBody);

    this.logger.log(`Tripo3D任务创建成功 | taskId: ${response.data.data.task_id}`);
    return response.data.data.task_id;
  }

  /**
   * 查询任务状态
   * @param taskId 任务ID
   * @returns 任务状态详情
   */
  async getTaskStatus(taskId: string): Promise<TripoTaskStatusResponseData> {
    this.logger.log(`查询Tripo3D任务状态 | taskId: ${taskId}`);
    const response = await this.axiosInstance.get<TripoTaskStatusResponse>(`/task/${taskId}`);
    this.logger.log(`任务状态查询结果 | taskId: ${taskId} | 状态: ${response.data.data.status} | 进度: ${response.data.data.progress}%`);
    return response.data.data;
  }
}