// 获取当前用户信息API路由
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-service';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('👤 Fetching current user info');
    
    // 从cookie中获取认证信息
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    const userInfoCookie = cookieStore.get('user_info')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { 
          success: false, 
          message: '未登录',
          code: 'NOT_AUTHENTICATED'
        },
        { status: 401 }
      );
    }

    // 尝试从cookie中快速获取用户信息
    if (userInfoCookie) {
      try {
        const userInfo = JSON.parse(userInfoCookie);
        console.log('✅ User info from cookie:', userInfo.id);
        
        return NextResponse.json({
          success: true,
          data: userInfo,
          message: '获取用户信息成功'
        });
      } catch (error) {
        console.warn('⚠️ Invalid user info cookie, fetching from database');
      }
    }

    // 从数据库获取完整用户信息
    const user = await AuthService.getUserByToken(authToken);
    
    if (!user) {
      // Token无效，清除cookie
      const response = NextResponse.json(
        { 
          success: false, 
          message: '认证已过期，请重新登录',
          code: 'TOKEN_EXPIRED'
        },
        { status: 401 }
      );
      
      response.cookies.delete('auth_token');
      response.cookies.delete('user_info');
      
      return response;
    }

    console.log('✅ User info from database:', user.id);
    
    // 更新用户信息cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image
      },
      message: '获取用户信息成功'
    });

    response.cookies.set('user_info', JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image
    }), {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60
    });

    return response;

  } catch (error) {
    console.error('❌ Get current user error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '获取用户信息失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 