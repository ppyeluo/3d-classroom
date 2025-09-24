import { Controller, Post, Get, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ModelTaskService } from '../services/model-task.service';
import { CreateModelTaskDto } from '../dto/create-model-task.dto';
import { QueryModelTasksDto } from '../dto/query-model-tasks.dto';
import { RequestWithUser } from '../../user/controllers/user.controller';
import { UserService } from '../../user/services/user.service';

@Controller('api/model-generate')
@UseGuards(JwtAuthGuard)
export class ModelTaskController {
  constructor(
    private readonly modelTaskService: ModelTaskService,
    private readonly userService: UserService
  ) {}

  @Post('tasks')
  async createTask(
    @Body() createDto: CreateModelTaskDto,
    @Request() req: RequestWithUser
  ) {
    // 使用新方法获取完整用户实体
    const user = await this.userService.findFullEntityById(req.user.sub);
    return this.modelTaskService.createTask(createDto, user);
  }

  @Get('tasks')
  async getUserTasks(
    @Query() queryDto: QueryModelTasksDto,
    @Request() req: RequestWithUser
  ) {
    // 使用新方法获取完整用户实体
    const user = await this.userService.findFullEntityById(req.user.sub);
    return this.modelTaskService.getUserTasks(user, queryDto);
  }

  @Get('tasks/:id')
  getTaskDetail(
    @Param('id') id: string,
    @Request() req: RequestWithUser
  ) {
    return this.modelTaskService.getTaskDetail(id, req.user.sub);
  }
}
