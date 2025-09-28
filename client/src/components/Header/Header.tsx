import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  UserOutlined, DownOutlined, SearchOutlined, 
  DownloadOutlined, EditOutlined, ShareAltOutlined,
  UndoOutlined, RedoOutlined, SaveOutlined
} from '@ant-design/icons';
import { Button, Dropdown, Menu, Avatar, Input, Space, Modal, message } from 'antd';
import { useUserStore } from '../../store/userStore';
import Logo from '../../assets/logo.png';
import LoginModal from '../Auth/LoginModal'; // 引入登录弹窗
import RegisterModal from '../Auth/RegisterModal'; // 引入注册弹窗
import ProfileModal from '../Auth/ProfileModal'; // 引入个人信息弹窗
import './Header.scss';

const { Search } = Input;

const Header = () => {
  const location = useLocation();
  const { isLogin, userInfo, logout } = useUserStore();
  
  // 弹窗状态管理
  const [loginVisible, setLoginVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentNav, setCurrentNav] = useState(null);

  // 用户下拉菜单（登录后显示）
  const userMenu = (
    <Menu 
      onClick={({ key }) => {
        // 处理菜单点击事件
        if (key === 'logout') {
          logout();
          localStorage.removeItem('token'); // 清除token
          setIsDropdownOpen(false);
        } else if (key === 'profile') {
          setProfileVisible(true); // 打开个人信息弹窗
          setIsDropdownOpen(false);
        }
      }}
    >
      <Menu.Item key="profile" icon={<UserOutlined />}>个人中心</Menu.Item>
      <Menu.Item key="settings" icon={<EditOutlined />}>设置</Menu.Item>
      <Menu.Item key="logout" icon={<UserOutlined />}>退出登录</Menu.Item>
    </Menu>
  );

  // 切换到登录弹窗
  const handleSwitchToLogin = () => {
    setRegisterVisible(false);
    setLoginVisible(true);
  };

  // 切换到注册弹窗
  const handleSwitchToRegister = () => {
    setLoginVisible(false);
    setRegisterVisible(true);
  };

  // 根据当前页面动态生成中间导航内容
  // useEffect(() => {
  //   const path = location.pathname;
  //   switch (path) {
  //     case '/':
  //       setCurrentNav(
  //         <nav className="header__nav">
  //           {[
  //             { key: '/model-generate', label: '3D 模型生成' },
  //             { key: '/material-market', label: '素材市场' },
  //             { key: '/model-lab', label: '模型实验室' },
  //           ].map((menu) => (
  //             <Link
  //               key={menu.key}
  //               to={menu.key}
  //               className={`header__nav-item ${
  //                 location.pathname === menu.key ? 'header__nav-item--active' : ''
  //               }`}
  //             >
  //               {menu.label}
  //             </Link>
  //           ))}
  //         </nav>
  //       );
  //       break;
  //     case '/model-generate':
  //       setCurrentNav(
  //         <div className="header__operation-buttons">
  //           <Space size="middle">
  //             <Button icon={<DownloadOutlined />} size="middle">下载模型</Button>
  //             <Button icon={<ShareAltOutlined />} size="middle">分享模型</Button>
  //             <Button icon={<EditOutlined />} type="primary" size="middle">保存修改</Button>
  //           </Space>
  //         </div>
  //       );
  //       break;
  //     case '/material-market':
  //       setCurrentNav(
  //         <div className="header__search-container">
  //           <Search
  //             placeholder="搜索模型名称或描述"
  //             allowClear
  //             enterButton={<SearchOutlined />}
  //             style={{ width: 400 }}
  //             onSearch={(value) => {
  //               window.dispatchEvent(new CustomEvent('marketSearch', { detail: value }));
  //             }}
  //           />
  //         </div>
  //       );
  //       break;
  //     case '/model-lab':
  //       setCurrentNav(
  //         <div className="header__operation-buttons">
  //           <Space size="middle">
  //             <Button icon={<UndoOutlined />} size="middle">撤销</Button>
  //             <Button icon={<RedoOutlined />} size="middle">重做</Button>
  //             <Button icon={<DownloadOutlined />} size="middle">导出模型</Button>
  //             <Button icon={<SaveOutlined />} type="primary" size="middle">保存实验</Button>
  //           </Space>
  //         </div>
  //       );
  //       break;
  //     default:
  //       setCurrentNav(null);
  //   }
  // }, [location.pathname]);

  // 开发中提示
  const waitWait = () => {
    message.info('功能开发中，敬请期待');
  };

  return (
    <header className="header">
      <div className="container header__container">
        {/* Logo区域（保持不变） */}
        <Link to="/" className="header__logo">
          <img src={Logo} alt="立体课堂Logo" className="header__logo-icon" />
          <span className="header__logo-text">立体课堂</span>
        </Link>

        {/* 中间导航区域 */}
        <nav className="header__nav">
          {[
            { key: '/model-generate', label: '3D 模型生成' },
            { key: '/material-market', label: '素材市场' },
            { key: '/model-lab', label: '模型实验室' },
          ].map((menu) => (
            // 模型实验室特殊处理（开发中）
            menu.key === '/model-lab' ? (
              <span
                key={menu.key}
                className={`header__nav-item header__nav-item--disabled ${
                  location.pathname === menu.key ? 'header__nav-item--active' : ''
                }`}
                onClick={waitWait}
              >
                {menu.label}
              </span>
            ) : (
              <Link
                key={menu.key}
                to={menu.key}
                className={`header__nav-item ${
                  location.pathname === menu.key ? 'header__nav-item--active' : ''
                }`}
              >
                {menu.label}
              </Link>
            )
          ))}
        </nav>

        {/* 右侧用户区域 */}
        <div className="header__user"
          style={{
            backgroundColor: 'rgb(235, 118, 10, .8)',
            borderRadius: '5px'
          }}>
          {isLogin ? (
            // 登录状态显示用户信息下拉
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
            // 未登录状态显示登录/注册按钮
            <div className="header__auth-buttons">
              <Button 
                type="text" 
                className="header__login-btn"
                onClick={() => setLoginVisible(true)} // 打开登录弹窗
              >
                登录
              </Button>
              <Button 
                type="primary" 
                className="header__register-btn"
                onClick={() => setRegisterVisible(true)} // 打开注册弹窗
              >
                注册
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 登录弹窗 */}
      <LoginModal
        visible={loginVisible}
        onCancel={() => setLoginVisible(false)}
      />

      {/* 注册弹窗 */}
      <RegisterModal
        visible={registerVisible}
        onCancel={() => setRegisterVisible(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />

      {/* 个人信息弹窗 */}
      <ProfileModal
        visible={profileVisible}
        onCancel={() => setProfileVisible(false)}
      />
    </header>
  );
};

export default Header;