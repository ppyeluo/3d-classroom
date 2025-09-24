import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseGuards, Request, UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AssetService } from '../services/asset.service';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { QueryAssetsDto } from '../dto/query-assets.dto';
import { UpdateAssetDto } from '../dto/update-asset.dto';
import { UserService } from '../../user/services/user.service';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { createReadStream } from 'fs';
// 导入Fastify类型
import type { FastifyRequest, FastifyReply } from 'fastify';
// 导入Express文件类型
import type { Multer } from 'multer';

@Controller('api/marketplace')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly userService: UserService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 上传新的3D素材
   * 需要登录
   */
  @Post('assets')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 2))
  async uploadAsset(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createDto: CreateAssetDto,
    @Request() req: FastifyRequest & { user: { sub: string } } // 明确请求类型
  ) {
    // 验证文件是否存在
    if (!files || files.length === 0) {
      throw new Error('请上传3D模型文件');
    }
    
    // 分离模型文件和缩略图 - 使用const修复ESLint警告
    const modelFile: Express.Multer.File = files[0];
    let thumbnailFile: Express.Multer.File | undefined;

    if (files.length > 1) {
      thumbnailFile = files[1];
    }

    // 获取上传用户
    const user = await this.userService.findFullEntityById(req.user.sub);
    
    // 创建素材
    const asset = await this.assetService.createAsset(
      createDto,
      user,
      modelFile,
      thumbnailFile
    );

    return {
      message: '素材上传成功，等待审核',
      asset: {
        id: asset.id,
        name: asset.name,
        status: asset.isVerified ? '已审核' : '待审核'
      }
    };
  }

  /**
   * 获取素材列表
   * 公开接口
   */
  @Get('assets')
  async getAssets(@Query() queryDto: QueryAssetsDto) {
    return this.assetService.getAssets(queryDto);
  }

  /**
   * 获取素材详情
   * 公开接口
   */
  @Get('assets/:id')
  async getAssetDetail(@Param('id') id: string) {
    return this.assetService.getAssetById(id);
  }

  /**
   * 下载素材文件
   * 公开接口
   */
  @Get('assets/:id/download')
  async downloadAsset(
    @Param('id') id: string,
    @Request() req: FastifyRequest, // 明确请求类型
    @Res() res: FastifyReply // 明确响应类型
  ) {
    try {
      // 记录下载并获取文件信息
      const fileInfo = await this.assetService.downloadAsset(id);
      
      // 构建文件路径
      const uploadPath = this.configService.get<string>('ASSET_UPLOAD_PATH') || './uploads/3d-assets';
      const filePath = join(uploadPath, fileInfo.filePath);
      
      // 设置响应头
      res.headers({
        'Content-Disposition': `attachment; filename="${fileInfo.name}.${fileInfo.fileFormat}"`,
        'Content-Type': 'application/octet-stream',
      });
      
      // 兼容Fastify的文件发送方式（不依赖sendFile）
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res.raw); // 使用raw响应对象
      
    } catch (error) {
      return res.status(404).send({
        message: error.message || '下载失败，文件不存在'
      });
    }
  }

  /**
   * 更新素材信息
   * 仅上传者或管理员可操作
   */
  @Put('assets/:id')
  @UseGuards(JwtAuthGuard)
  async updateAsset(
    @Param('id') id: string,
    @Body() updateDto: UpdateAssetDto,
    @Request() req: FastifyRequest & { user: { sub: string } } // 明确请求类型
  ) {
    // 获取用户是否为管理员
    const user = await this.userService.findFullEntityById(req.user.sub);
    const isAdmin = user.isAdmin || false;
    
    return this.assetService.updateAsset(id, updateDto, req.user.sub, isAdmin);
  }

  /**
   * 删除素材
   * 仅上传者或管理员可操作
   */
  @Delete('assets/:id')
  @UseGuards(JwtAuthGuard)
  async deleteAsset(
    @Param('id') id: string,
    @Request() req: FastifyRequest & { user: { sub: string } } // 明确请求类型
  ) {
    // 获取用户是否为管理员
    const user = await this.userService.findFullEntityById(req.user.sub);
    const isAdmin = user.isAdmin || false;
    
    return this.assetService.deleteAsset(id, req.user.sub, isAdmin);
  }

  /**
   * 给素材评分
   * 需要登录
   */
  @Post('assets/:id/rating')
  @UseGuards(JwtAuthGuard)
  async rateAsset(
    @Param('id') id: string,
    @Body('rating') rating: number,
    @Request() req: FastifyRequest & { user: { sub: string } } // 明确请求类型
  ) {
    return this.assetService.rateAsset(id, rating, req.user.sub);
  }

  /**
   * 获取热门分类
   * 公开接口
   */
  @Get('categories/popular')
  async getPopularCategories(@Query('limit') limit?: number) {
    return this.assetService.getPopularCategories(limit ? parseInt(limit.toString()) : 5);
  }

  /**
   * 获取热门标签
   * 公开接口
   */
  @Get('tags/popular')
  async getPopularTags(@Query('limit') limit?: number) {
    return this.assetService.getPopularTags(limit ? parseInt(limit.toString()) : 20);
  }

  /**
   * 审核素材（仅管理员）
   */
  @Put('assets/:id/verify')
  @UseGuards(JwtAuthGuard)
  async verifyAsset(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
    @Request() req: FastifyRequest & { user: { sub: string } } // 明确请求类型
  ) {
    // 管理员检查逻辑
    const user = await this.userService.findFullEntityById(req.user.sub);
    if (!user.isAdmin) {
      throw new Error('只有管理员可以审核素材');
    }

    const updateDto = new UpdateAssetDto();
    updateDto.isActive = isVerified; // 审核通过才上架
    
    const isAdmin = user.isAdmin || false;
    
    const asset = await this.assetService.updateAsset(
      id, 
      updateDto, 
      req.user.sub,
      isAdmin
    );
    
    return {
      message: isVerified ? '素材审核通过并上架' : '素材审核未通过',
      asset: {
        id: asset.id,
        name: asset.name,
        isVerified: asset.isVerified,
        isActive: asset.isActive
      }
    };
  }
}
