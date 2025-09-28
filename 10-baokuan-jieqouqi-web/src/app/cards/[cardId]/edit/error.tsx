'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 分析卡片编辑页面错误边界
 */
export default function Error({ error, reset }: ErrorPageProps) {
  const router = useRouter();

  useEffect(() => {
    // 记录错误到控制台
    console.error('分析卡片编辑页面错误:', error);
  }, [error]);

  const handleGoBack = () => {
    router.back();
  };

  const handleRetry = () => {
    reset();
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

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
          <CardContent className="p-8 text-center space-y-6">
            {/* 错误图标 */}
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>

            {/* 错误标题 */}
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-gray-900">
                页面加载失败
              </h1>
              <p className="text-gray-600">
                分析卡片编辑页面遇到了问题，请尝试重新加载或返回上一页。
              </p>
            </div>

            {/* 错误详情（开发环境） */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-left">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  开发调试信息:
                </h3>
                <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
                  {error.message}
                </pre>
                {error.digest && (
                  <p className="text-xs text-red-600 mt-2">
                    错误ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleRetry}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                重新加载
              </Button>
              
              <Button
                variant="outline"
                onClick={handleGoBack}
              >
                返回上一页
              </Button>
              
              <Button
                variant="outline"
                onClick={handleGoHome}
              >
                回到首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}