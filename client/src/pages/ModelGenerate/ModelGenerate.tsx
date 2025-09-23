import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, Button, Select, Slider, Tabs, Card, List, Avatar, message, Spin, Alert, Dropdown, Menu, Modal } from 'antd';
import { UploadOutlined, RotateLeftOutlined, ZoomInOutlined, MoreOutlined, FullscreenOutlined, DownloadOutlined, ShareAltOutlined, SaveOutlined, PlusOutlined, EditOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useModelStore, type ModelInfo } from '../../store/modelStore';
import request from '../../utils/request';
import './ModelGenerate.scss';

const { Option } = Select;
const { TabPane } = Tabs;
const { Meta } = Card;

// 学科与二级标签配置
const subjectTagsConfig = {
  physics: [
    { key: 'mechanics', label: '力学' },
    { key: 'electricity', label: '电学' },
    { key: 'thermodynamics', label: '热力学' },
    { key: 'optics', label: '光学' },
  ],
  math: [
    { key: 'solid-geometry', label: '立体几何' },
    { key: 'algebra', label: '代数' },
    { key: 'geometry', label: '平面几何' },
  ],
  chemistry: [
    { key: 'molecule', label: '分子结构' },
    { key: 'element', label: '元素周期' },
    { key: 'reaction', label: '化学反应' },
  ],
  biology: [
    { key: 'organ', label: '器官结构' },
    { key: 'cell', label: '细胞结构' },
    { key: 'evolution', label: '生物进化' },
  ],
  geography: [
    { key: 'earth', label: '地球结构' },
    { key: 'weather', label: '气象气候' },
    { key: 'landform', label: '地形地貌' },
  ],
  default: [
    { key: 'other', label: '其他' },
  ],
};

// 模型风格配置
const styleConfig = [
  { key: 'cartoon', label: '卡通', thumbnail: 'https://via.placeholder.com/80x80?text=卡通风格' },
  { key: 'simple', label: '简洁', thumbnail: 'https://via.placeholder.com/80x80?text=简洁风格' },
  { key: 'realistic', label: '写实', thumbnail: 'https://via.placeholder.com/80x80?text=写实风格' },
];

// 3D模型占位组件
const ModelPlaceholder = ({ modelUrl }: { modelUrl?: string }) => {
  return (
    <group>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#1890ff" />
      </mesh>
      <axesHelper args={[3]} />
      <Html position={[0, 2, 0]} transform>
        <div className="model__name-tag">
          {modelUrl ? '加载完成的模型' : '模型加载中...'}
        </div>
      </Html>
    </group>
  );
};

const ModelGenerate = () => {
  // 首先在组件状态中添加上传状态管理
  const [isUploading, setIsUploading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { currentModel, setCurrentModel, historyModels, addHistoryModel } = useModelStore();
  
  // 页面状态
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('default');
  const [tags, setTags] = useState<string[]>([]);
  const [style, setStyle] = useState('simple');
  const [precision, setPrecision] = useState('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('appearance');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 弹窗状态
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [precisionModalVisible, setPrecisionModalVisible] = useState(false);

  // 从首页跳转时携带的参数
  useEffect(() => {
    const state = location.state as any;
    if (state) {
      if (state.description) setDescription(state.description);
      if (state.defaultSubject) setSubject(state.defaultSubject);
      if (state.previewModel) {
        setCurrentModel(state.previewModel);
        setModelLoaded(true);
      }
    }
  }, [location.state, setCurrentModel]);

  // 切换学科时重置二级标签
  useEffect(() => {
    setTags([]);
  }, [subject]);

  // 图片上传处理
  const handleUploadChange = (info: any) => {
    if (info.file.status === 'done') {
      setUploadFile(info.file.originFileObj);
    }
  };

  // 生成模型
  const handleGenerateModel = async () => {
    if (!description && !uploadFile) {
      message.warning('请上传图片或输入模型描述');
      return;
    }

    setIsGenerating(true);
    setModelLoaded(false);
    try {
      const formData = new FormData();
      if (uploadFile) formData.append('image', uploadFile);
      formData.append('description', description);
      formData.append('subject', subject);
      formData.append('tags', JSON.stringify(tags));
      formData.append('style', style);
      formData.append('precision', precision);

      const res: ModelInfo = await request.post('/model/generate', formData);

      setCurrentModel(res);
      addHistoryModel(res);
      setModelLoaded(true);
      message.success('模型生成成功！');
    } catch (error) {
      console.error('模型生成失败', error);
      message.error('模型生成失败，请检查参数后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 加载历史模型
  const handleLoadHistoryModel = (model: ModelInfo) => {
    setCurrentModel(model);
    setModelLoaded(true);
    setDescription(model.description);
    setSubject(model.subject);
    setTags(model.tags);
    setStyle(model.style);
    setPrecision(model.precision);
  };

  // 3D模型控制
  const [controls, setControls] = useState<any>(null);
  const handleRotate = () => {
    if (controls) {
      controls.enableRotate = true;
      controls.enableZoom = false;
      controls.enablePan = false;
    }
  };
  const handleZoom = () => {
    if (controls) {
      controls.enableRotate = false;
      controls.enableZoom = true;
      controls.enablePan = false;
    }
  };
  const handleMove = () => {
    if (controls) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enablePan = true;
    }
  };
  const handleResetView = () => {
    if (controls) {
      controls.reset();
    }
  };
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 编辑操作
  const handleSaveEdit = () => {
    if (!currentModel) return;
    request.put(`/model/${currentModel.id}/update`, {
      style,
      precision,
    }).then(() => {
      message.success('修改保存成功');
    }).catch(() => {
      message.error('保存失败，请重试');
    });
  };

  const handleDownloadModel = () => {
    if (!currentModel) return;
    window.open(`/api/model/${currentModel.id}/download?format=glb`, '_blank');
  };

  const handleShareModel = () => {
    if (!currentModel) return;
    request.post(`/model/${currentModel.id}/share`).then((res) => {
      navigator.clipboard.writeText(res.shareUrl);
      message.success('分享链接已复制到剪贴板');
    });
  };

  // 获取当前选中的学科名称
  const getSubjectLabel = () => {
    const subjectMap = {
      physics: '物理',
      math: '数学',
      chemistry: '化学',
      biology: '生物',
      geography: '地理',
      default: '其他'
    };
    return subjectMap[subject as keyof typeof subjectMap] || '其他';
  };

  // 获取当前选中的标签名称
  const getTagsLabel = () => {
    if (tags.length === 0) return '未选择';
    const subjectTags = subjectTagsConfig[subject as keyof typeof subjectTagsConfig];
    return tags.map(tagKey => {
      const tag = subjectTags.find(t => t.key === tagKey);
      return tag?.label || tagKey;
    }).join('，');
  };

  // 获取当前选中的风格名称
  const getStyleLabel = () => {
    const styleItem = styleConfig.find(s => s.key === style);
    return styleItem?.label || '简洁';
  };

  return (
    <div className="model-generate">
      <div className="model-generate__container">
        {/* 左侧：参数设置区（无滚动条） */}
        <div className="model-generate__left" style={{ overflow: 'hidden' }}>
          <Card title="参数设置" className="model-generate__param-card">
            {/* 1. 图片上传 */}
            <div className="model-generate__upload">
              <p className="model-generate__param-label">上传参考图片（可选）</p>
              <Upload
                name="image"
                beforeUpload={(file) => {
                  // 选择文件后立即显示预览并开始模拟上传
                  setUploadFile(file);
                  setIsUploading(true); // 开始上传，显示蒙版
                  
                  // 模拟上传过程（实际项目中替换为真实上传请求）
                  setTimeout(() => {
                    setIsUploading(false); // 上传完成，隐藏蒙版
                  }, 1500);
                  
                  return false; // 阻止自动上传
                }}
                showUploadList={false}
                accept="image/jpg,image/png"
              >
                <div className="model-generate__upload-area">
                  {uploadFile ? (
                    <div className="model-generate__upload-preview">
                      <img 
                        src={uploadFile ? URL.createObjectURL(uploadFile) : ''} 
                        alt="上传预览" 
                        className="model-generate__upload-img"
                        onLoad={() => {
                          URL.revokeObjectURL(URL.createObjectURL(uploadFile!));
                        }}
                      />
                      
                      {/* 上传蒙版加载效果 */}
                      {isUploading && (
                        <div className="model-generate__upload-mask">
                          <Spin size="large" />
                        </div>
                      )}
                      
                      <Button 
                        type="text" 
                        className="model-generate__upload-remove"
                        onClick={() => {
                          setUploadFile(null);
                          setIsUploading(false);
                        }}
                        disabled={isUploading} // 上传中禁用删除按钮
                      >
                        移除
                      </Button>
                    </div>
                  ) : (
                    <div className="model-generate__upload-placeholder">
                      <UploadOutlined />
                      <span>点击上传图片</span>
                    </div>
                  )}
                </div>
              </Upload>
            </div>

            {/* 2. 文字描述 */}
            <div className="model-generate__desc">
              <p className="model-generate__param-label">模型描述（必填）</p>
              <textarea
                className="model-generate__desc-input"
                placeholder="请描述您需要的 3D 模型，例如：一个带标签的人体心脏模型"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
              <p className="model-generate__desc-count">
                {description.length}/200 字
              </p>
            </div>

            {/* 3. 学科选择（弹窗形式） */}
            <div className="model-generate__subject">
              <p className="model-generate__param-label">所属学科（必填）</p>
              <Button
                type="default"
                onClick={() => setSubjectModalVisible(true)}
                block
              >
                {getSubjectLabel()} <span style={{ opacity: 0.5 }}>点击修改</span>
              </Button>
              
              <Modal
                title="选择学科"
                open={subjectModalVisible}
                onCancel={() => setSubjectModalVisible(false)}
                footer={[
                  <Button key="cancel" onClick={() => setSubjectModalVisible(false)}>
                    取消
                  </Button>,
                  <Button key="confirm" type="primary" onClick={() => setSubjectModalVisible(false)}>
                    确认
                  </Button>,
                ]}
              >
                <Select
                  value={subject}
                  onChange={setSubject}
                  style={{ width: '100%' }}
                  placeholder="请选择学科"
                  showSearch
                >
                  <Option value="physics">物理</Option>
                  <Option value="math">数学</Option>
                  <Option value="chemistry">化学</Option>
                  <Option value="biology">生物</Option>
                  <Option value="geography">地理</Option>
                  <Option value="default">其他</Option>
                </Select>
              </Modal>
            </div>

            {/* 4. 二级标签（弹窗形式） */}
            <div className="model-generate__tags">
              <p className="model-generate__param-label">知识模块（可选）</p>
              <Button
                type="default"
                onClick={() => setTagsModalVisible(true)}
                block
              >
                {getTagsLabel()} <span style={{ opacity: 0.5 }}>点击修改</span>
              </Button>
              
              <Modal
                title="选择二级标签"
                open={tagsModalVisible}
                onCancel={() => setTagsModalVisible(false)}
                footer={[
                  <Button key="cancel" onClick={() => setTagsModalVisible(false)}>
                    取消
                  </Button>,
                  <Button key="confirm" type="primary" onClick={() => setTagsModalVisible(false)}>
                    确认
                  </Button>,
                ]}
              >
                <Select
                  mode="multiple"
                  value={tags}
                  onChange={setTags}
                  style={{ width: '100%' }}
                  placeholder="请选择标签"
                >
                  {subjectTagsConfig[subject as keyof typeof subjectTagsConfig].map((tag) => (
                    <Option key={tag.key} value={tag.key}>
                      {tag.label}
                    </Option>
                  ))}
                </Select>
              </Modal>
            </div>

            {/* 5. 模型风格选择（弹窗形式） */}
            <div className="model-generate__style">
              <p className="model-generate__param-label">模型风格（必填）</p>
              <Button
                type="default"
                onClick={() => setStyleModalVisible(true)}
                block
              >
                {getStyleLabel()} <span style={{ opacity: 0.5 }}>点击修改</span>
              </Button>
              
              <Modal
                title="选择模型风格"
                open={styleModalVisible}
                onCancel={() => setStyleModalVisible(false)}
                footer={[
                  <Button key="cancel" onClick={() => setStyleModalVisible(false)}>
                    取消
                  </Button>,
                  <Button key="confirm" type="primary" onClick={() => setStyleModalVisible(false)}>
                    确认
                  </Button>,
                ]}
              >
                <div className="model-generate__style-options">
                  {styleConfig.map((item) => (
                    <div
                      key={item.key}
                      className={`model-generate__style-option ${
                        style === item.key ? 'model-generate__style-option--active' : ''
                      }`}
                      onClick={() => setStyle(item.key)}
                    >
                      <img 
                        src={item.thumbnail} 
                        alt={item.label} 
                        className="model-generate__style-thumbnail"
                      />
                      <span className="model-generate__style-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </Modal>
            </div>

            {/* 6. 精细度设置（弹窗形式） */}
            <div className="model-generate__precision">
              <p className="model-generate__param-label">模型精细度</p>
              <Button
                type="default"
                onClick={() => setPrecisionModalVisible(true)}
                block
              >
                {precision === 'low' ? '低' : precision === 'medium' ? '中' : '高'} 
                <span style={{ opacity: 0.5 }}>点击修改</span>
              </Button>
              
              <Modal
                title="设置模型精细度"
                open={precisionModalVisible}
                onCancel={() => setPrecisionModalVisible(false)}
                footer={[
                  <Button key="cancel" onClick={() => setPrecisionModalVisible(false)}>
                    取消
                  </Button>,
                  <Button key="confirm" type="primary" onClick={() => setPrecisionModalVisible(false)}>
                    确认
                  </Button>,
                ]}
              >
                <Slider
                  value={
                    precision === 'low' ? 1 : precision === 'medium' ? 2 : 3
                  }
                  onChange={(value) => {
                    if (value === 1) setPrecision('low');
                    else if (value === 2) setPrecision('medium');
                    else setPrecision('high');
                  }}
                  min={1}
                  max={3}
                  marks={{ 1: '低', 2: '中', 3: '高' }}
                  step={1}
                />
              </Modal>
            </div>

            {/* 7. 生成按钮 */}
            <Button
              type="primary"
              className="model-generate__generate-btn"
              loading={isGenerating}
              onClick={handleGenerateModel}
              block
            >
              生成模型
            </Button>
          </Card>
        </div>

        {/* 中间：模型展示区 */}
        <div className="model-generate__middle">
          <Card className="model-generate__model-card">
            {/* 模型控制栏 */}
            <div className="model-generate__control-bar">
              <Button 
                icon={<RotateLeftOutlined />} 
                size="small" 
                onClick={handleRotate}
                className="model-generate__control-btn"
              >
                旋转
              </Button>
              <Button 
                icon={<ZoomInOutlined />} 
                size="small" 
                onClick={handleZoom}
                className="model-generate__control-btn"
              >
                缩放
              </Button>
              <Button 
                icon={<MoreOutlined />} 
                size="small" 
                onClick={handleMove}
                className="model-generate__control-btn"
              >
                平移
              </Button>
              <Button 
                icon={<FullscreenOutlined />} 
                size="small" 
                onClick={handleFullscreen}
                className="model-generate__control-btn"
              >
                全屏
              </Button>
              <Button 
                size="small" 
                onClick={handleResetView}
                className="model-generate__control-btn"
              >
                重置视图
              </Button>

              {/* 视角预设 */}
              <Select
                size="small"
                placeholder="视角预设"
                style={{ width: 120, marginLeft: 16 }}
                onChange={(value) => {
                  if (controls) {
                    if (value === 'front') controls.target.set(0, 0, 0);
                    else if (value === 'side') controls.target.set(2, 0, 0);
                    else if (value === 'top') controls.target.set(0, 2, 0);
                    controls.update();
                  }
                }}
              >
                <Option value="front">前视图</Option>
                <Option value="side">侧视图</Option>
                <Option value="top">顶视图</Option>
              </Select>
            </div>

            {/* 3D模型渲染画布 */}
            <div className={`model-generate__model-canvas ${isFullscreen ? 'model-generate__model-canvas--fullscreen' : ''}`}>
              {isGenerating || !modelLoaded ? (
                <div className="model-generate__loading">
                  <Spin size="large" tip="模型生成中..."></Spin>
                </div>
              ) : currentModel ? (
                <Canvas shadows camera={{ position: [5, 5, 5] }}>
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[10, 10, 5]} castShadow />
                  <ModelPlaceholder modelUrl={currentModel.modelUrl} />
                  <OrbitControls
                    ref={setControls}
                    enableRotate={true}
                    enableZoom={true}
                    enablePan={true}
                    target={[0, 0, 0]}
                  />
                </Canvas>
              ) : (
                <Alert
                  message="请生成或选择历史模型"
                  description="通过左侧参数设置生成新模型，或从历史记录中选择已有模型"
                  type="info"
                  showIcon
                  style={{ height: '100%', display: 'flex', alignItems: 'center' }}
                />
              )}
            </div>
          </Card>
        </div>

        {/* 右侧：编辑调整区 + 历史记录 */}
        <div className="model-generate__right">
          {currentModel ? (
            <>
              <Card title="模型编辑" className="model-generate__edit-card">
                {/* 编辑标签页 */}
                <Tabs
                  activeKey={activeEditTab}
                  onChange={setActiveEditTab}
                  className="model-generate__edit-tabs"
                >
                  {/* 1. 外观调整 */}
                  <TabPane tab="外观调整" key="appearance">
                    <div className="model-generate__appearance-edit">
                      <div className="model-generate__edit-item">
                        <p className="model-generate__edit-label">整体颜色</p>
                        <input
                          type="color"
                          className="model-generate__color-picker"
                          defaultValue="#1890ff"
                        />
                      </div>

                      <div className="model-generate__edit-item">
                        <p className="model-generate__edit-label">材质类型</p>
                        <Select
                          defaultValue="plastic"
                          style={{ width: '100%' }}
                        >
                          <Option value="plastic">塑料</Option>
                          <Option value="metal">金属</Option>
                          <Option value="glass">玻璃</Option>
                          <Option value="wood">木材</Option>
                        </Select>
                      </div>

                      <div className="model-generate__edit-item">
                        <p className="model-generate__edit-label">透明度：50%</p>
                        <Slider
                          defaultValue={50}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>
                  </TabPane>

                  {/* 2. 注释添加 */}
                  <TabPane tab="注释添加" key="annotation">
                    <div className="model-generate__annotation-edit">
                      <div className="model-generate__edit-item">
                        <p className="model-generate__edit-label">添加文字标签</p>
                        <div className="model-generate__annotation-input-group">
                          <input
                            type="text"
                            className="model-generate__annotation-input"
                            placeholder="输入标签内容"
                          />
                          <Button type="primary" size="small">
                            添加
                          </Button>
                        </div>
                      </div>

                      <div className="model-generate__edit-item">
                        <p className="model-generate__edit-label">已添加标签</p>
                        <List
                          dataSource={['标签1', '标签2', '标签3']}
                          renderItem={(tag) => (
                            <List.Item
                              actions={[<EditOutlined />, <a>删除</a>]}
                            >
                              {tag}
                            </List.Item>
                          )}
                          locale={{ emptyText: '暂无标签' }}
                        />
                      </div>
                    </div>
                  </TabPane>

                  {/* 3. 动画设置 */}
                  <TabPane tab="动画设置" key="animation">
                    <div className="model-generate__animation-edit">
                      <div className="model-generate__edit-item">
                        <p className="model-generate__edit-label">预设动画</p>
                        <Select
                          defaultValue="rotate"
                          style={{ width: '100%' }}
                        >
                          <Option value="rotate">旋转</Option>
                          <Option value="disassemble">分解</Option>
                          <Option value="assemble">组装</Option>
                          <Option value="none">无动画</Option>
                        </Select>
                      </div>

                      <div className="model-generate__edit-item">
                        <p className="model-generate__edit-label">动画速度：中等</p>
                        <Slider
                          defaultValue={2}
                          min={1}
                          max={3}
                          marks={{ 1: '慢', 2: '中', 3: '快' }}
                          step={1}
                        />
                      </div>

                      <div className="model-generate__edit-item">
                        <Button 
                          icon={<PlayCircleOutlined />} 
                          size="small"
                          style={{ marginRight: 8 }}
                        >
                          播放
                        </Button>
                        <Button 
                          icon={<PauseCircleOutlined />} 
                          size="small"
                        >
                          暂停
                        </Button>
                      </div>
                    </div>
                  </TabPane>
                </Tabs>

                {/* 操作按钮区 */}
                <div className="model-generate__action-buttons">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    className="model-generate__action-btn"
                    onClick={handleSaveEdit}
                    block
                  >
                    保存修改
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    className="model-generate__action-btn"
                    onClick={handleDownloadModel}
                    block
                  >
                    下载模型
                  </Button>
                  <Button
                    icon={<ShareAltOutlined />}
                    className="model-generate__action-btn"
                    onClick={handleShareModel}
                    block
                  >
                    分享模型
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    className="model-generate__action-btn"
                    onClick={() => navigate('/model-lab')}
                    block
                  >
                    前往实验室（高级编辑）
                  </Button>
                </div>
              </Card>

              {/* 历史记录（移至右侧） */}
              <Card title="历史记录" className="model-generate__history-card" style={{ marginTop: 16 }}>
                <List
                  dataSource={historyModels}
                  renderItem={(model) => (
                    <List.Item
                      key={model.id}
                      className="model-generate__history-item"
                      onClick={() => handleLoadHistoryModel(model)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={model.thumbnail} shape="square" size={40} />}
                        title={model.name}
                        description={`${model.subject} · ${model.style}风格`}
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无历史生成记录' }}
                />
              </Card>
            </>
          ) : (
            // 无模型时显示提示 + 历史记录
            <>
              <Card className="model-generate__empty-card">
                <Alert
                  message="暂无模型"
                  description="请先生成模型或从历史记录中选择模型"
                  type="info"
                  showIcon
                />
              </Card>

              {/* 历史记录（移至右侧） */}
              <Card title="历史记录" className="model-generate__history-card" style={{ marginTop: 16 }}>
                <List
                  dataSource={historyModels}
                  renderItem={(model) => (
                    <List.Item
                      key={model.id}
                      className="model-generate__history-item"
                      onClick={() => handleLoadHistoryModel(model)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={model.thumbnail} shape="square" size={40} />}
                        title={model.name}
                        description={`${model.subject} · ${model.style}风格`}
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: '暂无历史生成记录' }}
                />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelGenerate;