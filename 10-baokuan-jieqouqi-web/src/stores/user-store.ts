import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AuthService } from '@/lib/auth-service'
import type { User, AuthError } from '@/types/auth'

interface UserState {
  // 基础状态
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null

  // 基础方法（向后兼容）
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void

  // 新增认证方法
  login: (token: string, user: User) => Promise<void>
  refreshUser: () => Promise<void>
  initializeAuth: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  setError: (error: AuthError | null) => void

  // 认证状态检查
  checkAuthStatus: () => boolean
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 基础方法（保持向后兼容）
      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          error: null 
        })
      },
      
      setToken: (token) => {
        set({ 
          token,
          error: null 
        })
      },
      
      logout: () => {
        console.log('🚪 Logging out user');
        set({ 
          user: null, 
          token: null,
          isAuthenticated: false,
          error: null 
        });
      },

      // 新增认证方法
      login: async (token: string, user: User) => {
        try {
          console.log('🔐 Logging in user:', user.id);
          set({ 
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null 
          });
        } catch (error) {
          console.error('❌ Login error:', error);
          set({ 
            error: {
              code: 'LOGIN_ERROR',
              message: '登录失败',
              details: error
            },
            isLoading: false 
          });
        }
      },

      refreshUser: async () => {
        try {
          set({ isLoading: true, error: null });
          console.log('🔄 Refreshing user data');
          
          const user = await AuthService.getCurrentUser();
          if (user) {
            set({ 
              user,
              isAuthenticated: true,
              isLoading: false,
              token: 'cookie-based'
            });
            console.log('✅ User data refreshed successfully');
          } else {
            // 无法获取用户信息，清除认证状态
            console.log('❌ No user found during refresh, clearing state');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('❌ Refresh user error:', error);
          set({ 
            error: {
              code: 'REFRESH_ERROR',
              message: '刷新用户信息失败',
              details: error
            },
            isLoading: false,
            user: null,
            token: null,
            isAuthenticated: false
          });
        }
      },

      initializeAuth: async () => {
        try {
          set({ isLoading: true, error: null });
          console.log('🚀 Initializing auth by checking current user');
          
          // 直接调用API检查当前用户状态（不依赖localStorage中的token）
          const user = await AuthService.getCurrentUser();
          if (user) {
            set({ 
              user,
              isAuthenticated: true,
              isLoading: false,
              token: 'cookie-based' // 标记为基于cookie的认证
            });
            console.log('✅ Auth initialized successfully for user:', user.id);
          } else {
            // 没有当前用户，清除状态
            console.log('❌ No current user found, clearing auth state');
            set({ 
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false 
            });
          }
        } catch (error) {
          console.error('❌ Initialize auth error:', error);
          set({ 
            error: {
              code: 'INIT_ERROR',
              message: '初始化认证失败',
              details: error
            },
            isLoading: false,
            user: null,
            token: null,
            isAuthenticated: false
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: AuthError | null) => {
        set({ error });
      },

      checkAuthStatus: () => {
        const { user, token } = get();
        return !!(user && token);
      }
    }),
    {
      name: 'user-auth-storage', // 用于localStorage的key
      storage: createJSONStorage(() => localStorage),
      // 只持久化必要的状态，不持久化loading和error状态
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)