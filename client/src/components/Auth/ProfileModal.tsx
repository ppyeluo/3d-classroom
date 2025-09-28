import { useState, useEffect } from 'react';
import { Modal, Card, Descriptions, Button, message, Upload, Spin } from 'antd';
import { UserOutlined, UploadOutlined, EditOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useUserStore } from '../../store/userStore';
import './Auth.scss';

// 学科映射表 - 将后端返回的英文key转换为中文显示
const subjectMap: Record<string, string> = {
  'math': '数学',
  'physics': '物理',
  'chemistry': '化学',
  'biology': '生物',
  'geography': '地理',
  'chinese': '语文',
  'english': '英语',
  'history': '历史',
  'politics': '政治',
  'other': '其他'
};

// 学段映射表 - 同上
const gradeMap: Record<string, string> = {
  'primary': '小学',
  'junior': '初中',
  'senior': '高中',
  'college': '大学',
  'other': '其他'
};

// 组件接收的属性类型定义
interface ProfileModalProps {
  visible: boolean;  // 控制弹窗显示/隐藏
  onCancel: () => void;  // 关闭弹窗的回调函数
}

// 用户信息数据结构定义
interface UserProfile {
  id: string;  // 用户唯一标识
  phone: string;  // 手机号
  name: string;  // 姓名
  subject: string;  // 所属学科（英文key）
  grade: string;  // 所属学段（英文key）
  isEnabled: boolean;  // 账号是否启用
  createTime: number;  // 注册时间（时间戳）
  avatar?: string;  // 头像URL（可选）
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onCancel }) => {
  // 加载状态管理 - 用于数据请求过程中的loading显示
  const [loading, setLoading] = useState(false);
  // 用户信息数据存储
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // 头像上传状态管理
  const [uploading, setUploading] = useState(false);
  // 从全局状态获取用户信息和登录方法
  const { userInfo, login } = useUserStore();

  /**
   * 获取用户个人信息
   * 仅在弹窗显示时执行，请求失败时处理错误状态
   */
  const fetchProfile = async () => {
    // 弹窗未显示时不执行请求
    if (!visible) return;
    
    setLoading(true);
    try {
      // 调用个人信息接口
      const res = await request.get('/api/user/profile');
      setProfile(res);
    } catch (error: any) {
      message.error(error.message || '获取个人信息失败');
      // 401状态表示token失效，需要重新登录
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        login({ avatar: '', name: '' });
        onCancel();
      }
    } finally {
      // 无论成功失败都关闭loading
      setLoading(false);
    }
  };

  // 监听弹窗显示状态，显示时自动加载用户信息
  useEffect(() => {
    if (visible) {
      fetchProfile();
    }
  }, [visible]);

  /**
   * 处理头像上传
   * @param file 选中的图片文件
   * 上传成功后更新全局用户状态和本地显示
   */
  const handleAvatarUpload = async (file: any) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 调用头像上传接口，使用multipart/form-data格式
      const res = await request.post('/api/user/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 更新全局用户信息中的头像
      login({
        ...userInfo!,
        avatar: res.avatarUrl
      });

      // 更新本地显示的头像
      setProfile(prev => prev ? { ...prev, avatar: res.avatarUrl } : null);
      message.success('头像上传成功');
      return Promise.resolve(res);
    } catch (error) {
      message.error('头像上传失败');
      return Promise.reject(error);
    } finally {
      setUploading(false);
    }
  };

  /**
   * 时间戳格式化
   * @param timestamp 后端返回的时间戳（秒级）
   * @returns 格式化后的本地时间字符串
   */
  const formatTime = (timestamp: number) => {
    // 后端返回的是秒级时间戳，需要转换为毫秒
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      title="个人信息"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose  // 关闭时销毁组件，避免缓存数据
    >
      {/* 加载状态显示 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" tip="加载中..." />
        </div>
      ) : profile ? (
        <div className="auth-profile">
          {/* 头像区域 - 支持上传功能 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Upload
              name="avatar"
              showUploadList={false}  // 不显示上传列表
              beforeUpload={handleAvatarUpload}  // 上传前处理函数
              accept="image/jpg,image/png,image/webp"  // 限制图片格式
              maxCount={1}  // 仅允许上传一个文件
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* 头像显示 */}
                <Card.Avatar
                  size={100}
                  src={profile.avatar || undefined}
                  icon={<UserOutlined style={{ fontSize: 48 }} />}  // 无头像时显示默认图标
                  style={{ cursor: 'pointer' }}
                />
                {/* 编辑图标 */}
                <div 
                  style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    right: 0,
                    backgroundColor: '#1890ff',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <EditOutlined size={16} />
                </div>
              </div>
            </Upload>
            {/* 用户名显示 */}
            <p style={{ marginTop: 8, fontSize: 16, fontWeight: 500 }}>
              {profile.name}
            </p>
            {/* 账号状态显示 */}
            <p style={{ color: '#999', fontSize: 12 }}>
              {profile.isEnabled ? '账号正常' : '账号已禁用'}
            </p>
          </div>

          {/* 个人信息详情列表 */}
          <Descriptions
            title="基本信息"
            bordered  // 带边框样式
            column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}  // 响应式列数设置
          >
            <Descriptions.Item label="用户ID" className="auth-profile-item">
              <span className="auth-profile-value">{profile.id}</span>
            </Descriptions.Item>
            <Descriptions.Item label="手机号" className="auth-profile-item">
              <span className="auth-profile-value">{profile.phone}</span>
            </Descriptions.Item>
            <Descriptions.Item label="所属学科" className="auth-profile-item">
              <span className="auth-profile-value">
                {/* 使用映射表转换为中文，默认显示原始值 */}
                {subjectMap[profile.subject] || profile.subject}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="所属学段" className="auth-profile-item">
              <span className="auth-profile-value">
                {gradeMap[profile.grade] || profile.grade}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="注册时间" className="auth-profile-item">
              <span className="auth-profile-value">
                {formatTime(profile.createTime)}
              </span>
            </Descriptions.Item>
          </Descriptions>

          {/* 操作按钮区域 */}
          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button onClick={onCancel}>关闭</Button>
          </div>
        </div>
      ) : (
        // 信息加载失败状态
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>获取个人信息失败，请重试</p>
          <Button onClick={fetchProfile} style={{ marginTop: 16 }}>
            重新获取
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default ProfileModal;