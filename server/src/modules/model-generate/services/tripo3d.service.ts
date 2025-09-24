import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class Tripo3dService {
  private apiKey: string;
  private apiUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('TRIPO3D_API_KEY');
    const apiUrl = this.configService.get<string>('TRIPO3D_API_URL');
    
    if (!apiKey || !apiUrl) {
      throw new Error('Tripo3D API配置不完整，请检查.env文件');
    }
    
    // 现在可以安全地赋值，因为已经检查过不为空
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * 提交3D模型生成任务
   * @param prompt 生成提示词
   * @returns 任务ID
   */
  async createModelTask(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          prompt,
          output_format: 'glb', // 请求GLB格式的3D模型
          quality: 'medium'    // 中等质量，平衡速度和效果
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      if (!response.data?.task_id) {
        throw new Error('Tripo3D API返回格式不正确，未找到task_id');
      }

      return response.data.task_id;
    } catch (error) {
      // 增强错误信息
      let errorMessage = 'Tripo3D API调用失败';
      
      if (error.response) {
        // 服务器返回了错误响应
        errorMessage += `: ${error.response.status} ${error.response.statusText}`;
        
        // 401错误特别处理
        if (error.response.status === 401) {
          errorMessage += ' - 可能是API密钥无效或已过期';
        }
        
        // 附加API返回的错误详情
        if (error.response.data?.message) {
          errorMessage += `, 详情: ${error.response.data.message}`;
        }
      } else if (error.request) {
        // 没有收到响应
        errorMessage += ': 未收到API响应';
      } else {
        // 请求配置错误
        errorMessage += `: ${error.message}`;
      }
      
      console.error(errorMessage, error);
      
      throw new HttpException(
        `模型生成请求失败: ${errorMessage}`,
        error.response?.status || HttpStatus.BAD_GATEWAY
      );
    }
  }

  /**
   * 查询任务状态
   * @param taskId Tripo3D任务ID
   * @returns 任务状态及结果
   */
  async getTaskStatus(taskId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('查询Tripo3D任务状态失败:', error.message);
      throw new HttpException(
        `查询任务状态失败: ${error.message}`,
        HttpStatus.BAD_GATEWAY
      );
    }
  }
}
