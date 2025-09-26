import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as FormData from 'form-data';
import { ModelGenerateType, GenerateStyle } from '../dto/create-model-task.dto';
import { Logger } from '@nestjs/common';

// 修复：完善响应类型定义
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
  message?: string; // 新增message字段定义
}

export interface TripoTaskStatusResponse {
  code: number;
  data: TripoTaskStatusResponseData;
  message?: string; // 新增顶层message字段定义
}

@Injectable()
export class Tripo3dService {
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(Tripo3dService.name);

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TRIPO3D_API_KEY') ?? '';
    const apiUrl = this.configService.get<string>('TRIPO3D_API_URL') ?? '';
    this.baseUrl = apiUrl.replace('/task', '');

    if (!this.apiKey) {
      throw new InternalServerErrorException('Tripo3D API密钥未配置（TRIPO3D_API_KEY）');
    }
    if (!this.baseUrl) {
      throw new InternalServerErrorException('Tripo3D API地址未配置（TRIPO3D_API_URL）');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    // 修复：确保拦截器返回正确的AxiosResponse类型
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<TripoTaskStatusResponse>): AxiosResponse<TripoTaskStatusResponse> => 
        this.handleSuccessResponse(response),
      (error) => this.handleErrorResponse(error)
    );
  }

  // 修复：确保返回AxiosResponse类型
  private handleSuccessResponse(response: AxiosResponse<TripoTaskStatusResponse>): AxiosResponse<TripoTaskStatusResponse> {
    if (response.data?.code !== 0) {
      // 修复：正确访问message属性
      const errorMessage = response.data?.message || '未知错误';
      this.logger.error(`Tripo3D API业务错误：${errorMessage}`);
      throw new InternalServerErrorException(`Tripo3D业务错误：${errorMessage}`);
    }
    return response;
  }

  private handleErrorResponse(error: any): never {
    if (error.response) {
      const tripoTraceId = error.response.headers['x-tripo-trace-id'] || '未知';
      // 修复：正确处理错误响应中的message
      const errorMessage = error.response.data?.message || '服务端异常';
      this.logger.error(
        `Tripo3D API响应错误 | 状态码: ${error.response.status} | TraceID: ${tripoTraceId} | 数据: ${JSON.stringify(error.response.data)}`
      );
      throw new InternalServerErrorException(
        `Tripo3D服务错误（TraceID: ${tripoTraceId}）：${errorMessage}`
      );
    } else if (error.request) {
      this.logger.error('Tripo3D API请求超时或无响应');
      throw new InternalServerErrorException('Tripo3D服务请求超时，请稍后重试');
    } else {
      this.logger.error(`Tripo3D API请求配置错误：${error.message}`);
      throw new InternalServerErrorException('请求配置错误，请联系技术支持');
    }
  }

  async uploadImage(buffer: Buffer, mimeType: string): Promise<string> {
    this.logger.log(`上传图片到Tripo3D | 格式: ${mimeType} | 大小: ${buffer.length}B`);
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: `tripo_upload_${Date.now()}.${mimeType.split('/')[1]}`,
      contentType: mimeType,
    });

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

  async createGenerateTask(
    generateType: ModelGenerateType,
    prompt?: string,
    imageToken?: string,
    style?: GenerateStyle,
  ): Promise<string> {
    this.logger.log(`创建Tripo3D任务 | 类型: ${generateType} | 风格: ${style || '默认'}`);
    const requestBody: any = { type: generateType };

    if (generateType === ModelGenerateType.TEXT_TO_MODEL) {
      if (!prompt) {
        this.logger.error('文本生成任务缺少prompt参数');
        throw new InternalServerErrorException('文本生成模型必须提供prompt参数');
      }
      requestBody.prompt = prompt;
    }

    if (generateType === ModelGenerateType.IMAGE_TO_MODEL) {
      if (!imageToken) {
        this.logger.error('图片生成任务缺少imageToken参数');
        throw new InternalServerErrorException('图片生成模型必须提供imageToken参数');
      }
      requestBody.file = { type: 'image', file_token: imageToken };
      if (style) {
        const styleMap: Record<GenerateStyle, string> = {
          [GenerateStyle.CARTOON]: 'person:person2cartoon',
          [GenerateStyle.REALISTIC]: 'object:realistic',
          [GenerateStyle.WIREFRAME]: 'object:wireframe',
        };
        requestBody.style = styleMap[style];
        this.logger.log(`图片生成任务设置风格 | 风格: ${requestBody.style}`);
      }
    }

    const response = await this.axiosInstance.post<{
      code: 0;
      data: { task_id: string };
    }>('/task', requestBody);

    this.logger.log(`Tripo3D任务创建成功 | taskId: ${response.data.data.task_id}`);
    return response.data.data.task_id;
  }

  // 修复：明确返回类型
  async getTaskStatus(taskId: string): Promise<TripoTaskStatusResponseData> {
    this.logger.log(`查询Tripo3D任务状态 | taskId: ${taskId}`);
    const response = await this.axiosInstance.get<TripoTaskStatusResponse>(`/task/${taskId}`);
    this.logger.log(`任务状态查询结果 | taskId: ${taskId} | 状态: ${response.data.data.status} | 进度: ${response.data.data.progress}%`);
    return response.data.data;
  }
}
    