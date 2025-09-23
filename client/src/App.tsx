import { Suspense } from 'react';
import { Spin } from 'antd';

function App() {
  return (
    <Suspense fallback={<Spin size="large" style={{ position: 'fixed', top: '50%', left: '50%' }} />}>
      {/* 路由由AppRouter管理 */}
    </Suspense>
  );
}

export default App;