import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MaterialEntity } from '../entities/material.entity';
import { MaterialCategoryEntity } from '../entities/material-category.entity';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { QueryMaterialsDto } from '../dto/query-materials.dto';
import { MaterialListResponse, MaterialDetailResponse } from '../dto/material-response.dto';
import { QiniuUtil } from '../../../utils/qiniu.util';
import { UserService } from '../../user/services/user.service';
import { DEFAULT_CATEGORY_ID } from 'src/constants/material.constants';

// 七牛云素材存储路径前缀，规范文件存储结构
const QINIU_MATERIAL_PREFIX = 'material-market/';
// 缩略图尺寸--前端预览
const THUMBNAIL_SIZE = '200x200';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    @InjectRepository(MaterialEntity)
    private materialRepo: Repository<MaterialEntity>,
    @InjectRepository(MaterialCategoryEntity)
    private categoryRepo: Repository<MaterialCategoryEntity>,
    private qiniuUtil: QiniuUtil,
    private userService: UserService,
  ) {}

  /**
   * 上传素材文件到七牛云（支持模型文件和缩略图）
   * @param file 上传文件缓冲区
   * @param fileType 文件类型（model：模型文件，thumbnail：缩略图）
   * @param uploaderId 上传者ID
   * @param modelFormat 模型文件格式（仅model类型需要）
   */
  async uploadFileToQiniu(
    file: Buffer,
    fileType: 'model' | 'thumbnail',
    uploaderId: string,
    modelFormat?: string,
  ): Promise<string> {
    try {
      // 生成唯一文件名避免冲突，根据文件类型拼接后缀
      const fileName = `${uuidv4()}.${fileType === 'model' ? modelFormat : 'png'}`;
      // 构建七牛云存储路径，按用户和文件类型分类存储
      const qiniuKey = `${QINIU_MATERIAL_PREFIX}${uploaderId}/${fileType}/${fileName}`;

      // 上传文件到七牛云，这里通过base64处理缓冲区文件
      const qiniuUrl = await this.qiniuUtil.uploadModelFromTripo(
        `data:${fileType === 'model' ? 'model/gltf-binary' : 'image/png'};base64,${file.toString('base64')}`,
        qiniuKey,
      );

      // 缩略图添加尺寸处理参数（七牛云图片处理能力）
      if (fileType === 'thumbnail') {
        return `${qiniuUrl}?imageMogr2/thumbnail/${THUMBNAIL_SIZE}`;
      }

      this.logger.log(`[${fileType}]文件上传七牛云成功 | uploaderId: ${uploaderId} | url: ${qiniuUrl}`);
      return qiniuUrl;
    } catch (error) {
      this.logger.error(`[${fileType}]文件上传七牛云失败 | uploaderId: ${uploaderId}`, error.stack);
      throw new InternalServerErrorException(`文件上传失败：${error.message}`);
    }
  }

  /**
   * 创建3D素材（含文件上传）
   * @param uploaderId 上传者ID
   * @param createDto 素材基本信息
   * @param modelFile 3D模型文件缓冲区
   */
 async createMaterial(
        uploaderId: string,
        createDto: CreateMaterialDto,
        modelFile: Buffer
    ): Promise<MaterialEntity> {
        // 处理分类ID，为空时使用默认分类
        const targetCategoryId = createDto.categoryId || DEFAULT_CATEGORY_ID;

        // 校验分类有效性（必须存在且启用）
        const category = await this.categoryRepo.findOne({
            where: { id: targetCategoryId, isEnabled: true },
        });
        if (!category) {
            throw new NotFoundException(`素材分类不存在或已禁用（分类ID：${targetCategoryId}）`);
        }

        // 计算文件大小（KB），优先使用DTO传入值，否则自动计算
        const targetFileSize = createDto.fileSize || Math.ceil(modelFile.length / 1024);

        // 模型格式使用DTO中定义的默认值（glb）
        const targetModelFormat = createDto.modelFormat;

        // 校验上传者是否存在
        await this.userService.findById(uploaderId);

        // 上传模型文件到七牛云
        const modelUrl = await this.uploadFileToQiniu(modelFile, 'model', uploaderId, targetModelFormat);

        // 根据模型文件URL生成对应的缩略图URL
        const thumbnailUrl = this.generateThumbnailUrl(modelUrl);

        // 构建素材实体并保存
        const material = this.materialRepo.create({
           ...createDto,
            id: uuidv4(),
            uploaderId,
            modelUrl,
            thumbnailUrl,
            categoryId: targetCategoryId,
            modelFormat: targetModelFormat,
            fileSize: targetFileSize,
            downloadCount: 0,
            viewCount: 0,
            isEnabled: true,
            createTime: Math.floor(Date.now() / 1000),
            updateTime: Math.floor(Date.now() / 1000),
        });

        try {
            const savedMaterial = await this.materialRepo.save(material);
            this.logger.log(`素材创建成功 | materialId: ${savedMaterial.id} | uploaderId: ${uploaderId}`);
            return savedMaterial;
        } catch (error) {
            this.logger.error(`素材创建失败 | uploaderId: ${uploaderId}`, error.stack);
            throw new InternalServerErrorException(`素材创建失败：${error.message}`);
        }
    }

    /**
     * 根据模型文件URL生成缩略图URL
     * 规则：去除模型文件后缀，添加.png作为缩略图后缀
     */
    private generateThumbnailUrl(modelUrl: string): string {
        const baseFileName = modelUrl.split('.').slice(0, -1).join('.');
        return `${baseFileName}.png`;
    }

  /**
   * 查询素材列表（支持分页、筛选、排序）
   */
  async getMaterialList(queryDto: QueryMaterialsDto): Promise<MaterialListResponse> {
    const { page, pageSize, categoryId, keyword, isFree, sortBy = 'createTime', sortOrder = 'desc' } = queryDto;
    const skip = page * pageSize;

    // 构建查询构建器，关联分类表并筛选启用状态的素材
    const queryBuilder: SelectQueryBuilder<MaterialEntity> = this.materialRepo.createQueryBuilder('material')
        .leftJoinAndSelect('material.category', 'category', 'category.isEnabled = true')
        .where('material.isEnabled = true');

    // 按分类筛选
    if (categoryId) {
      queryBuilder.andWhere('material.categoryId = :categoryId', { categoryId });
    }

    // 关键词搜索（匹配名称或描述）
    if (keyword) {
      queryBuilder.andWhere(
        '(material.name LIKE :keyword OR material.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 按免费/付费筛选
    if (isFree !== undefined) {
      queryBuilder.andWhere('material.isFree = :isFree', { isFree });
    }

    // 设置排序方式
    queryBuilder.orderBy(`material.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // 执行分页查询，只返回需要的字段减少数据传输
    const [list, total] = await queryBuilder
      .select([
        'material.id',
        'material.name',
        'material.description',
        'material.thumbnailUrl',
        'material.modelFormat',
        'material.fileSize',
        'material.isFree',
        'material.price',
        'material.tags',
        'material.downloadCount',
        'material.viewCount',
        'material.createTime',
        'category.id',
        'category.name',
      ])
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    this.logger.log(`素材列表查询成功 | 条件: ${JSON.stringify(queryDto)} | 总数: ${total}`);
    return { total, page, pageSize, list };
  }

  /**
   * 查询素材详情（含分类信息）
   * @param materialId 素材ID
   * @param userId 当前登录用户ID（用于判断是否为上传者）
   */
  async getMaterialDetail(materialId: string, userId: string): Promise<MaterialDetailResponse> {
    // 查询素材详情并关联分类信息
    const material = await this.materialRepo.findOne({
      where: { id: materialId, isEnabled: true },
      relations: ['category'],
    });
    if (!material) {
      throw new NotFoundException('素材不存在或已禁用');
    }

    // 异步更新浏览量，不阻塞当前请求
    this.materialRepo
      .createQueryBuilder()
      .update(MaterialEntity)
      .set({ viewCount: () => 'viewCount + 1' })
      .where('id = :materialId', { materialId })
      .execute()
      .catch((error) => this.logger.error(`素材浏览量更新失败 | materialId: ${materialId}`, error.stack));

    // 判断当前用户是否为素材上传者
    const isOwner = material.uploaderId === userId;

    this.logger.log(`素材详情查询成功 | materialId: ${materialId} | userId: ${userId}`);
    return { material, isOwner };
  }

  /**
   * 更新素材信息（仅上传者可操作）
   * @param materialId 素材ID
   * @param userId 当前登录用户ID
   * @param updateDto 更新参数
   */
  async updateMaterial(
    materialId: string,
    userId: string,
    updateDto: UpdateMaterialDto,
  ): Promise<MaterialEntity> {
    // 检查素材是否存在
    const material = await this.materialRepo.findOne({ where: { id: materialId } });
    if (!material) {
      throw new NotFoundException('素材不存在');
    }

    // 权限校验：只有上传者能更新
    if (material.uploaderId !== userId) {
      throw new ForbiddenException('无权限更新该素材');
    }

    // 若更新分类，需校验目标分类有效性
    if (updateDto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: updateDto.categoryId, isEnabled: true },
      });
      if (!category) {
        throw new NotFoundException('目标分类不存在或已禁用');
      }
    }

    // 合并更新数据并设置更新时间
    const updatedMaterial = this.materialRepo.merge(material, {
      ...updateDto,
      updateTime: Math.floor(Date.now() / 1000),
    });

    try {
      const result = await this.materialRepo.save(updatedMaterial);
      this.logger.log(`素材更新成功 | materialId: ${materialId} | userId: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`素材更新失败 | materialId: ${materialId} | userId: ${userId}`, error.stack);
      throw new InternalServerErrorException(`素材更新失败：${error.message}`);
    }
  }

  /**
   * 素材下载处理（下载量+1，返回模型文件URL）
   * @param materialId 素材ID
   */
  async downloadMaterial(materialId: string): Promise<{ modelUrl: string }> {
    // 检查素材是否存在且启用
    const material = await this.materialRepo.findOne({ where: { id: materialId, isEnabled: true } });
    if (!material) {
      throw new NotFoundException('素材不存在或已禁用');
    }

    // 更新下载量和更新时间
    await this.materialRepo
      .createQueryBuilder()
      .update(MaterialEntity)
      .set({ downloadCount: () => 'downloadCount + 1', updateTime: Math.floor(Date.now() / 1000) })
      .where('id = :materialId', { materialId })
      .execute();

    this.logger.log(`素材下载成功 | materialId: ${materialId} | downloadCount: ${material.downloadCount + 1}`);
    return { modelUrl: material.modelUrl };
  }

  /**
   * 获取所有启用的素材分类（按排序权重降序）
   */
  async getEnabledCategories(): Promise<MaterialCategoryEntity[]> {
    const categories = await this.categoryRepo.find({
      where: { isEnabled: true },
      order: { sort: 'desc' },
    });
    this.logger.log(`获取启用分类成功 | 数量: ${categories.length}`);
    return categories;
  }
}