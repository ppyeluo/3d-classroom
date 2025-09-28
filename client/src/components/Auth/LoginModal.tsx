import { useState, useEffect } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useUserStore } from '../../store/userStore';
import './Auth.scss';

// 登录表单数据结构
interface LoginFormValues {
  phone: string;  // 手机号
  password: string;  // 密码
}

// 表单字段错误信息结构
interface FormErrors {
  phone: string;  // 手机号错误提示
  password: string;  // 密码错误提示
}

// 组件属性定义
interface LoginModalProps {
  visible: boolean;  // 控制弹窗显示
  onCancel: () => void;  // 关闭弹窗回调
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, onCancel }) => {
  // 登录请求状态
  const [loading, setLoading] = useState(false);
  // 全局登录状态管理
  const { login } = useUserStore();

  // 表单数据状态
  const [formValues, setFormValues] = useState<LoginFormValues>({
    phone: '',
    password: ''
  });

  // 表单错误信息状态
  const [formErrors, setFormErrors] = useState<FormErrors>({
    phone: '',
    password: ''
  });

  /**
   * 弹窗关闭时重置表单
   * 避免下次打开时显示上次输入的内容和错误提示
   */
  useEffect(() => {
    if (!visible) {
      setFormValues({ phone: '', password: '' });
      setFormErrors({ phone: '', password: '' });
    }
  }, [visible]);

  /**
   * 单个字段校验
   * @param field 字段名称
   * @param value 字段值
   * @returns 错误提示文本（空字符串表示校验通过）
   */
  const validateField = (field: keyof LoginFormValues, value: string): string => {
    // 手机号正则：中国大陆手机号规则
    const phoneReg = /^1[3-9]\d{9}$/;
    const trimmedValue = value.trim();

    switch (field) {
      case 'phone':
        if (!trimmedValue) return '请输入手机号';
        if (!phoneReg.test(trimmedValue)) return '请输入正确的中国大陆手机号';
        return '';

      case 'password':
        if (!trimmedValue) return '请输入密码';
        if (trimmedValue.length < 6 || trimmedValue.length > 20) 
          return '密码长度需在6-20位之间';
        return '';

      default:
        return '';
    }
  };

  /**
   * 输入框内容变化处理
   * 实时更新表单值，不触发校验（校验在失焦时进行）
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof LoginFormValues;

    // 更新表单值
    setFormValues(prev => ({ ...prev, [field]: value }));

    // 输入过程中清除空值的错误提示
    if (formErrors[field] && !value.trim()) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * 输入框失焦处理
   * 失去焦点时校验当前字段
   */
  const handleInputBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof LoginFormValues;

    const errorMsg = validateField(field, value);
    setFormErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  /**
   * 全表单校验
   * 登录前检查所有字段
   * @returns 是否通过校验
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {
      phone: validateField('phone', formValues.phone),
      password: validateField('password', formValues.password)
    };

    setFormErrors(errors);
    // 所有字段都没有错误提示表示校验通过
    return Object.values(errors).every(msg => !msg);
  };

  /**
   * 登录处理函数
   * 先校验表单，通过后调用登录接口
   */
  const handleLogin = async () => {
    try {
      // 表单校验
      const isFormValid = validateForm();
      if (!isFormValid) return;

      // 去除首尾空格
      const trimmedValues = {
        phone: formValues.phone.trim(),
        password: formValues.password.trim()
      };

      setLoading(true);
      // 调用登录接口
      const res = await request.post('/api/user/login', trimmedValues);

      // 存储token并更新用户状态
      localStorage.setItem('token', res.token);
      login({
        avatar: res.user.avatar || '',
        name: res.user.name
      });

      message.success('登录成功');
      onCancel();
    } catch (error: any) {
      // 错误处理：根据不同状态码显示对应提示
      if (error.response?.status === 404) {
        message.error('用户不存在，请先注册');
      } else if (error.response?.status === 401) {
        message.error('密码错误或账号已禁用');
      } else if (error.response?.status === 400) {
        message.error('参数不合法，请检查输入');
      } else {
        message.error(error.message || '登录失败，请重试');
      }
    } finally {
      // 无论成功失败都关闭loading
      setLoading(false);
    }
  };

  return (
    <Modal
      title="用户登录"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose  // 关闭时销毁组件
      className="auth-modal"
    >
      <div className="auth-form">
        {/* 手机号输入项 */}
        <div className="auth-form-item">
          <label className="auth-form-label">手机号</label>
          <Input
            name="phone"  // 与表单字段名对应
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="请输入手机号"
            maxLength={11}  // 限制手机号长度
            value={formValues.phone}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            // 校验不通过时添加错误样式
            className={formErrors.phone ? 'auth-form-input-error' : ''}
          />
          {/* 显示错误提示 */}
          {formErrors.phone && (
            <div className="auth-form-warning">{formErrors.phone}</div>
          )}
        </div>

        {/* 密码输入项 */}
        <div className="auth-form-item">
          <label className="auth-form-label">密码</label>
          <Input
            name="password"
            type="password"  // 密码类型，输入内容隐藏
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="请输入密码"
            value={formValues.password}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className={formErrors.password ? 'auth-form-input-error' : ''}
          />
          {formErrors.password && (
            <div className="auth-form-warning">{formErrors.password}</div>
          )}
          {/* 密码格式提示 */}
          <div className="auth-form-hint">密码长度为6-20位字符</div>
        </div>

        {/* 按钮区域 */}
        <div className="auth-form-footer">
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            取消
          </Button>
          <Button 
            type="primary" 
            loading={loading}
            onClick={handleLogin}
          >
            登录
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LoginModal;