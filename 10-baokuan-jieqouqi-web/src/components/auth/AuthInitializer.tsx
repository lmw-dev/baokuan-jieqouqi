'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/stores/user-store';

/**
 * 认证初始化组件
 * 在应用启动时自动检查用户登录状态
 */
export function AuthInitializer() {
  const { initializeAuth } = useUserStore();

  useEffect(() => {
    // 初始化认证状态
    initializeAuth();
  }, [initializeAuth]);

  // 这个组件不渲染任何UI
  return null;
}