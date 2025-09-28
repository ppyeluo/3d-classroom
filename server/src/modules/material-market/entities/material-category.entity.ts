import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { MaterialEntity } from './material.entity';

/**
 * 3D素材分类实体（如：动物、植物、建筑、机械等）
 */
@Entity('material_categories')
export class MaterialCategoryEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '分类ID' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, comment: '分类名称' })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '分类描述' })
  description: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '分类图标URL（七牛云存储）' })
  iconUrl: string;

  @Column({ type: 'int', default: 0, comment: '排序权重（值越大越靠前）' })
  sort: number;

  @Column({ type: 'boolean', default: true, comment: '是否启用（禁用后不展示）' })
  isEnabled: boolean;

  @Column({ 
    type: 'bigint', 
    default: () => 'extract(epoch from now())', 
    comment: '创建时间（秒级时间戳）' 
  })
  createTime: number;

  // 关联该分类下的所有素材
  @OneToMany(() => MaterialEntity, (material) => material.category)
  materials: MaterialEntity[];
}