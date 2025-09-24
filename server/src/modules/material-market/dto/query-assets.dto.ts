import { IsOptional, IsEnum, IsInt, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetCategory, AssetLicense } from '../entities/asset.entity';

export class QueryAssetsDto {
  @IsOptional()
  @IsString()
  search?: string; // 搜索关键词

  @IsOptional()
  @IsEnum(AssetCategory)
  category?: AssetCategory;

  @IsOptional()
  @IsEnum(AssetLicense)
  license?: AssetLicense;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Min(10)
  limit = 20;

  @IsOptional()
  @IsString()
  sort?: 'newest' | 'popular' | 'rating'; // 排序方式
}
