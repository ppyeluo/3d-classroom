import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './router';
import { useUserStore } from './store/userStore';
import request from './utils/request';
import './styles/global.css';
import './styles/variables.scss'

// 初始化用户状态（刷新页面后保持登录）
const initUserState = async () => {
  const token = localStorage.getItem('token');
  const { login } = useUserStore.getState();
  
  if (token) {
    try {
      // 获取用户信息
      const res = await request.get('/api/user/profile');
      login({
        avatar: res.avatar || '',
        name: res.name
      });
    } catch (error) {
      // token失效，清除token
      localStorage.removeItem('token');
    }
  }
};

// 先初始化用户状态，再渲染页面
initUserState().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppRouter />
    </React.StrictMode>,
  );
});