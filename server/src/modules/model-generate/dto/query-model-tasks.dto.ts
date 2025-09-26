import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryModelTasksDto {
  @ApiProperty({
    description: '页码，从 0 开始',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  page: number;

  @ApiProperty({
    description: '每页数量',
    default: 10,
  })
  @IsNumber()
  @Min(1)
  pageSize: number;
}