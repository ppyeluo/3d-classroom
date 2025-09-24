import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetController } from './controllers/asset.controller';
import { AssetService } from './services/asset.service';
import { AssetEntity } from './entities/asset.entity';
import { UserModule } from '../user/user.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetEntity]),
    UserModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get<string>('ASSET_UPLOAD_PATH') || './uploads/3d-assets',
          filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
            callback(null, filename);
          },
        }),
        fileFilter: (req, file, callback) => {
          // 只允许上传3D模型相关文件
          const allowedExtensions = ['.glb', '.gltf', '.obj', '.fbx', '.stl'];
          const ext = extname(file.originalname).toLowerCase();
          
          if (allowedExtensions.includes(ext)) {
            callback(null, true);
          } else {
            callback(new Error('只允许上传GLB、GLTF、OBJ、FBX或STL格式的3D模型文件'), false);
          }
        },
        limits: {
          fileSize: 50 * 1024 * 1024, // 限制文件大小为50MB
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AssetController],
  providers: [AssetService],
  exports: [AssetService],
})
export class MaterialMarket {}
