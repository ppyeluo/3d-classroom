import { Entity, Column, PrimaryColumn } from 'typeorm';
import { ModelGenerateType } from '../dto/create-model-task.dto';

export interface TaskOutput {
  model?: string;
  base_model?: string;
  pbr_model?: string;
  rendered_image?: string;
  qiniu_output?: {
    model?: string;
    pbr_model?: string;
    rendered_image?: string;
  };
}

@Entity('model_tasks')
export class ModelTaskEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '本地任务ID（UUID）' })
  id: string;

  @Column({ type: 'varchar', length: 36, comment: '任务所属用户ID' })
  userId: string;

  @Column({ 
    type: 'varchar', 
    length: 20, 
    comment: '任务类型：text_to_model（文本）、image_to_model（图片）' 
  })
  type: ModelGenerateType;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: 'Tripo3D平台任务ID' })
  tripoTaskId: string;

  @Column({ 
    type: 'varchar', 
    length: 20, 
    default: 'queued', 
    comment: '任务状态：queued（排队）、running（运行）、success（成功）、failed（失败）、banned（封禁）、expired（过期）、cancelled（取消）、unknown（未知）' 
  })
  status: 'queued' | 'running' | 'success' | 'failed' | 'banned' | 'expired' | 'cancelled' | 'unknown';

  @Column({ type: 'int', default: 0, comment: '任务进度（0-100）' })
  progress: number;

  @Column({ type: 'text', nullable: true, comment: '文本生成提示词（仅text_to_model任务）' })
  prompt: string;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '生成风格（仅image_to_model任务）' })
  style: string;

  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    comment: '任务输出结果：包含Tripo3D原始输出和七牛云转存地址' 
  })
  output: TaskOutput;

  @Column({ type: 'text', nullable: true, comment: '任务错误信息（失败时存储）' })
  errorMsg: string;

  @Column({ type: 'bigint', comment: '任务创建时间（时间戳，秒级）' })
  createTime: number;

  @Column({ type: 'bigint', nullable: true, comment: '任务更新时间（时间戳，秒级）' })
  updateTime: number;
}
