import { IsNumber, IsString, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 3D素材列表查询参数
 * 用于分页查询素材，支持多条件筛选和排序
 */
export class QueryMaterialsDto {
  @ApiProperty({ description: '页码（从0开始）', default: 0 })
  @IsNumber()
  @Min(0)
  page: number;

  @ApiProperty({ description: '每页数量', default: 10 })
  @IsNumber()
  @Min(1)
  pageSize: number;

  @ApiProperty({ description: '分类ID（可选，筛选指定分类下的素材）', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: '搜索关键词（匹配素材名称/描述）', required: false })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiProperty({ description: '是否免费（true：免费，false：付费，可选）', required: false })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiProperty({ description: '排序字段（createTime：创建时间，downloadCount：下载量，viewCount：浏览量）', default: 'createTime' })
  @IsString()
  @IsOptional()
  sortBy?: 'createTime' | 'downloadCount' | 'viewCount';

  @ApiProperty({ description: '排序方向（desc：降序，asc：升序）', default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: 'desc' | 'asc';
}