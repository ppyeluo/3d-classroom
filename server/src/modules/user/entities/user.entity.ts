import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { AssetEntity } from '../../material-market/entities/asset.entity';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: '手机号' })
  phone: string;

  @Column({ comment: '姓名' })
  name: string;

  @Column({ comment: '学科（如：物理、数学）' })
  subject: string;

  @Column({ comment: '学段（如：初中、高中）' })
  grade: string;

  @Exclude()
  @Column({ comment: '密码（BCrypt 加密）' })
  password: string;

  @Column({ default: true, comment: '账号是否启用' })
  isEnabled: boolean;

  @Column({ default: false, comment: '是否为管理员' })
  isAdmin: boolean;

  // 添加与素材的一对多关联
  @OneToMany(() => AssetEntity, (asset) => asset.uploader)
  assets: AssetEntity[];

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
