import { create } from 'zustand';
import { apiClient } from '@/api/client';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const result = await apiClient.login(email, password);
      if (result.data) {
        set({
          user: result.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const result = await apiClient.register(email, password, name);
      if (result.data) {
        set({
          user: result.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    apiClient.logout();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    const token = apiClient.getToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const result = await apiClient.getMe();
      if (result.data) {
        set({
          user: result.data,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      apiClient.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
