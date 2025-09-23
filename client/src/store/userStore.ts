import { create } from 'zustand';

interface UserState {
  isLogin: boolean;
  userInfo: {
    avatar: string;
    name: string;
  } | null;
  login: (userData: { avatar: string; name: string }) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  isLogin: false,
  userInfo: null,
  login: (userData) => set({ isLogin: true, userInfo: userData }),
  logout: () => set({ isLogin: false, userInfo: null }),
}));