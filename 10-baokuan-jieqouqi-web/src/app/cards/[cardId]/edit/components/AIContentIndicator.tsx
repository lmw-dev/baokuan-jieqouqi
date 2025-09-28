/**
 * AI内容指示器组件
 * TOM-219: 标识和显示AI生成内容的视觉指示器
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Brain, Clock, User, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataProtectionManager } from '@/lib/data-protection';
import { FieldMappingResult } from '@/types/ai-analysis';

interface AIContentIndicatorProps {
  isAIGenerated: boolean;
  lastModified?: Date;
  showTooltip?: boolean;
  className?: string;
  variant?: 'default' | 'subtle' | 'prominent';
  size?: 'sm' | 'default' | 'lg';
  showTimestamp?: boolean;
  cardId?: string;
  fieldName?: keyof FieldMappingResult;
}

/**
 * AI内容指示器主组件
 * 提供清晰的AI生成内容标识
 */
export function AIContentIndicator({
  isAIGenerated,
  lastModified,
  showTooltip = true,
  className,
  variant = 'default',
  size = 'default',
  showTimestamp = false,
  cardId,
  fieldName,
}: AIContentIndicatorProps) {
  const [aiMarks, setAiMarks] = useState<any[]>([]);

  useEffect(() => {
    if (cardId && fieldName) {
      const marks = DataProtectionManager.getAIContentMarks(cardId, fieldName);
      setAiMarks(marks);
    }
  }, [cardId, fieldName]);

  if (!isAIGenerated && aiMarks.length === 0) {
    return null;
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'subtle':
        return 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100';
      case 'prominent':
        return 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent shadow-sm';
      default:
        return 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5 gap-1';
      case 'lg':
        return 'text-sm px-3 py-1.5 gap-2';
      default:
        return 'text-xs px-2 py-1 gap-1.5';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'prominent':
        return <Sparkles className="h-3 w-3" />;
      default:
        return <Brain className="h-3 w-3" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getTooltipContent = () => {
    const effectiveLastModified = lastModified || (aiMarks[0] ? new Date(aiMarks[0].lastModified) : null);
    
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Brain className="h-4 w-4 text-purple-500" />
          <span>AI生成内容</span>
        </div>
        <div className="text-gray-600 space-y-1">
          <p>此内容由AI智能分析生成</p>
          {effectiveLastModified && (
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="h-3 w-3" />
              <span>生成时间: {formatTimestamp(effectiveLastModified)}</span>
            </div>
          )}
          <p className="text-xs text-purple-600">💡 您可以随时编辑和完善这些内容</p>
        </div>
      </div>
    );
  };

  const badgeContent = (
    <Badge
      variant="secondary"
      className={cn(
        'transition-all duration-200 cursor-help',
        getVariantStyles(),
        getSizeStyles(),
        className
      )}
    >
      {getIcon()}
      <span>AI生成</span>
      {showTimestamp && lastModified && (
        <span className="opacity-75">
          {formatTimestamp(lastModified)}
        </span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 字段级AI内容指示器
 * 专门用于表单字段的AI内容标识
 */
export function FieldAIIndicator({
  cardId,
  fieldName,
  className,
  showInlineEdit = false,
}: {
  cardId: string;
  fieldName: keyof FieldMappingResult;
  className?: string;
  showInlineEdit?: boolean;
}) {
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [lastModified, setLastModified] = useState<Date | null>(null);

  useEffect(() => {
    const checkAIStatus = () => {
      const isAI = DataProtectionManager.isAIGenerated(cardId, fieldName);
      setIsAIGenerated(isAI);

      if (isAI) {
        const marks = DataProtectionManager.getAIContentMarks(cardId, fieldName);
        if (marks.length > 0) {
          setLastModified(new Date(marks[0].lastModified));
        }
      }
    };

    checkAIStatus();

    // 监听字段更新
    const interval = setInterval(checkAIStatus, 1000);
    return () => clearInterval(interval);
  }, [cardId, fieldName]);

  const handleMarkAsUserEdited = () => {
    DataProtectionManager.clearAIContentMarks(cardId, fieldName);
    setIsAIGenerated(false);
    setLastModified(null);
  };

  if (!isAIGenerated) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AIContentIndicator
        isAIGenerated={isAIGenerated}
        lastModified={lastModified || undefined}
        variant="subtle"
        size="sm"
        cardId={cardId}
        fieldName={fieldName}
      />
      
      {showInlineEdit && (
        <button
          onClick={handleMarkAsUserEdited}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          title="标记为已编辑"
        >
          <User className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/**
 * 批量AI内容指示器
 * 显示多个字段的AI生成状态概览
 */
export function BatchAIIndicator({
  cardId,
  fields,
  className,
}: {
  cardId: string;
  fields: Array<keyof FieldMappingResult>;
  className?: string;
}) {
  const [aiFieldsCount, setAiFieldsCount] = useState(0);
  const [totalFields, setTotalFields] = useState(fields.length);

  useEffect(() => {
    const checkAllFields = () => {
      const aiCount = fields.filter(field => 
        DataProtectionManager.isAIGenerated(cardId, field)
      ).length;
      setAiFieldsCount(aiCount);
    };

    checkAllFields();
    const interval = setInterval(checkAllFields, 2000);
    return () => clearInterval(interval);
  }, [cardId, fields]);

  if (aiFieldsCount === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
        <Brain className="h-3 w-3 mr-1" />
        <span>{aiFieldsCount}/{totalFields} 字段由AI生成</span>
      </Badge>
      
      {aiFieldsCount === totalFields && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-purple-500 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>所有字段都由AI生成，建议您检查和完善内容</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/**
 * 内联AI状态指示器
 * 用于在表单控件内部显示AI状态
 */
export function InlineAIStatus({
  cardId,
  fieldName,
  compact = false,
}: {
  cardId: string;
  fieldName: keyof FieldMappingResult;
  compact?: boolean;
}) {
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      setIsAIGenerated(DataProtectionManager.isAIGenerated(cardId, fieldName));
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [cardId, fieldName]);

  if (!isAIGenerated) {
    return null;
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 text-purple-600">
        <Brain className="h-3 w-3" />
        {!compact && <span className="text-xs">AI</span>}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-md text-xs">
      <Brain className="h-3 w-3" />
      <span>AI生成</span>
    </div>
  );
}