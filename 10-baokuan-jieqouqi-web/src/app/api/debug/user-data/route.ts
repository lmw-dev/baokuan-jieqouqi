// Debug API - 检查当前用户的数据状态
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking user data');
    
    // 从cookie中获取用户信息
    const cookieStore = await cookies();
    const userInfoCookie = cookieStore.get('user_info')?.value;
    
    if (!userInfoCookie) {
      return NextResponse.json({
        success: false,
        message: '未找到用户信息cookie'
      });
    }

    const userInfoFromCookie = JSON.parse(userInfoCookie);
    console.log('🍪 User info from cookie:', userInfoFromCookie);

    // 从数据库获取用户信息
    const dbUser = await prisma.user.findUnique({
      where: { id: userInfoFromCookie.id }
    });

    if (!dbUser) {
      return NextResponse.json({
        success: false,
        message: '数据库中未找到用户'
      });
    }

    console.log('💾 User info from database:', {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      logtoId: dbUser.logtoId
    });

    return NextResponse.json({
      success: true,
      data: {
        cookie: userInfoFromCookie,
        database: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          phoneNumber: dbUser.phoneNumber,
          image: dbUser.image,
          logtoId: dbUser.logtoId,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Debug user data error:', error);
    return NextResponse.json({
      success: false,
      message: '获取用户数据失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}