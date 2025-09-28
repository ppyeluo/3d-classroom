import { Controller, Get, Post, Put, Query, Param, Body, UseGuards, Request, BadRequestException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MaterialService } from '../services/material.service';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { QueryMaterialsDto } from '../dto/query-materials.dto';
import { MaterialListResponse, MaterialDetailResponse } from '../dto/material-response.dto';
import { MaterialEntity } from '../entities/material.entity';
import { MaterialCategoryEntity } from '../entities/material-category.entity';
import { ALLOWED_3D_FORMATS } from '../../../constants/material.constants';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';


// 扩展Request类型，添加用户信息字段
interface RequestWithUser extends FastifyRequest {
  user: { id: string };
}

@ApiTags('素材市场管理')
@Controller('material-market')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  /**
   * 上传3D素材
   * 处理包含模型文件和缩略图的 multipart/form-data 格式请求
   * 需要用户登录认证
   */
  @Post('materials')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建3D素材（前端传模型文件，后端生成缩略图地址存储）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: `模型文件支持格式：${ALLOWED_3D_FORMATS.join(', ')}`,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '素材名称' },
        description: { type: 'string', description: '素材描述（可选）' },
        categoryId: { type: 'string', description: '所属分类ID（可选）' },
        modelFormat: { type: 'string', enum: ALLOWED_3D_FORMATS, description: '模型格式（可选，默认glb）' },
        fileSize: { type: 'number', description: '文件大小（KB，可选）' },
        isFree: { type: 'boolean', default: true, description: '是否免费' },
        price: { type: 'number', default: 0, description: '价格（元）' },
        tags: { type: 'string', description: '标签（逗号分隔）' },
        modelFile: { type: 'string', format: 'binary', description: '3D模型文件' },
      },
      required: ['name', 'modelFile'],
    },
  })
  @ApiResponse({ status: 201, description: '素材创建成功', type: CreateMaterialDto })
  async createMaterial(
    @Req() req: RequestWithUser,
  ) {
    // 验证请求格式是否为 multipart/form-data
    if (!req.isMultipart()) {
      throw new BadRequestException('请求必须是 multipart/form-data 格式（用于文件上传）');
    }

    // 获取并验证模型文件
    const modelFile = await this.getFile(req, 'modelFile', ALLOWED_3D_FORMATS);
    if (!modelFile) {
      throw new BadRequestException('未找到有效3D模型文件');
    }

    // 读取文件缓冲区
    const modelBuffer = await modelFile.toBuffer();

    // 从请求中获取各个表单字段
    const name = await this.getField(req, 'name') || '';
    const description = await this.getField(req, 'description');
    const categoryId = await this.getField(req, 'categoryId');
    const modelFormat = await this.getField(req, 'modelFormat') || 'glb';
    const fileSize = (await this.getField(req, 'fileSize')) ? Number(await this.getField(req, 'fileSize')) : undefined;
    const isFree = (await this.getField(req, 'isFree')) === 'true';
    const price = (await this.getField(req, 'price')) ? Number(await this.getField(req, 'price')) : 0;
    const tags = await this.getField(req, 'tags');

    // 组装创建素材的DTO
    const createDto: CreateMaterialDto = {
      name,
      description,
      categoryId,
      modelFormat,
      fileSize,
      isFree,
      price,
      tags,
    };

    // 调用服务层方法创建素材
    return this.materialService.createMaterial(
      req.user.id,
      createDto,
      modelBuffer
    );
  }

  /**
   * 从请求中获取指定字段的文件
   * @param req 请求对象
   * @param fieldName 字段名
   * @param allowedMimeTypes 允许的MIME类型列表
   * @returns 符合条件的文件或null
   */
  private async getFile(
    req: FastifyRequest,
    fieldName: string,
    allowedMimeTypes: string[]
  ): Promise<MultipartFile | null> {
    const file = await req.file({ name: fieldName } as any) as MultipartFile;
    // if (file && allowedMimeTypes.includes(file.mimetype)) {
      return file;
    // }
    // return null;
  }

  /**
   * 从请求中获取指定的表单字段值
   * @param req 请求对象
   * @param fieldName 字段名
   * @returns 字段值或undefined
   */
  private async getField(
    req: FastifyRequest,
    fieldName: string,
  ): Promise<string | undefined> {
    for await (const part of req.parts()) {
      if (part.type === 'field' && part.fieldname === fieldName) {
        return part.value as string;
      }
    }
    return undefined;
  }

  /**
   * 查询素材列表
   * 公开接口，支持分页、筛选和排序
   */
  @Get('materials')
  @ApiOperation({ summary: '查询3D素材列表（公开接口，无需登录）' })
  @ApiQuery({ type: QueryMaterialsDto })
  @ApiResponse({ status: 200, description: '素材列表查询成功', type: MaterialListResponse })
  async getMaterialList(@Query() queryDto: QueryMaterialsDto) {
    return this.materialService.getMaterialList(queryDto);
  }

  /**
   * 查询素材详情
   * 公开接口，根据素材ID获取详情，包含权限判断
   */
  @Get('materials/:materialId')
  @ApiOperation({ summary: '查询素材详情（公开接口，无需登录）' })
  @ApiParam({ name: 'materialId', description: '素材ID' })
  @ApiResponse({ status: 200, description: '素材详情查询成功', type: MaterialDetailResponse })
  async getMaterialDetail(
    @Param('materialId') materialId: string,
    @Request() req: RequestWithUser,
  ) {
    // 未登录用户userId为空字符串
    const userId = req.user?.id || '';
    return this.materialService.getMaterialDetail(materialId, userId);
  }

  /**
   * 更新素材信息
   * 需要用户登录，且仅上传者可操作
   */
  @Put('materials/:materialId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新素材信息（仅上传者可操作）' })
  @ApiParam({ name: 'materialId', description: '素材ID' })
  @ApiBody({ type: UpdateMaterialDto })
  @ApiResponse({ status: 200, description: '素材更新成功', type: MaterialEntity })
  async updateMaterial(
    @Param('materialId') materialId: string,
    @Request() req: RequestWithUser,
    @Body() updateDto: UpdateMaterialDto,
  ) {
    return this.materialService.updateMaterial(materialId, req.user.id, updateDto);
  }

  /**
   * 下载素材
   * 公开接口，获取模型文件的下载URL
   */
  @Get('materials/:materialId/download')
  @ApiOperation({ summary: '下载3D素材（公开接口，无需登录）' })
  @ApiParam({ name: 'materialId', description: '素材ID' })
  @ApiResponse({ 
    status: 200, 
    description: '下载地址获取成功', 
    schema: { type: 'object', properties: { modelUrl: { type: 'string' } } } 
  })
  async downloadMaterial(@Param('materialId') materialId: string) {
    return this.materialService.downloadMaterial(materialId);
  }

  /**
   * 获取所有启用的素材分类
   * 公开接口，用于前端展示可用分类
   */
  @Get('categories')
  @ApiOperation({ summary: '获取启用的素材分类（公开接口，无需登录）' })
  @ApiResponse({ status: 200, description: '分类列表获取成功', type: [MaterialCategoryEntity] })
  async getEnabledCategories() {
    return this.materialService.getEnabledCategories();
  }
}