import { ApiProperty } from '@nestjs/swagger';
import { ModelTaskEntity } from '../entities/model-task.entity';

export class TaskListResponse {
  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;

  @ApiProperty({ description: '任务列表', type: [ModelTaskEntity] })
  list: ModelTaskEntity[];
}