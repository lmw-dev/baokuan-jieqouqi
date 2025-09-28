/**
 * 重新分析按钮组件
 * TOM-219: 触发AI重新分析的交互按钮
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, RefreshCw, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReAnalyzeButtonProps {
  sourceId: string;
  onAnalysisStart: () => void;
  onAnalysisComplete: (result: any) => void;
  onAnalysisError: (error: Error) => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'sm' | 'default' | 'lg';
}

/**
 * 重新分析按钮组件
 * 提供触发AI分析的用户界面和状态反馈
 */
export function ReAnalyzeButton({
  sourceId,
  onAnalysisStart,
  onAnalysisComplete,
  onAnalysisError,
  disabled = false,
  isLoading = false,
  className,
  variant = 'default',
  size = 'default',
}: ReAnalyzeButtonProps) {
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAnalyze = async () => {
    if (disabled || isLoading) return;

    try {
      // 触发分析开始
      onAnalysisStart();

      // 获取正确的media_file_id
      // sourceId实际上可能是AnalysisSource的ID，我们需要获取对应的media_file_id
      const sourceResponse = await fetch(`/api/sources/${sourceId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!sourceResponse.ok) {
        throw new Error('无法获取分析源信息');
      }

      const sourceData = await sourceResponse.json();
      const mediaFileId = sourceData.data?.mediaFileId || sourceId; // 回退到sourceId

      // 调用前端API路由进行重新分析
      const response = await fetch('/api/analyze/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          mediaFileId: mediaFileId,
          analysisType: 'full',
          forceNewCard: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 检查Next.js API响应格式（使用ErrorCode模式）
      if (result.code !== 0) {
        throw new Error(result.message || '分析失败');
      }

      // 映射分析结果到表单字段格式
      // 注意：直接使用API返回的数据，无需通过FieldMapper转换
      // 因为/api/analyze/start已经返回了正确的格式
      const mappedResult = result.data;

      // 更新状态
      setLastAnalysisTime(new Date());
      setAnalysisCount(prev => prev + 1);
      setShowSuccess(true);

      // 通知父组件分析完成
      onAnalysisComplete(mappedResult);

      // 3秒后隐藏成功提示
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      console.error('AI重新分析失败:', error);
      onAnalysisError(error as Error);
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>分析中...</span>
        </>
      );
    }

    if (showSuccess) {
      return (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span>分析完成</span>
        </>
      );
    }

    return (
      <>
        <Brain className="h-4 w-4" />
        <span>{analysisCount > 0 ? '重新分析' : 'AI分析'}</span>
        <Zap className="h-3 w-3 text-purple-500" />
      </>
    );
  };

  const getButtonVariant = () => {
    if (showSuccess) return 'outline';
    return variant;
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleAnalyze}
        disabled={disabled || isLoading}
        variant={getButtonVariant()}
        size={size}
        className={cn(
          'gap-2 font-medium transition-all duration-200',
          'hover:shadow-md active:scale-95',
          showSuccess && 'border-green-200 bg-green-50 text-green-700',
          isLoading && 'cursor-not-allowed',
          className
        )}
      >
        {getButtonContent()}
      </Button>

      {/* 分析历史信息 */}
      {(lastAnalysisTime || analysisCount > 0) && (
        <div className="text-xs text-gray-500 space-y-1">
          {lastAnalysisTime && (
            <p>
              上次分析: {lastAnalysisTime.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {analysisCount > 1 && (
            <p>共分析 {analysisCount} 次</p>
          )}
        </div>
      )}

      {/* 成功提示 */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            AI分析完成！已自动填充相关字段，请检查并调整内容。
          </AlertDescription>
        </Alert>
      )}

      {/* 使用提示 */}
      {analysisCount === 0 && !isLoading && (
        <Alert className="border-blue-200 bg-blue-50">
          <Brain className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>AI智能分析:</strong> 
            基于视频内容生成钩子文案、核心观点和价值交付建议。
            <br />
            <span className="text-blue-600">💡 您的笔记内容将被自动保护</span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * 紧凑版重新分析按钮
 * 用于空间受限的场景
 */
export function CompactReAnalyzeButton({
  sourceId,
  onAnalysisStart,
  onAnalysisComplete,
  onAnalysisError,
  disabled = false,
  isLoading = false,
  className,
}: Omit<ReAnalyzeButtonProps, 'variant' | 'size'>) {
  return (
    <ReAnalyzeButton
      sourceId={sourceId}
      onAnalysisStart={onAnalysisStart}
      onAnalysisComplete={onAnalysisComplete}
      onAnalysisError={onAnalysisError}
      disabled={disabled}
      isLoading={isLoading}
      variant="outline"
      size="sm"
      className={cn('min-w-[100px]', className)}
    />
  );
}

/**
 * 内联重新分析按钮
 * 用于与其他控件并排显示的场景
 */
export function InlineReAnalyzeButton({
  sourceId,
  onAnalysisStart,
  onAnalysisComplete,
  onAnalysisError,
  disabled = false,
  isLoading = false,
  showLabel = true,
  className,
}: Omit<ReAnalyzeButtonProps, 'variant' | 'size'> & {
  showLabel?: boolean;
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (disabled || isLoading || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      onAnalysisStart();

      // 获取正确的media_file_id
      const sourceResponse = await fetch(`/api/sources/${sourceId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!sourceResponse.ok) {
        throw new Error('无法获取分析源信息');
      }

      const sourceData = await sourceResponse.json();
      const mediaFileId = sourceData.data?.mediaFileId || sourceId; // 回退到sourceId

      // 调用前端API路由进行重新分析
      const response = await fetch('/api/analyze/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          mediaFileId: mediaFileId,
          analysisType: 'full',
          forceNewCard: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 检查Next.js API响应格式（使用ErrorCode模式）
      if (result.code !== 0) {
        throw new Error(result.message || '分析失败');
      }

      // 映射分析结果到表单字段格式
      const { FieldMapper } = await import('@/lib/field-mapper');
      const mappedResult = FieldMapper.mapAIResultToFormFields(result.data);
      onAnalysisComplete(mappedResult);

    } catch (error) {
      console.error('AI重新分析失败:', error);
      onAnalysisError(error as Error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Button
      onClick={handleAnalyze}
      disabled={disabled || isLoading || isAnalyzing}
      variant="ghost"
      size="sm"
      className={cn(
        'gap-1.5 h-8 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50',
        'transition-colors duration-200',
        (disabled || isLoading || isAnalyzing) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {isAnalyzing || isLoading ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Brain className="h-3.5 w-3.5" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isAnalyzing || isLoading ? '分析中' : 'AI分析'}
        </span>
      )}
    </Button>
  );
}