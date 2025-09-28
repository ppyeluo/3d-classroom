// src/modules/model-generate/dto/history-models-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ModelGenerateType } from './create-model-task.dto';

/** 单条历史模型记录 */
export class HistoryModelItem {
  @ApiProperty({ description: '任务ID' })
  taskId: string;

  @ApiProperty({ description: '生成类型（text_to_model：文本生成，image_to_model：图片生成）' })
  generateType: ModelGenerateType;

  // 关键修改：允许 prompt 为空字符串（图片生成任务无prompt，文本生成任务有prompt）
  @ApiProperty({ description: '文本提示词（文本生成任务有值，图片生成任务为空字符串）' })
  prompt: string; // 保持string类型，但实际赋值时用空字符串兜底，避免undefined

  @ApiProperty({ description: '七牛云3D模型地址（优先返回PBR模型，无则返回主模型）' })
  modelUrl: string;

  @ApiProperty({ description: '七牛云缩略图地址（模型预览图）' })
  thumbnailUrl: string;

  @ApiProperty({ description: '任务创建时间（秒级时间戳，可前端转换为日期）' })
  createTime: number;
}

/** 历史模型记录列表响应 */
export class HistoryModelsResponse {
  @ApiProperty({ description: '总记录数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;

  @ApiProperty({ description: '历史模型记录列表', type: [HistoryModelItem] })
  list: HistoryModelItem[];
}