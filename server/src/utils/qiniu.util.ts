import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as qiniu from 'qiniu';
import axios from 'axios';
import { Readable } from 'stream';

@Injectable()
export class QiniuUtil {
  private accessKey: string;
  private secretKey: string;
  private bucket: string;
  private domain: string;
  private mac: qiniu.auth.digest.Mac;
  private config: qiniu.conf.Config;
  private uploadManager: qiniu.form_up.FormUploader;
  private logger = new Logger(QiniuUtil.name);

  constructor(private configService: ConfigService) {
    // 读取配置
    this.accessKey = this.configService.get<string>('QINIU_ACCESS_KEY') || '';
    this.secretKey = this.configService.get<string>('QINIU_SECRET_KEY') || '';
    this.bucket = this.configService.get<string>('QINIU_BUCKET') || '';
    this.domain = this.configService.get<string>('QINIU_DOMAIN') || '';

    // 校验配置
    if (!this.accessKey || !this.secretKey || !this.bucket || !this.domain) {
      throw new InternalServerErrorException('七牛云配置缺失，请检查.env文件');
    }

    // 修复：七牛云SDK v7+的正确配置方式
    this.mac = new qiniu.auth.digest.Mac(this.accessKey, this.secretKey);
    this.config = new qiniu.conf.Config();
    
    // 修复：使用正确的区域配置方法（根据实际区域调整）
    // 华东: qiniu.zone.Zone_z0
    // 华北: qiniu.zone.Zone_z1
    // 华南: qiniu.zone.Zone_z2
    // 北美: qiniu.zone.Zone_na0
     this.config = new qiniu.conf.Config({
      zone: qiniu.zone.Zone_z0, // 根据 bucket 所在区域调整
    });// 华南区域
    
    this.uploadManager = new qiniu.form_up.FormUploader(this.config);
  }

  /**
   * 获取七牛云上传凭证
   */
  getUploadToken(key: string, expires = 3600): string {
    try {
      const options = { scope: `${this.bucket}:${key}`, expires };
      const putPolicy = new qiniu.rs.PutPolicy(options);
      return putPolicy.uploadToken(this.mac);
    } catch (error) {
      this.logger.error(`获取上传凭证失败 | key: ${key}`, error.stack);
      throw new InternalServerErrorException(`获取上传凭证失败：${error.message}`);
    }
  }

  /**
   * 从Tripo3D下载模型并上传到七牛云
   */
  async uploadModelFromTripo(tripoModelUrl: string, qiniuKey: string): Promise<string> {
    this.logger.log(`开始转存模型 | TripoURL: ${tripoModelUrl} | 七牛Key: ${qiniuKey}`);
    try {
      // 1. 下载Tripo3D模型
      const downloadResponse = await axios.get(tripoModelUrl, {
        responseType: 'stream',
        timeout: 60000,
        maxRedirects: 5,
      });

      // 2. 转换为Readable流
      const stream = downloadResponse.data as Readable;

      // 3. 上传到七牛云
      return new Promise((resolve, reject) => {
        const token = this.getUploadToken(qiniuKey);
        const extra = new qiniu.form_up.PutExtra();
        
        // 修复：使用流上传方式，避免FormData的类型问题
        this.uploadManager.putStream(
          token,
          qiniuKey,
          stream,
          extra,
          (err, body) => {
            if (err) {
              this.logger.error(`七牛云上传失败 | key: ${qiniuKey}`, err.stack);
              return reject(new InternalServerErrorException(`七牛云上传失败：${err.message}`));
            }
            
            if (body?.key) {
              const qiniuUrl = `${this.domain}/${body.key}`;
              this.logger.log(`模型转存成功 | 七牛URL: ${qiniuUrl}`);
              resolve(qiniuUrl);
            } else {
              this.logger.error(`七牛云上传返回异常 | 响应: ${JSON.stringify(body)}`);
              reject(new InternalServerErrorException('七牛云上传返回异常'));
            }
          }
        );
      });
    } catch (error) {
      this.logger.error(`模型转存失败 | 七牛Key: ${qiniuKey}`, error.stack);
      throw new InternalServerErrorException(`模型转存失败：${error.message}`);
    }
  }

  /**
   * 删除七牛云文件
   */
  async deleteFile(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
      bucketManager.delete(this.bucket, key, (err) => {
        if (err) {
          this.logger.error(`删除七牛文件失败 | key: ${key}`, err.stack);
          reject(new InternalServerErrorException(`删除七牛文件失败：${err.message}`));
        } else {
          this.logger.log(`删除七牛文件成功 | key: ${key}`);
          resolve(true);
        }
      });
    });
  }
}
    