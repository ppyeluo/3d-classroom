import { create } from 'zustand';

// 模型类型定义
export interface ModelInfo {
  generateType?: string;
  id: string;
  name: string;
  description: string;
  subject: string; // 所属学科（物理/数学/化学等）
  tags: string[]; // 二级标签（如力学/立体几何）
  style: string; // 风格（卡通/简洁/写实）
  precision: 'low' | 'medium' | 'high'; // 精细度
  thumbnail: string; // 缩略图地址
  modelUrl: string; // 模型文件地址
  createTime: string; // 创建时间
}

interface ModelState {
  currentModel: ModelInfo | null; // 当前选中模型
  historyModels: ModelInfo[]; // 历史生成模型
  setCurrentModel: (model: ModelInfo | null) => void;
  addHistoryModel: (model: ModelInfo) => void;
  clearHistoryModels: () => void;
}

export const useModelStore = create<ModelState>((set) => ({
  currentModel: null,
  historyModels: [],
  setCurrentModel: (model) => set({ currentModel: model }),
  addHistoryModel: (model) => set((state) => ({
    historyModels: [model, ...state.historyModels].slice(0, 10) // 最多保留10条历史
  })),
  clearHistoryModels: () => set({ historyModels: [] }),
}));