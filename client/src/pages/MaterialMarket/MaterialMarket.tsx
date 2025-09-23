import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input, Select, Card, Row, Col, Badge, Pagination, message, Spin, Button } from 'antd';
import { SearchOutlined, DownloadOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import request from '../../utils/request';
import './MaterialMarket.scss';

const { Option } = Select;
const { Search } = Input;

// 模型类型定义（与后端一致）
interface MaterialModel {
  id: string;
  name: string;
  description: string;
  subject: string;
  tags: string[];
  thumbnail: string;
  downloadCount: number;
  favoriteCount: number;
  isFavorite: boolean;
  uploadTime: string;
}

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
  // 状态管理
  const [models, setModels] = useState<MaterialModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // 加载素材列表
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      // 构造查询参数
      const params = {
        keyword: searchKeyword,
        subject: selectedSubject !== 'all' ? selectedSubject : '',
        page,
        pageSize,
      };

      // 调用后端接口（预留）
      const res = await request.get('/materials', { params });
      
      // 模拟数据（实际项目应使用res.data）
      const mockData = Array.from({ length: pageSize }, (_, i) => ({
        id: `mat-${(page-1)*pageSize + i + 1}`,
        name: `${selectedSubject !== 'all' ? subjectOptions.find(s => s.key === selectedSubject)?.label : '通用'}模型 ${i+1}`,
        description: `这是一个${selectedSubject !== 'all' ? subjectOptions.find(s => s.key === selectedSubject)?.label : ''}教学用3D模型，适合课堂演示使用。`,
        subject: selectedSubject !== 'all' ? selectedSubject : 'physics',
        tags: ['教学专用', i % 2 === 0 ? '基础' : '进阶'],
        thumbnail: `https://picsum.photos/seed/${(page-1)*pageSize + i + 1}/300/200`,
        downloadCount: Math.floor(Math.random() * 1000),
        favoriteCount: Math.floor(Math.random() * 200),
        isFavorite: Math.random() > 0.8,
        uploadTime: `2024-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
      }));

      setModels(mockData);
      setTotal(120); // 模拟总条数
    } catch (error) {
      console.error('加载素材失败', error);
      message.error('加载素材失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载与参数变化时重新加载
  useEffect(() => {
    fetchMaterials();
  }, [page, pageSize, selectedSubject, searchKeyword]);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setPage(1); // 重置到第一页
  };

  // 切换学科
  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setPage(1); // 重置到第一页
  };

  // 收藏/取消收藏
  const handleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      // 调用后端接口（预留）
      await request.post(`/materials/${id}/${isFavorite ? 'unfavorite' : 'favorite'}`);
      
      // 更新本地状态
      setModels(models.map(model => 
        model.id === id ? { ...model, isFavorite: !isFavorite, favoriteCount: isFavorite ? model.favoriteCount - 1 : model.favoriteCount + 1 } : model
      ));
      
      message.success(isFavorite ? '已取消收藏' : '收藏成功');
    } catch (error) {
      console.error('操作收藏失败', error);
      message.error('操作失败，请重试');
    }
  };

  // 下载模型
  const handleDownload = async (id: string) => {
    try {
      // 调用后端接口（预留）
      const res = await request.get(`/materials/${id}/download-url`);
      
      // 模拟下载
      window.open(res.downloadUrl, '_blank');
      
      // 更新本地下载次数
      setModels(models.map(model => 
        model.id === id ? { ...model, downloadCount: model.downloadCount + 1 } : model
      ));
    } catch (error) {
      console.error('下载模型失败', error);
      message.error('下载失败，请重试');
    }
  };

  // 查看详情/编辑模型
  const handleViewDetail = (id: string) => {
    // 跳转到模型实验室页面（携带模型ID）
    window.location.href = `/model-lab?id=${id}`;
  };

  return (
    <div className="material-market">
      <div className="material-market__header">
        <h1 className="material-market__title">3D素材市场</h1>
        <p className="material-market__desc">
          浏览并下载优质教学3D模型，支持多学科分类检索
        </p>
      </div>

      {/* 筛选与搜索区 */}
      <div className="material-market__filters">
        <div className="material-market__filter-group">
          <Select
            value={selectedSubject}
            onChange={handleSubjectChange}
            style={{ width: 200, marginRight: 16 }}
            placeholder="选择学科"
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
            onSearch={handleSearch}
          />
        </div>
      </div>

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
                          src={model.thumbnail} 
                          alt={model.name} 
                          className="material-market__model-img"
                        />
                        <div className="material-market__model-actions">
                          <Button
                            icon={model.isFavorite ? <StarFilled /> : <StarOutlined />}
                            size="small"
                            className={`material-market__model-action-btn ${
                              model.isFavorite ? 'material-market__model-action-btn--favorite' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFavorite(model.id, model.isFavorite);
                            }}
                          />
                          <Button
                            icon={<DownloadOutlined />}
                            size="small"
                            className="material-market__model-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(model.id);
                            }}
                          />
                        </div>
                      </div>
                    }
                    onClick={() => handleViewDetail(model.id)}
                  >
                    <div className="material-market__model-info">
                      <h3 className="material-market__model-name">{model.name}</h3>
                      <p className="material-market__model-desc">{model.description}</p>
                      
                      <div className="material-market__model-tags">
                        {model.tags.map(tag => (
                          <Badge 
                            key={tag} 
                            className="material-market__model-tag"
                            color="#1890ff"
                          >
                            {tag}
                          </Badge>
                        ))}
                        <Badge 
                          className="material-market__model-tag"
                          color="#4caf50"
                        >
                          {subjectOptions.find(s => s.key === model.subject)?.label}
                        </Badge>
                      </div>
                      
                      <div className="material-market__model-stats">
                        <span className="material-market__model-stat">
                          下载: {model.downloadCount}
                        </span>
                        <span className="material-market__model-stat">
                          收藏: {model.favoriteCount}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 分页控件 */}
            <div className="material-market__pagination">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p) => setPage(p)}
                onShowSizeChange={(_, size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 个模型`}
              />
            </div>
          </>
        ) : (
          <div className="material-market__empty">
            <p>未找到匹配的模型，请尝试其他搜索条件</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialMarket;