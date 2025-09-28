// src/components/Auth/ProfileModal.tsx
import { useState, useEffect } from 'react';
import { Modal, Card, Descriptions, Button, message, Upload, Spin } from 'antd';
import { UserOutlined, UploadOutlined, EditOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useUserStore } from '../../store/userStore';
import './Auth.scss';

// 学科映射（后端返回key转中文）
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

// 学段映射（后端返回key转中文）
const gradeMap: Record<string, string> = {
  'primary': '小学',
  'junior': '初中',
  'senior': '高中',
  'college': '大学',
  'other': '其他'
};

interface ProfileModalProps {
  visible: boolean;
  onCancel: () => void;
}

interface UserProfile {
  id: string;
  phone: string;
  name: string;
  subject: string;
  grade: string;
  isEnabled: boolean;
  createTime: number;
  avatar?: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const { userInfo, login } = useUserStore();

  // 获取个人信息
  const fetchProfile = async () => {
    if (!visible) return;
    
    setLoading(true);
    try {
      const res = await request.get('/api/user/profile');
      setProfile(res);
    } catch (error: any) {
      message.error(error.message || '获取个人信息失败');
      if (error.response?.status === 401) {
        // token失效，退出登录
        localStorage.removeItem('token');
        login({ avatar: '', name: '' });
        onCancel();
      }
    } finally {
      setLoading(false);
    }
  };

  // 组件显示时获取个人信息
  useEffect(() => {
    if (visible) {
      fetchProfile();
    }
  }, [visible]);

  // 处理头像上传（实际项目中需后端提供头像上传接口）
  const handleAvatarUpload = async (file: any) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 调用头像上传接口（假设后端提供该接口）
      const res = await request.post('/api/user/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 更新用户状态
      login({
        ...userInfo!,
        avatar: res.avatarUrl
      });

      // 更新个人信息
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

  // 格式化时间戳
  const formatTime = (timestamp: number) => {
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
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" tip="加载中..." />
        </div>
      ) : profile ? (
        <div className="auth-profile">
          {/* 头像区域 */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Upload
              name="avatar"
              showUploadList={false}
              beforeUpload={handleAvatarUpload}
              accept="image/jpg,image/png,image/webp"
              maxCount={1}
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Card.Avatar
                  size={100}
                  src={profile.avatar || undefined}
                  icon={<UserOutlined style={{ fontSize: 48 }} />}
                  style={{ cursor: 'pointer' }}
                />
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
            <p style={{ marginTop: 8, fontSize: 16, fontWeight: 500 }}>
              {profile.name}
            </p>
            <p style={{ color: '#999', fontSize: 12 }}>
              {profile.isEnabled ? '账号正常' : '账号已禁用'}
            </p>
          </div>

          {/* 个人信息详情 */}
          <Descriptions
            title="基本信息"
            bordered
            column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2, xxl: 2 }}
          >
            <Descriptions.Item label="用户ID" className="auth-profile-item">
              <span className="auth-profile-value">{profile.id}</span>
            </Descriptions.Item>
            <Descriptions.Item label="手机号" className="auth-profile-item">
              <span className="auth-profile-value">{profile.phone}</span>
            </Descriptions.Item>
            <Descriptions.Item label="所属学科" className="auth-profile-item">
              <span className="auth-profile-value">
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

          {/* 操作按钮 */}
          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button onClick={onCancel}>关闭</Button>
          </div>
        </div>
      ) : (
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