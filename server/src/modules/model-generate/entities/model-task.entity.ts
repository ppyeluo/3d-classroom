import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

export enum ModelTaskStatus {
  PENDING = 'pending',      // 等待中
  PROCESSING = 'processing',// 处理中
  COMPLETED = 'completed',  // 完成
  FAILED = 'failed'         // 失败
}

@Entity('model_task', {
  comment: '3D模型生成任务表'
})
export class ModelTaskEntity {
  @PrimaryGeneratedColumn('uuid', {
    comment: '任务ID'
  })
  id: string;

  @Column({ comment: '模型名称' })
  name: string;

  @Column({ type: 'text', comment: '模型描述/生成提示词' })
  description: string;

  @Column({ 
    type: 'enum', 
    enum: ModelTaskStatus, 
    default: ModelTaskStatus.PENDING,
    comment: '任务状态' 
  })
  status: ModelTaskStatus;

  @Column({ nullable: true, comment: 'Tripo3D任务ID' })
  tripoTaskId: string;

  @Column({ nullable: true, type: 'text', comment: '生成的模型URL' })
  modelUrl: string;

  @Column({ nullable: true, type: 'text', comment: '错误信息' })
  errorMessage: string;

  @Column({ nullable: true, comment: '模型缩略图URL' })
  thumbnailUrl: string;

  // 移除关系装饰器中的comment属性
  @ManyToOne(() => UserEntity, user => user.id, {
    onDelete: 'CASCADE' // 当用户删除时，关联的任务也删除
  })
  user: UserEntity;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
