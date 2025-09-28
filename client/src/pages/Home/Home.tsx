// src/pages/Home/Home.tsx
import { message, Typography } from 'antd'; // 保留需要的AntD组件
import { MailOutlined, DatabaseOutlined, EditOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom'; // 保留Link用于跳转
import Logo3D from '../../components/Logo3D';
import './Home.scss';

const { Title, Paragraph, Text } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const goModelGenerate = () => {
      const token = localStorage.getItem('token');
      if(token){
        navigate('/model-generate');
      }else{
        message.error('请先进行登录');
      }
  }
  const waitWait = () => {
  message.info('功能开发中，敬请期待')
}
  return (
    <div className="home">
      
      {/* 内容区域（完全保留原逻辑） */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* 顶部标题区（完全保留原逻辑） */}
        <section className="home__title-area">
          <div className="container home__title-container">
            <div className="home__title-content">
              <div className="home__title-group">
                <div className="home__logo-container">
                  <Logo3D 
                    scale={1}
                    position={[0, 0, 0]}
                    rotation={[0, -2000, 0]}
                  />
                </div>
                <div className="home__text-content">
                  <div className='home__title'>
                    <span className="home__main-title">立体课堂</span>
                    <span className="home__sub-title">，解锁教学新维度</span>
                  </div>
                  <Text className="home__assistant-desc">
                    告别抽象，拥抱直观，让知识触手可及
                  </Text>
                </div>
              </div>
            </div>
            <div className="home__cta-button">
                <div className="home__start-button"
                onClick={goModelGenerate}>
                  立即开始3D建模之旅
                  <ArrowRightOutlined className="home__start-icon" />
                </div>
            </div>
          </div>
        </section>

        {/* 功能卡片区域（核心修改：恢复跳转+调整背景色） */}
        <section className="home__features-cards">
            <div className="home__features-grid">
              {/* 卡片1：AI 智能生成 - 跳转至模型生成页 */}
              <Link to="/model-generate" className="home__feature-card-link">
                <div className="home__feature-card">
<div className="home__featuretop">                  <div className="home__feature-icon">
                    <MailOutlined className="home__feature-icon-inner" />
                  </div>
                  <Title level={4} className="home__feature-title">AI 智能生成</Title></div>
                  <Paragraph className="home__feature-desc">
                    支持图片上传与文字描述，AI自动生成高精度3D教学模型。
                  </Paragraph>
                </div>
              </Link>

              {/* 卡片2：海量素材市场 - 跳转至素材市场页 */}
              <Link to="/material-market" className="home__feature-card-link">
                <div className="home__feature-card">
<div className="home__featuretop">                  <div className="home__feature-icon">
                    <DatabaseOutlined className="home__feature-icon-inner" />
                  </div>
                  <Title level={4} className="home__feature-title">海量素材市场</Title></div>
                  <Paragraph className="home__feature-desc">
                    整理优质3D模型，支持关键词检索。
                  </Paragraph>
                </div>
              </Link>

              {/* 卡片3：灵活编辑调整 - 跳转至模型实验室页 */}
              <Link to="/" className="home__feature-card-link">
                <div className="home__feature-card" onClick={waitWait}>
                    <div className="home__featuretop">                  <div className="home__feature-icon">
                    <EditOutlined className="home__feature-icon-inner" />
                  </div>
                  <Title level={4} className="home__feature-title">灵活编辑调整</Title></div>
                  <Paragraph className="home__feature-desc">
                    支持模型外观修改、标签注释添加、动画设置。
                  </Paragraph>
                </div>
              </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;