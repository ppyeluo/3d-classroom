import { IsString, MaxLength, IsNumber, Min, IsBoolean, IsOptional, IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ALLOWED_3D_FORMATS } from '../../../constants/material.constants';

/**
 * 3D素材创建参数
 */
export class CreateMaterialDto {
  @ApiProperty({ description: '素材名称' })
  @IsString()
  @IsNotEmpty({ message: '素材名称不能为空' })
  @MaxLength(100, { message: '素材名称不能超过100字符' })
  name: string;

  @ApiProperty({ description: '素材描述（可选）' })
  @IsString()
  @IsOptional()
  @MaxLength(2000, { message: '素材描述不能超过2000字符' })
  description?: string;

  // categoryId非必传时，默认使用"默认分类ID"
  @ApiProperty({ description: '所属分类ID（可选，默认：默认分类）', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  // modelFormat非必传时默认glb，且值需在允许列表内
  @ApiProperty({ 
    description: `3D模型文件格式（可选，默认：glb，支持格式：${ALLOWED_3D_FORMATS.join(', ')}）`, 
    enum: ALLOWED_3D_FORMATS,
    required: false,
    default: 'glb'
  })
  @IsString()
  @IsOptional()
  @IsIn(ALLOWED_3D_FORMATS, { message: `模型格式仅支持：${ALLOWED_3D_FORMATS.join(', ')}` })
  modelFormat?: string = 'glb';

  @ApiProperty({ description: '素材文件大小（KB，可选，后端自动计算）', required: false })
  @IsNumber()
  @Min(1, { message: '文件大小不能小于1KB' })
  @IsOptional()
  fileSize?: number;

  @ApiProperty({ description: '是否免费', default: true })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean = true;

  @ApiProperty({ description: '素材价格（元，免费时填0）', default: 0 })
  @IsNumber()
  @Min(0, { message: '价格不能为负数' })
  @IsOptional()
  price?: number = 0;

  @ApiProperty({ description: '素材标签（逗号分隔，如：动物,大象）', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '标签不能超过500字符' })
  tags?: string;
}