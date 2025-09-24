import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ModelTaskStatus } from '../entities/model-task.entity';

export class QueryModelTasksDto {
  @IsOptional()
  @IsEnum(ModelTaskStatus, { message: '状态值不正确' })
  status?: ModelTaskStatus;

  @IsOptional()
  @Type(() => Number) // 确保转换为数字
  @IsInt({ message: '页码必须为整数' })
  @Min(1, { message: '页码最小为1' })
  page = 1;

  @IsOptional()
  @Type(() => Number) // 确保转换为数字
  @IsInt({ message: '每页条数必须为整数' })
  @Min(1, { message: '每页条数最小为1' })
  limit = 10;
}
