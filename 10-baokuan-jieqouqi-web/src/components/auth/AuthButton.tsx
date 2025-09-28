// 登录/注册按钮组件
'use client';

import { Button } from '@/components/ui/button';
import { useUserStore } from '@/stores/user-store';

interface AuthButtonProps {
  redirectTo?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AuthButton({ 
  redirectTo = '/dashboard',
  variant = 'default',
  size = 'default',
  className 
}: AuthButtonProps) {
  const { isAuthenticated, isLoading } = useUserStore();

  // 如果已登录，不显示登录按钮
  if (isAuthenticated) {
    return null;
  }

  const handleSignIn = () => {
    const params = new URLSearchParams();
    if (redirectTo) {
      params.set('redirectTo', redirectTo);
    }
    
    const signInUrl = `/api/auth/sign-in${params.toString() ? '?' + params.toString() : ''}`;
    window.location.href = signInUrl;
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {isLoading ? '加载中...' : '登录 / 注册'}
    </Button>
  );
} 