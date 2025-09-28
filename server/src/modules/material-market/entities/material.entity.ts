import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MaterialCategoryEntity } from './material-category.entity';

/**
 * 3D素材实体（存储素材核心信息）
 */
@Entity('materials')
export class MaterialEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '素材ID' })
  id: string;

  @Column({ type: 'varchar', length: 100, comment: '素材名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '素材描述（支持简单HTML）' })
  description: string;

  @Column({ type: 'varchar', length: 300, comment: '素材缩略图URL（七牛云存储，用于前端预览）' })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 300, comment: '3D模型文件URL（七牛云存储，glb/gltf等格式）' })
  modelUrl: string;

  @Column({ type: 'varchar', length: 20, comment: '3D模型文件格式（如：glb、gltf、obj）' })
  modelFormat: string;

  @Column({ type: 'int', comment: '素材文件大小（KB，便于前端显示）' })
  fileSize: number;

  @Column({ type: 'uuid', comment: '所属分类ID' })
  categoryId: string;
  
  // 关联分类信息（查询时可关联获取分类名称）
  @ManyToOne(() => MaterialCategoryEntity, (category) => category.materials)
  @JoinColumn({ name: 'categoryId' })
  category: MaterialCategoryEntity;

  @Column({ type: 'int', default: 0, comment: '下载次数（用于热门排序）' })
  downloadCount: number;

  @Column({ type: 'int', default: 0, comment: '浏览次数' })
  viewCount: number;

  @Column({ type: 'boolean', default: true, comment: '是否免费（true：免费，false：付费）' })
  isFree: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '素材价格（单位：元，免费时为0）' })
  price: number;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '素材标签（逗号分隔，如：动物,哺乳动物,大象）' })
  tags: string;

  @Column({ type: 'boolean', default: true, comment: '是否启用（禁用后不展示）' })
  isEnabled: boolean;

  @Column({ type: 'varchar', length: 36, comment: '上传者ID（关联users表）' })
  uploaderId: string;

  @Column({ 
    type: 'bigint', 
    default: () => 'extract(epoch from now())', 
    comment: '创建时间（秒级时间戳）' 
  })
  createTime: number;

  @Column({ 
    type: 'bigint', 
    nullable: true, 
    comment: '更新时间（秒级时间戳）' 
  })
  updateTime: number;
}