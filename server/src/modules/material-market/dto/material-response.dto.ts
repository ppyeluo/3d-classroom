import { ApiProperty } from '@nestjs/swagger';
import { MaterialEntity } from '../entities/material.entity';
import { MaterialCategoryEntity } from '../entities/material-category.entity';

/**
 * 素材列表响应结构
 * 包含分页信息和素材列表数据
 */
export class MaterialListResponse {
  @ApiProperty({ description: '总素材数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;

  @ApiProperty({ description: '素材列表', type: [MaterialEntity] })
  // 列表项包含素材基本信息和所属分类的部分信息（ID和名称）
  list: (MaterialEntity & { category?: Pick<MaterialCategoryEntity, 'id' | 'name'> })[];
}

/**
 * 素材详情响应结构
 * 包含素材完整信息和权限判断标识
 */
export class MaterialDetailResponse {
  @ApiProperty({ description: '素材详情' })
  // 详情包含素材完整信息和所属分类的完整信息
  material: MaterialEntity & { category: MaterialCategoryEntity };

  @ApiProperty({ description: '是否为上传者本人（用于前端权限控制）' })
  isOwner: boolean;
}