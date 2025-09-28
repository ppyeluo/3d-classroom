import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from '../pages/Home/Home';
import ModelGenerate from '../pages/ModelGenerate/ModelGenerate';
import MaterialMarket from '../pages/MaterialMarket/MaterialMarket';
import ModelLab from '../pages/ModelLab/ModelLab';
import Layout from '../components/Layout/Layout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> }, // 首页
      { path: '/model-generate', element: <ModelGenerate /> }, // 3D模型生成页
      { path: '/material-market', element: <MaterialMarket /> }, // 素材市场页
      { path: '/model-lab', element: <ModelLab /> }, // 模型实验室页
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}