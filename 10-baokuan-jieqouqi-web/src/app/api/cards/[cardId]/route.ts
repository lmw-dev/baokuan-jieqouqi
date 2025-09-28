import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/lib/auth-service';
import { analysisCardFormSchema, type AnalysisCardFormData } from '@/lib/validations/analysis-card';

// 确保Prisma客户端单例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * 获取分析卡片详情
 * GET /api/cards/[cardId]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await context.params;

    // 获取当前用户
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      );
    }

    // 查找分析卡片和其所属的分析源
    const card = await prisma.analysisCard.findUnique({
      where: { id: cardId },
      include: {
        source: {
          select: {
            id: true,
            ownerId: true,
            title: true,
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json(
        { error: '分析卡片不存在' },
        { status: 404 }
      );
    }

    // 权限验证：只有卡片创建者可以访问
    if (card.source.ownerId !== currentUser.id) {
      return NextResponse.json(
        { error: '无权限访问此分析卡片' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: card
    });

  } catch (error) {
    console.error('获取分析卡片失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新分析卡片
 * PUT /api/cards/[cardId]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await context.params;

    // 获取当前用户
    const currentUser = await AuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '用户未认证' },
        { status: 401 }
      );
    }

    // 解析请求体
    const requestBody = await request.json();
    
    // 验证数据格式
    const validationResult = analysisCardFormSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: '数据格式错误',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const formData: AnalysisCardFormData = validationResult.data;

    // 查找分析卡片和权限验证
    const card = await prisma.analysisCard.findUnique({
      where: { id: cardId },
      include: {
        source: {
          select: {
            ownerId: true,
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json(
        { error: '分析卡片不存在' },
        { status: 404 }
      );
    }

    // 权限验证：只有卡片创建者可以修改
    if (card.source.ownerId !== currentUser.id) {
      return NextResponse.json(
        { error: '无权限修改此分析卡片' },
        { status: 403 }
      );
    }

    // 准备更新数据（处理可选字段）
    const updateData = {
      versionTitle: formData.versionTitle,
      hookCopy: formData.hookCopy || null,
      hookTypes: formData.hookTypes || [],
      hookNotes: formData.hookNotes || null,
      coreIdea: formData.coreIdea || null,
      argumentCase: formData.argumentCase || null,
      valueDelivery: formData.valueDelivery || [],
      reusableElements: formData.reusableElements || null,
      valueNotes: formData.valueNotes || null,
    };

    // 更新分析卡片
    const updatedCard = await prisma.analysisCard.update({
      where: { id: cardId },
      data: updateData,
      include: {
        source: {
          select: {
            id: true,
            ownerId: true,
            title: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedCard,
      message: '分析卡片更新成功'
    });

  } catch (error) {
    console.error('更新分析卡片失败:', error);
    
    // 处理Prisma相关错误
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: '分析卡片不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}