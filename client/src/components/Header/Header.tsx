import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserOutlined, DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, Avatar } from 'antd';
import { useUserStore } from '../../store/userStore';
import Logo from '../../assets/logo.png'; // 假设Logo已放入assets目录
import './Header.scss';

const Header = () => {
  const location = useLocation();
  const { isLogin, userInfo, logout } = useUserStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 导航菜单配置（与路由对应）
  const navMenus = [
    { key: '/model-generate', label: '3D 模型生成' },
    { key: '/material-market', label: '素材市场' },
    { key: '/model-lab', label: '模型实验室' },
  ];

  // 用户下拉菜单（登录后显示）
  const userMenu = (
    <Menu 
      onClick={({ key }) => {
        if (key === 'logout') {
          logout();
          setIsDropdownOpen(false);
        }
      }}
    >
      <Menu.Item key="profile">个人中心</Menu.Item>
      <Menu.Item key="settings">设置</Menu.Item>
      <Menu.Item key="logout">退出登录</Menu.Item>
    </Menu>
  );

  return (
    <header className="header">
      <div className="container header__container">
        {/* Logo区域 */}
        <Link to="/" className="header__logo">
          <img src={Logo} alt="立体课堂Logo" className="header__logo-icon" />
          <span className="header__logo-text">立体课堂</span>
        </Link>

        {/* 中间导航菜单 */}
        <nav className="header__nav">
          {navMenus.map((menu) => (
            <Link
              key={menu.key}
              to={menu.key}
              className={`header__nav-item ${
                location.pathname === menu.key ? 'header__nav-item--active' : ''
              }`}
            >
              {menu.label}
            </Link>
          ))}
        </nav>

        {/* 右侧用户区域 */}
        <div className="header__user">
          {isLogin ? (
            // 已登录：显示头像+下拉菜单
            <Dropdown
              overlay={userMenu}
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
              trigger={['click']}
            >
              <div 
                className="header__user-info" 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Avatar 
                  src={userInfo?.avatar || <UserOutlined />} 
                  className="header__user-avatar"
                />
                <span className="header__user-name">{userInfo?.name || '用户'}</span>
                <DownOutlined className="header__user-arrow" />
              </div>
            </Dropdown>
          ) : (
            // 未登录：显示登录/注册按钮
            <div className="header__auth-buttons">
              <Button type="text" className="header__login-btn">
                登录
              </Button>
              <Button type="primary" className="header__register-btn">
                注册
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;