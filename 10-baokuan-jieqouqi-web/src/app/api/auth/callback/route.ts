// 认证回调API路由 - 处理Logto认证回调
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-service';
import { logtoConfig } from '@/lib/logto-client';
import type { LogtoUserInfo, AuthCallbackParams } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Processing auth callback');
    
    // 解析回调参数
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || '/dashboard';
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // 检查是否有错误
    if (error) {
      console.error('❌ Auth callback error:', error, errorDescription);
      return NextResponse.redirect(
        `${logtoConfig.baseUrl}/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`
      );
    }

    // 检查授权码
    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(
        `${logtoConfig.baseUrl}/?error=missing_code&error_description=${encodeURIComponent('未收到授权码')}`
      );
    }

    console.log('✅ Authorization code received:', code.substring(0, 10) + '...');

    try {
      // 1. 用授权码交换访问令牌
      const tokenResponse = await exchangeCodeForToken(code);
      const { access_token, id_token } = tokenResponse;

      console.log('✅ Access token obtained');

      // 2. 获取用户信息
      const userInfo = await getUserInfo(access_token);
      console.log('✅ User info obtained:', userInfo.sub);

      // 🔍 特别调试：检查用户信息的完整性
      console.log('🔍 CALLBACK DEBUG: Checking user info completeness:');
      console.log('  - Is registration/first login?', !userInfo.name && !userInfo.email);
      console.log('  - All fields present?', {
        sub: !!userInfo.sub,
        name: !!userInfo.name,
        username: !!userInfo.username,
        email: !!userInfo.email,
        phone_number: !!userInfo.phone_number,
        picture: !!userInfo.picture
      });
      console.log('  - Actual values:', {
        sub: userInfo.sub,
        name: userInfo.name,
        username: userInfo.username,
        email: userInfo.email
      });

      // 3. 处理用户数据同步
      const authResponse = await AuthService.handleCallback(userInfo, access_token);
      
      if (!authResponse.success) {
        throw new Error(authResponse.message || '用户数据同步失败');
      }

      // 4. 智能合并用户信息（优先使用非空值）
      let finalUserInfo: { name: string | null; email: string | null; image: string | null } = { 
        name: null, 
        email: null, 
        image: null 
      };

      // 检查本地数据库中的用户信息
      const dbUser = await AuthService.getUserByLogtoId(userInfo.sub);
      
      // 智能合并策略：优先使用有值的信息
      finalUserInfo = {
        // 优先使用本地数据库的name，再使用Logto的username/name，最后使用email前缀作为fallback
        name: dbUser?.name || userInfo.username || userInfo.name || (userInfo.email ? userInfo.email.split('@')[0] : null),
        // 优先使用本地数据库的email，再使用Logto的email  
        email: dbUser?.email || userInfo.email || null,
        // 优先使用本地数据库的image，再使用Logto的picture
        image: dbUser?.image || userInfo.picture || null
      };

      console.log('🔍 Final user info after smart merge:', finalUserInfo);
      
      // 如果合并后仍然缺少基本信息，生成默认值
      if (!finalUserInfo.name && !finalUserInfo.email) {
        console.log('⚠️ No name or email available, generating fallback');
        finalUserInfo.name = `用户${userInfo.sub.substring(0, 8)}`;
      }
      
      // 直接跳转到目标页面，不再强制完善信息
      const redirectUrl = state;
      
      console.log('🔍 Final user info:', finalUserInfo);
      console.log('🔍 Redirecting to:', redirectUrl);

      // 5. 设置认证Cookie或会话
      const response = NextResponse.redirect(`${logtoConfig.baseUrl}${redirectUrl}`);
      
      // 设置token cookie（httpOnly for security）
      response.cookies.set('auth_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24小时
      });

      // 设置用户信息cookie（供前端读取）- 使用最终确定的信息
      response.cookies.set('user_info', JSON.stringify({
        id: authResponse.user.id,
        name: finalUserInfo.name,
        email: finalUserInfo.email,
        image: finalUserInfo.image
      }), {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60
      });

      console.log('✅ Auth callback completed successfully');
      return response;

    } catch (authError) {
      console.error('❌ Authentication process failed:', authError);
      return NextResponse.redirect(
        `${logtoConfig.baseUrl}/?error=auth_failed&error_description=${encodeURIComponent('认证处理失败')}`
      );
    }

  } catch (error) {
    console.error('❌ Callback handler error:', error);
    return NextResponse.redirect(
      `${logtoConfig.baseUrl}/?error=server_error&error_description=${encodeURIComponent('服务器错误')}`
    );
  }
}

/**
 * 用授权码交换访问令牌
 */
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}> {
  console.log('🔄 Exchanging code for token');

  const tokenUrl = `${logtoConfig.endpoint}/oidc/token`;
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: logtoConfig.appId,
    client_secret: process.env.LOGTO_APP_SECRET || '#internal:dgJFcxuG0gL62KxZELbV628HBu9Wu2Yi',
    code,
    redirect_uri: `${logtoConfig.baseUrl}/api/auth/callback`
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Token exchange failed:', response.status, errorText);
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const tokenData = await response.json();
  console.log('✅ Token exchange successful');
  return tokenData;
}

/**
 * 获取用户信息
 */
async function getUserInfo(accessToken: string): Promise<LogtoUserInfo> {
  console.log('🔄 Fetching user info');

  const userInfoUrl = `${logtoConfig.endpoint}/oidc/me`;
  
  const response = await fetch(userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ User info fetch failed:', response.status, errorText);
    throw new Error(`User info fetch failed: ${response.status} ${errorText}`);
  }

  const userInfo = await response.json();
  console.log('✅ User info fetch successful');
  
  // 🔍 详细调试日志 - 输出完整的用户信息
  console.log('🔍 Complete user info from Logto:', JSON.stringify(userInfo, null, 2));
  console.log('🔍 User info fields:');
  console.log('  - sub:', userInfo.sub);
  console.log('  - email:', userInfo.email);
  console.log('  - phone_number:', userInfo.phone_number);
  console.log('  - name:', userInfo.name);
  console.log('  - username:', userInfo.username);
  console.log('  - picture:', userInfo.picture);
  console.log('  - email_verified:', userInfo.email_verified);
  console.log('  - phone_number_verified:', userInfo.phone_number_verified);
  
  return userInfo;
} 