/**
 * 数据保护对话框组件
 * TOM-219: 处理AI分析结果与用户数据冲突的确认对话框
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Brain, 
  User, 
  RefreshCw, 
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  Merge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  FieldConflict,
  DataProtectionOptions,
  FieldMappingResult,
  DataMergeStrategy 
} from '@/types/ai-analysis';

interface DataProtectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: DataProtectionOptions, strategy: DataMergeStrategy) => void;
  conflictingFields: FieldConflict[];
  newData: FieldMappingResult;
  existingData: Partial<FieldMappingResult>;
  cardId?: string;
}

/**
 * 数据保护确认对话框
 * 处理AI分析与用户数据的冲突解决
 */
export function DataProtectionDialog({
  isOpen,
  onClose,
  onConfirm,
  conflictingFields,
  newData,
  existingData,
  cardId,
}: DataProtectionDialogProps) {
  const [protectionOptions, setProtectionOptions] = useState<DataProtectionOptions>({
    preserveUserNotes: true,
    showConfirmDialog: true,
    highlightAIContent: true,
  });

  const [fieldResolutions, setFieldResolutions] = useState<
    Record<string, 'keep_user' | 'use_ai' | 'merge'>
  >({});

  const [selectedTab, setSelectedTab] = useState<'overview' | 'details'>('overview');
  const [showPreview, setShowPreview] = useState(false);

  // 初始化字段解决方案
  useEffect(() => {
    const initialResolutions: Record<string, 'keep_user' | 'use_ai' | 'merge'> = {};
    conflictingFields.forEach(conflict => {
      initialResolutions[conflict.fieldName] = conflict.recommended;
    });
    setFieldResolutions(initialResolutions);
  }, [conflictingFields]);

  const handleConfirm = () => {
    const updatedConflicts = conflictingFields.map(conflict => ({
      ...conflict,
      recommended: fieldResolutions[conflict.fieldName] || conflict.recommended,
    }));

    const strategy: DataMergeStrategy = {
      conflictingFields: updatedConflicts,
      protectionOptions,
      mergeMode: 'user_choice',
    };

    onConfirm(protectionOptions, strategy);
  };

  const getRiskLevel = () => {
    const highRiskCount = conflictingFields.filter(c => 
      c.userValue.length > 50 && c.aiValue.length > 50
    ).length;
    
    if (highRiskCount >= 3) return 'high';
    if (highRiskCount >= 1) return 'medium';
    return 'low';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getFieldDisplayName = (fieldName: string) => {
    const nameMap: Record<string, string> = {
      hookCopy: '钩子文案',
      hookTypes: '钩子类型',
      coreIdea: '核心观点',
      argumentCase: '论证案例',
      valueDelivery: '价值交付',
      reusableElements: '可复用要素',
    };
    return nameMap[fieldName] || fieldName;
  };

  const renderFieldComparison = (conflict: FieldConflict) => {
    const resolution = fieldResolutions[conflict.fieldName];
    
    return (
      <div key={conflict.fieldName} className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">
            {getFieldDisplayName(conflict.fieldName)}
          </h4>
          <Badge 
            variant={resolution === 'use_ai' ? 'default' : 'outline'}
            className={cn(
              resolution === 'use_ai' && 'bg-purple-100 text-purple-700',
              resolution === 'keep_user' && 'bg-blue-100 text-blue-700',
              resolution === 'merge' && 'bg-green-100 text-green-700'
            )}
          >
            {resolution === 'use_ai' && '使用AI版本'}
            {resolution === 'keep_user' && '保留用户版本'}
            {resolution === 'merge' && '智能合并'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 用户版本 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <User className="h-4 w-4" />
              <span>您的版本</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {conflict.userValue || '(空)'}
              </p>
            </div>
          </div>

          {/* AI版本 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
              <Brain className="h-4 w-4" />
              <span>AI分析版本</span>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {conflict.aiValue || '(空)'}
              </p>
            </div>
          </div>
        </div>

        {/* 解决方案选择 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">选择处理方式:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={resolution === 'keep_user' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFieldResolutions(prev => ({
                ...prev,
                [conflict.fieldName]: 'keep_user'
              }))}
              className="gap-1"
            >
              <User className="h-3 w-3" />
              保留我的版本
            </Button>
            
            <Button
              variant={resolution === 'use_ai' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFieldResolutions(prev => ({
                ...prev,
                [conflict.fieldName]: 'use_ai'
              }))}
              className="gap-1"
            >
              <Brain className="h-3 w-3" />
              使用AI版本
            </Button>

            {conflict.fieldName === 'hookTypes' || conflict.fieldName === 'valueDelivery' ? (
              <Button
                variant={resolution === 'merge' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFieldResolutions(prev => ({
                  ...prev,
                  [conflict.fieldName]: 'merge'
                }))}
                className="gap-1"
              >
                <Merge className="h-3 w-3" />
                智能合并
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const riskLevel = getRiskLevel();
  const conflictCount = conflictingFields.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">数据保护确认</DialogTitle>
              <DialogDescription>
                检测到 {conflictCount} 个字段存在内容冲突，请选择如何处理
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* 风险概览 */}
          <Alert className={cn('mb-4', getRiskColor(riskLevel))}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>
                {riskLevel === 'high' && '高风险冲突: '}
                {riskLevel === 'medium' && '中等风险冲突: '}
                {riskLevel === 'low' && '轻微冲突: '}
              </strong>
              {riskLevel === 'high' && '多个字段包含大量用户内容，请仔细选择'}
              {riskLevel === 'medium' && '部分字段可能覆盖您的重要内容'}
              {riskLevel === 'low' && 'AI可以安全填充大部分内容'}
            </AlertDescription>
          </Alert>

          {/* 保护选项 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">数据保护设置</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preserve-notes"
                  checked={protectionOptions.preserveUserNotes}
                  onCheckedChange={(checked) =>
                    setProtectionOptions(prev => ({
                      ...prev,
                      preserveUserNotes: !!checked
                    }))
                  }
                />
                <label htmlFor="preserve-notes" className="text-sm font-medium">
                  保护用户笔记字段 (推荐)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="highlight-ai"
                  checked={protectionOptions.highlightAIContent}
                  onCheckedChange={(checked) =>
                    setProtectionOptions(prev => ({
                      ...prev,
                      highlightAIContent: !!checked
                    }))
                  }
                />
                <label htmlFor="highlight-ai" className="text-sm font-medium">
                  标识AI生成的内容
                </label>
              </div>
            </div>
          </div>

          {/* 冲突字段详情 */}
          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">快速处理</TabsTrigger>
              <TabsTrigger value="details">逐一对比</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 max-h-60 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    为所有冲突字段选择统一处理方式:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="gap-1"
                  >
                    {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPreview ? '隐藏预览' : '预览结果'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newResolutions: Record<string, 'keep_user'> = {};
                      conflictingFields.forEach(c => {
                        newResolutions[c.fieldName] = 'keep_user';
                      });
                      setFieldResolutions(newResolutions);
                    }}
                    className="gap-2"
                  >
                    <User className="h-4 w-4" />
                    全部保留用户版本
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const newResolutions: Record<string, 'use_ai'> = {};
                      conflictingFields.forEach(c => {
                        newResolutions[c.fieldName] = 'use_ai';
                      });
                      setFieldResolutions(newResolutions);
                    }}
                    className="gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    全部使用AI版本
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const newResolutions: Record<string, any> = {};
                      conflictingFields.forEach(c => {
                        newResolutions[c.fieldName] = c.recommended;
                      });
                      setFieldResolutions(newResolutions);
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    使用推荐方案
                  </Button>
                </div>

                {showPreview && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">处理结果预览:</h5>
                    <div className="space-y-2 text-sm">
                      {conflictingFields.map(conflict => (
                        <div key={conflict.fieldName} className="flex justify-between">
                          <span>{getFieldDisplayName(conflict.fieldName)}</span>
                          <Badge variant="outline">
                            {fieldResolutions[conflict.fieldName] === 'use_ai' && 'AI版本'}
                            {fieldResolutions[conflict.fieldName] === 'keep_user' && '用户版本'}
                            {fieldResolutions[conflict.fieldName] === 'merge' && '合并'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 max-h-80 overflow-y-auto">
              {conflictingFields.map(renderFieldComparison)}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            确认应用 ({conflictCount} 个冲突)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 简化版数据保护对话框
 * 用于低风险场景的快速确认
 */
export function SimpleDataProtectionDialog({
  isOpen,
  onClose,
  onConfirm,
  conflictCount,
  riskLevel = 'low',
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflictCount: number;
  riskLevel?: 'low' | 'medium' | 'high';
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            确认AI分析
          </DialogTitle>
          <DialogDescription>
            将AI分析结果应用到 {conflictCount} 个字段，您的笔记内容将被保护。
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50">
          <Brain className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            AI将智能填充表单内容，您可以随时编辑和完善。
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onConfirm}>
            确认应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}