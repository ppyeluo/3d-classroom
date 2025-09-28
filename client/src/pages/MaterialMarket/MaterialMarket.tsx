// src/pages/MaterialMarket/MaterialMarket.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Input, Select, Card, Row, Col, Badge, Pagination, message, 
  Spin, Button, Modal, Upload, Form, InputNumber // 新增：Form/Upload等组件
} from 'antd';
import { 
  SearchOutlined, DownloadOutlined, StarOutlined, StarFilled,
  UploadOutlined, PlusOutlined // 新增：上传图标
} from '@ant-design/icons';
import materialApi from '../../api/materialApi';
import type { 
  QueryMaterialsParams, MaterialModel, QueryMaterialsResponse,
  CreateMaterialForm // 新增：创建素材表单类型
} from '../../types/materialType';
import './MaterialMarket.scss';
import defaultImg from '../../assets/default.png';

const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;
const { Item } = Form;

// 学科分类配置（原有代码保留）
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
  
  // 原有状态保留
  const [models, setModels] = useState<MaterialModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [favoriteStatus, setFavoriteStatus] = useState<Record<string, boolean>>({});

  // 新增：上传素材相关状态
  const [uploadModalVisible, setUploadModalVisible] = useState(false); // 上传弹窗显示状态
  const [form] = Form.useForm(); // 表单实例
  const [uploadLoading, setUploadLoading] = useState(false); // 上传按钮加载状态

  // 原有：加载素材列表（保留）
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params: QueryMaterialsParams = {
        page: page,
        pageSize: pageSize,
        keyword: searchKeyword.trim() || undefined,
        subject: selectedSubject !== 'all' ? selectedSubject : undefined
      };
      const res: QueryMaterialsResponse = await materialApi.queryMaterials(params);
      setModels(res.list);
      setTotal(res.total);
      
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

  // 原有：初始化加载（保留）
  useEffect(() => {
    fetchMaterials();
  }, [page, pageSize, selectedSubject, searchKeyword]);

  // 原有：搜索/学科切换/收藏/下载/查看详情（保留）
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

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setPage(0);
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setPage(0);
  };

  const handleFavorite = async (id: string, isFavorite: boolean) => {
    try {
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

  const handleDownload = async (materialId: string, modelName: string) => {
    try {
      setLoading(true);
      const res = await materialApi.downloadMaterial(materialId);
      const link = document.createElement('a');
      link.href = res.modelUrl;
      link.download = modelName || `素材_${materialId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
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

  const handleViewDetail = (id: string) => {
    navigate(`/model-lab?id=${id}`);
  };

  // 新增：上传素材逻辑
  /**
   * 1. 表单提交：收集表单数据，调用创建素材接口
   */
  const handleUploadSubmit = async () => {
    try {
      // 1.1 校验表单（必填项检查）
      const formValues = await form.validateFields();
      const { name, description, modelFile } = formValues as unknown as CreateMaterialForm;

      if (!modelFile) {
        message.warning('请上传3D模型文件');
        return;
      }

      // 1.2 构造FormData（文件上传必需格式）
      const formData = new FormData();
      formData.append('name', name.trim()); // 素材名称
      if (description.trim()) formData.append('description', description.trim()); // 可选描述
      formData.append('modelFile', modelFile); // 3D模型文件

      // 1.3 调用接口上传素材
      setUploadLoading(true);
      const newMaterial = await materialApi.uploadMaterial(formData);

      // 1.4 上传成功后更新列表
      message.success('素材上传成功！');
      setUploadModalVisible(false); // 关闭弹窗
      form.resetFields(); // 重置表单
      fetchMaterials(); // 重新加载素材列表
    } catch (error: any) {
      console.error('素材上传失败:', error);
      // 接口错误处理（匹配接口文档状态码）
      if (error.response?.status === 401) {
        message.error('请先登录后再上传素材');
        navigate('/'); // 跳转首页登录
      } else if (error.response?.status === 413) {
        message.error('文件过大，最大支持50MB');
      } else {
        message.error(error.message || '素材上传失败，请重试');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  /**
   * 2. 文件上传前校验（格式+大小）
   */
  const beforeUpload = (file: File) => {
    // 校验文件格式（仅支持glb，可根据需求扩展）
    const isGLB = file.type === 'model/gltf-binary' || file.name.endsWith('.glb');
    if (!isGLB) {
      message.error('仅支持GLB格式的3D模型文件');
      return false;
    }

    // 校验文件大小（≤50MB，与接口文档一致）
    const isLt50M = file.size / 1024 / 1024 < 50;
    if (!isLt50M) {
      message.error('文件大小不能超过50MB');
      return false;
    }

    // 手动触发Form表单值更新（Upload组件需手动同步文件到表单）
    form.setFieldValue('modelFile', file);
    return false; // 关闭自动上传，通过表单提交统一触发
  };

  /**
   * 3. 打开上传弹窗（重置表单）
   */
  const handleOpenUploadModal = () => {
    form.resetFields();
    setUploadModalVisible(true);
  };

  return (
    <div className="material-market">
      {/* 页面头部：新增“上传素材”按钮 */}
      <div className="material-market__header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="material-market__title">3D素材市场</h1>
            <p className="material-market__desc">
              浏览并下载优质教学3D模型，支持多学科分类检索
            </p>
          </div>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleOpenUploadModal}
            // 可根据登录状态控制显示（使用useUserStore）
            // disabled={!isLogin}
          >
            上传素材
          </Button>
        </div>
      </div>

      {/* 筛选与搜索区（原有代码保留） */}
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

      {/* 素材列表 */}
      <div className="material-market__content">
        {loading ? (
          <div className="material-market__loading">
            <Spin size="large" tip="加载中..."></Spin>
          </div>
        ) : models.length > 0 ? (
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
                              e.stopPropagation();
                              handleDownload(model.id, model.name);
                            }}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    }
                    onClick={() => handleViewDetail(model.id)}
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
                          下载: {model.downloadCount}
                        </span>
                        <span className="material-market__model-stat">
                          浏览: {model.viewCount}
                        </span>
                        <span className="material-market__model-stat">
                          上传: {new Date(model.createTime * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
            <div className="material-market__pagination">
              <Pagination
                current={page + 1}
                pageSize={pageSize}
                total={total}
                onChange={(p) => setPage(p - 1)}
                onShowSizeChange={(_, size) => {
                  setPageSize(size);
                  setPage(0);
                }}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 个模型`}
                disabled={loading}
                pageSizeOptions={['10', '20', '30', '50']}
              />
            </div>
          </>
        ) : (
          <div className="material-market__empty">
            <p>未找到匹配的模型，请尝试其他搜索条件</p>
          </div>
        )}
      </div>

      {/* 新增：上传素材弹窗 */}
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
          initialValues={{ description: '' }} // 初始值
        >
          {/* 素材名称（必传） */}
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

          {/* 素材描述（可选） */}
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

          {/* 3D模型文件（必传） */}
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
              accept=".glb" // 仅允许选择glb文件
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