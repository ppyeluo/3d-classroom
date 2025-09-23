import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Tabs, Card, Input, Select, Slider, Switch, Badge, message, Spin, Upload, Modal } from 'antd';
import { 
  DownloadOutlined, ShareAltOutlined, SaveOutlined, 
  PlusOutlined, DashOutlined, CopyOutlined, 
  PlayCircleOutlined, PauseCircleOutlined, UndoOutlined,
  RedoOutlined, UploadOutlined, EyeOutlined, EyeInvisibleOutlined
} from '@ant-design/icons';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, TransformControls } from '@react-three/drei';
import request from '../../utils/request';
import './ModelLab.scss';

const { Option } = Select;
const { TabPane } = Tabs;
const { Search } = Input;

// 模型类型定义
interface LabModel {
  id: string;
  name: string;
  description: string;
  modelUrl: string;
  thumbnail: string;
  subject: string;
  tags: string[];
  annotations: Annotation[];
  animations: Animation[];
  materials: Material[];
}

// 注释类型
interface Annotation {
  id: string;
  text: string;
  position: [number, number, number];
  color: string;
  size: number;
}

// 动画类型
interface Animation {
  id: string;
  name: string;
  type: 'rotate' | 'translate' | 'scale' | 'custom';
  speed: number;
  isPlaying: boolean;
}

// 材质类型
interface Material {
  id: string;
  name: string;
  color: string;
  opacity: number;
  type: 'plastic' | 'metal' | 'glass' | 'wood';
}

// 3D模型占位组件
const ModelPlaceholder = ({ modelUrl }: { modelUrl?: string }) => {
  return (
    <group>
      {/* 简单立方体占位 */}
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#1890ff" />
      </mesh>
      {/* 坐标轴辅助 */}
      <axesHelper args={[3]} />
    </group>
  );
};

const ModelLab = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const modelId = searchParams.get('id');
  
  // 状态管理
  const [model, setModel] = useState<LabModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('edit');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [selectedAnimation, setSelectedAnimation] = useState<Animation | null>(null);
  const [controls, setControls] = useState<any>(null);
  const [transformControls, setTransformControls] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 加载模型详情
  const fetchModelDetail = async () => {
    if (!modelId) {
      // 如果没有模型ID，显示空状态
      setModel(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 调用后端接口（预留）
      const res = await request.get(`/models/${modelId}`);
      
      // 模拟数据（实际项目应使用res.data）
      const mockModel: LabModel = {
        id: modelId,
        name: `高级编辑模型 ${modelId}`,
        description: '这是一个可进行高级编辑的3D模型，支持添加注释、动画和修改材质。',
        modelUrl: '/models/sample.glb',
        thumbnail: `https://picsum.photos/seed/${modelId}/300/200`,
        subject: 'physics',
        tags: ['力学', '教学模型'],
        annotations: [
          {
            id: 'anno-1',
            text: '主要部件',
            position: [1, 1, 0],
            color: '#ff4d4f',
            size: 16,
          },
          {
            id: 'anno-2',
            text: '连接点',
            position: [-1, -1, 0],
            color: '#52c41a',
            size: 14,
          },
        ],
        animations: [
          {
            id: 'anim-1',
            name: '旋转动画',
            type: 'rotate',
            speed: 1,
            isPlaying: false,
          },
          {
            id: 'anim-2',
            name: '缩放动画',
            type: 'scale',
            speed: 0.5,
            isPlaying: false,
          },
        ],
        materials: [
          {
            id: 'mat-1',
            name: '主体材质',
            color: '#1890ff',
            opacity: 1,
            type: 'plastic',
          },
        ],
      };

      setModel(mockModel);
      // 初始化历史记录
      setHistory([JSON.stringify(mockModel)]);
      setHistoryIndex(0);
    } catch (error) {
      console.error('加载模型详情失败', error);
      message.error('加载模型失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchModelDetail();
  }, [modelId]);

  // 保存历史记录
  const saveHistory = () => {
    if (!model) return;
    
    // 截断历史记录
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.stringify(model));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 撤销操作
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setModel(JSON.parse(history[newIndex]));
      setHistoryIndex(newIndex);
    }
  };

  // 重做操作
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setModel(JSON.parse(history[newIndex]));
      setHistoryIndex(newIndex);
    }
  };

  // 添加注释
  const handleAddAnnotation = () => {
    if (!model || !newAnnotationText.trim()) return;
    
    const newAnnotation: Annotation = {
      id: `anno-${Date.now()}`,
      text: newAnnotationText.trim(),
      position: [0, 0, 0], // 默认位置
      color: '#1890ff',
      size: 14,
    };
    
    const updatedModel = {
      ...model,
      annotations: [...model.annotations, newAnnotation],
    };
    
    setModel(updatedModel);
    setNewAnnotationText('');
    setSelectedAnnotation(newAnnotation);
    saveHistory();
  };

  // 更新注释
  const handleUpdateAnnotation = (id: string, updates: Partial<Annotation>) => {
    if (!model) return;
    
    const updatedModel = {
      ...model,
      annotations: model.annotations.map(anno => 
        anno.id === id ? { ...anno, ...updates } : anno
      ),
    };
    
    setModel(updatedModel);
    saveHistory();
  };

  // 删除注释
  const handleDeleteAnnotation = (id: string) => {
    if (!model) return;
    
    const updatedModel = {
      ...model,
      annotations: model.annotations.filter(anno => anno.id !== id),
    };
    
    setModel(updatedModel);
    if (selectedAnnotation?.id === id) {
      setSelectedAnnotation(null);
    }
    saveHistory();
  };

  // 添加动画
  const handleAddAnimation = (type: 'rotate' | 'translate' | 'scale' | 'custom') => {
    if (!model) return;
    
    const animationNames = {
      rotate: '旋转动画',
      translate: '平移动画',
      scale: '缩放动画',
      custom: '自定义动画',
    };
    
    const newAnimation: Animation = {
      id: `anim-${Date.now()}`,
      name: animationNames[type],
      type,
      speed: 1,
      isPlaying: false,
    };
    
    const updatedModel = {
      ...model,
      animations: [...model.animations, newAnimation],
    };
    
    setModel(updatedModel);
    setSelectedAnimation(newAnimation);
    saveHistory();
  };

  // 更新动画
  const handleUpdateAnimation = (id: string, updates: Partial<Animation>) => {
    if (!model) return;
    
    const updatedModel = {
      ...model,
      animations: model.animations.map(anim => 
        anim.id === id ? { ...anim, ...updates } : anim
      ),
    };
    
    setModel(updatedModel);
    saveHistory();
  };

  // 删除动画
  const handleDeleteAnimation = (id: string) => {
    if (!model) return;
    
    const updatedModel = {
      ...model,
      animations: model.animations.filter(anim => anim.id !== id),
    };
    
    setModel(updatedModel);
    if (selectedAnimation?.id === id) {
      setSelectedAnimation(null);
    }
    saveHistory();
  };

  // 播放/暂停所有动画
  const handleToggleAllAnimations = () => {
    if (!model) return;
    
    const newState = !isPlaying;
    const updatedModel = {
      ...model,
      animations: model.animations.map(anim => ({
        ...anim,
        isPlaying: newState,
      })),
    };
    
    setModel(updatedModel);
    setIsPlaying(newState);
  };

  // 保存模型修改
  const handleSaveModel = async () => {
    if (!model) return;
    
    try {
      // 调用后端接口（预留）
      await request.put(`/models/${model.id}`, {
        name: model.name,
        description: model.description,
        annotations: model.annotations,
        animations: model.animations,
        materials: model.materials,
      });
      
      message.success('模型保存成功');
    } catch (error) {
      console.error('保存模型失败', error);
      message.error('保存失败，请重试');
    }
  };

  // 下载模型
  const handleDownloadModel = () => {
    if (!model) return;
    
    // 调用后端接口（预留）
    window.open(`/api/models/${model.id}/download?format=glb`, '_blank');
  };

  // 分享模型
  const handleShareModel = async () => {
    if (!model) return;
    
    try {
      const res = await request.post(`/models/${model.id}/share`);
      // 复制链接到剪贴板
      navigator.clipboard.writeText(res.shareUrl);
      message.success('分享链接已复制到剪贴板');
    } catch (error) {
      console.error('生成分享链接失败', error);
      message.error('分享失败，请重试');
    }
  };

  return (
    <div className="model-lab">
      {loading ? (
        <div className="model-lab__loading">
          <Spin size="large" tip="加载模型中..."></Spin>
        </div>
      ) : model ? (
        <>
          {/* 顶部工具栏 */}
          <div className="model-lab__toolbar">
            <div className="model-lab__model-info">
              <h1 className="model-lab__model-name">{model.name}</h1>
              <div className="model-lab__model-tags">
                {model.tags.map(tag => (
                  <Badge key={tag} className="model-lab__model-tag" color="#1890ff">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="model-lab__actions">
              <Button 
                icon={<UndoOutlined />} 
                size="small"
                disabled={historyIndex <= 0}
                onClick={handleUndo}
                className="model-lab__action-btn"
              >
                撤销
              </Button>
              <Button 
                icon={<RedoOutlined />} 
                size="small"
                disabled={historyIndex >= history.length - 1}
                onClick={handleRedo}
                className="model-lab__action-btn"
              >
                重做
              </Button>
              
              <div className="model-lab__divider"></div>
              
              <Button 
                icon={showAnnotations ? <EyeOutlined /> : <EyeInvisibleOutlined />} 
                size="small"
                onClick={() => setShowAnnotations(!showAnnotations)}
                className="model-lab__action-btn"
              >
                {showAnnotations ? '隐藏注释' : '显示注释'}
              </Button>
              
              <div className="model-lab__divider"></div>
              
              <Button 
                icon={<SaveOutlined />} 
                onClick={handleSaveModel}
                className="model-lab__action-btn"
              >
                保存模型
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleDownloadModel}
                className="model-lab__action-btn"
              >
                下载模型
              </Button>
              <Button 
                icon={<ShareAltOutlined />} 
                onClick={handleShareModel}
                className="model-lab__action-btn"
              >
                分享模型
              </Button>
            </div>
          </div>

          <div className="model-lab__container">
            {/* 左侧：3D模型展示区 */}
            <div className="model-lab__preview">
              <Card className="model-lab__preview-card">
                {/* 模型控制栏 */}
                <div className="model-lab__preview-controls">
                  <Button 
                    icon={<PlayCircleOutlined />} 
                    size="small"
                    onClick={handleToggleAllAnimations}
                    className="model-lab__preview-control-btn"
                  >
                    {isPlaying ? '暂停所有动画' : '播放所有动画'}
                  </Button>
                  
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

                {/* 3D渲染画布 */}
                <div className="model-lab__canvas-container">
                  <Canvas shadows camera={{ position: [5, 5, 5] }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} castShadow />
                    
                    {/* 模型 */}
                    <ModelPlaceholder modelUrl={model.modelUrl} />
                    
                    {/* 注释标签 */}
                    {showAnnotations && model.annotations.map(annotation => (
                      <Html 
                        key={annotation.id}
                        position={annotation.position}
                        transform
                        distanceFactor={10}
                      >
                        <div 
                          className={`model-lab__annotation ${
                            selectedAnnotation?.id === annotation.id ? 'model-lab__annotation--selected' : ''
                          }`}
                          style={{ 
                            backgroundColor: annotation.color,
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: `${annotation.size}px`,
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedAnnotation(annotation)}
                        >
                          {annotation.text}
                        </div>
                      </Html>
                    ))}
                    
                    {/* 控制器 */}
                    <OrbitControls
                      ref={setControls}
                      enableRotate={true}
                      enableZoom={true}
                      enablePan={true}
                      target={[0, 0, 0]}
                    />
                    
                    {/* 变换控制器（用于移动注释等） */}
                    {selectedAnnotation && (
                      <TransformControls
                        ref={setTransformControls}
                        object={
                          // 实际项目中应绑定到注释对象
                          { position: selectedAnnotation.position }
                        }
                        mode="translate"
                        onChange={(value) => {
                          if (selectedAnnotation) {
                            handleUpdateAnnotation(selectedAnnotation.id, {
                              position: [value.x, value.y, value.z] as [number, number, number]
                            });
                          }
                        }}
                      />
                    )}
                  </Canvas>
                </div>
              </Card>
            </div>

            {/* 右侧：编辑面板 */}
            <div className="model-lab__editor">
              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                className="model-lab__editor-tabs"
              >
                {/* 1. 模型信息编辑 */}
                <TabPane tab="模型信息" key="info">
                  <div className="model-lab__editor-content">
                    <div className="model-lab__editor-item">
                      <label className="model-lab__editor-label">模型名称</label>
                      <Input
                        value={model.name}
                        onChange={(e) => {
                          if (model) {
                            setModel({ ...model, name: e.target.value });
                          }
                        }}
                      />
                    </div>

                    <div className="model-lab__editor-item">
                      <label className="model-lab__editor-label">模型描述</label>
                      <Input.TextArea
                        value={model.description}
                        onChange={(e) => {
                          if (model) {
                            setModel({ ...model, description: e.target.value });
                          }
                        }}
                        rows={4}
                      />
                    </div>

                    <div className="model-lab__editor-item">
                      <label className="model-lab__editor-label">所属学科</label>
                      <Select
                        value={model.subject}
                        onChange={(value) => {
                          if (model) {
                            setModel({ ...model, subject: value });
                          }
                        }}
                        style={{ width: '100%' }}
                      >
                        <Option value="physics">物理</Option>
                        <Option value="math">数学</Option>
                        <Option value="chemistry">化学</Option>
                        <Option value="biology">生物</Option>
                        <Option value="geography">地理</Option>
                      </Select>
                    </div>

                    <div className="model-lab__editor-item">
                      <label className="model-lab__editor-label">标签管理</label>
                      <div className="model-lab__tags-container">
                        <div className="model-lab__tags">
                          {model.tags.map(tag => (
                            <Badge 
                              key={tag}
                              className="model-lab__tag"
                              color="#1890ff"
                              closable
                              onClose={() => {
                                if (model) {
                                  setModel({
                                    ...model,
                                    tags: model.tags.filter(t => t !== tag)
                                  });
                                  saveHistory();
                                }
                              }}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="model-lab__add-tag">
                          <Input 
                            placeholder="添加标签" 
                            value={newAnnotationText}
                            onChange={(e) => setNewAnnotationText(e.target.value)}
                            onPressEnter={(e) => {
                              if (newAnnotationText.trim() && !model.tags.includes(newAnnotationText.trim())) {
                                setModel({
                                  ...model,
                                  tags: [...model.tags, newAnnotationText.trim()]
                                });
                                setNewAnnotationText('');
                                saveHistory();
                              }
                            }}
                            style={{ width: 160 }}
                          />
                          <Button 
                            icon={<PlusOutlined />} 
                            size="small"
                            onClick={() => {
                              if (newAnnotationText.trim() && !model.tags.includes(newAnnotationText.trim())) {
                                setModel({
                                  ...model,
                                  tags: [...model.tags, newAnnotationText.trim()]
                                });
                                setNewAnnotationText('');
                                saveHistory();
                              }
                            }}
                          >
                            添加
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabPane>

                {/* 2. 注释编辑 */}
                <TabPane tab="注释管理" key="annotations">
                  <div className="model-lab__editor-content">
                    <div className="model-lab__editor-item">
                      <label className="model-lab__editor-label">添加新注释</label>
                      <div className="model-lab__add-annotation">
                        <Input 
                          placeholder="输入注释内容" 
                          value={newAnnotationText}
                          onChange={(e) => setNewAnnotationText(e.target.value)}
                          onPressEnter={handleAddAnnotation}
                        />
                        <Button 
                          type="primary" 
                          icon={<PlusOutlined />}
                          onClick={handleAddAnnotation}
                        >
                          添加
                        </Button>
                      </div>
                    </div>

                    <div className="model-lab__editor-item">
                      <label className="model-lab__editor-label">已添加注释</label>
                      {model.annotations.length > 0 ? (
                        <div className="model-lab__annotations-list">
                          {model.annotations.map(annotation => (
                            <div 
                              key={annotation.id}
                              className={`model-lab__annotation-item ${
                                selectedAnnotation?.id === annotation.id ? 'model-lab__annotation-item--selected' : ''
                              }`}
                              onClick={() => setSelectedAnnotation(annotation)}
                            >
                              <div className="model-lab__annotation-text">
                                {annotation.text}
                              </div>
                              <div className="model-lab__annotation-actions">
                                <Button 
                                  icon={<DashOutlined />} 
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAnnotation(annotation.id);
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="model-lab__empty-text">暂无注释，请添加新注释</p>
                      )}
                    </div>

                    {selectedAnnotation && (
                      <div className="model-lab__editor-item model-lab__annotation-edit">
                        <label className="model-lab__editor-label">编辑选中注释</label>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">注释文本</label>
                          <Input
                            value={selectedAnnotation.text}
                            onChange={(e) => {
                              handleUpdateAnnotation(selectedAnnotation.id, {
                                text: e.target.value
                              });
                            }}
                          />
                        </div>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">文本颜色</label>
                          <input
                            type="color"
                            className="model-lab__color-picker"
                            value={selectedAnnotation.color}
                            onChange={(e) => {
                              handleUpdateAnnotation(selectedAnnotation.id, {
                                color: e.target.value
                              });
                            }}
                          />
                        </div>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">文本大小: {selectedAnnotation.size}px</label>
                          <Slider
                            value={selectedAnnotation.size}
                            min={10}
                            max={30}
                            step={1}
                            onChange={(value) => {
                              handleUpdateAnnotation(selectedAnnotation.id, {
                                size: value
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabPane>

                {/* 3. 动画编辑 */}
                <TabPane tab="动画管理" key="animations">
                  <div className="model-lab__editor-content">
                    <div className="model-lab__editor-item">
                      <label className="model-lab__editor-label">添加新动画</label>
                      <div className="model-lab__add-animation">
                        <Select
                          placeholder="选择动画类型"
                          style={{ width: 200, marginRight: 8 }}
                          onSelect={(value) => {
                            handleAddAnimation(value as any);
                          }}
                        >
                          <Option value="rotate">旋转动画</Option>
                          <Option value="translate">平移动画</Option>
                          <Option value="scale">缩放动画</Option>
                          <Option value="custom">自定义动画</Option>
                        </Select>
                      </div>
                    </div>

                    <div className="model-lab__editor-item">
                      <label className="model-lab__editor-label">已添加动画</label>
                      {model.animations.length > 0 ? (
                        <div className="model-lab__animations-list">
                          {model.animations.map(animation => (
                            <div 
                              key={animation.id}
                              className={`model-lab__animation-item ${
                                selectedAnimation?.id === animation.id ? 'model-lab__animation-item--selected' : ''
                              }`}
                              onClick={() => setSelectedAnimation(animation)}
                            >
                              <div className="model-lab__animation-info">
                                <div className="model-lab__animation-name">{animation.name}</div>
                                <div className="model-lab__animation-type">
                                  {animation.type === 'rotate' && '旋转'}
                                  {animation.type === 'translate' && '平移'}
                                  {animation.type === 'scale' && '缩放'}
                                  {animation.type === 'custom' && '自定义'}
                                </div>
                              </div>
                              <div className="model-lab__animation-actions">
                                <Button 
                                  icon={animation.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateAnimation(animation.id, {
                                      isPlaying: !animation.isPlaying
                                    });
                                  }}
                                />
                                <Button 
                                  icon={<DashOutlined />} 
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAnimation(animation.id);
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="model-lab__empty-text">暂无动画，请添加新动画</p>
                      )}
                    </div>

                    {selectedAnimation && (
                      <div className="model-lab__editor-item model-lab__animation-edit">
                        <label className="model-lab__editor-label">编辑选中动画</label>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">动画名称</label>
                          <Input
                            value={selectedAnimation.name}
                            onChange={(e) => {
                              handleUpdateAnimation(selectedAnimation.id, {
                                name: e.target.value
                              });
                            }}
                          />
                        </div>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">动画速度: {selectedAnimation.speed}x</label>
                          <Slider
                            value={selectedAnimation.speed}
                            min={0.1}
                            max={5}
                            step={0.1}
                            onChange={(value) => {
                              handleUpdateAnimation(selectedAnimation.id, {
                                speed: value
                              });
                            }}
                          />
                        </div>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">播放状态</label>
                          <Switch
                            checked={selectedAnimation.isPlaying}
                            onChange={(checked) => {
                              handleUpdateAnimation(selectedAnimation.id, {
                                isPlaying: checked
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabPane>

                {/* 4. 材质编辑 */}
                <TabPane tab="材质编辑" key="materials">
                  <div className="model-lab__editor-content">
                    <div className="model-lab__editor-item">
                      <p className="model-lab__editor-description">
                        在此处可以修改模型的材质属性，包括颜色、透明度和材质类型等。
                      </p>
                    </div>

                    {model.materials.map(material => (
                      <div key={material.id} className="model-lab__editor-item">
                        <label className="model-lab__editor-label">{material.name}</label>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">材质颜色</label>
                          <input
                            type="color"
                            className="model-lab__color-picker"
                            value={material.color}
                            onChange={(e) => {
                              // 实际项目需实现材质更新逻辑
                              console.log('更新材质颜色', e.target.value);
                            }}
                          />
                        </div>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">透明度: {Math.round(material.opacity * 100)}%</label>
                          <Slider
                            value={material.opacity}
                            min={0.1}
                            max={1}
                            step={0.1}
                            onChange={(value) => {
                              // 实际项目需实现透明度更新逻辑
                              console.log('更新透明度', value);
                            }}
                          />
                        </div>
                        
                        <div className="model-lab__editor-subitem">
                          <label className="model-lab__editor-sublabel">材质类型</label>
                          <Select
                            value={material.type}
                            style={{ width: '100%' }}
                            onChange={(value) => {
                              // 实际项目需实现材质类型更新逻辑
                              console.log('更新材质类型', value);
                            }}
                          >
                            <Option value="plastic">塑料</Option>
                            <Option value="metal">金属</Option>
                            <Option value="glass">玻璃</Option>
                            <Option value="wood">木材</Option>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabPane>
              </Tabs>
            </div>
          </div>
        </>
      ) : (
        <div className="model-lab__empty-state">
          <div className="model-lab__empty-content">
            <h3>未选择模型</h3>
            <p>请从素材市场或模型生成页面选择一个模型进行编辑</p>
            <Button 
              type="primary" 
              onClick={() => navigate('/material-market')}
            >
              前往素材市场
            </Button>
            <Button 
              style={{ marginLeft: 16 }}
              onClick={() => navigate('/model-generate')}
            >
              生成新模型
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelLab;