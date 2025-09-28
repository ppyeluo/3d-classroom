export interface MaterialModel {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  downloadCount: number;
  viewCount: number;
  createTime: number;
}

export interface UploadMaterialResponse {
  id: string;
  name: string;
  thumbnailUrl: string;
}

export interface QueryMaterialsParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  subject?: string;
}

export interface QueryMaterialsResponse {
  list: MaterialModel[];
  total: number;
}