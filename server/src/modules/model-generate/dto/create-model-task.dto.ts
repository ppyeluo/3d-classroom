import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateModelTaskDto {
  @IsString({ message: '模型名称必须为字符串' })
  @IsNotEmpty({ message: '模型名称不能为空' })
  @Length(1, 100, { message: '模型名称长度需在1-100位之间' })
  name: string;

  @IsString({ message: '模型描述必须为字符串' })
  @IsNotEmpty({ message: '模型描述不能为空' })
  @Length(10, 500, { message: '模型描述需详细一些（10-500字）' })
  description: string;
}
