import { PartialType } from '@nestjs/swagger';
import { CreateMaterialDto } from './create-material.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 3D素材更新参数（继承创建DTO，所有字段可选）
 */
export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {
  @ApiProperty({ description: '是否启用（true：启用，false：禁用）', required: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}