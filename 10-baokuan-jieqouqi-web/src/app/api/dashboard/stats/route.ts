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

    console.log('🔍 从数据库获取用户分析统计信息，用户ID:', userId);

    // 获取用户的分析统计信息
    const [totalCards, totalSources, recentCards] = await Promise.all([
      // 总卡片数
      prisma.analysisCard.count({
        where: {
          source: {
            ownerId: userId
          }
        }
      }),
      // 总分析源数
      prisma.analysisSource.count({
        where: {
          ownerId: userId
        }
      }),
      // 近期卡片数（最近7天）
      prisma.analysisCard.count({
        where: {
          source: {
            ownerId: userId
          },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const stats = {
      totalCards,
      totalSources,
      recentCards
    };

    console.log('✅ 从数据库获取用户分析统计信息成功:', stats);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ 获取用户分析统计信息失败:', error);
    return NextResponse.json(
      { error: '获取分析统计信息失败' },
      { status: 500 }
    );
  }
} 