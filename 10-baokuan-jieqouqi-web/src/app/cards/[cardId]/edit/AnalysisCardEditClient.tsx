'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { AnalysisCardForm } from '@/components/analysis-card/AnalysisCardForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, Lock, FileX } from 'lucide-react';
import { type AnalysisCard } from '@/lib/validations/analysis-card';

interface AnalysisCardEditClientProps {
  cardId: string;
}

/**
 * 分析卡片编辑页面 - 客户端组件
 * 处理权限验证、数据加载和用户交互
 */
export function AnalysisCardEditClient({ cardId }: AnalysisCardEditClientProps) {
  const router = useRouter();
  const { permissionResult, isLoading, error, hasPermission, card } = usePermissionCheck(cardId);
  const [cardData, setCardData] = useState<AnalysisCard | null>(null);

  // 更新卡片数据
  useEffect(() => {
    if (card) {
      setCardData(card);
    }
  }, [card]);

  // 处理保存成功
  const handleSaveSuccess = (updatedCard: AnalysisCard) => {
    setCardData(updatedCard);
  };

  // 返回上一页
  const handleGoBack = () => {
    router.back();
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* 导航骨架 */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        
        {/* 表单骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 错误状态处理
  if (error || !hasPermission) {
    const errorMessage = permissionResult.error || error || '加载失败';
    const isPermissionError = errorMessage.includes('权限') || errorMessage.includes('认证');
    const isNotFound = errorMessage.includes('不存在');

    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto">
          {/* 返回按钮 */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
          </div>

          {/* 错误信息卡片 */}
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              {/* 错误图标 */}
              <div className="flex justify-center">
                {isPermissionError ? (
                  <Lock className="h-16 w-16 text-orange-500" />
                ) : isNotFound ? (
                  <FileX className="h-16 w-16 text-gray-400" />
                ) : (
                  <AlertCircle className="h-16 w-16 text-red-500" />
                )}
              </div>

              {/* 错误标题 */}
              <h1 className="text-2xl font-semibold text-gray-900">
                {isPermissionError 
                  ? '无权限访问'
                  : isNotFound 
                    ? '分析卡片不存在'
                    : '加载失败'
                }
              </h1>

              {/* 错误描述 */}
              <p className="text-gray-600 max-w-md mx-auto">
                {isPermissionError 
                  ? '您没有权限编辑此分析卡片，只有卡片创建者可以进行编辑。'
                  : isNotFound 
                    ? '您要查找的分析卡片不存在，可能已被删除或您输入了错误的链接。'
                    : '加载分析卡片时发生错误，请稍后重试。'
                }
              </p>

              {/* 操作按钮 */}
              <div className="flex justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleGoBack}
                >
                  返回上一页
                </Button>
                {!isPermissionError && !isNotFound && (
                  <Button
                    onClick={() => window.location.reload()}
                  >
                    重新加载
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 详细错误信息（开发环境） */}
          {process.env.NODE_ENV === 'development' && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>开发调试信息:</strong> {errorMessage}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  // 正常渲染编辑页面
  if (!cardData) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            分析卡片数据加载中...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              编辑分析卡片
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              来源: {(cardData as any).source?.title || '未知来源'}
            </p>
          </div>
        </div>
      </div>

      {/* 主要内容 - 表单 */}
      <AnalysisCardForm
        cardId={cardId}
        initialData={cardData}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
}