import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FieldEditor, TagFieldEditor } from './FieldEditor';
import { 
  type AnalysisCardFormData, 
  type EditMode,
  VALUE_DELIVERY_OPTIONS 
} from '@/lib/validations/analysis-card';
import { Gift } from 'lucide-react';

interface ValueSectionProps {
  control: Control<AnalysisCardFormData>;
  errors: FieldErrors<AnalysisCardFormData>;
  mode: EditMode;
  cardId?: string;
}

/**
 * 价值交付区块组件
 * 包含价值交付标签、可复用要素、价值点笔记三个字段
 */
export function ValueSection({ control, errors, mode, cardId }: ValueSectionProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Gift className="h-5 w-5 text-green-600" />
          价值交付
        </CardTitle>
        <p className="text-sm text-gray-600">
          内容为用户提供的具体价值和可复用的要素
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 价值交付标签 */}
        <TagFieldEditor
          label="价值交付"
          name="valueDelivery"
          control={control}
          error={errors.valueDelivery as any}
          mode={mode}
          options={VALUE_DELIVERY_OPTIONS}
          maxTags={8}
          description="内容提供的具体价值类型，最多8个"
        />
        
        {/* 可复用要素 */}
        <FieldEditor
          label="可复用要素"
          name="reusableElements"
          control={control}
          error={errors.reusableElements}
          mode={mode}
          multiline
          rows={4}
          maxLength={600}
          placeholder="提取可以在其他内容中复用的元素..."
          description="可以借鉴和复用的具体元素"
        />
        
        {/* 价值点笔记 */}
        <FieldEditor
          label="价值点笔记"
          name="valueNotes"
          control={control}
          error={errors.valueNotes}
          mode={mode}
          multiline
          rows={3}
          maxLength={500}
          placeholder="记录价值分析的思路和启发..."
          description="个人思考和价值总结"
        />
      </CardContent>
    </Card>
  );
}