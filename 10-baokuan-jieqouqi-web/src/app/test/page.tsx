'use client';

import { useState } from 'react';

export default function TestPage() {
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: ''
  });
  const [updateResult, setUpdateResult] = useState('');

  const handleDirectLogin = () => {
    console.log('🔄 直接跳转测试');
    window.location.href = '/api/auth/sign-in';
  };

  const handleForceRedirect = () => {
    console.log('🔄 强制跳转测试');
    try {
      window.location.replace('/api/auth/sign-in');
    } catch (e) {
      console.error('跳转失败:', e);
      window.location.href = '/api/auth/sign-in';
    }
  };

  const handleUpdateUserInfo = async () => {
    try {
      setUpdateResult('更新中...');
      
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userInfo)
      });

      const data = await response.json();
      
      if (data.success) {
        setUpdateResult('✅ 用户信息更新成功！');
      } else {
        setUpdateResult('❌ 更新失败: ' + data.message);
      }
    } catch (error: any) {
      setUpdateResult('❌ 更新失败: ' + error.message);
    }
  };

  const handleGetCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setUpdateResult('当前用户信息: ' + JSON.stringify(data.data, null, 2));
      } else {
        setUpdateResult('获取用户信息失败: ' + data.message);
      }
    } catch (error: any) {
      setUpdateResult('获取用户信息失败: ' + error.message);
    }
  };

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      maxWidth: '600px',
      margin: '50px auto',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1>🔐 登录测试页面</h1>
        <p>既然 API 可以工作，让我们测试不同的跳转方式：</p>

        <div style={{ margin: '20px 0' }}>
          <h3>方法1: 直接链接</h3>
          <a 
            href="/api/auth/sign-in"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              margin: '5px'
            }}
          >
            HTML 链接登录
          </a>
        </div>

        <div style={{ margin: '20px 0' }}>
          <h3>方法2: JavaScript 跳转</h3>
          <button
            onClick={handleDirectLogin}
            style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              margin: '5px'
            }}
          >
            JavaScript 登录
          </button>
        </div>

        <div style={{ margin: '20px 0' }}>
          <h3>方法3: 强制跳转</h3>
          <button
            onClick={handleForceRedirect}
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              margin: '5px'
            }}
          >
            强制跳转登录
          </button>
        </div>

        <div style={{ margin: '20px 0', borderTop: '2px solid #eee', paddingTop: '20px' }}>
          <h3>🛠️ 用户信息管理</h3>
          
          <div style={{ margin: '10px 0' }}>
            <button
              onClick={handleGetCurrentUser}
              style={{
                padding: '8px 16px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                margin: '5px'
              }}
            >
              获取当前用户信息
            </button>
          </div>

          <div style={{ margin: '15px 0' }}>
            <label style={{ display: 'block', margin: '5px 0' }}>
              姓名:
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  marginLeft: '10px',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  width: '200px'
                }}
                placeholder="请输入您的姓名"
              />
            </label>
          </div>

          <div style={{ margin: '15px 0' }}>
            <label style={{ display: 'block', margin: '5px 0' }}>
              邮箱:
              <input
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                style={{
                  marginLeft: '10px',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  width: '200px'
                }}
                placeholder="请输入您的邮箱"
              />
            </label>
          </div>

          <div style={{ margin: '15px 0' }}>
            <button
              onClick={handleUpdateUserInfo}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              更新用户信息
            </button>
          </div>

          {updateResult && (
            <div style={{
              margin: '15px 0',
              padding: '10px',
              backgroundColor: updateResult.includes('✅') ? '#d4edda' : '#f8d7da',
              border: `1px solid ${updateResult.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
              fontSize: '14px'
            }}>
              {updateResult}
            </div>
          )}
        </div>
        
        <div style={{ 
          fontSize: '14px', 
          color: '#666', 
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px'
        }}>
          <strong>💡 提示：</strong>
          <br />
          1. 先点击&quot;获取当前用户信息&quot;查看现有数据
          <br />
          2. 填写您的姓名和邮箱
          <br />
          3. 点击&quot;更新用户信息&quot;保存
          <br />
          4. 刷新页面查看是否生效
        </div>
      </div>
    </div>
  );
} 