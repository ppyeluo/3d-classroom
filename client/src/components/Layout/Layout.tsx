import { Outlet } from 'react-router-dom';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './Layout.scss';

const Layout = () => {
  return (
    <div className="layout">
      {/* 顶部导航栏 */}
      <Header />

      {/* 中间内容区（Outlet渲染当前路由组件） */}
      <main className="layout__content">
        <div className="container">
          <Outlet />
        </div>
      </main>

      {/* 底部页脚 */}
      <Footer />
    </div>
  );
};

export default Layout;