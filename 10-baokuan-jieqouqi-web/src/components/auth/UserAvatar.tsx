// 用户头像和下拉菜单组件
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useUserStore } from '@/stores/user-store';
import { LogOut, User, Settings, CreditCard } from 'lucide-react';

interface UserAvatarProps {
  showName?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function UserAvatar({ 
  showName = false, 
  size = 'default',
  className 
}: UserAvatarProps) {
  const { user, isAuthenticated, logout } = useUserStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 如果未登录，不显示头像
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      console.log('🚪 Starting sign out process');
      
      // 1. 清除本地状态
      logout();
      console.log('✅ Local state cleared');
      
      // 2. 给用户一个视觉反馈
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. 重定向到登出API（这会调用Logto的登出端点）
      console.log('🔗 Redirecting to sign-out API');
      window.location.href = '/api/auth/sign-out';
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      
      // 即使发生错误，也要尝试清除本地状态
      logout();
      
      // 尝试强制重定向
      try {
        window.location.replace('/api/auth/sign-out');
      } catch (fallbackError) {
        console.error('❌ Fallback redirect failed:', fallbackError);
        // 最后的备用方案：重定向到首页
        window.location.href = '/';
      }
      
      setIsLoggingOut(false);
    }
  };

  const avatarSize = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12'
  }[size];

  const getUserInitials = () => {
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const formatUserName = () => {
    if (user.name) return user.name;
    if (user.email) return user.email.split('@')[0];
    return '用户';
  };

  const trigger = (
    <div className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <Avatar className={avatarSize}>
        <AvatarImage src={user.image || undefined} alt={formatUserName()} />
        <AvatarFallback>{getUserInitials()}</AvatarFallback>
      </Avatar>
      {showName && (
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{formatUserName()}</span>
          <Badge variant="secondary" className="text-xs">已登录</Badge>
        </div>
      )}
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-1 rounded-full">
          {trigger}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{formatUserName()}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || '未设置邮箱'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>我的工作台</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>设置</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/billing" className="cursor-pointer flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>账单管理</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleSignOut}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? '登出中...' : '登出'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 