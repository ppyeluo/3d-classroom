import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import './Auth.scss';

// 1. 学科/学段选项配置（默认值设为"other"，匹配需求）
const subjectOptions = [
  { key: 'math', label: '数学' },
  { key: 'physics', label: '物理' },
  { key: 'chemistry', label: '化学' },
  { key: 'biology', label: '生物' },
  { key: 'geography', label: '地理' },
  { key: 'chinese', label: '语文' },
  { key: 'english', label: '英语' },
  { key: 'history', label: '历史' },
  { key: 'politics', label: '政治' },
  { key: 'other', label: '其他' } // 默认选中项
];
const gradeOptions = [
  { key: 'primary', label: '小学' },
  { key: 'junior', label: '初中' },
  { key: 'senior', label: '高中' },
  { key: 'college', label: '大学' },
  { key: 'other', label: '其他' } // 默认选中项
];

// 2. 表单值类型（严格匹配接口文档注册参数，默认值设为"other"）
interface RegisterFormValues {
  phone: string;
  name: string;
  subject: string; // 默认"other"（接口文档要求非空）
  grade: string; // 默认"other"（接口文档要求非空）
  password: string;
  confirmPassword: string;
}

// 3. 表单错误提示类型
interface FormErrors {
  phone: string;
  name: string;
  subject: string;
  grade: string;
  password: string;
  confirmPassword: string;
}

interface RegisterModalProps {
  visible: boolean;
  onCancel: () => void;
  onSwitchToLogin: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ 
  visible, 
  onCancel, 
  onSwitchToLogin 
}) => {
  const [loading, setLoading] = useState(false);

  // 表单值状态（默认选中"other"，匹配需求）
  const [formValues, setFormValues] = useState<RegisterFormValues>({
    phone: '',
    name: '',
    subject: 'other', // 学科默认"其他"
    grade: 'other', // 学段默认"其他"
    password: '',
    confirmPassword: ''
  });

  // 表单错误状态
  const [formErrors, setFormErrors] = useState<FormErrors>({
    phone: '',
    name: '',
    subject: '',
    grade: '',
    password: '',
    confirmPassword: ''
  });

  // 4. 弹窗关闭时重置表单
  useEffect(() => {
    if (!visible) {
      setFormValues({
        phone: '',
        name: '',
        subject: 'other', // 重置后仍默认"其他"
        grade: 'other', // 重置后仍默认"其他"
        password: '',
        confirmPassword: ''
      });
      setFormErrors({
        phone: '',
        name: '',
        subject: '',
        grade: '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [visible]);

  // 5. 单个字段校验（严格遵循接口文档规则）
  const validateField = (field: keyof RegisterFormValues, value: string): string => {
    const phoneReg = /^1[3-9]\d{9}$/;
    const trimmedValue = value.trim();

    switch (field) {
      case 'phone':
        if (!trimmedValue) return '请输入手机号';
        if (!phoneReg.test(trimmedValue)) return '请输入正确的中国大陆手机号';
        return '';
      case 'name':
        if (!trimmedValue) return '请输入姓名';
        if (trimmedValue.length < 2 || trimmedValue.length > 10) return '姓名长度需在2-10位之间';
        return '';
      case 'subject':
        if (!trimmedValue) return '请选择学科'; // 接口文档要求非空（默认"other"已满足，此警告仅极端情况触发）
        return '';
      case 'grade':
        if (!trimmedValue) return '请选择学段'; // 同理，默认"other"已满足
        return '';
      case 'password':
        if (!trimmedValue) return '请设置密码';
        if (trimmedValue.length < 6 || trimmedValue.length > 20) return '密码长度需在6-20位之间';
        return '';
      case 'confirmPassword':
        if (!trimmedValue) return '请确认密码';
        if (trimmedValue !== formValues.password.trim()) return '两次输入的密码不一致';
        return '';
      default:
        return '';
    }
  };

  // 6. 字段值变化处理
  const handleValueChange = (field: keyof RegisterFormValues, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    if (field === 'password') {
      setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
    } else if (formErrors[field] && !value.trim()) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 7. 字段失焦校验
  const handleFieldBlur = (field: keyof RegisterFormValues) => {
    const errorMsg = validateField(field, formValues[field]);
    setFormErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  // 8. 全表单校验
  const validateForm = (): boolean => {
    const errors: FormErrors = {
      phone: validateField('phone', formValues.phone),
      name: validateField('name', formValues.name),
      subject: validateField('subject', formValues.subject),
      grade: validateField('grade', formValues.grade),
      password: validateField('password', formValues.password),
      confirmPassword: validateField('confirmPassword', formValues.confirmPassword)
    };
    setFormErrors(errors);
    return Object.values(errors).every(msg => !msg);
  };

  // 9. 注册逻辑（与接口文档对接）
  const handleRegister = async () => {
    try {
      const isFormValid = validateForm();
      if (!isFormValid) return;

      // 整理接口参数（仅传递接口文档要求的字段）
      const registerParams = {
        phone: formValues.phone.trim(),
        name: formValues.name.trim(),
        subject: formValues.subject.trim(), // 传递默认"other"或用户选择值
        grade: formValues.grade.trim(), // 传递默认"other"或用户选择值
        password: formValues.password.trim()
      };
      console.log('校验通过的注册参数:', registerParams);

      setLoading(true);
      await request.post('/api/user/register', registerParams); // 调用接口文档注册接口

      message.success('注册成功，请登录');
      onCancel();
      onSwitchToLogin();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('该手机号已注册，请直接登录'); // 接口文档409状态
      } else if (error.response?.status === 400) {
        message.error(error.message || '参数不合法，请检查输入'); // 接口文档400状态
      } else {
        message.error('注册失败，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="用户注册"
      visible={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      className="auth-modal"
    >
      <div className="auth-form">
        {/* 1. 手机号（添加必填星号） */}
        <div className="auth-form-item">
          <label className="auth-form-label">
            <span className="required-star">*</span> 手机号
          </label>
          <Input
            prefix={<PhoneOutlined className="site-form-item-icon" />}
            placeholder="请输入手机号"
            maxLength={11}
            value={formValues.phone}
            onChange={(e) => handleValueChange('phone', e.target.value)}
            onBlur={() => handleFieldBlur('phone')}
            className={formErrors.phone ? 'auth-form-input-error' : ''}
          />
          {formErrors.phone && <div className="auth-form-warning">{formErrors.phone}</div>}
        </div>

        {/* 2. 姓名（添加必填星号） */}
        <div className="auth-form-item">
          <label className="auth-form-label">
            <span className="required-star">*</span> 姓名
          </label>
          <Input
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="请输入姓名"
            value={formValues.name}
            onChange={(e) => handleValueChange('name', e.target.value)}
            onBlur={() => handleFieldBlur('name')}
            className={formErrors.name ? 'auth-form-input-error' : ''}
          />
          {formErrors.name && <div className="auth-form-warning">{formErrors.name}</div>}
        </div>

        {/* 3. 学科+学段（一行显示+默认"其他"+必填星号） */}
        <div className="auth-form-row">
          {/* 学科下拉框 */}
          <div className="auth-form-col">
            <label className="auth-form-label">
              <span className="required-star">*</span> 所属学科
            </label>
            <Select
              placeholder="请选择学科"
              value={formValues.subject} // 默认"other"
              onChange={(value) => handleValueChange('subject', value)}
              onBlur={() => handleFieldBlur('subject')}
              className={`auth-form-select ${formErrors.subject ? 'auth-form-input-error' : ''}`}
            >
              {subjectOptions.map(option => (
                <Select.Option key={option.key} value={option.key}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
            {formErrors.subject && <div className="auth-form-warning">{formErrors.subject}</div>}
          </div>

          {/* 学段下拉框 */}
          <div className="auth-form-col">
            <label className="auth-form-label">
              <span className="required-star">*</span> 所属学段
            </label>
            <Select
              placeholder="请选择学段"
              value={formValues.grade} // 默认"other"
              onChange={(value) => handleValueChange('grade', value)}
              onBlur={() => handleFieldBlur('grade')}
              className={`auth-form-select ${formErrors.grade ? 'auth-form-input-error' : ''}`}
            >
              {gradeOptions.map(option => (
                <Select.Option key={option.key} value={option.key}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
            {formErrors.grade && <div className="auth-form-warning">{formErrors.grade}</div>}
          </div>
        </div>

        {/* 4. 密码（添加必填星号） */}
        <div className="auth-form-item">
          <label className="auth-form-label">
            <span className="required-star">*</span> 设置密码
          </label>
          <Input
            prefix={<LockOutlined className="site-form-item-icon" />}
            type="password"
            placeholder="请设置密码"
            value={formValues.password}
            onChange={(e) => handleValueChange('password', e.target.value)}
            onBlur={() => handleFieldBlur('password')}
            className={formErrors.password ? 'auth-form-input-error' : ''}
          />
          {formErrors.password && <div className="auth-form-warning">{formErrors.password}</div>}
          <div className="auth-form-hint">密码长度为6-20位字符</div>
        </div>

        {/* 5. 确认密码（添加必填星号） */}
        <div className="auth-form-item">
          <label className="auth-form-label">
            <span className="required-star">*</span> 确认密码
          </label>
          <Input
            prefix={<LockOutlined className="site-form-item-icon" />}
            type="password"
            placeholder="请再次输入密码"
            value={formValues.confirmPassword}
            onChange={(e) => handleValueChange('confirmPassword', e.target.value)}
            onBlur={() => handleFieldBlur('confirmPassword')}
            className={formErrors.confirmPassword ? 'auth-form-input-error' : ''}
          />
          {formErrors.confirmPassword && <div className="auth-form-warning">{formErrors.confirmPassword}</div>}
        </div>

        {/* 6. 按钮区域 */}
        <div className="auth-form-footer">
          <Button 
            onClick={() => {
              onCancel();
              onSwitchToLogin();
            }}
            style={{ marginRight: 8 }}
          >
            已有账号？登录
          </Button>
          <Button 
            type="primary" 
            loading={loading}
            onClick={handleRegister}
          >
            注册
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RegisterModal;