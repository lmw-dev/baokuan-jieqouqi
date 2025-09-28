'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserStore } from '@/stores/user-store';

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading, refreshUser } = useUserStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    console.log('🔍 Profile Complete: Current user state:', { user, isUserLoading });
    
    // 如果还在加载，不做任何操作
    if (isUserLoading) {
      return;
    }

    // 如果用户已经有基本信息，跳转到dashboard
    if (user && user.name && user.email) {
      console.log('✅ User already has complete info, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    // 预填充现有信息
    if (user) {
      console.log('📝 Pre-filling form with existing user data');
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user, isUserLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '更新失败');
      }

      setSuccess('✅ 个人信息更新成功！');
      
      // 刷新用户信息
      await refreshUser();
      
      // 2秒后跳转到dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  // 如果还在加载，显示加载状态
  if (isUserLoading) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>正在初始化...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>正在获取用户信息，请稍候...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果加载完成但没有用户信息，可能是认证问题
  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">无法获取用户信息</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">
              无法获取当前用户信息，可能是认证过期或系统错误。
            </p>
            <div className="flex flex-col space-y-2">
                             <Button onClick={() => refreshUser()} disabled={isUserLoading}>
                 🔄 重新获取用户信息
               </Button>
              <Button variant="ghost" onClick={() => router.push('/api/auth/sign-in')}>
                🔐 重新登录
              </Button>
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                📊 跳转到工作台
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>完善个人信息</CardTitle>
          <CardDescription>
            欢迎使用爆款解构器！请完善您的个人信息以获得更好的体验。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">姓名 <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="请输入您的姓名"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">邮箱地址 <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="请输入您的邮箱地址"
                required
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">手机号码（可选）</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                placeholder="请输入您的手机号码"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.email}
                className="w-full"
              >
                {isSubmitting ? '更新中...' : '完成设置'}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                className="w-full"
              >
                暂时跳过
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">为什么需要这些信息？</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 姓名：用于个性化显示和沟通</li>
            <li>• 邮箱：用于重要通知和账户安全</li>
            <li>• 手机号：用于安全验证（可选）</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 