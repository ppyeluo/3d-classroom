// src/pages/MaterialMarket/MaterialMarket.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Input, Select, Card, Row, Col, Badge, Pagination, message, 
  Spin, Button, Modal, Upload, Form, InputNumber
} from 'antd';
import { 
  SearchOutlined, DownloadOutlined, StarOutlined, StarFilled,
  UploadOutlined, PlusOutlined
} from '@ant-design/icons';
import materialApi from '../../api/materialApi';
import type { 
  QueryMaterialsParams, MaterialModel, QueryMaterialsResponse,
  CreateMaterialForm
} from '../../types/materialType';
import './MaterialMarket.scss';
import defaultImg from '../../assets/default.png';
import ModelModal from '../../components/ModelModal';

const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;
const { Item } = Form;

// 学科分类配置
const subjectOptions = [
  { key: 'all', label: '全部学科' },
  { key: 'physics', label: '物理' },
  { key: 'math', label: '数学' },
  { key: 'chemistry', label: '化学' },
  { key: 'biology', label: '生物' },
  { key: 'geography', label: '地理' },
];

const MaterialMarket = () => {
  const navigate = useNavigate();
  
  // 模型预览相关状态
  const [isModelModalVisible, setIsModelModalVisible] = useState(false);
  const [currentModelUrl, setCurrentModelUrl] = useState('');
  
  // 素材列表相关状态
  const [models, setModels] = useState<MaterialModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [favoriteStatus, setFavoriteStatus] = useState<Record<string, boolean>>({});

  // 上传素材相关状态
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [uploadLoading, setUploadLoading] = useState(false);

  // 获取素材列表数据
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      // 构建请求参数，过滤空值
      const params: QueryMaterialsParams = {
        page: page,
        pageSize: pageSize,
        keyword: searchKeyword.trim() || undefined,
        subject: selectedSubject !== 'all' ? selectedSubject : undefined
      };
      const res: QueryMaterialsResponse = await materialApi.queryMaterials(params);
      setModels(res.list);
      setTotal(res.total);
      
      // 初始化收藏状态
      const initFavorites: Record<string, boolean> = {};
      res.list.forEach(model => {
        initFavorites[model.id] = false;
      });
      setFavoriteStatus(initFavorites);
    } catch (error: any) {
      console.error('加载素材失败:', error);
      message.error(error.message || '加载素材失败，请重试');
      setModels([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 监听分页、筛选条件变化，重新加载数据
  useEffect(() => {
    fetchMaterials();
  }, [page, pageSize, selectedSubject, searchKeyword]);

  // 全局搜索事件监听
  useEffect(() => {
    const handleSearch = (e: CustomEvent) => {
      setSearchKeyword(e.detail);
      setPage(0);
    };
    window.addEventListener('marketSearch', handleSearch as EventListener);
    return () => {
      window.removeEventListener('marketSearch', handleSearch as EventListener);
    };
  }, []);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setPage(0);
  };

  // 学科筛选处理
  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setPage(0);
  };

  // 收藏状态切换
  const handleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      // 先更新UI状态，提升交互体验
      setFavoriteStatus(prev => ({
        ...prev,
        [id]: !isFavorite
      }));
      message.success(isFavorite ? '已取消收藏' : '收藏成功');
    } catch (error: any) {
      console.error('操作收藏失败:', error);
      message.error(error.message || '操作失败，请重试');
    }
  };

  // 下载素材处理
  const handleDownload = async (materialId: string, modelName: string) => {
    try {
      setLoading(true);
      const res = await materialApi.downloadMaterial(materialId);
      // 创建下载链接
      const link = document.createElement('a');
      link.href = res.modelUrl;
      link.download = modelName || `素材_${materialId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 更新下载计数（本地临时更新，优化体验）
      setModels(prev => 
        prev.map(model => 
          model.id === materialId 
            ? { ...model, downloadCount: model.downloadCount + 1 } 
            : model
        )
      );
      message.success('下载链接已生成，正在下载...');
    } catch (error: any) {
      console.error('下载模型失败:', error);
      message.error(error.message || '下载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 查看模型详情
  const handleViewDetail = (thumbnailUrl: string) => {
    // 从缩略图URL推导模型文件URL
    const glbUrl = thumbnailUrl.replace(/\.png$/, '.glb');
    setCurrentModelUrl(glbUrl);
    setIsModelModalVisible(true);
  };

  // 提交上传素材表单
  const handleUploadSubmit = async () => {
    try {
      // 表单校验
      const formValues = await form.validateFields();
      const { name, description, modelFile } = formValues as unknown as CreateMaterialForm;

      if (!modelFile) {
        message.warning('请上传3D模型文件');
        return;
      }

      // 构建表单数据
      const formData = new FormData();
      formData.append('name', name.trim());
      if (description.trim()) formData.append('description', description.trim());
      formData.append('modelFile', modelFile);

      // 调用上传接口
      setUploadLoading(true);
      await materialApi.uploadMaterial(formData);

      // 上传成功处理
      message.success('素材上传成功！');
      setUploadModalVisible(false);
      form.resetFields();
      fetchMaterials(); // 重新加载列表
    } catch (error: any) {
      console.error('素材上传失败:', error);
      // 错误处理
      if (error.response?.status === 401) {
        message.error('请先登录后再上传素材');
        navigate('/');
      } else if (error.response?.status === 413) {
        message.error('文件过大，最大支持50MB');
      } else {
        message.error(error.message || '素材上传失败，请重试');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // 上传前文件校验
  const beforeUpload = (file: File) => {
    // 校验文件格式
    const isGLB = file.type === 'model/gltf-binary' || file.name.endsWith('.glb');
    if (!isGLB) {
      message.error('仅支持GLB格式的3D模型文件');
      return false;
    }

    // 校验文件大小
    const isLt50M = file.size / 1024 / 1024 < 50;
    if (!isLt50M) {
      message.error('文件大小不能超过50MB');
      return false;
    }

    // 同步文件到表单
    form.setFieldValue('modelFile', file);
    return false; // 关闭自动上传
  };

  // 打开上传弹窗
  const handleOpenUploadModal = () => {
    form.resetFields();
    setUploadModalVisible(true);
  };

  return (
    <div className="material-market">
      {/* 模型预览模态框 */}
      {isModelModalVisible && (
        <ModelModal 
          modelUrl={currentModelUrl}
          visible={isModelModalVisible} 
          onClose={() => setIsModelModalVisible(false)} 
        />
      )}
      
      {/* 页面头部 */}
      <div className="material-market__header">
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          }}>
          <div>
            <h1 className="material-market__title">3D素材市场</h1>
            <p className="material-market__desc">
              浏览并下载优质教学3D模型，支持多学科分类检索
            </p>
          </div>
          {/* <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleOpenUploadModal}
          >
            上传素材
          </Button> */}
        </div>
      </div>

      {/* 筛选与搜索区 */}
      {/* <div className="material-market__filters">
        <div className="material-market__filter-group">
          <Select
            value={selectedSubject}
            onChange={handleSubjectChange}
            style={{ width: 200, marginRight: 16 }}
            placeholder="选择学科"
            disabled={loading}
          >
            {subjectOptions.map(option => (
              <Option key={option.key} value={option.key}>
                {option.label}
              </Option>
            ))}
          </Select>
          <Search
            placeholder="搜索模型名称或描述"
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 400 }}
            value={searchKeyword}
            onSearch={handleSearch}
            disabled={true}
          />
        </div>
      </div> */}

      {/* 素材列表区域 */}
      <div className="material-market__content">
        {loading ? (
          // 加载状态
          <div className="material-market__loading">
            <Spin size="large" tip="加载中..."></Spin>
          </div>
        ) : models.length > 0 ? (
          // 素材列表
          <>
            <Row gutter={[24, 24]}>
              {models.map(model => (
                <Col key={model.id} xs={24} sm={12} md={8} lg={6}>
                  <Card 
                    className="material-market__model-card"
                    hoverable
                    cover={
                      <div className="material-market__model-thumbnail">
                        <img 
                          src={model.thumbnailUrl} 
                          alt={model.name} 
                          className="material-market__model-img"
                          // 图片加载失败时显示默认图
                          onError={(e) => {
                            e.currentTarget.src = defaultImg;
                          }}
                        />
                        <div className="material-market__model-actions">
                          {/* <Button
                            icon={favoriteStatus[model.id] ? <StarFilled /> : <StarOutlined />}
                            size="small"
                            className={`material-market__model-action-btn ${
                              favoriteStatus[model.id] ? 'material-market__model-action-btn--favorite' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFavorite(model.id, favoriteStatus[model.id]);
                            }}
                            disabled={loading}
                          /> */}
                          <Button
                            icon={<DownloadOutlined />}
                            size="small"
                            className="material-market__model-action-btn"
                            onClick={(e) => {
                              e.stopPropagation(); // 阻止事件冒泡到卡片
                              handleDownload(model.id, model.name);
                            }}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    }
                    onClick={() => handleViewDetail(model.thumbnailUrl)}
                  >
                    <div className="material-market__model-info">
                      {/* <h3 className="material-market__model-name">{model.name}</h3>
                      <p className="material-market__model-desc">
                        {model.description || '暂无描述'}
                      </p> */}
                      {/* <div className="material-market__model-tags">
                        <Badge 
                          className="material-market__model-tag"
                          color="#4caf50"
                        >
                          {subjectOptions.find(s => s.key === model.subject)?.label || '未知学科'}
                        </Badge>
                      </div> */}
                      <div className="material-market__model-stats">
                        <span className="material-market__model-stat">
                          下载量: {model.downloadCount}
                        </span>
                        {/* <span className="material-market__model-stat">
                          浏览: {model.viewCount}
                        </span> */}
                        <span className="material-market__model-stat">
                          上传: {new Date(model.createTime * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
            
            {/* 分页组件 */}
            <div className="material-market__pagination" style={{
              position: 'absolute',
              color:'#E76F00',
              left: '40%',
              bottom: '40px',
              width:'300px'
            }}>
              <Pagination
                current={page + 1}
                pageSize={pageSize}
                total={total}
                onChange={(p) => setPage(p - 1)}
                // onShowSizeChange={(_, size) => {
                //   setPageSize(size);
                //   setPage(0);
                // }}
                // showSizeChanger
                // showQuickJumper
                // showTotal={(total) => `共 ${total} 个模型`}
                disabled={loading}
              />
            </div>
          </>
        ) : (
          // 空状态
          <div className="material-market__empty">
            <p>未找到匹配的模型，请尝试其他搜索条件</p>
          </div>
        )}
      </div>

      {/* 上传素材弹窗 */}
      <Modal
        title="上传3D素材"
        visible={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        onOk={handleUploadSubmit}
        confirmLoading={uploadLoading}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ description: '' }}
        >
          {/* 素材名称 */}
          <Item
            name="name"
            label="素材名称"
            rules={[
              { required: true, message: '请输入素材名称' },
              { min: 1, max: 100, message: '名称长度需在1-100字符之间' }
            ]}
          >
            <Input placeholder="请输入素材名称（如：初中物理-杠杆模型）" />
          </Item>

          {/* 素材描述 */}
          <Item
            name="description"
            label="素材描述"
            rules={[
              { max: 2000, message: '描述长度不能超过2000字符' }
            ]}
          >
            <TextArea 
              rows={4} 
              placeholder="请描述素材用途（如：适合初中物理力学课程演示）" 
            />
          </Item>

          {/* 模型文件上传 */}
          <Item
            name="modelFile"
            label="3D模型文件"
            rules={[
              { required: true, message: '请上传GLB格式的3D模型文件' }
            ]}
          >
            <Upload
              name="modelFile"
              beforeUpload={beforeUpload}
              showUploadList={false}
              accept=".glb"
            >
              <Button icon={<PlusOutlined />}>选择GLB文件（≤50MB）</Button>
            </Upload>
            <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              支持格式：GLB（推荐），最大大小：50MB，上传后将自动生成缩略图
            </p>
          </Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialMarket;