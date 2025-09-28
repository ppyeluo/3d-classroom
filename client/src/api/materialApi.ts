import request from '../utils/request';
import type {
  UploadMaterialResponse,
  QueryMaterialsParams,
  QueryMaterialsResponse
} from '../types/materialType';

const materialApi = {
  // 查询素材列表
  queryMaterials: (params: QueryMaterialsParams): Promise<QueryMaterialsResponse> => {
    return request({
      url: '/api/material-market/materials',
      method: 'GET',
      params
    });
  },

  // 上传素材
  uploadMaterial: (formData: FormData): Promise<UploadMaterialResponse> => {
    return request({
      url: '/api/material-market/materials',
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // 下载素材
  downloadMaterial: (materialId: string): Promise<{ modelUrl: string }> => {
    return request({
      url: `/api/material-market/materials/${materialId}/download`,
      method: 'GET'
    });
  }
};

export default materialApi;