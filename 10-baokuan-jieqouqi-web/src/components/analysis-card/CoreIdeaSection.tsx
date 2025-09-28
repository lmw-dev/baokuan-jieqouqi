import React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FieldEditor } from './FieldEditor';
import { 
  type AnalysisCardFormData, 
  type EditMode 
} from '@/lib/validations/analysis-card';
import { Lightbulb } from 'lucide-react';

interface CoreIdeaSectionProps {
  control: Control<AnalysisCardFormData>;
  errors: FieldErrors<AnalysisCardFormData>;
  mode: EditMode;
  cardId?: string;
}

/**
 * 核心观点区块组件
 * 包含核心观点和论证案例两个字段
 */
export function CoreIdeaSection({ control, errors, mode, cardId }: CoreIdeaSectionProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          核心观点
        </CardTitle>
        <p className="text-sm text-gray-600">
          内容的主要观点和支撑论证，构成内容的核心价值
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 核心观点 */}
        <FieldEditor
          label="核心观点"
          name="coreIdea"
          control={control}
          error={errors.coreIdea}
          mode={mode}
          multiline
          rows={4}
          maxLength={800}
          placeholder="总结内容的核心观点和主要思想..."
          description="内容想要传达的主要观点"
        />
        
        {/* 论证案例 */}
        <FieldEditor
          label="论证案例"
          name="argumentCase"
          control={control}
          error={errors.argumentCase}
          mode={mode}
          multiline
          rows={5}
          maxLength={1000}
          placeholder="支撑核心观点的案例、数据、故事等..."
          description="用来支撑观点的具体案例和证据"
        />
      </CardContent>
    </Card>
  );
}