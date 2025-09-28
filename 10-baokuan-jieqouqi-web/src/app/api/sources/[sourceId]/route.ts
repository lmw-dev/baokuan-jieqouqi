import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth-service';

// 确保Prisma客户端单例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * 获取分析源详情
 * GET /api/sources/[sourceId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await context.params;

    // 获取当前用户
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      );
    }

    // 查找分析源
    const analysisSource = await prisma.analysisSource.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        ownerId: true,
        title: true,
        mediaFileId: true,
        createdAt: true,
      }
    });

    if (!analysisSource) {
      return NextResponse.json(
        { error: '分析源不存在' },
        { status: 404 }
      );
    }

    // 权限验证：只有创建者可以访问
    if (analysisSource.ownerId !== currentUser.id) {
      return NextResponse.json(
        { error: '无权限访问此分析源' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: analysisSource
    });

  } catch (error) {
    console.error('获取分析源失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}