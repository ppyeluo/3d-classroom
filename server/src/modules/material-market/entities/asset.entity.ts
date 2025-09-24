import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

// 枚举定义保持不变
export enum AssetCategory {
  CHARACTER = 'character',
  ENVIRONMENT = 'environment',
  PROP = 'prop',
  VEHICLE = 'vehicle',
  ARCHITECTURE = 'architecture',
  FURNITURE = 'furniture',
  OTHER = 'other'
}

export enum AssetLicense {
  FREE = 'free',
  COMMERCIAL = 'commercial',
  ATTTRIBUTION = 'attribution'
}

// 定义一个返回构造函数的函数，严格匹配TypeORM的要求
const enumTypeFactory = () => String;

@Entity('3d_assets')
export class AssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // 正确匹配重载要求：第一个参数是返回构造函数的函数
  @Column(enumTypeFactory, {
    enum: AssetCategory,
    index: true
  })
  category: AssetCategory;

  @Column(enumTypeFactory, {
    enum: AssetLicense,
    default: AssetLicense.FREE
  })
  license: AssetLicense;

  // 其他字段保持不变...
  @Column({ default: 0 })
  downloadCount: number;

  @Column({ default: 0 })
  rating: number;

  @Column({ default: 0 })
  ratingCount: number;

  @Column({ length: 255 })
  filePath: string;

  @Column({ length: 255, nullable: true })
  thumbnailPath: string;

  @Column({ type: 'float', default: 0 })
  fileSize: number;

  @Column({ length: 50 })
  fileFormat: string;

  @Column({
    type: 'simple-array',
    nullable: true
  })
  tags: string[];

  @ManyToOne(() => UserEntity, user => user.assets, {
    onDelete: 'CASCADE'
  })
  uploader: UserEntity;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
