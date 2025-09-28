// 登录API路由 - 重定向到Logto登录页面
import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { logtoConfig } from '@/lib/logto-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔑 Initiating sign-in process');
    
    // 获取重定向参数
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
    
    console.log('📍 Redirect target:', redirectTo);
    
    // 构建Logto登录URL
    const loginUrl = new URL(`${logtoConfig.endpoint}/oidc/auth`);
    loginUrl.searchParams.set('client_id', logtoConfig.appId);
    loginUrl.searchParams.set('redirect_uri', `${logtoConfig.baseUrl}/api/auth/callback`);
    loginUrl.searchParams.set('response_type', 'code');
    loginUrl.searchParams.set('scope', logtoConfig.scopes.join(' '));
    loginUrl.searchParams.set('state', redirectTo);
    
    console.log('🔗 Redirecting to Logto login:', loginUrl.toString());
    
    // 重定向到Logto登录页面
    return NextResponse.redirect(loginUrl.toString());
    
  } catch (error) {
    console.error('❌ Sign-in error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '登录失败，请稍后重试',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 