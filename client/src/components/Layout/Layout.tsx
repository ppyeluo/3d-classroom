import { Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Header from '../Header/Header';
import './Layout.scss';
import ThreeDBackground from '../ThreeDBackground';
import { useFullscreenState } from '../../store/fullscreenStore';

const Layout = () => {
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { fullscreen } = useFullscreenState();

  // 计算并设置内容区域高度
  useEffect(() => {
    const calculateHeight = () => {
      if (contentRef.current && headerRef.current) {
        // 窗口高度减去头部高度得到内容区可用高度
        const windowHeight = window.innerHeight;
        const headerHeight = headerRef.current.offsetHeight;
        const contentHeight = windowHeight - headerHeight;
        
        // 应用计算出的高度
        contentRef.current.style.height = `${contentHeight}px`;
      }
    };

    calculateHeight();
    
    // 监听窗口大小变化，动态调整高度
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  return (
    <div className="layout">
      {/* 顶部导航栏 - 全屏状态下隐藏 */}
      {
        !fullscreen && (<div ref={headerRef} className="layout__header">
          <Header />
        </div>)
      }
      
      {/* 中间内容区 - 根据全屏状态设置高度 */}
      <main 
        ref={contentRef} 
        className="layout__content" 
        style={
          !fullscreen ? {
            height: 'calc(100vh - 64px)'
          }: {
            height: '100vh'
          }
        }
      >
        <div className="container">
          {/* 3D背景效果 */}
          <ThreeDBackground />
          {/* 路由出口 - 渲染匹配的子路由组件 */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;