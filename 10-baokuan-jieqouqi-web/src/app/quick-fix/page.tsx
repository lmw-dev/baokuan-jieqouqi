'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function QuickFixPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult('');

    try {
      console.log('🔄 Submitting user data:', formData);
      
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log('📥 Response:', data);

      if (response.ok) {
        setResult(`✅ 成功更新用户信息！用户ID: ${data.data?.id}`);
      } else {
        setResult(`❌ 更新失败: ${data.message}`);
      }

    } catch (error) {
      console.error('❌ Submit error:', error);
      setResult(`❌ 网络错误: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestApi = async () => {
    try {
      setResult('🔍 测试API连接...');
      
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('📥 API Test Response:', data);
      
      if (response.ok) {
        setResult(`✅ API连接正常，当前用户: ${JSON.stringify(data.data, null, 2)}`);
      } else {
        setResult(`❌ API错误: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ API test error:', error);
      setResult(`❌ API测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>🔧 快速修复 - 用户信息更新</CardTitle>
          <CardDescription>
            如果您的用户信息没有正确保存，可以通过这个页面直接更新。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API测试 */}
          <div>
            <Button onClick={handleTestApi} variant="outline" className="w-full">
              🔍 测试API连接和当前用户状态
            </Button>
          </div>

          {/* 更新表单 */}
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

            <Button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.email}
              className="w-full"
            >
              {isSubmitting ? '更新中...' : '💾 更新用户信息'}
            </Button>
          </form>

          {/* 结果显示 */}
          {result && (
            <Alert>
              <AlertDescription>
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {result}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          {/* 导航按钮 */}
          <div className="flex flex-col space-y-2">
            <Button variant="ghost" onClick={() => window.location.href = '/dashboard'}>
              📊 返回工作台
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = '/debug-user'}>
              🔍 打开调试页面
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>💡 问题说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>问题原因：</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Logto注册时可能没有收集姓名和邮箱信息</li>
              <li>用户只使用用户名+密码注册，其他字段为空</li>
              <li>前端状态管理可能存在问题</li>
            </ul>
            <p><strong>这个页面的作用：</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>直接调用API更新用户信息到数据库</li>
              <li>绕过前端状态管理问题</li>
              <li>提供实时的错误反馈和调试信息</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 