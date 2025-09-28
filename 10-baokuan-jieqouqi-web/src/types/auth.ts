// 认证相关的类型定义

/**
 * 扩展的用户类型，包含认证相关字段
 * 与Prisma生成的User类型保持一致
 */
export interface User {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  name: string | null;
  image: string | null;
  logtoId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Logto 配置接口
 */
export interface LogtoConfig {
  endpoint: string;
  appId: string;
  baseUrl: string;
  resources: string[];
  scopes: string[];
}

/**
 * 认证响应接口
 */
export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
  message?: string;
}

/**
 * 认证错误接口
 */
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

/**
 * 认证状态接口
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  error: AuthError | null;
}

/**
 * Logto 用户信息接口（从 Logto 获取的原始用户信息）
 */
export interface LogtoUserInfo {
  sub: string; // Logto user ID
  email?: string;
  phone_number?: string;
  name?: string;
  username?: string; // Logto username field
  picture?: string;
  email_verified?: boolean;
  phone_number_verified?: boolean;
  [key: string]: any;
}

/**
 * 认证回调参数
 */
export interface AuthCallbackParams {
  code: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * 用户创建/更新数据接口
 */
export interface UserCreateData {
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  image?: string | null;
  logtoId: string;
}

export interface UserUpdateData {
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  image?: string | null;
} 