import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, QueryBuilder, SelectQueryBuilder } from 'typeorm';
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

// 七牛云素材存储路径前缀
const QINIU_MATERIAL_PREFIX = 'material-market/';
// 缩略图尺寸（前端预览用）
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
      // 生成七牛云存储Key（避免文件名重复）
      const fileName = `${uuidv4()}.${fileType === 'model' ? modelFormat : 'png'}`;
      const qiniuKey = `${QINIU_MATERIAL_PREFIX}${uploaderId}/${fileType}/${fileName}`;

      // 上传文件到七牛云
      const qiniuUrl = await this.qiniuUtil.uploadModelFromTripo(
        // 模拟文件URL（七牛工具兼容处理，实际使用文件缓冲区）
        `data:${fileType === 'model' ? 'model/gltf-binary' : 'image/png'};base64,${file.toString('base64')}`,
        qiniuKey,
      );

      // 缩略图添加尺寸处理（七牛云图片处理）
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
   * @param thumbnailFile 缩略图文件缓冲区
   */
 async createMaterial(
        uploaderId: string,
        createDto: CreateMaterialDto,
        modelFile: Buffer
    ): Promise<MaterialEntity> {
        // 2. 处理 categoryId：为空则使用默认分类ID
        const targetCategoryId = createDto.categoryId || DEFAULT_CATEGORY_ID;

        // 3. 校验分类是否存在且启用（默认分类也需启用）
        const category = await this.categoryRepo.findOne({
            where: { id: targetCategoryId, isEnabled: true },
        });
        if (!category) {
            throw new NotFoundException(`素材分类不存在或已禁用（分类ID：${targetCategoryId}）`);
        }

        // 4. 处理 fileSize：为空则从 modelFile 自动计算（1KB = 1024 字节）
        const targetFileSize = createDto.fileSize || Math.ceil(modelFile.length / 1024);

        // 5. 处理 modelFormat：使用DTO默认值（glb）
        const targetModelFormat = createDto.modelFormat; // DTO中已默认glb，无需额外处理

        // 6. 校验上传者是否存在（原有逻辑不变）
        await this.userService.findById(uploaderId);

        // 7. 上传模型文件（只有模型文件上传了，移除缩略图上传相关逻辑）
        const modelUrl = await this.uploadFileToQiniu(modelFile, 'model', uploaderId, targetModelFormat);

        // 根据模型文件生成缩略图地址（假设模型文件名类似 xxx.glb，生成对应的 xxx.png 地址，可根据实际情况调整更合理的逻辑）
        const thumbnailUrl = this.generateThumbnailUrl(modelUrl);

        // 8. 创建素材记录（使用处理后的参数）
        const material = this.materialRepo.create({
           ...createDto,
            id: uuidv4(),
            uploaderId,
            modelUrl,
            thumbnailUrl,
            categoryId: targetCategoryId, // 已处理默认分类
            modelFormat: targetModelFormat, // 已处理默认glb
            fileSize: targetFileSize, // 已自动计算
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

    private generateThumbnailUrl(modelUrl: string): string {
        // 简单示例，从文件名中提取基本名称（去除后缀），再拼接上.png 作为缩略图文件名
        const baseFileName = modelUrl.split('.').slice(0, -1).join('.');
        return `${baseFileName}.png`;
    }

  /**
   * 查询素材列表（支持分页、筛选、排序）
   */
  async getMaterialList(queryDto: QueryMaterialsDto): Promise<MaterialListResponse> {
    const { page, pageSize, categoryId, keyword, isFree, sortBy = 'createTime', sortOrder = 'desc' } = queryDto;
    const skip = page * pageSize;

    // 构建查询条件
    const queryBuilder: SelectQueryBuilder<MaterialEntity> = this.materialRepo.createQueryBuilder('material')
        .leftJoinAndSelect('material.category', 'category', 'category.isEnabled = true')
        .where('material.isEnabled = true');
    // 分类筛选
    if (categoryId) {
      queryBuilder.andWhere('material.categoryId = :categoryId', { categoryId });
    }

    // 关键词筛选（匹配名称或描述）
    if (keyword) {
      queryBuilder.andWhere(
        '(material.name LIKE :keyword OR material.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 免费/付费筛选
    if (isFree !== undefined) {
      queryBuilder.andWhere('material.isFree = :isFree', { isFree });
    }

    // 排序
    queryBuilder.orderBy(`material.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // 执行分页查询
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
    // 1. 查询素材详情（关联分类）
    const material = await this.materialRepo.findOne({
      where: { id: materialId, isEnabled: true },
      relations: ['category'],
    });
    if (!material) {
      throw new NotFoundException('素材不存在或已禁用');
    }

    // 2. 浏览量+1（异步更新，不阻塞返回）
    this.materialRepo
      .createQueryBuilder()
      .update(MaterialEntity)
      .set({ viewCount: () => 'viewCount + 1' })
      .where('id = :materialId', { materialId })
      .execute()
      .catch((error) => this.logger.error(`素材浏览量更新失败 | materialId: ${materialId}`, error.stack));

    // 3. 判断是否为上传者
    const isOwner = material.uploaderId === userId;

    this.logger.log(`素材详情查询成功 | materialId: ${materialId} | userId: ${userId}`);
    return { material, isOwner };
  }

  /**
   * 更新素材信息（仅上传者或管理员可操作）
   * @param materialId 素材ID
   * @param userId 当前登录用户ID
   * @param updateDto 更新参数
   */
  async updateMaterial(
    materialId: string,
    userId: string,
    updateDto: UpdateMaterialDto,
  ): Promise<MaterialEntity> {
    // 1. 查询素材是否存在
    const material = await this.materialRepo.findOne({ where: { id: materialId } });
    if (!material) {
      throw new NotFoundException('素材不存在');
    }

    // 2. 权限校验（仅上传者可更新）
    if (material.uploaderId !== userId) {
      throw new ForbiddenException('无权限更新该素材');
    }

    // 3. 若更新分类，校验分类是否存在
    if (updateDto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: updateDto.categoryId, isEnabled: true },
      });
      if (!category) {
        throw new NotFoundException('目标分类不存在或已禁用');
      }
    }

    // 4. 执行更新
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
   * 素材下载（下载量+1，返回模型文件URL）
   * @param materialId 素材ID
   */
  async downloadMaterial(materialId: string): Promise<{ modelUrl: string }> {
    // 1. 查询素材是否存在且启用
    const material = await this.materialRepo.findOne({ where: { id: materialId, isEnabled: true } });
    if (!material) {
      throw new NotFoundException('素材不存在或已禁用');
    }

    // 2. 下载量+1
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
   * 获取所有启用的素材分类
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