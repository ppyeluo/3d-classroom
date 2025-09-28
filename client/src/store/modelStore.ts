import { create } from 'zustand';

// 模型类型定义
export interface ModelInfo {
  generateType?: string;
  id: string;
  name: string;
  description: string;
  subject: string;
  tags: string[];
  style: string;
  precision: 'low' | 'medium' | 'high';
  thumbnail: string;
  modelUrl: string;
  createTime: string;
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
    historyModels: [model, ...state.historyModels].slice(0, 10)
  })),
  clearHistoryModels: () => set({ historyModels: [] }),
}));