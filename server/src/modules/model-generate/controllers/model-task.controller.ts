import { Controller, Post, Get, Param, Body, UseGuards, Request, Query, UploadedFile, UseInterceptors, BadRequestException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ModelTaskService } from '../services/model-task.service';
import { CreateModelTaskDto } from '../dto/create-model-task.dto';
import { ModelTaskEntity } from '../entities/model-task.entity';
import { FastifyRequest } from 'fastify';
import { QueryModelTasksDto } from '../dto/query-model-tasks.dto';
import { TaskListResponse } from '../dto/task-list-response.dto';
import { UploadImageDto, ALLOWED_IMAGE_MIME_TYPES } from '../dto/upload-image.dto';
import { QueryHistoryModelsDto } from '../dto/query-history-models.dto';
import { HistoryModelsResponse } from '../dto/history-models-response.dto';

@ApiTags('模型任务管理')
@Controller('model-tasks')
@UseGuards(JwtAuthGuard)
export class ModelTaskController {
  constructor(private readonly modelTaskService: ModelTaskService) {}

  @Post()
  @ApiOperation({ summary: '创建模型任务' })
  @ApiResponse({ status: 201, description: '任务创建成功', type: ModelTaskEntity })
  async createTask(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Body() createDto: CreateModelTaskDto,
  ) {
    return this.modelTaskService.createTask(req.user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: '查询用户模型任务列表' })
  @ApiResponse({ status: 200, description: '任务列表查询成功', type: TaskListResponse })
  async getUserTasks(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Query() queryDto: QueryModelTasksDto,
  ) {
    return this.modelTaskService.getUserTasks(req.user.id, queryDto);
  }

  @Get(':taskId')
  @ApiOperation({ summary: '查询模型任务详情' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '任务详情查询成功', type: ModelTaskEntity })
  async getTaskDetail(
    @Request() req: FastifyRequest & { user: { id: string } },
    @Param('taskId') taskId: string,
  ) {
    return this.modelTaskService.getTaskDetail(req.user.id, taskId);
  }

  @Post('upload-image')
  @ApiOperation({ summary: '上传图片获取imageToken', description: '用于图片生成3D模型的前置步骤' })
  @ApiBody({
    description: `支持的图片格式：${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
    type: UploadImageDto,
  })
  @ApiResponse({ status: 200, description: '上传成功，返回imageToken', schema: {
    type: 'object',
    properties: {
      imageToken: { type: 'string', description: 'Tripo3D图片标识，有效期与任务绑定' },
      message: { type: 'string', example: '图片上传成功' },
    },
  }})
  @ApiResponse({ status: 400, description: '图片格式错误' })
  async uploadImage(
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    // 检查是否是文件上传请求
    if (!req.isMultipart()) {
      throw new BadRequestException('请求不是multipart格式');
    }

    const data = await req.file();
    
    if (!data) {
      throw new BadRequestException('未找到上传的文件');
    }

    // 验证文件类型
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(data.mimetype as any)) {
      throw new BadRequestException(`不支持的文件类型。支持的类型：${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`);
    }

    // 读取文件内容
    const buffer = await data.toBuffer();
    
    // 创建兼容 Multer 的文件对象
    const file: Express.Multer.File = {
      fieldname: data.fieldname,
      originalname: data.filename,
      encoding: '7bit',
      mimetype: data.mimetype,
      buffer: buffer,
      size: buffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    const imageToken = await this.modelTaskService.uploadImageToTripo(file);
    
    return {
      imageToken,
      message: '图片上传成功，可用于创建图片生成模型任务',
    };
  }
   @Get('history-models')
  @ApiOperation({ summary: '查询用户历史生成模型记录（含七牛云3D模型地址与缩略图）' })
  @ApiQuery({ type: QueryHistoryModelsDto })
  @ApiResponse({ status: 200, description: '历史记录查询成功', type: HistoryModelsResponse })
  async getUserHistoryModels(
    @Request() req: FastifyRequest & { user: { id: string } }, // 从JWT提取用户ID
    @Query() queryDto: QueryHistoryModelsDto,
  ) {
    return this.modelTaskService.getUserHistoryModels(req.user.id, queryDto);
  }
}
