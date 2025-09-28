import { create } from 'zustand';

interface FullscreenState {
  fullscreen:boolean,
  setFullscreen: (value: boolean) => void
}

export const useFullscreenState = create<FullscreenState>((set) => ({
  fullscreen: false,
  setFullscreen: (value: boolean) => set({ fullscreen: value }),
}));