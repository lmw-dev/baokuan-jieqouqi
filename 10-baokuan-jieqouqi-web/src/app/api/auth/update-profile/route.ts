// 用户信息更新API路由
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-service';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating user profile');
    
    // 从cookie中获取认证信息
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    const userInfoCookie = cookieStore.get('user_info')?.value;
    
    if (!authToken || !userInfoCookie) {
      return NextResponse.json(
        { 
          success: false, 
          message: '未登录',
          code: 'NOT_AUTHENTICATED'
        },
        { status: 401 }
      );
    }

    // 解析当前用户信息
    let currentUser;
    try {
      currentUser = JSON.parse(userInfoCookie);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: '用户信息格式错误',
          code: 'INVALID_USER_INFO'
        },
        { status: 400 }
      );
    }

    // 解析请求体
    const updateData = await request.json();
    console.log('🔍 Update data received:', updateData);

    // 验证更新数据
    if (!updateData.name && !updateData.email) {
      return NextResponse.json(
        { 
          success: false, 
          message: '请至少提供姓名或邮箱',
          code: 'INVALID_INPUT'
        },
        { status: 400 }
      );
    }

    // 获取用户信息（优先通过Logto ID查找）
    const dbUser = await AuthService.getUserByLogtoId(currentUser.id) || 
                   await AuthService.getUserById(currentUser.id);
    
    if (!dbUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: '找不到用户信息',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    console.log('🔍 Found user:', dbUser.id);

    // 准备更新数据
    const cleanUpdateData = {
      name: updateData.name?.trim() || null,
      email: updateData.email?.trim() || null
    };

    console.log('🔄 Updating user info in local database');
    const updatedUser = await AuthService.updateUser(dbUser.id, cleanUpdateData);
    console.log('✅ Local user info updated');

    // 更新前端cookie（使用更新后的信息）
    const response = NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: cleanUpdateData.name,
        email: cleanUpdateData.email,
        image: currentUser.image
      },
      message: '用户信息更新成功'
    });

    // 更新cookie中的用户信息（这样前端可以立即看到更新）
    response.cookies.set('user_info', JSON.stringify({
      id: updatedUser.id,
      name: cleanUpdateData.name,
      email: cleanUpdateData.email,
      image: currentUser.image
    }), {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60
    });

    return response;

  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: '更新用户信息失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 