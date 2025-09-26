import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column({ type: 'varchar', length: 20, unique: true, comment: '手机号' })
  phone: string;
  
  @Column({ type: 'varchar', length: 50, comment: '姓名' })
  name: string;
  
  @Column({ type: 'varchar', length: 100, comment: '学科' })
  subject: string;
  
  @Column({ type: 'varchar', length: 50, comment: '年级' })
  grade: string;
  
  @Column({ type: 'varchar', length: 100, select: false, comment: '密码（加密存储）' })
  password: string;
  
  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ type: 'bigint', default: () => 'extract(epoch from now())', comment: '创建时间（时间戳，秒级）' })
  createTime: number;
}
