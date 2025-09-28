import { IsEnum, IsOptional, IsString, ValidateIf, MaxLength } from 'class-validator';

/**
 * 模型生成类型枚举（对应Tripo3D API的task.type字段）
 */
export enum ModelGenerateType {
  TEXT_TO_MODEL = 'text_to_model', // 文本生成3D模型
  IMAGE_TO_MODEL = 'image_to_model'  // 图片生成3D模型
}

/**
 * 模型生成风格枚举（仅图片生成可用）
 */
export enum GenerateStyle {
  CARTOON = 'cartoon',         // 卡通风格
  CLAY = 'clay',               // 黏土质感
  STEAMPUNK = 'steampunk',     // 蒸汽朋克
  VENOM = 'venom',             // 毒液风格
  BARBIE = 'barbie',           // 芭比风尚
  CHRISTMAS = 'christmas',     // 圣诞主题
  GOLD = 'gold',               // 金色质感
  ANCIENT_BRONZE = 'ancient_bronze'  // 古铜风格
}

/**
 * 创建模型生成任务的请求DTO
 */
export class CreateModelTaskDto {
  @IsEnum(ModelGenerateType, { 
    message: '生成类型必须是 text_to_model 或 image_to_model' 
  })
  generateType: ModelGenerateType;

  @ValidateIf((dto) => dto.generateType === ModelGenerateType.TEXT_TO_MODEL)
  @IsString({ message: '文本提示词必须是字符串' })
  @MaxLength(1024, { message: '提示词长度不能超过1024字符' })
  prompt: string;

  @ValidateIf((dto) => dto.generateType === ModelGenerateType.IMAGE_TO_MODEL)
  @IsString({ message: '图片Token必须是字符串' })
  imageToken: string;

  @ValidateIf((dto) => dto.generateType === ModelGenerateType.IMAGE_TO_MODEL)
  @IsEnum(GenerateStyle, { 
    message: '生成风格不对' 
  })
  @IsOptional()
  style?: GenerateStyle;

  @IsOptional()
  @IsString({ message: '模型版本必须是字符串' })
  modelVersion?: 'Turbo-v1.0-20250506' | 'v3.0-20250812' | 'v2.5-20250123' | 'v2.0-20240919' = 'v2.5-20250123';
}
