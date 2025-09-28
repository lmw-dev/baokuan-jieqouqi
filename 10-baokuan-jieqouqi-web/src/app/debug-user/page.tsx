'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function DebugUserPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [logtoUserInfo, setLogtoUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateData, setUpdateData] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    fetchUserInfo();
    fetchLogtoUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching user info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogtoUserInfo = async () => {
    try {
      // 尝试获取Logto的原始用户信息
      const response = await fetch('/api/debug/logto-user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogtoUserInfo(data);
      }
    } catch (error) {
      console.error('❌ Error fetching Logto user info:', error);
    }
  };

  const handleUpdateUser = async () => {
    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.data);
        alert('✅ 用户信息更新成功！');
      } else {
        const error = await response.json();
        alert(`❌ 更新失败：${error.message}`);
      }
    } catch (error) {
      console.error('❌ Error updating user:', error);
      alert('❌ 更新失败');
    }
  };

  const triggerNewRegistration = async () => {
    try {
      // 重新触发注册流程，查看日志
      window.location.href = '/api/auth/sign-in';
    } catch (error) {
      console.error('❌ Error triggering registration:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>🔍 用户注册调试</CardTitle>
          </CardHeader>
          <CardContent>
            <p>正在加载用户信息...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔍 用户注册调试页面</CardTitle>
          <CardDescription>
            检查用户注册时的详细信息，诊断为什么用户名和邮箱没有保存
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 应用数据库中的用户信息 */}
      <Card>
        <CardHeader>
          <CardTitle>📊 应用数据库中的用户信息</CardTitle>
          <CardDescription>这是存储在我们应用数据库中的用户信息</CardDescription>
        </CardHeader>
        <CardContent>
          {userInfo ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">用户ID</Label>
                  <p className="text-sm text-gray-600">{userInfo.id}</p>
                </div>
                <div>
                  <Label className="font-semibold">Logto ID</Label>
                  <p className="text-sm text-gray-600">{userInfo.logtoId}</p>
                </div>
                <div>
                  <Label className="font-semibold">姓名</Label>
                  <p className="text-sm text-gray-600">{userInfo.name || '❌ 未设置'}</p>
                </div>
                <div>
                  <Label className="font-semibold">邮箱</Label>
                  <p className="text-sm text-gray-600">{userInfo.email || '❌ 未设置'}</p>
                </div>
                <div>
                  <Label className="font-semibold">手机号</Label>
                  <p className="text-sm text-gray-600">{userInfo.phoneNumber || '❌ 未设置'}</p>
                </div>
                <div>
                  <Label className="font-semibold">头像</Label>
                  <p className="text-sm text-gray-600">{userInfo.image || '❌ 未设置'}</p>
                </div>
              </div>
              <div className="mt-4">
                <Label className="font-semibold">完整数据</Label>
                <Textarea
                  value={JSON.stringify(userInfo, null, 2)}
                  readOnly
                  className="mt-2 font-mono text-xs"
                  rows={8}
                />
              </div>
            </div>
          ) : (
            <p>❌ 未获取到用户信息</p>
          )}
        </CardContent>
      </Card>

      {/* Logto中的用户信息 */}
      <Card>
        <CardHeader>
          <CardTitle>🔐 Logto中的用户信息</CardTitle>
          <CardDescription>这是Logto认证系统中的用户信息</CardDescription>
        </CardHeader>
        <CardContent>
          {logtoUserInfo ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Subject (sub)</Label>
                  <p className="text-sm text-gray-600">{logtoUserInfo.sub}</p>
                </div>
                <div>
                  <Label className="font-semibold">Email</Label>
                  <p className="text-sm text-gray-600">{logtoUserInfo.email || '❌ 未设置'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Name</Label>
                  <p className="text-sm text-gray-600">{logtoUserInfo.name || '❌ 未设置'}</p>
                </div>
                <div>
                  <Label className="font-semibold">Picture</Label>
                  <p className="text-sm text-gray-600">{logtoUserInfo.picture || '❌ 未设置'}</p>
                </div>
              </div>
              <div className="mt-4">
                <Label className="font-semibold">完整数据</Label>
                <Textarea
                  value={JSON.stringify(logtoUserInfo, null, 2)}
                  readOnly
                  className="mt-2 font-mono text-xs"
                  rows={6}
                />
              </div>
            </div>
          ) : (
            <p>❌ 未获取到Logto用户信息</p>
          )}
        </CardContent>
      </Card>

      {/* 手动更新用户信息 */}
      <Card>
        <CardHeader>
          <CardTitle>✏️ 手动更新用户信息</CardTitle>
          <CardDescription>如果注册时没有收集到信息，可以手动更新</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={updateData.name}
                onChange={(e) => setUpdateData({...updateData, name: e.target.value})}
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={updateData.email}
                onChange={(e) => setUpdateData({...updateData, email: e.target.value})}
                placeholder="请输入邮箱地址"
              />
            </div>
            <Button onClick={handleUpdateUser} className="w-full">
              💾 更新用户信息
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 调试操作 */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 调试操作</CardTitle>
          <CardDescription>用于调试和测试的操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={triggerNewRegistration} variant="outline" className="w-full">
              🔄 重新触发注册流程（查看日志）
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              🔄 刷新页面
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 解决方案建议 */}
      <Card>
        <CardHeader>
          <CardTitle>💡 问题诊断和解决方案</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">可能的原因：</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Logto注册表单没有收集姓名和邮箱字段</li>
                <li>用户只填写了用户名和密码，没有填写其他信息</li>
                <li>权限范围（scopes）配置不正确</li>
                <li>Logto应用配置问题</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">解决方案：</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>在Logto控制台中配置必填字段</li>
                <li>使用上面的手动更新功能临时解决</li>
                <li>配置社交登录（如微信、QQ等）来获取更多信息</li>
                <li>在注册后引导用户完善信息</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 