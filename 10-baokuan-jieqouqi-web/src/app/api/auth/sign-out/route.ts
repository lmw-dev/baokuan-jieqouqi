// 登出API路由 - 调用Logto登出端点完全清除认证会话
import { NextRequest, NextResponse } from 'next/server';
import { logtoConfig } from '@/lib/logto-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🚪 Processing sign-out');
    
    // 获取重定向参数
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/';
    
    console.log('📍 Redirect target after sign-out:', redirectTo);
    
    // 构建Logto登出URL
    const logoutUrl = new URL(`${logtoConfig.endpoint}/oidc/session/end`);
    logoutUrl.searchParams.set('client_id', logtoConfig.appId);
    logoutUrl.searchParams.set('post_logout_redirect_uri', `${logtoConfig.baseUrl}${redirectTo}`);
    
    console.log('🔗 Redirecting to Logto logout:', logoutUrl.toString());
    
    // 创建响应并清除认证cookies
    const response = NextResponse.redirect(logoutUrl.toString());
    
    // 清除认证相关的cookies
    response.cookies.delete('auth_token');
    response.cookies.delete('user_info');
    
    // 设置安全的cookie清除（确保在所有情况下都被清除）
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      expires: new Date(0)
    });
    
    response.cookies.set('user_info', '', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      expires: new Date(0)
    });
    
    console.log('✅ Sign-out completed successfully');
    return response;
    
  } catch (error) {
    console.error('❌ Sign-out error:', error);
    
    // 即使出错也要尝试清除cookies和重定向
    const response = NextResponse.redirect(`${logtoConfig.baseUrl}/?error=signout_error`);
    
    response.cookies.delete('auth_token');
    response.cookies.delete('user_info');
    
    return response;
  }
}

export async function POST(request: NextRequest) {
  // 支持POST请求的登出
  return GET(request);
} 