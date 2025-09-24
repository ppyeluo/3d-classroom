import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

// 1. 定义实际的值数组（作为值存在）
export const ASSET_CATEGORY_VALUES = [
  'character',
  'environment',
  'prop',
  'vehicle',
  'architecture',
  'furniture',
  'other'
] as const;

export const ASSET_LICENSE_VALUES = [
  'free',
  'commercial',
  'attribution'
] as const;

// 2. 从值数组派生类型（仅作为类型存在）
export type AssetCategory = typeof ASSET_CATEGORY_VALUES[number];
export type AssetLicense = typeof ASSET_LICENSE_VALUES[number];

@Entity('3d_assets')
export class AssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // 使用派生的类型
  @Column({
    type: 'varchar',
    length: 50,
    index: true
  })
  category: AssetCategory;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'free'
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

  // 3. 验证时使用实际的值数组（而不是类型）
  @BeforeInsert()
  @BeforeUpdate()
  validateValues() {
    // 使用值数组进行验证
    if (!ASSET_CATEGORY_VALUES.includes(this.category)) {
      throw new Error(`无效的分类值: ${this.category}，允许的值为: ${ASSET_CATEGORY_VALUES.join(', ')}`);
    }
    
    if (!ASSET_LICENSE_VALUES.includes(this.license)) {
      throw new Error(`无效的许可值: ${this.license}，允许的值为: ${ASSET_LICENSE_VALUES.join(', ')}`);
    }
  }
}
