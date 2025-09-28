import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FieldEditor, TagFieldEditor } from './FieldEditor';
import { 
  type AnalysisCardFormData, 
  type EditMode,
  HOOK_TYPE_OPTIONS 
} from '@/lib/validations/analysis-card';
import { Target } from 'lucide-react';

interface HookSectionProps {
  control: Control<AnalysisCardFormData>;
  errors: FieldErrors<AnalysisCardFormData>;
  mode: EditMode;
  cardId?: string;
}

/**
 * 钩子分析区块组件
 * 包含钩子文案、钩子类型、钩子笔记三个字段
 */
export function HookSection({ control, errors, mode, cardId }: HookSectionProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Target className="h-5 w-5 text-blue-600" />
          钩子分析
        </CardTitle>
        <p className="text-sm text-gray-600">
          分析内容的开头钩子，包括吸引用户注意力的文案和类型
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 钩子文案 */}
        <FieldEditor
          label="钩子文案"
          name="hookCopy"
          control={control}
          error={errors.hookCopy}
          mode={mode}
          multiline
          rows={4}
          maxLength={1000}
          placeholder="输入吸引用户注意力的开头文案..."
          description="用于开头吸引用户的核心文案"
        />
        
        {/* 钩子类型 */}
        <TagFieldEditor
          label="钩子类型"
          name="hookTypes"
          control={control}
          error={errors.hookTypes as any}
          mode={mode}
          options={HOOK_TYPE_OPTIONS}
          maxTags={5}
          description="从预设类型中选择，最多5个"
        />
        
        {/* 钩子笔记 */}
        <FieldEditor
          label="钩子笔记"
          name="hookNotes"
          control={control}
          error={errors.hookNotes}
          mode={mode}
          multiline
          rows={3}
          maxLength={500}
          placeholder="记录钩子的分析思路、改进建议等..."
          description="个人分析和改进建议"
        />
      </CardContent>
    </Card>
  );
}