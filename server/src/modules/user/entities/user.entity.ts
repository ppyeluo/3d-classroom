import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '用户名' })
  username: string;

  @Column({ unique: true, comment: '邮箱' })
  email: string;

  @Column({ comment: '密码（加密存储）' })
  password: string;

  @Column({ nullable: true, comment: '教师姓名' })
  fullName: string;

  @Column({ nullable: true, comment: '所属学校' })
  school: string;

  @Column({ nullable: true, comment: '教授学科' })
  subject: string;

  @Column({ default: true, comment: '账号是否激活' })
  isActive: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
