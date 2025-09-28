import { IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryHistoryModelsDto {
  @ApiProperty({ description: '页码（从0开始）', default: 0 })
  @IsNumber()
  @Min(0)
  page: number = 0;

  @ApiProperty({ description: '每页数量', default: 10 })
  @IsNumber()
  @Min(1)
  pageSize: number = 10;

  @ApiProperty({ description: '生成类型筛选（可选：text_to_model/image_to_model）', required: false })
  @IsOptional()
  generateType?: 'text_to_model' | 'image_to_model';
}