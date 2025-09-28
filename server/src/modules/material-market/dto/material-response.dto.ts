import { ApiProperty } from '@nestjs/swagger';
import { MaterialEntity } from '../entities/material.entity';
import { MaterialCategoryEntity } from '../entities/material-category.entity';

/**
 * 素材列表响应结构
 */
export class MaterialListResponse {
  @ApiProperty({ description: '总素材数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;

  @ApiProperty({ description: '素材列表', type: [MaterialEntity] })
  list: (MaterialEntity & { category?: Pick<MaterialCategoryEntity, 'id' | 'name'> })[];
}

/**
 * 素材详情响应结构（补充分类完整信息）
 */
export class MaterialDetailResponse {
  @ApiProperty({ description: '素材详情' })
  material: MaterialEntity & { category: MaterialCategoryEntity };

  @ApiProperty({ description: '是否为上传者本人（用于前端权限控制）' })
  isOwner: boolean;
}