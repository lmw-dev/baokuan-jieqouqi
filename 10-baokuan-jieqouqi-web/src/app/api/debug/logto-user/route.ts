// Debug API - 获取Logto原始用户信息
import { NextRequest, NextResponse } from 'next/server';
import { logtoConfig } from '@/lib/logto-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Getting Logto user info');
    
    // 从cookie中获取访问令牌
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: '未找到访问令牌' },
        { status: 401 }
      );
    }

    console.log('🔍 Debug: Access token found');

    // 调用Logto获取用户信息
    const userInfoUrl = `${logtoConfig.endpoint}/oidc/me`;
    
    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('❌ Debug: Failed to fetch user info from Logto:', response.status);
      return NextResponse.json(
        { error: '获取用户信息失败', status: response.status },
        { status: response.status }
      );
    }

    const userInfo = await response.json();
    console.log('🔍 Debug: Raw Logto user info:', JSON.stringify(userInfo, null, 2));

    return NextResponse.json(userInfo);
    
  } catch (error) {
    console.error('❌ Debug: Error getting Logto user info:', error);
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 