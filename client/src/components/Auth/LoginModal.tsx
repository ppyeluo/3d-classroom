import { useState, useEffect } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useUserStore } from '../../store/userStore';
import './Auth.scss';

// 1. 定义表单值类型（匹配接口文档登录参数：phone + password）
interface LoginFormValues {
  phone: string;
  password: string;
}

// 2. 定义表单错误提示类型（对应每个字段的警告信息）
interface FormErrors {
  phone: string;
  password: string;
}

interface LoginModalProps {
  visible: boolean;
  onCancel: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const { login } = useUserStore();

  // 表单值状态（替代 AntD Form 的字段管理）
  const [formValues, setFormValues] = useState<LoginFormValues>({
    phone: '',
    password: ''
  });

  // 表单错误状态（存储每个字段的警告信息）
  const [formErrors, setFormErrors] = useState<FormErrors>({
    phone: '',
    password: ''
  });

  // 3. 弹窗关闭时重置表单（避免残留旧值和警告）
  useEffect(() => {
    if (!visible) {
      setFormValues({ phone: '', password: '' });
      setFormErrors({ phone: '', password: '' });
    }
  }, [visible]);

  // 4. 单个字段的校验逻辑（严格遵循接口文档规则）
  /**
   * 校验单个字段
   * @param field 字段名（phone/password）
   * @param value 字段值
   * @returns 该字段的警告信息（空字符串表示校验通过）
   */
  const validateField = (field: keyof LoginFormValues, value: string): string => {
    const phoneReg = /^1[3-9]\d{9}$/; // 接口文档：中国大陆手机号格式
    const trimmedValue = value.trim();

    switch (field) {
      case 'phone':
        if (!trimmedValue) return '请输入手机号'; // 接口文档：非空校验
        if (!phoneReg.test(trimmedValue)) return '请输入正确的中国大陆手机号'; // 接口文档：格式校验
        return '';

      case 'password':
        if (!trimmedValue) return '请输入密码'; // 接口文档：非空校验
        if (trimmedValue.length < 6 || trimmedValue.length > 20) 
          return '密码长度需在6-20位之间'; // 接口文档：长度校验（6-20位）
        return '';

      default:
        return '';
    }
  };

  // 5. 输入框变化处理（实时更新表单值，不触发校验）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof LoginFormValues;

    // 更新表单值（保留原始输入，失焦时再校验）
    setFormValues(prev => ({ ...prev, [field]: value }));

    // 输入过程中：若该字段之前有警告，且当前值为空（用户删除内容），则清空警告
    if (formErrors[field] && !value.trim()) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 6. 输入框失焦处理（核心：失去焦点后自动校验该字段）
  const handleInputBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof LoginFormValues;

    // 调用单个字段校验逻辑，获取警告信息
    const errorMsg = validateField(field, value);
    // 更新该字段的警告状态
    setFormErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  // 7. 全表单校验（登录前触发，确保所有字段符合接口要求）
  const validateForm = (): boolean => {
    const errors: FormErrors = {
      phone: validateField('phone', formValues.phone),
      password: validateField('password', formValues.password)
    };

    // 更新所有字段的警告状态
    setFormErrors(errors);
    // 所有字段警告为空，说明全表单校验通过
    return Object.values(errors).every(msg => !msg);
  };

  // 8. 登录核心逻辑（与接口文档对接）
  const handleLogin = async () => {
    try {
      // 先执行全表单校验
      const isFormValid = validateForm();
      if (!isFormValid) return;

      // 校验通过：打印表单值（确保手机号/密码非空且符合规则）
      const trimmedValues = {
        phone: formValues.phone.trim(),
        password: formValues.password.trim()
      };
      console.log('校验通过的表单值:', trimmedValues);
      console.log('手机号:', trimmedValues.phone);
      console.log('密码:', trimmedValues.password);

      setLoading(true);
      // 调用接口文档中的“用户登录接口”（POST /api/user/login）
      const res = await request.post('/api/user/login', trimmedValues);

      // 按接口文档响应处理：存储token（有效期7天）、更新用户状态
      localStorage.setItem('token', res.token);
      login({
        avatar: res.user.avatar || '',
        name: res.user.name
      });

      message.success('登录成功');
      onCancel();
    } catch (error: any) {
      // 按接口文档异常码处理错误
      if (error.response?.status === 404) {
        message.error('用户不存在，请先注册'); // 接口文档：404-用户不存在
      } else if (error.response?.status === 401) {
        message.error('密码错误或账号已禁用'); // 接口文档：401-密码错误/账号禁用
      } else if (error.response?.status === 400) {
        message.error('参数不合法，请检查输入'); // 接口文档：400-参数不合法
      } else {
        message.error(error.message || '登录失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="用户登录"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      className="auth-modal"
    >
      <div className="auth-form">
        {/* 手机号输入项：失焦校验+警告显示 */}
        <div className="auth-form-item">
          <label className="auth-form-label">手机号</label>
          <Input
            name="phone" // 与表单值字段名一致
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="请输入手机号"
            maxLength={11} // 接口文档：手机号11位限制
            value={formValues.phone}
            onChange={handleInputChange} // 输入变化更新值
            onBlur={handleInputBlur} // 失焦触发校验
            // 校验不通过时，输入框边框变红（对齐 AntD 样式）
            className={formErrors.phone ? 'auth-form-input-error' : ''}
          />
          {/* 校验不通过时，显示警告信息（对齐 AntD 交互） */}
          {formErrors.phone && (
            <div className="auth-form-warning">{formErrors.phone}</div>
          )}
        </div>

        {/* 密码输入项：失焦校验+警告显示 */}
        <div className="auth-form-item">
          <label className="auth-form-label">密码</label>
          <Input
            name="password" // 与表单值字段名一致
            type="password"
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="请输入密码"
            value={formValues.password}
            onChange={handleInputChange} // 输入变化更新值
            onBlur={handleInputBlur} // 失焦触发校验
            // 校验不通过时，输入框边框变红（对齐 AntD 样式）
            className={formErrors.password ? 'auth-form-input-error' : ''}
          />
          {/* 校验不通过时，显示警告信息（对齐 AntD 交互） */}
          {formErrors.password && (
            <div className="auth-form-warning">{formErrors.password}</div>
          )}
          {/* 接口文档：密码长度提示（默认显示） */}
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