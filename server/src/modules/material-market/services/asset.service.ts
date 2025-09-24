import { Injectable, NotFoundException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetEntity, AssetCategory, AssetLicense } from '../entities/asset.entity';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { QueryAssetsDto } from '../dto/query-assets.dto';
import { UpdateAssetDto } from '../dto/update-asset.dto';
import { UserEntity } from '../../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AssetService {
  constructor(
    @InjectRepository(AssetEntity)
    private assetRepo: Repository<AssetEntity>,
    private configService: ConfigService
  ) {}

  /**
   * 上传新的3D素材
   */
  async createAsset(
    createDto: CreateAssetDto,
    uploader: UserEntity,
    file: Express.Multer.File,
    thumbnailFile?: Express.Multer.File
  ): Promise<AssetEntity> {
    // 解析文件信息 - 修复文件扩展名为undefined的问题
    const fileNameParts = file.originalname.split('.');
    if (fileNameParts.length < 2) {
      throw new HttpException('上传的文件没有扩展名', HttpStatus.BAD_REQUEST);
    }
    const fileExt = fileNameParts.pop()?.toLowerCase() || '';
    const fileSize = file.size / (1024 * 1024); // 转换为MB

    // 创建素材记录
    const asset = new AssetEntity();
    asset.name = createDto.name;
    // 修复描述可能为undefined的问题
    asset.description = createDto.description || '';
    asset.category = createDto.category;
    asset.license = createDto.license;
    asset.tags = createDto.tags || [];
    asset.filePath = file.filename;
    asset.fileFormat = fileExt;
    asset.fileSize = parseFloat(fileSize.toFixed(2));
    asset.uploader = uploader;
    
    // 处理缩略图
    if (thumbnailFile) {
      asset.thumbnailPath = thumbnailFile.filename;
    } else if (createDto.thumbnailUrl) {
      asset.thumbnailPath = createDto.thumbnailUrl;
    }

    return this.assetRepo.save(asset);
  }

  /**
   * 获取素材列表（支持筛选、分页和排序）
   */
  async getAssets(queryDto: QueryAssetsDto) {
    const { 
      page, 
      limit, 
      category, 
      license, 
      tags, 
      search, 
      minRating,
      sort = 'newest'
    } = queryDto;

    const skip = (page - 1) * limit;
    
    // 构建查询
    const query = this.assetRepo.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.uploader', 'uploader', 'uploader.isEnabled = true')
      .where('asset.isActive = true')
      .andWhere('asset.isVerified = true');

    // 分类筛选
    if (category) {
      query.andWhere('asset.category = :category', { category });
    }

    // 许可类型筛选
    if (license) {
      query.andWhere('asset.license = :license', { license });
    }

    // 标签筛选
    if (tags && tags.length > 0) {
      tags.forEach((tag, index) => {
        query.andWhere(`:tag${index} = ANY(asset.tags)`, { [`tag${index}`]: tag });
      });
    }

    // 搜索（名称、描述、标签）
    if (search) {
      query.andWhere(`
        (asset.name ILIKE :search OR 
         asset.description ILIKE :search OR
         array_to_string(asset.tags, ',') ILIKE :search)
      `, { search: `%${search}%` });
    }

    // 最低评分筛选
    if (minRating) {
      query.andWhere('asset.rating >= :minRating', { minRating });
    }

    // 排序
    switch (sort) {
      case 'popular':
        query.orderBy('asset.downloadCount', 'DESC');
        break;
      case 'rating':
        query.orderBy('asset.rating', 'DESC');
        break;
      case 'newest':
      default:
        query.orderBy('asset.createdAt', 'DESC');
        break;
    }

    // 执行查询
    const [items, total] = await query
      .select([
        'asset',
        'uploader.id',
        'uploader.name',
        'uploader.avatarUrl'
      ])
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取素材详情
   */
  async getAssetById(id: string) {
    const asset = await this.assetRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.uploader', 'uploader', 'uploader.isEnabled = true')
      .select([
        'asset',
        'uploader.id',
        'uploader.name',
        'uploader.avatarUrl',
        'uploader.bio'
      ])
      .where('asset.id = :id', { id })
      .andWhere('asset.isActive = true')
      .andWhere('asset.isVerified = true')
      .getOne();

    if (!asset) {
      throw new NotFoundException('素材不存在或未上架');
    }

    return asset;
  }

  /**
   * 更新素材信息
   */
  async updateAsset(
    id: string,
    updateDto: UpdateAssetDto,
    userId: string,
    isAdmin: boolean // 新增参数：是否为管理员
  ) {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['uploader']
    });

    if (!asset) {
      throw new NotFoundException('素材不存在');
    }

    // 检查权限（只有上传者或管理员可以更新）
    if (asset.uploader.id !== userId && !isAdmin) {
      throw new ForbiddenException('没有权限更新此素材');
    }

    // 更新字段
    if (updateDto.name) asset.name = updateDto.name;
    if (updateDto.description !== undefined) asset.description = updateDto.description || '';
    if (updateDto.category) asset.category = updateDto.category;
    if (updateDto.license) asset.license = updateDto.license;
    if (updateDto.tags) asset.tags = updateDto.tags;
    if (updateDto.thumbnailUrl) asset.thumbnailPath = updateDto.thumbnailUrl;
    if (updateDto.isActive !== undefined) asset.isActive = updateDto.isActive;

    asset.updatedAt = new Date();

    return this.assetRepo.save(asset);
  }

  /**
   * 删除素材
   */
  async deleteAsset(id: string, userId: string, isAdmin: boolean) {
    const asset = await this.assetRepo.findOne({
      where: { id },
      relations: ['uploader']
    });

    if (!asset) {
      throw new NotFoundException('素材不存在');
    }

    // 检查权限
    if (asset.uploader.id !== userId && !isAdmin) {
      throw new ForbiddenException('没有权限删除此素材');
    }

    // 删除文件
    const uploadPath = this.configService.get<string>('ASSET_UPLOAD_PATH') || './uploads/3d-assets';
    const filePath = join(uploadPath, asset.filePath);
    
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        console.error(`删除素材文件失败: ${filePath}`, error);
        // 不中断删除操作，只记录错误
      }
    }

    // 删除缩略图
    if (asset.thumbnailPath && !asset.thumbnailPath.startsWith('http')) {
      const thumbnailPath = join(uploadPath, asset.thumbnailPath);
      if (existsSync(thumbnailPath)) {
        try {
          unlinkSync(thumbnailPath);
        } catch (error) {
          console.error(`删除缩略图失败: ${thumbnailPath}`, error);
        }
      }
    }

    // 从数据库删除记录
    await this.assetRepo.remove(asset);

    return { message: '素材已成功删除' };
  }

  /**
   * 下载素材（增加下载计数）
   */
  async downloadAsset(id: string) {
    const asset = await this.assetRepo.findOne({ where: { id } });

    if (!asset || !asset.isActive || !asset.isVerified) {
      throw new NotFoundException('素材不存在或未上架');
    }

    // 增加下载计数
    asset.downloadCount += 1;
    await this.assetRepo.save(asset);

    // 返回文件信息
    return {
      id: asset.id,
      name: asset.name,
      filePath: asset.filePath,
      fileFormat: asset.fileFormat,
      fileSize: asset.fileSize
    };
  }

  /**
   * 评分
   */
  async rateAsset(id: string, rating: number, userId: string) {
    if (rating < 1 || rating > 5) {
      throw new HttpException('评分必须在1到5之间', HttpStatus.BAD_REQUEST);
    }

    const asset = await this.assetRepo.findOne({ where: { id } });

    if (!asset) {
      throw new NotFoundException('素材不存在');
    }

    // 计算新评分（简单平均）
    const newTotalRating = asset.rating * asset.ratingCount + rating;
    asset.ratingCount += 1;
    asset.rating = parseFloat((newTotalRating / asset.ratingCount).toFixed(1));

    return this.assetRepo.save(asset);
  }

  /**
   * 获取热门分类
   */
  async getPopularCategories(limit = 5) {
    return this.assetRepo
      .createQueryBuilder('asset')
      .select('asset.category', 'category')
      .addSelect('COUNT(asset.id)', 'count')
      .where('asset.isActive = true')
      .andWhere('asset.isVerified = true')
      .groupBy('asset.category')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(limit = 20) {
    // 这个查询会将标签数组展开并统计每个标签的出现次数
    return this.assetRepo
      .createQueryBuilder('asset')
      .select("unnest(asset.tags)", "tag")
      .addSelect("COUNT(unnest(asset.tags))", "count")
      .where('asset.isActive = true')
      .andWhere('asset.isVerified = true')
      .andWhere('asset.tags IS NOT NULL')
      .groupBy("unnest(asset.tags)")
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
