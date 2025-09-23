import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Button, Card, Row, Col, Typography, Space } from 'antd';
import { UploadOutlined, ArrowRightOutlined, BookOutlined, MailOutlined, EditOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useModelStore } from '../../store/modelStore';
import request from '../../utils/request';
import './Home.scss';

const { Title, Paragraph, Text } = Typography;

// 热门示例配置
const hotExamples = [
  '一个带标签的人体心脏模型',
  '初中数学立体几何正方体（带棱长标注）',
  '化学水分子结构模型（H2O）',
  '物理电路串联实验模型',
];

const Home = () => {
  const navigate = useNavigate();
  const { addHistoryModel } = useModelStore();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 图片上传处理
  const handleUploadChange = (info: any) => {
    if (info.file.status === 'done') {
      setUploadFile(info.file.originFileObj);
    }
  };

  // 选择热门示例
  const handleSelectExample = (example: string) => {
    setDescription(example);
    document.querySelector('.home__description-input')?.focus();
  };

  // 生成模型
  const handleGenerate = async () => {
    if (!description && !uploadFile) {
      Text.warning('请上传图片或输入模型描述').render();
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      if (uploadFile) formData.append('image', uploadFile);
      formData.append('description', description);
      formData.append('subject', 'default');
      formData.append('style', 'simple');

      const res = await request.post('/model/generate-preview', formData);
      addHistoryModel(res);

      navigate('/model-generate', {
        state: {
          previewModel: res,
          description,
          uploadFile: uploadFile ? uploadFile.name : '',
        },
      });
    } catch (error) {
      console.error('生成模型预览失败', error);
      Text.error('生成失败，请稍后重试').render();
    } finally {
      setIsGenerating(false);
    }
  };

  // 移除图片
  const handleRemoveImage = () => {
    setUploadFile(null);
  };

  return (
    <div className="home">
      {/* 顶部标题区 */}
      <section className="home__title-area">
        <div className="container">
          <div className="home__title-content">
            <Paragraph className="home__main-title">
              立体课堂
            </Paragraph>
            <Paragraph className="home__sub-title">
              您最好的教学助手
            </Paragraph>
            <Text className="home__assistant-desc">
              最先进的教学AI 3D模型生成器
            </Text>
          </div>
        </div>
      </section>

      {/* 输入区域 */}
      <section className="home__input-area">
        <div className="container">
          {/* 输入框主体 */}
          <div className="home__input-wrapper">
            {/* 左侧上传区域 */}
            <div className="home__upload-container">
              {uploadFile ? (
                // 图片上传后显示预览
                <div className="home__image-preview">
                  <img 
                    src={URL.createObjectURL(uploadFile)} 
                    alt="上传预览" 
                    className="home__preview-img"
                  />
                  <Button 
                    type="text" 
                    className="home__remove-img"
                    onClick={handleRemoveImage}
                  >
                    ×
                  </Button>
                </div>
              ) : (
                // 未上传时显示上传图标
                <Upload
                  name="image"
                  beforeUpload={() => false}
                  onChange={handleUploadChange}
                  showUploadList={false}
                  accept="image/jpg,image/png"
                  className="home__upload-btn"
                >
                  <UploadOutlined className="home__upload-icon" />
                </Upload>
              )}
            </div>

            {/* 中间大输入框 */}
            <textarea
              className="home__description-input"
              placeholder="描述你想生成的模型，例如：一个带标签的人体心脏模型，需要标注主要血管和心房心室..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3} // 设置为3行，可容纳两行多文字
            />

            {/* 右侧发送按钮 */}
            <Button
              type="primary"
              className="home__generate-btn"
              loading={isGenerating}
              onClick={handleGenerate}
              icon={<ArrowRightOutlined />}
            />
          </div>

          {/* 热门示例 - 一行展示 */}
          <div className="home__hot-examples">
            <Text className="home__examples-title">热门示例：</Text>
            <Space size="small" className="home__examples-list">
              {hotExamples.map((example, index) => (
                <Button
                  key={index}
                  type="text"
                  className="home__example-btn"
                  onClick={() => handleSelectExample(example)}
                  size="small"
                >
                  {example}
                </Button>
              ))}
            </Space>
          </div>
        </div>
      </section>

      {/* 功能卡片区域 - 保留三个卡片 */}
      <section className="home__features-cards">
        <div className="container">
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={12} md={8}>
              <Card className="home__feature-card" hoverable>
                <div className="home__feature-icon">
                  <MailOutlined className="home__feature-icon-inner" />
                </div>
                <Title level={4} className="home__feature-title">AI 智能生成</Title>
                <Paragraph className="home__feature-desc">
                  支持图片上传与文字描述，AI 自动生成高精度 3D 教学模型，无需专业建模技能
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Card className="home__feature-card" hoverable>
                <div className="home__feature-icon">
                  <DatabaseOutlined className="home__feature-icon-inner" />
                </div>
                <Title level={4} className="home__feature-title">海量素材市场</Title>
                <Paragraph className="home__feature-desc">
                  按学科分类整理优质 3D 模型，支持关键词检索，直接选用无需重复生成
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Card className="home__feature-card" hoverable>
                <div className="home__feature-icon">
                  <EditOutlined className="home__feature-icon-inner" />
                </div>
                <Title level={4} className="home__feature-title">灵活编辑调整</Title>
                <Paragraph className="home__feature-desc">
                  支持模型外观修改、标签注释添加、动画设置，打造个性化教学演示素材
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      </section>
    </div>
  );
};

export default Home;
    