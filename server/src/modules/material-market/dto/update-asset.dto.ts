import { IsOptional, IsString, MaxLength, IsEnum, ArrayMinSize, ArrayMaxSize, IsUrl, IsBoolean } from 'class-validator';
import { AssetCategory, AssetLicense } from '../entities/asset.entity';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @IsOptional()
  @IsEnum(AssetLicense)
  license?: AssetLicense;

  @IsOptional()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
