// 工作台页面数据获取服务

import type { AnalysisCardListItem } from '@/types/dashboard';

/**
 * 获取用户的所有分析卡片
 * @param userId 用户ID
 * @returns 分析卡片列表
 */
export async function getUserAnalysisCards(userId: string): Promise<AnalysisCardListItem[]> {
  try {
    console.log('🔍 获取用户分析卡片，用户ID:', userId);
    
    // 调用API获取用户的分析卡片
    const response = await fetch(`/api/dashboard/cards?userId=${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.log('❌ 获取用户分析卡片失败:', response.status);
      return getMockAnalysisCards();
    }

    const data = await response.json();
    console.log('✅ 获取到用户分析卡片数量:', data.data?.length || 0);
    
    // 确保日期字段被正确处理
    const cardsWithDates = data.data?.map((card: any) => ({
      ...card,
      createdAt: card.createdAt ? new Date(card.createdAt) : new Date(),
      updatedAt: card.updatedAt ? new Date(card.updatedAt) : new Date()
    })) || [];
    
    return cardsWithDates;
  } catch (error) {
    console.error('❌ 获取用户分析卡片失败:', error);
    // 返回Mock数据以便开发测试
    return getMockAnalysisCards();
  }
}

/**
 * 获取用户的分析统计信息
 * @param userId 用户ID
 * @returns 统计信息
 */
export async function getUserAnalysisStats(userId: string): Promise<{
  totalCards: number;
  totalSources: number;
  recentCards: number;
}> {
  try {
    console.log('🔍 获取用户分析统计信息，用户ID:', userId);
    
    // 调用API获取统计信息
    const response = await fetch(`/api/dashboard/stats?userId=${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      console.log('❌ 获取用户分析统计信息失败:', response.status);
      return {
        totalCards: 0,
        totalSources: 0,
        recentCards: 0
      };
    }

    const data = await response.json();
    console.log('✅ 获取用户分析统计信息成功:', data.data);
    return data.data || {
      totalCards: 0,
      totalSources: 0,
      recentCards: 0
    };
  } catch (error) {
    console.error('❌ 获取用户分析统计信息失败:', error);
    // 返回Mock数据以便开发测试
    const mockCards = getMockAnalysisCards();
    return {
      totalCards: mockCards.length,
      totalSources: 3,
      recentCards: mockCards.filter(card => 
        card.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    };
  }
}

/**
 * 获取Mock分析卡片数据（用于开发测试）
 * @returns Mock分析卡片列表
 */
function getMockAnalysisCards(): AnalysisCardListItem[] {
  return [
    {
      id: 'card-001',
      sourceId: 'source-001',
      sourceTitle: 'iPhone 15 Pro深度评测：值得升级吗？',
      versionTitle: 'iPhone评测视频解构分析',
      createdAt: new Date('2024-12-28T10:30:00Z'),
      updatedAt: new Date('2024-12-28T10:30:00Z'),
      analysisType: '视频解构',
      tags: ['数码评测', 'iPhone', '消费电子']
    },
    {
      id: 'card-002',
      sourceId: 'source-002',
      sourceTitle: '2024年最佳笔记本电脑推荐',
      versionTitle: '笔记本选购指南分析',
      createdAt: new Date('2024-12-25T14:15:00Z'),
      updatedAt: new Date('2024-12-25T16:20:00Z'),
      analysisType: '选购指南',
      tags: ['笔记本', '选购指南', '性价比']
    },
    {
      id: 'card-003',
      sourceId: 'source-003',
      sourceTitle: 'AirPods Pro 2代 vs Sony WF-1000XM4',
      versionTitle: '降噪耳机对比分析',
      createdAt: new Date('2024-12-22T09:45:00Z'),
      updatedAt: new Date('2024-12-22T11:30:00Z'),
      analysisType: '产品对比',
      tags: ['耳机', '降噪', '对比评测']
    },
    {
      id: 'card-004',
      sourceId: 'source-004',
      sourceTitle: '小米13 Ultra拍照体验',
      versionTitle: '手机摄影功能分析',
      createdAt: new Date('2024-12-20T16:00:00Z'),
      updatedAt: new Date('2024-12-20T18:15:00Z'),
      analysisType: '功能体验',
      tags: ['手机', '摄影', '小米']
    },
    {
      id: 'card-005',
      sourceId: 'source-005',
      sourceTitle: 'MacBook Air M2 使用一年后感受',
      versionTitle: '长期使用体验分析',
      createdAt: new Date('2024-12-18T13:20:00Z'),
      updatedAt: new Date('2024-12-18T15:45:00Z'),
      analysisType: '长期体验',
      tags: ['MacBook', '体验报告', '生产力']
    }
  ];
}

 