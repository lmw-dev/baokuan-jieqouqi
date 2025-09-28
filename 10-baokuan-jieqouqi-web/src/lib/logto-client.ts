// Logto 客户端配置和初始化
import LogtoClient from '@logto/next';
import { LogtoConfig } from '@/types/auth';

/**
 * 环境变量配置（一次性读取）
 */
const ENV_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_LOGTO_ENDPOINT || 'http://localhost:3001',
  appId: process.env.NEXT_PUBLIC_LOGTO_APP_ID || '',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  resource: process.env.NEXT_PUBLIC_LOGTO_RESOURCE || 'http://localhost:8000/api/v1',
  cookieSecret: process.env.LOGTO_COOKIE_SECRET || 'your-cookie-secret-at-least-32-characters-long'
} as const;

/**
 * Logto 配置
 */
export const logtoConfig: LogtoConfig = {
  endpoint: ENV_CONFIG.endpoint,
  appId: ENV_CONFIG.appId,
  baseUrl: ENV_CONFIG.baseUrl,
  resources: [ENV_CONFIG.resource],
  scopes: [
    'openid',
    'profile',
    'email',
    'phone',
    'offline_access' // 用于获取 refresh token
  ]
};

/**
 * 创建 Logto 客户端实例
 */
export const logtoClient = new LogtoClient({
  endpoint: logtoConfig.endpoint,
  appId: logtoConfig.appId,
  baseUrl: logtoConfig.baseUrl,
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieSecret: ENV_CONFIG.cookieSecret,
  resources: logtoConfig.resources,
  scopes: logtoConfig.scopes
});

/**
 * 认证相关的 URL 配置
 */
export const authUrls = {
  signIn: `${logtoConfig.baseUrl}/api/auth/sign-in`,
  signOut: `${logtoConfig.baseUrl}/api/auth/sign-out`,
  callback: `${logtoConfig.baseUrl}/api/auth/callback`,
  dashboard: `${logtoConfig.baseUrl}/dashboard`,
  home: `${logtoConfig.baseUrl}/`
} as const;

/**
 * 获取登录 URL
 */
export function getSignInUrl(redirectUri?: string): string {
  const params = new URLSearchParams();
  if (redirectUri) {
    params.set('redirectTo', redirectUri);
  }
  return `${authUrls.signIn}${params.toString() ? '?' + params.toString() : ''}`;
}

/**
 * 获取登出 URL
 */
export function getSignOutUrl(redirectUri?: string): string {
  const params = new URLSearchParams();
  if (redirectUri) {
    params.set('redirectTo', redirectUri);
  }
  return `${authUrls.signOut}${params.toString() ? '?' + params.toString() : ''}`;
}

/**
 * 检查 Logto 配置是否完整
 */
export function validateLogtoConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!ENV_CONFIG.endpoint) {
    errors.push('NEXT_PUBLIC_LOGTO_ENDPOINT is required');
  }
  
  if (!ENV_CONFIG.appId) {
    errors.push('NEXT_PUBLIC_LOGTO_APP_ID is required');
  }
  
  if (!ENV_CONFIG.baseUrl) {
    errors.push('NEXT_PUBLIC_APP_URL is required');
  }
  
  if (!ENV_CONFIG.cookieSecret || ENV_CONFIG.cookieSecret.length < 32) {
    errors.push('LOGTO_COOKIE_SECRET is required and must be at least 32 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 