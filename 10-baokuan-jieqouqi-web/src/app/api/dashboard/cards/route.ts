import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID参数' },
        { status: 400 }
      );
    }

    console.log('🔍 从数据库获取用户分析卡片，用户ID:', userId);

    // 从数据库获取用户的分析卡片
    const cards = await prisma.analysisCard.findMany({
      where: {
        source: {
          ownerId: userId
        }
      },
      include: {
        source: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 转换为前端需要的格式
    const formattedCards = cards.map(card => ({
      id: card.id,
      sourceId: card.source.id,
      sourceTitle: card.source.title,
      versionTitle: card.versionTitle,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      analysisType: getAnalysisType(card.hookTypes),
      tags: [...card.hookTypes, ...card.valueDelivery]
    }));

    console.log('✅ 从数据库获取到分析卡片数量:', formattedCards.length);

    return NextResponse.json({
      success: true,
      data: formattedCards
    });

  } catch (error) {
    console.error('❌ 获取用户分析卡片失败:', error);
    return NextResponse.json(
      { error: '获取分析卡片失败' },
      { status: 500 }
    );
  }
}

// 根据钩子类型推断分析类型
function getAnalysisType(hookTypes: string[]): string {
  if (hookTypes.includes('对比反差') || hookTypes.includes('二选一')) {
    return '产品对比';
  } else if (hookTypes.includes('权威背书') || hookTypes.includes('成本投入')) {
    return '选购指南';
  } else if (hookTypes.includes('长期体验') || hookTypes.includes('长期回顾')) {
    return '长期体验';
  } else if (hookTypes.includes('实测验证') || hookTypes.includes('争议话题')) {
    return '功能体验';
  } else if (hookTypes.includes('痛点挖掘')) {
    return '视频解构';
  } else {
    return '内容分析';
  }
} 