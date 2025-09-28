// src/pages/ModelGenerate/ModelGenerate.tsx
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, Button, Select, Tabs, Card, List, Avatar, message, Spin, Alert, Input, Pagination } from 'antd';
import { UploadOutlined, RotateLeftOutlined, FullscreenOutlined, DownloadOutlined  } from '@ant-design/icons';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useModelStore, type ModelInfo } from '../../store/modelStore';
import { useFullscreenState } from '../../store/fullscreenStore';
import request from '../../utils/request';
import api from '../../api'; // 导入接口集合
// 严格遵循接口文档定义的类型
import type { 
  UploadImageResponse, 
  CreateModelTaskRequest, 
  CreateModelTaskResponse,
  TaskStatus,
  ModelStyle,
  QueryTaskDetailResponse,
  QueryHistoryModelsParams,
  HistoryModelItem,
  QueryHistoryModelsResponse,
  GenerateType
} from '../../types/modelType';
import './ModelGenerate.scss';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Suspense } from 'react';
import materialApi from '../../api/materialApi';

const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Meta } = Card;

// 1. 科目与知识模块配置（非必填，保留完整选项）
const subjectConfig = [
  { key: 'chinese', label: '语文', role: '语文老师' },
  { key: 'math', label: '数学', role: '数学老师' },
  { key: 'english', label: '英语', role: '英语老师' },
  { key: 'physics', label: '物理', role: '物理老师' },
  { key: 'chemistry', label: '化学', role: '化学老师' },
  { key: 'biology', label: '生物', role: '生物老师' },
  { key: 'politics', label: '政治', role: '政治老师' },
  { key: 'history', label: '历史', role: '历史老师' },
  { key: 'geography', label: '地理', role: '地理老师' }
];

const subjectTagsConfig = {
  chinese: [
    { key: 'ancient-architecture', label: '古代建筑' },
    { key: 'spatial-description', label: '空间场景' },
    { key: 'cultural-relics', label: '文物形制' }
  ],
  math: [
    { key: 'solid-geometry', label: '立体几何模型' },
    { key: 'fractal-structures', label: '分形几何结构' },
    { key: 'geometric-solids', label: '基本几何体' },
    { key: 'graph-theory', label: '空间图形网络' }
  ],
  english: [
    { key: 'spatial-prepositions', label: '空间介词场景' },
    { key: '3d-object-descriptions', label: '三维物体描述' },
    { key: 'architectural-terms', label: '建筑术语场景' }
  ],
  physics: [
    { key: 'mechanical-structures', label: '机械结构模型' },
    { key: 'circuit-components', label: '电路元件三维结构' },
    { key: 'optics-systems', label: '光学仪器结构' },
    { key: 'wave-propagation', label: '波传播动态模型' },
    { key: 'atomic-models', label: '原子结构模型' }
  ],
  chemistry: [
    { key: 'molecular-models', label: '分子空间结构' },
    { key: 'crystal-structures', label: '晶体结构' },
    { key: 'chemical-equipment', label: '实验装置三维模型' },
    { key: 'atomic-arrangements', label: '原子排列方式' },
    { key: 'reaction-mechanisms', label: '反应过程动态模拟' }
  ],
  biology: [
    { key: 'cell-models', label: '细胞三维结构' },
    { key: 'organ-systems', label: '器官系统立体模型' },
    { key: 'dna-structures', label: 'DNA双螺旋结构' },
    { key: 'tissue-layers', label: '组织层次结构' },
    { key: 'skeletal-system', label: '骨骼系统模型' }
  ],
  politics: [
    { key: 'government-structures', label: '政府组织结构模型' },
    { key: 'economic-networks', label: '经济网络关系图' },
    { key: 'social-structures', label: '社会结构层次' }
  ],
  history: [
    { key: 'ancient-cities', label: '古城复原模型' },
    { key: 'historical-buildings', label: '历史建筑三维重建' },
    { key: 'cultural-relics', label: '文物三维模型' },
    { key: 'battlefield-terrain', label: '古战场地形' }
  ],
  geography: [
    { key: 'earth-inner', label: '地球内部结构' },
    { key: 'landform-models', label: '地形地貌三维模型' },
    { key: 'atmospheric-layers', label: '大气层结构' },
    { key: 'plate-tectonics', label: '板块运动模型' },
    { key: 'river-systems', label: '水系流域模型' }
  ]
};


// 2. 模型风格配置（与接口文档 ModelStyle 枚举完全匹配）
const styleConfig = [
  { key: 'cartoon', label: '卡通风格' },
  { key: 'clay', label: '黏土质感' },
  { key: 'steampunk', label: '蒸汽朋克' },
  { key: 'venom', label: '毒液风格' },
  { key: 'barbie', label: '芭比风尚' },
  { key: 'christmas', label: '圣诞主题' },
  { key: 'gold', label: '金色质感' },
  { key: 'ancient_bronze', label: '古铜风格' }
];

// 3. 3D模型渲染组件（对接接口文档 output 字段的模型地址）
const ModelRenderer = ({ modelUrl }: { modelUrl: string }) => {
  const gltf = useLoader(GLTFLoader, modelUrl);
  return (
    <group>
      <primitive object={gltf.scene} dispose={null} />
      <axesHelper args={[3]} />
    </group>
  );
};

// 4. 加载中占位组件
const ModelLoadingFallback = () => {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#E76F00" opacity={0.5} transparent />
      </mesh>
      <Html position={[0, 1, 0]} transform>
        <div className="model__name-tag">模型加载中...</div>
      </Html>
    </group>
  );
};

// 5. 加载动画组件（根据接口文档 TaskStatus 字段显示）
const GenerateLoading = ({ status, progress }: { status: TaskStatus, progress: number }) => {
  const statusTextMap = {
    queued: '任务排队中，等待处理...',
    running: `模型生成中（${progress}%）`,
    success: '生成成功，正在加载模型...',
    failed: '生成失败'
  };
  return (
    <div className="model-generate__loading-container" style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {status !== 'failed' ? (
        <>
          <Spin 
            size="large" 
            tip={statusTextMap[status]} 
            style={{ color: '#1890ff' }} 
          />
          {status === 'running' && (
            <div style={{ width: '80%', marginTop: 20 }}>
              <div style={{
                height: 8,
                backgroundColor: '#e5e7eb',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <div 
                  style={{
                    height: '100%',
                    backgroundColor: '#1890ff',
                    width: `${progress}%`,
                    transition: 'width 0.3s ease'
                  }}
                ></div>
              </div>
            </div>
          )}
        </>
      ) : (
        <Alert
          message="模型生成失败"
          description="请检查参数后重新尝试"
          type="error"
          showIcon
          style={{ maxWidth: 300 }}
        />
      )}
    </div>
  );
};

const ModelGenerate = () => {
  
const navigate = useNavigate();


  // 6. 核心状态（含生成后禁用控制）
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [imageToken, setImageToken] = useState(''); // 接口文档上传图片返回字段
  const [previewUrl, setPreviewUrl] = useState('');
  
  // 文字生成模型状态（科目/模块非必填）
  const [generateMode, setGenerateMode] = useState<'text' | 'image'>('text');
  const [subject, setSubject] = useState(''); // 初始空，非必填
  const [tags, setTags] = useState<string[]>([]); // 初始空，非必填
  const [description, setDescription] = useState(''); // 文本域内容
  const [style, setStyle] = useState('cartoon');
  
  // 接口对接与禁用控制状态
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false); // 控制生成中状态
  const [hasValidRequest, setHasValidRequest] = useState(false); // 标记有效生成请求
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null); // 轮询定时器引用
  // 全屏显示
  // 7. 历史模型列表相关状态（新增）
  const [historyModels, setHistoryModels] = useState<HistoryModelItem[]>([]); // 历史模型列表
  const [historyLoading, setHistoryLoading] = useState(true); // 历史记录加载中
  const [historyTotal, setHistoryTotal] = useState(0); // 历史记录总条数
  const [historyPage, setHistoryPage] = useState(0); // 当前页码（默认0，匹配接口）
  const [historyPageSize, setHistoryPageSize] = useState(5); // 每页数量
  const [historyFilterType, setHistoryFilterType] = useState<GenerateType | ''>(''); // 生成类型筛选

  const location = useLocation();
  const { currentModel, setCurrentModel, addHistoryModel } = useModelStore();
  const { fullscreen, setFullscreen } = useFullscreenState();
  const [controls, setControls] = useState<any>(null);

  // 8. 从首页跳转参数处理（保留原有逻辑）
  useEffect(() => {
    const state = location.state as any;
    if (state) {
      if (state.description) {
        setDescription(state.description);
        setGenerateMode('text');
      }
      if (state.defaultSubject) {
        setSubject(state.defaultSubject);
        setTags([subjectTagsConfig[state.defaultSubject as keyof typeof subjectTagsConfig][0].key]);
      }
      if (state.previewModel) {
        setCurrentModel(state.previewModel);
        setModelUrl(state.previewModel.modelUrl);
      }
    }
  }, [location.state, setCurrentModel]);

  // 9. 切换科目重置标签（仅当科目有值时触发）
  useEffect(() => {
    if (subject) {
      const defaultTag = subjectTagsConfig[subject as keyof typeof subjectTagsConfig][0].key;
      setTags([defaultTag]);
    } else {
      setTags([]);
    }
  }, [subject]);

  // 10. 图片上传（严格对接接口文档）
  const beforeUpload = async (file: File) => {
    const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isImage) {
      message.error('仅支持webp/jpeg/png格式');
      return false;
    }
    if (!isLt10M) {
      message.error('图片大小不能超过10MB');
      return false;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res: UploadImageResponse = await request({
        url: '/api/model-tasks/upload-image',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        data: formData
      });
      setImageToken(res.imageToken);
      setUploadFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      message.success(res.message || '图片上传成功');
      setIsUploading(false);
      return true;
    } catch (error: any) {
      setIsUploading(false);
      if (error.response?.status === 400) message.error('文件格式错误');
      else if (error.response?.status === 413) message.error('文件过大');
      else message.error('图片上传失败：' + (error.message || '未知错误'));
      return false;
    }
  };

  // 11. 提示词处理（按需封装）
const getFinalPrompt = (): string => {
  if (!subject && tags.length === 0) {
    return description.trim();
  }
  const teacherRole = subject? subjectConfig.find(item => item.key === subject)?.role || '教师' : '教师';
  const tagLabel = tags.length > 0 
   ? subjectTagsConfig[subject as keyof typeof subjectTagsConfig].find(item => item.key === tags[0])?.label
    : '相关';
  return `我是一名${teacherRole}，正在教授${tagLabel}的课，需要生成一个${description.trim()}模型`;
};

  // 12. 轮询任务详情（严格对接接口文档）
  const startTaskPolling = (taskId: string) => {
    if (!taskId) return;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    // 接口文档建议3秒轮询一次
    pollTimerRef.current = setInterval(async () => {
      try {
        const res: QueryTaskDetailResponse = await request({
          url: `/api/model-tasks/${taskId}`,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setTaskStatus(res.status);
        setTaskProgress(res.progress);
        // 任务完成：停止轮询+重置状态
        if (res.status === 'success' || res.status === 'failed') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setIsGenerating(false);
          setHasValidRequest(false);
          if (res.status === 'success') {
            const realModelUrl = res.output.qiniu_output?.pbr_model || res.output.pbr_model;
            fetchHistoryModels();
            if (realModelUrl) {
              setModelUrl(realModelUrl);
              // 构造历史模型数据
              const newModel: ModelInfo = {
                id: taskId,
                name: generateMode === 'text' 
                  ? `${subject ? subjectConfig.find(item => item.key === subject)?.label : '自定义'}模型`
                  : `图片生成模型_${Date.now()}`,
                description: getFinalPrompt(),
                subject: subject || '',
                tags: tags || [],
                style,
                precision: 'medium',
                thumbnail: generateMode === 'image' ? previewUrl : `https://via.placeholder.com/200x150?text=模型缩略图`,
                modelUrl: realModelUrl,
                createTime: new Date().toISOString()
              };
              setCurrentModel(newModel);
              addHistoryModel(newModel);
              message.success('模型加载完成');
            } else {
              setTaskStatus('failed');
              message.error('模型生成成功但未获取到模型地址');
            }
          } else {
            message.error(`模型生成失败：${res.errorMsg || '未知错误'}`);
          }
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsGenerating(false);
          setHasValidRequest(false);
          setTaskStatus('failed');
          message.error('任务不存在或无访问权限');
        } else if (error.response?.status === 401) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsGenerating(false);
          setHasValidRequest(false);
          message.error('令牌无效或已过期，请重新登录');
          localStorage.removeItem('token');
          navigate('/');
        } else {
          // message.error('查询任务进度失败，3秒后重试');
        }
      }
    }, 3000);
  };

  // 13. 创建模型任务（严格对接接口文档）
  const handleGenerateModel = async () => {
    let isParamValid = false;
    if (generateMode === 'text') {
      isParamValid = !!description.trim();
    } else if (generateMode === 'image') {
      isParamValid = !!imageToken;
    }
    if (!isParamValid) {
      message.warning(
        generateMode === 'text' 
          ? '请先输入模型描述（文本域不能为空）' 
          : '请先上传参考图片'
      );
      return;
    }
    try {
      setIsGenerating(true);
      setHasValidRequest(true);
      setTaskStatus('queued');
      setTaskProgress(0);
      setModelUrl('');
      // 构造接口请求参数
      const taskParams: CreateModelTaskRequest = {
        generateType: generateMode === 'text' ? 'text_to_model' : 'image_to_model',
        prompt: generateMode === 'text' ? getFinalPrompt() : undefined,
        imageToken: generateMode === 'image' ? imageToken : undefined,
        style: generateMode === 'image' ? style : undefined,
        modelVersion: 'v2.5-20250123'
      };
      const res: CreateModelTaskResponse = await request({
        url: '/api/model-tasks',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        data: taskParams
      });
      startTaskPolling(res.tripoTaskId);
      message.info(`任务已创建（ID：${res.id}），进入排队队列`);
    } catch (error: any) {
      setIsGenerating(false);
      setHasValidRequest(false);
      setTaskStatus('failed');
      if (error.response?.status === 403) {
        message.error('用户账号已禁用，无法生成模型');
      } else if (error.response?.status === 500) {
        message.error('Tripo3D API调用失败');
      } else if (error.response?.status === 401) {
        message.error('令牌无效，请重新登录');
        localStorage.removeItem('token');
        navigate('/');
      } else {
        message.error('创建任务失败：' + (error.message || '未知错误'));
      }
    }
  };

  // 14. 移除图片（仅在未生成时允许）
  const handleRemoveImage = () => {
    if (isGenerating) {
      message.warning('模型生成中，暂不允许移除图片');
      return;
    }
    setUploadFile(null);
    setImageToken('');
    setPreviewUrl('');
  };

  // 15. 加载历史模型（新增：适配接口返回格式）
  const handleLoadHistoryModel = (model: HistoryModelItem) => {
    // 转换接口返回格式为页面所需的 ModelInfo
    const modelInfo: ModelInfo = {
      id: model.taskId,
      name: model.generateType === 'text_to_model' 
        ? `文本生成模型_${new Date(model.createTime * 1000).toLocaleDateString()}`
        : `图片生成模型_${new Date(model.createTime * 1000).toLocaleDateString()}`,
      description: model.prompt || '图片生成模型（无提示词）',
      subject: subject || '',
      tags: [model.generateType === 'text_to_model' ? '文本生成' : '图片生成'],
      style: 'cartoon',
      precision: 'medium',
      thumbnail: model.thumbnailUrl,
      modelUrl: model.modelUrl,
      createTime: new Date(model.createTime * 1000).toISOString()
    };
    // 更新页面状态
    setCurrentModel(modelInfo);
    setModelUrl(model.modelUrl);
    // setDescription(model.prompt || '');
    // setSubject('');
    // setTags([model.generateType === 'text_to_model' ? '文本生成' : '图片生成']);
    // setStyle('cartoon');
    // setGenerateMode(model.generateType as 'text' | 'image');
    // // 图片生成模式下重置图片状态
    // if (model.generateType === 'image_to_model') {
    //   setUploadFile(null);
    //   setImageToken('');
    //   setPreviewUrl('');
    // }
  };

  // 16. 查询历史模型列表（新增：调用目标接口）
  const fetchHistoryModels = async () => {
    setHistoryLoading(true);
    try {
      // 构造接口请求参数
      const params: QueryHistoryModelsParams = {
        page: historyPage,
        pageSize: historyPageSize
      };
      if (historyFilterType) {
        params.generateType = historyFilterType;
      }
      // 调用历史模型接口（自动携带token）
      const res: QueryHistoryModelsResponse = await api.model.queryHistoryModels(params);
      // 更新历史记录状态
      setHistoryModels(res.list);
      setHistoryTotal(res.total);
      setHistoryPage(res.page);
      setHistoryPageSize(res.pageSize);
    } catch (error: any) {
      console.error('加载历史模型失败:', error);
      if (error.response?.status === 401) {
        message.error('登录已过期，请重新登录');
        localStorage.removeItem('token');
        navigate('/');
      } else {
        message.error('加载历史记录失败，请重试');
        setHistoryModels([]);
        setHistoryTotal(0);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  // 17. 页面初始化/筛选条件变化时加载历史记录
  useEffect(() => {
    fetchHistoryModels();
  }, [modelUrl, historyPage, historyPageSize, historyFilterType]);

  // 18. 3D模型控制（保留原有逻辑）
  const handleDownload = () => {
    if (controls) controls.reset();
      const link = document.createElement('a');
      link.href = modelUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  const handleResetView = () => {
    if (controls) controls.reset();
  };
  // 全屏显示
  const handleFullscreen = (value: boolean) => {
    setFullscreen(value)
  }
  // 19. 组件卸载时清除轮询（避免内存泄漏）
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);
  
  return (
    <div className="model-generate" style={
        !fullscreen ? {
          height: 'calc(100vh - 64px)'
        }: {
          width: '100%',
          height: '100vh',
        }
      }>
      <div className="model-generate__container" 
      // style={{
      //   display: 'flex',
      //   gap: 20,
      //   height: 'calc(100vh - 40px)'
      // }}
      >
        {/* 左侧：参数设置区 */}
        {!fullscreen && (<div className="model-generate__left" style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: 360,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 40px)'
        }}>
          <Card title="模型生成参数" style={{ flex: 1, overflow: 'auto' }}>
            {/* 生成模式切换 */}
            <Tabs
              activeKey={generateMode}
              onChange={(key) => {
                setGenerateMode(key as 'text' | 'image');
                setIsGenerating(false);
                setHasValidRequest(false);
                if (key === 'text') {
                  setUploadFile(null);
                  setImageToken(null);
                  setPreviewUrl('');
                }
              }}
              style={{ marginBottom: 16 }}
              tabBarStyle={{ marginBottom: 16 }}
              disabled={isGenerating}
            >
              <TabPane tab="文字生成模型" key="text" />
              <TabPane tab="图片生成模型" key="image" />
            </Tabs>
            {/* 文字生成参数 */}
            {generateMode === 'text' && (
              <div className="model-generate__text-param" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    模型描述（必填）
                  </label>
                  <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={200}
                    style={{
                      resize: 'none',
                      borderRadius: 4,
                      borderColor: '#d9d9d9'
                    }}
                    disabled={isGenerating}
                    placeholder={isGenerating ? '模型生成中，文本描述暂不允许修改' : '请描述需要生成的3D模型'}
                  />
                  <p style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: '#999',
                    textAlign: 'right'
                  }}>
                    {description.length}/200 字符
                  </p>
                </div>
                {/* 科目+知识模块 */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                      所属科目（可选）
                    </label>
                    <Select
                      value={subject}
                      onChange={setSubject}
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="label"
                      allowClear
                      placeholder="所属科目（可选）"
                      disabled={isGenerating}
                    >
                      {subjectConfig.map((item) => (
                        <Option key={item.key} value={item.key} label={item.label}>
                          {item.label}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                      知识模块（可选）
                    </label>
                    <Select
                      value={tags}
                      onChange={setTags}
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="label"
                      allowClear
                      placeholder="知识模块（可选）"
                      disabled={!subject || isGenerating}
                    >
                      {subject && subjectTagsConfig[subject as keyof typeof subjectTagsConfig].map((tag) => (
                        <Option key={tag.key} value={tag.key} label={tag.label}>
                          {tag.label}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            )}
            {/* 图片生成参数 */}
            {generateMode === 'image' && (
              <div className="model-generate__image-param" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    参考图片（必填）
                  </label>
                  <div style={{
                    height: 200,
                    border: '1px dashed #d9d9d9',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt="参考图片预览"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: 10
                          }}
                        />
                        <Button
                          type="text"
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            color: '#fff',
                            zIndex: 5
                          }}
                          onClick={handleRemoveImage}
                          disabled={isGenerating}
                          title={isGenerating ? '模型生成中，暂不允许移除图片' : '移除图片'}
                        >
                          移除
                        </Button>
                      </>
                    ) : (
                      <Upload
                        name="file"
                        beforeUpload={beforeUpload}
                        showUploadList={false}
                        accept="image/jpeg,image/png,image/webp"
                        disabled={isUploading || isGenerating}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <UploadOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                          <p style={{ color: '#666' }}>点击上传图片</p>
                          <p style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                            支持webp/jpeg/png，最大10MB
                          </p>
                        </div>
                      </Upload>
                    )}
                    {isUploading && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Spin size="large" tip="图片上传中" style={{ color: '#fff' }} />
                      </div>
                    )}
                  </div>
                </div>
                {/* 模型风格 */}
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                    模型风格（可选）
                  </label>
                  <Select
                    // allowClear
                    value={style}
                    onChange={(value) => setStyle(value as ModelStyle)}
                    style={{ width: '100%' }}
                    placeholder="请选择模型风格（可选）"
                    disabled={isGenerating}
                  >
                    {styleConfig.map((item) => (
                      <Option key={item.key} value={item.key}>
                        {item.label}
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
            {/* 生成按钮 */}
            <Button
              type="primary"
              size="large"
              onClick={handleGenerateModel}
              loading={isGenerating}
              block
              style={{
                marginTop: 24,
                height: 44,
                fontSize: 16
              }}
              disabled={generateMode === 'image' && !imageToken}
            >
              {isGenerating ? `生成中` : '生成3D模型'}
            </Button>
          </Card>
        </div>)}
        {/* 中间：模型展示区 */}
        <div className="model-generate__middle" style={{
          // flex: 1,
          // display: 'flex',
          // flexDirection: 'column'
        }}>
          {/* <Card title="模型展示区" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}> */}
            {/* 模型控制栏 */}
        <div style={
              !fullscreen ? {
                position: 'absolute',
                top: '0',
                left: '360px',
                right: '300px',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.05) 0%, rgba(24, 144, 255, 0.1) 50%, rgba(24, 144, 255, 0.05) 100%)',
                backgroundImage: 'linear-gradient(rgba(24, 144, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(24, 144, 255, 0.1) 1px, transparent 1px)',
                backgroundSize:'30px 30px',
                boxShadow:' inset 0 0 150px rgba(24, 144, 255, 0.2)'
              }: {
                width: '100%',
                height: '100vh',
                background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.05) 0%, rgba(24, 144, 255, 0.1) 50%, rgba(24, 144, 255, 0.05) 100%)',
                backgroundImage: 'linear-gradient(rgba(24, 144, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(24, 144, 255, 0.1) 1px, transparent 1px)',
                backgroundSize:'30px 30px',
                boxShadow:' inset 0 0 150px rgba(24, 144, 255, 0.2)'
              }
            }>
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '0',
              zIndex: '99',
              display: 'flex',
              gap: '10px',
              marginLeft: '10px'
            }}>
              <Button
                icon={<FullscreenOutlined />}
                size="small"
                onClick={() => handleFullscreen(!fullscreen)}
                style={{ border: '1px solid #d9d9d9',
                    backgroundColor:'#fff'
                 }}
                disabled={!modelUrl}
              >
                {fullscreen ? '退出全屏' : '全屏显示'}
              </Button>
              <Button
                icon={<RotateLeftOutlined />}
                size="small"
                onClick={handleResetView}
                style={{ border: '1px solid #d9d9d9',
                    backgroundColor:'#fff' }}
                disabled={!modelUrl}
              >
                重置视图
              </Button>
              <Button
                icon={<DownloadOutlined />}
                size="small"
                onClick={handleDownload}
                style={{ border: '1px solid #d9d9d9',
                    backgroundColor:'#fff' }}
                disabled={!modelUrl}
              >
                下载
              </Button>
            </div>
            {/* 模型渲染/加载动画区域 */}
            <div style={{
              height: '100vh',
              // backgroundColor: 'red'
            }}>
              {hasValidRequest && isGenerating && !modelUrl ? (
                <GenerateLoading
                  status={taskStatus || 'queued'}
                  progress={taskProgress}
                />
              ) : modelUrl ? (
                <Canvas shadows camera={{ position: [1,1,1] }} style={{ width: '100%', height: '100%' }}>
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[10, 10, 5]} castShadow />
                  <Suspense fallback={<ModelLoadingFallback />}>
                    <ModelRenderer modelUrl={modelUrl} />
                  </Suspense>
                  <OrbitControls
                    ref={setControls}
                    enableRotate={true}
                    enableZoom={true}
                    enablePan={true}
                    target={[0, 0, 0]}
                  />
                </Canvas>
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Alert
                    message="暂无模型"
                    description={
                      generateMode === 'text' 
                        ? `请输入模型描述后点击“生成3D模型”${historyModels.length > 0 ? '或点击历史记录区模型查看': ''}`
                        : `请上传参考图片后点击“生成3D模型”${historyModels.length > 0 ? '或点击历史记录区模型查看': ''}`
                    }
                    type="info"
                    showIcon
                    style={{ maxWidth: 300 }}
                  />
                </div>
              )}
            </div>
        </div>
          {/* </Card> */}
        </div>
        {/* 右侧：历史记录区 */}
        {!fullscreen && (<div className="model-generate__right" style={{
          position: 'absolute',
          right: '0',
          top:'0',
          width: 300,
          height: 'calc(100vh - 40px)'
        }}>
          <Card title="历史生成记录" style={{ display: 'flex', flexDirection: "column", height: '100%' }}>
              {/* 历史记录筛选栏 */}
              {/* <div className="history-filter-bar" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Select
                      value={historyFilterType}
                      onChange={(value) => setHistoryFilterType(value as GenerateType | '')}
                      style={{ width: '100%' }}
                      placeholder="筛选生成类型"
                      disabled={historyLoading}
                  >
                      <Option value="">全部类型</Option>
                      <Option value="text_to_model">文本生成</Option>
                      <Option value="text_to_model">图片生成</Option>
                  </Select>
              </div> */}

              {/* 历史记录内容区，整体设置为flex:1并设置overflow-y为auto实现滚动 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  {/* 历史记录列表 */}
                  <List style={{ flex: 1 }}
                      dataSource={historyModels}
                      renderItem={(model) => (
                          <List.Item
                              key={model.taskId}
                              className="model-generate__history-item"
                              onClick={() => handleLoadHistoryModel(model)}
                              style={{
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f0f0f0',
                                  padding: 12,
                                  display: 'flex',
                                  alignItems: 'center', // 垂直居中
                              }}
                          >
                              <List.Item.Meta
                                  avatar={
                                      <Avatar
                                          src={model.thumbnailUrl}
                                          shape="square"
                                          size={48}
                                          style={{ objectFit: 'cover' }}
                                      />
                                  }
                                  description={
                                      <div style={{ fontSize: 12, color: '#999', marginLeft: 12 }}>
                                          <p>{new Date(model.createTime * 1000).toLocaleString()}</p>
                                      </div>
                                  }
                              />
                          </List.Item>
                      )}
                  />

                  {/* 分页控件，固定在底部 */}
                  <div style={{ marginTop: 16, textAlign: 'center', height: '40px' }}>
                      <Pagination
                          current={historyPage + 1}
                          pageSize={5}
                          total={historyTotal}
                          onChange={(p) => setHistoryPage(p - 1)}
                      />
                  </div>
              </div>
          </Card>
        </div>)}
      </div>
    </div>
  );
};

export default ModelGenerate;