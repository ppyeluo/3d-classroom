import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import './Auth.scss';

// 学科选项配置
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
  { key: 'other', label: '其他' }
];

// 学段选项配置
const gradeOptions = [
  { key: 'primary', label: '小学' },
  { key: 'junior', label: '初中' },
  { key: 'senior', label: '高中' },
  { key: 'college', label: '大学' },
  { key: 'other', label: '其他' }
];

// 注册表单数据结构
interface RegisterFormValues {
  phone: string;  // 手机号
  name: string;  // 姓名
  subject: string;  // 学科（默认other）
  grade: string;  // 学段（默认other）
  password: string;  // 密码
  confirmPassword: string;  // 确认密码
}

// 注册表单错误信息结构
interface FormErrors {
  phone: string;
  name: string;
  subject: string;
  grade: string;
  password: string;
  confirmPassword: string;
}

// 组件属性定义
interface RegisterModalProps {
  visible: boolean;  // 控制显示
  onCancel: () => void;  // 关闭回调
  onSwitchToLogin: () => void;  // 切换到登录的回调
}

const RegisterModal: React.FC<RegisterModalProps> = ({ 
  visible, 
  onCancel, 
  onSwitchToLogin 
}) => {
  // 注册请求状态
  const [loading, setLoading] = useState(false);

  // 表单数据状态（默认选择"其他"）
  const [formValues, setFormValues] = useState<RegisterFormValues>({
    phone: '',
    name: '',
    subject: 'other',
    grade: 'other',
    password: '',
    confirmPassword: ''
  });

  // 表单错误信息状态
  const [formErrors, setFormErrors] = useState<FormErrors>({
    phone: '',
    name: '',
    subject: '',
    grade: '',
    password: '',
    confirmPassword: ''
  });

  /**
   * 弹窗关闭时重置表单
   * 恢复默认值，清除错误提示
   */
  useEffect(() => {
    if (!visible) {
      setFormValues({
        phone: '',
        name: '',
        subject: 'other',
        grade: 'other',
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

  /**
   * 单个字段校验
   * @param field 字段名
   * @param value 字段值
   * @returns 错误提示文本
   */
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
        if (!trimmedValue) return '请选择学科';
        return '';
      case 'grade':
        if (!trimmedValue) return '请选择学段';
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

  /**
   * 表单值变化处理
   * @param field 字段名
   * @param value 新值
   */
  const handleValueChange = (field: keyof RegisterFormValues, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    // 密码变化时清除确认密码的错误提示
    if (field === 'password') {
      setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
    } else if (formErrors[field] && !value.trim()) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * 字段失焦校验
   * @param field 字段名
   */
  const handleFieldBlur = (field: keyof RegisterFormValues) => {
    const errorMsg = validateField(field, formValues[field]);
    setFormErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  /**
   * 全表单校验
   * @returns 是否通过校验
   */
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

  /**
   * 注册处理函数
   * 校验通过后调用注册接口
   */
  const handleRegister = async () => {
    try {
      const isFormValid = validateForm();
      if (!isFormValid) return;

      // 整理注册参数（去除空格）
      const registerParams = {
        phone: formValues.phone.trim(),
        name: formValues.name.trim(),
        subject: formValues.subject.trim(),
        grade: formValues.grade.trim(),
        password: formValues.password.trim()
      };

      setLoading(true);
      // 调用注册接口
      await request.post('/api/user/register', registerParams);

      message.success('注册成功，请登录');
      onCancel();
      onSwitchToLogin();  // 切换到登录界面
    } catch (error: any) {
      // 错误处理
      if (error.response?.status === 409) {
        message.error('该手机号已注册，请直接登录');
      } else if (error.response?.status === 400) {
        message.error(error.message || '参数不合法，请检查输入');
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
        {/* 手机号输入 */}
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

        {/* 姓名输入 */}
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

        {/* 学科和学段选择（同行显示） */}
        <div className="auth-form-row">
          {/* 学科选择 */}
          <div className="auth-form-col">
            <label className="auth-form-label">
              <span className="required-star">*</span> 所属学科
            </label>
            <Select
              placeholder="请选择学科"
              value={formValues.subject}
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

          {/* 学段选择 */}
          <div className="auth-form-col">
            <label className="auth-form-label">
              <span className="required-star">*</span> 所属学段
            </label>
            <Select
              placeholder="请选择学段"
              value={formValues.grade}
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

        {/* 密码设置 */}
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

        {/* 确认密码 */}
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

        {/* 按钮区域 */}
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