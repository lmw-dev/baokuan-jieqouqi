// 认证配置API路由 - 提供前端需要的配置信息
import { NextRequest, NextResponse } from 'next/server';
import { logtoConfig, validateLogtoConfig } from '@/lib/logto-client';

export async function GET(request: NextRequest) {
  try {
    console.log('⚙️ Fetching auth config');
    
    // 验证配置
    const validation = validateLogtoConfig();
    
    if (!validation.isValid) {
      console.error('❌ Invalid Logto configuration:', validation.errors);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Logto配置不完整',
          errors: validation.errors
        },
        { status: 500 }
      );
    }
    
    // 返回前端需要的配置（不包含敏感信息）
    const clientConfig = {
      endpoint: logtoConfig.endpoint,
      baseUrl: logtoConfig.baseUrl,
      signInUrl: '/api/auth/sign-in',
      signOutUrl: '/api/auth/sign-out',
      callbackUrl: '/api/auth/callback',
      userInfoUrl: '/api/auth/me',
      scopes: logtoConfig.scopes,
      // 不返回 appId 等敏感信息
    };
    
    console.log('✅ Auth config fetched successfully');
    
    return NextResponse.json({
      success: true,
      data: clientConfig,
      message: '获取认证配置成功'
    });
    
  } catch (error) {
    console.error('❌ Get auth config error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '获取认证配置失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 