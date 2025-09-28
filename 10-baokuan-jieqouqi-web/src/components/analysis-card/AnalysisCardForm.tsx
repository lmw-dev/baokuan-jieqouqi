import React from 'react';
import { FieldEditor } from './FieldEditor';
import { HookSection } from './HookSection';
import { CoreIdeaSection } from './CoreIdeaSection';
import { ValueSection } from './ValueSection';
import { EditModeToggle } from './EditModeToggle';
import { useAnalysisCardForm } from '@/hooks/useAnalysisCardForm';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { type AnalysisCard } from '@/lib/validations/analysis-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReAnalyzeButton } from '@/app/cards/[cardId]/edit/components/ReAnalyzeButton';
import { BatchAIIndicator } from '@/app/cards/[cardId]/edit/components/AIContentIndicator';
import { DataProtectionDialog } from '@/app/cards/[cardId]/edit/components/DataProtectionDialog';
import { FileText, Brain } from 'lucide-react';

interface AnalysisCardFormProps {
  cardId: string;
  initialData: AnalysisCard;
  onSaveSuccess?: (data: AnalysisCard) => void;
}

/**
 * 分析卡片主表单组件
 * 集成所有字段区块和编辑功能
 * TOM-219: 增加AI分析功能集成
 */
export function AnalysisCardForm({ 
  cardId, 
  initialData, 
  onSaveSuccess 
}: AnalysisCardFormProps) {
  
  const {
    form,
    control,
    errors,
    onSubmit,
    editMode,
    isSaving,
    hasUnsavedChanges,
    isValid,
    toggleEditMode,
    cancelEdit,
    save
  } = useAnalysisCardForm({
    cardId,
    initialData,
    onSaveSuccess
  });

  // AI分析功能集成
  const {
    analyze,
    status: aiStatus,
    result: aiResult,
    error: aiError,
    isLoading: isAnalyzing,
    conflicts,
    showProtectionDialog,
    setShowProtectionDialog,
    applyAIResult,
  } = useAIAnalysis({
    form,
    cardId,
    onAnalysisComplete: (result) => {
      console.log('AI分析完成:', result);
    },
    onAnalysisError: (error) => {
      console.error('AI分析失败:', error);
    },
  });

  // 处理AI分析触发
  const handleAnalyze = async () => {
    if (!initialData.sourceId) {
      console.error('缺少sourceId，无法进行AI分析');
      return;
    }
    
    try {
      await analyze(initialData.sourceId);
    } catch (error) {
      console.error('AI分析失败:', error);
    }
  };

  // 处理数据保护对话框确认
  const handleProtectionConfirm = (options: any, strategy: any) => {
    if (aiResult) {
      applyAIResult(aiResult, strategy);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 表单头部 - 版本标题和AI分析 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <FileText className="h-6 w-6 text-purple-600" />
                分析卡片
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                编辑和完善AI生成的内容分析结果
              </p>
            </div>
            
            {/* AI分析按钮 */}
            <div className="flex items-center gap-3">
              <BatchAIIndicator
                cardId={cardId}
                fields={['hookCopy', 'hookTypes', 'coreIdea', 'argumentCase', 'valueDelivery', 'reusableElements']}
              />
              <ReAnalyzeButton
                sourceId={initialData.sourceId || ''}
                onAnalysisStart={handleAnalyze}
                onAnalysisComplete={() => {}}
                onAnalysisError={(error) => console.error('分析失败:', error)}
                isLoading={isAnalyzing}
                disabled={!initialData.sourceId || isSaving}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldEditor
            label="版本标题"
            name="versionTitle"
            control={control}
            error={errors.versionTitle}
            mode={editMode}
            maxLength={50}
            placeholder="例如：AI初稿、精修版v1、最终版本等..."
            description="为这个版本命名，便于区分不同的修改版本"
          />
        </CardContent>
      </Card>

      {/* 响应式布局容器 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* 钩子分析区块 */}
        <div className="lg:col-span-1">
          <HookSection 
            control={control}
            errors={errors}
            mode={editMode}
            cardId={cardId}
          />
        </div>
        
        {/* 核心观点区块 */}
        <div className="lg:col-span-1">
          <CoreIdeaSection 
            control={control}
            errors={errors}
            mode={editMode}
            cardId={cardId}
          />
        </div>
        
        {/* 价值交付区块 */}
        <div className="lg:col-span-2 xl:col-span-1">
          <ValueSection 
            control={control}
            errors={errors}
            mode={editMode}
            cardId={cardId}
          />
        </div>
      </div>

      {/* 编辑控制栏 */}
      <EditModeToggle
        mode={editMode}
        onModeChange={toggleEditMode}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        isValid={isValid}
        onSave={save}
        onCancel={cancelEdit}
      />

      {/* 数据保护对话框 */}
      <DataProtectionDialog
        isOpen={showProtectionDialog}
        onClose={() => setShowProtectionDialog(false)}
        onConfirm={handleProtectionConfirm}
        conflictingFields={conflicts}
        newData={aiResult || {} as any}
        existingData={form.getValues()}
        cardId={cardId}
      />
    </div>
  );
}