// 我的工作台页面 - 显示用户的分析卡片列表
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, LayoutDashboard, TrendingUp, FileText, Clock } from 'lucide-react';
import Link from 'next/link';

import { useUserStore } from '@/stores/user-store';
import { getUserAnalysisCards, getUserAnalysisStats } from '@/lib/dashboard-service';
import { AnalysisCardItem } from '@/components/dashboard/AnalysisCardItem';
import { EmptyState } from '@/components/dashboard/EmptyState';
import type { AnalysisCardListItem } from '@/types/dashboard';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, error, initializeAuth } = useUserStore();
  const [cards, setCards] = useState<AnalysisCardListItem[]>([]);
  const [stats, setStats] = useState({ totalCards: 0, totalSources: 0, recentCards: 0 });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth().finally(() => setIsInitialized(true));
    }
  }, [initializeAuth, isInitialized]);

  useEffect(() => {
    async function loadUserData() {
      if (!user || !isAuthenticated) return;
      
      setIsLoadingData(true);
      setDataError(null);
      
      try {
        const [cardsData, statsData] = await Promise.all([
          getUserAnalysisCards(user.id),
          getUserAnalysisStats(user.id)
        ]);
        
        setCards(cardsData);
        setStats(statsData);
      } catch (error) {
        console.error('❌ 加载用户数据失败:', error);
        setDataError('加载数据失败，请刷新页面重试');
      } finally {
        setIsLoadingData(false);
      }
    }

    loadUserData();
  }, [user, isAuthenticated]);

  // 加载状态
  if (isLoading || !isInitialized || isLoadingData) {
    return <DashboardSkeleton />;
  }

  // 错误状态
  if (error || dataError) {
    return <DashboardError error={error?.message || dataError || '未知错误'} />;
  }

  // 未认证状态
  if (!isAuthenticated || !user) {
    return <DashboardUnauthorized />;
  }

  const isEmpty = cards.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* 页面头部 */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <LayoutDashboard className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  我的工作台
                </span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                管理您的分析卡片，追踪创作灵感
              </p>
            </div>
            <Link href="/" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto shadow-lg group hover:scale-105 transition-all duration-200">
                <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                新建分析
              </Button>
            </Link>
          </div>
          
          {/* 信息完善提示 */}
          {(!user.name || !user.email) && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <span>⚠️</span>
                  完善个人信息
                </CardTitle>
                <CardDescription className="text-orange-700">
                  您的个人信息尚未完善，完善后可以获得更好的使用体验。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/profile/complete">
                  <Button size="sm">立即完善</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 统计卡片 */}
        {!isEmpty && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  总分析卡片
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCards}</div>
                <p className="text-xs text-muted-foreground">
                  来自 {stats.totalSources} 个分析源
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  本周新增
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentCards}</div>
                <p className="text-xs text-muted-foreground">
                  过去7天创建的卡片
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  最新更新
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cards.length > 0 ? '今天' : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {cards.length > 0 
                    ? `${cards[0].versionTitle.slice(0, 15)}...` 
                    : '暂无最新更新'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 分析卡片列表 */}
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  我的分析卡片
                </h2>
                <p className="text-muted-foreground">
                  共 {cards.length} 个分析卡片，按创建时间排序
                </p>
              </div>
              <Badge variant="outline" className="px-3 py-1">
                按时间排序
              </Badge>
            </div>
            
            {/* 卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map((card) => (
                <AnalysisCardItem key={card.id} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* 快速操作（保留部分原有功能） */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>快速访问常用功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/" className="block group">
                <div className="p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 cursor-pointer group-hover:scale-105">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
                      <Plus className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <span className="font-medium group-hover:text-primary transition-colors duration-200">创建分析</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 ml-11">
                    分析新的内容并创建卡片
                  </p>
                </div>
              </Link>
              
              <Link href="/quick-fix" className="block group">
                <div className="p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 cursor-pointer group-hover:scale-105">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 group-hover:bg-amber-200 transition-colors duration-200">
                      <span className="text-lg group-hover:scale-110 transition-transform duration-200">⚡</span>
                    </div>
                    <span className="font-medium group-hover:text-primary transition-colors duration-200">快速修复</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 ml-11">
                    快速修复和优化文案
                  </p>
                </div>
              </Link>
              
              <Link href="/script" className="block group">
                <div className="p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 cursor-pointer group-hover:scale-105">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors duration-200">
                      <span className="text-lg group-hover:scale-110 transition-transform duration-200">📝</span>
                    </div>
                    <span className="font-medium group-hover:text-primary transition-colors duration-200">脚本框架</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 ml-11">
                    管理脚本框架模板
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 加载骨架屏组件
function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* 头部骨架屏 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        {/* 统计卡片骨架屏 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-12 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* 卡片列表骨架屏 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="h-48">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <Skeleton className="h-5 w-5 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-12" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 错误状态组件
function DashboardError({ error }: { error: string }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">加载错误</CardTitle>
          <CardDescription>加载工作台时出现错误</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            重新加载
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 未授权状态组件
function DashboardUnauthorized() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>需要登录</CardTitle>
          <CardDescription>您需要登录才能访问工作台</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              请先登录您的账户，然后再访问个人工作台。
            </p>
            <Link href="/api/auth/sign-in">
              <Button>立即登录</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 