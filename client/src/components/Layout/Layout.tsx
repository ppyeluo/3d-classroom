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
  // 计算内容区域高度
  useEffect(() => {
    const calculateHeight = () => {
      if (contentRef.current && headerRef.current) {
        // 窗口高度减去头部高度
        const windowHeight = window.innerHeight;
        const headerHeight = headerRef.current.offsetHeight;
        const contentHeight = windowHeight - headerHeight;
        
        // 设置内容区域高度
        contentRef.current.style.height = `${contentHeight}px`;
      }
    };

    // 初始化计算
    calculateHeight();
    
    // 窗口大小变化时重新计算
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  return (
    <div className="layout">
      {/* 顶部导航栏 */}
      {
        !fullscreen && (<div ref={headerRef} className="layout__header">
          <Header />
        </div>)
      }
      
      {/* 中间内容区 - 动态计算高度 */}
      <main ref={contentRef} className="layout__content" style={
        !fullscreen ? {
          height: 'calc(100vh - 64px)'
        }: {
          height: '100vh'
        }
      }>
        <div className="container">
          <ThreeDBackground />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
