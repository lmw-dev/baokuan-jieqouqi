import React from 'react';
import { Control, Controller, FieldError } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { type AnalysisCardFormData, type EditMode } from '@/lib/validations/analysis-card';

interface FieldEditorProps {
  label: string;
  name: keyof AnalysisCardFormData;
  control: Control<AnalysisCardFormData>;
  error?: FieldError;
  mode: EditMode;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  description?: string;
}

/**
 * 通用字段编辑器组件
 * 支持单行文本、多行文本的查看和编辑
 */
export function FieldEditor({
  label,
  name,
  control,
  error,
  mode,
  placeholder,
  multiline = false,
  rows = 3,
  maxLength,
  description
}: FieldEditorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium text-gray-900">
        {label}
        {description && (
          <span className="ml-2 text-xs text-gray-500">({description})</span>
        )}
      </Label>
      
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const value = field.value || '';
          
          if (mode === 'view') {
            // 查看模式：只读显示
            return (
              <div 
                className="min-h-[2.5rem] p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700"
                style={{ whiteSpace: multiline ? 'pre-wrap' : 'nowrap' }}
              >
                {value || <span className="text-gray-400 italic">暂无内容</span>}
              </div>
            );
          }
          
          // 编辑模式：表单控件
          const commonProps = {
            ...field,
            id: name,
            placeholder: placeholder || `请输入${label}`,
            className: error 
              ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
              : ""
          };
          
          return multiline ? (
            <Textarea
              {...commonProps}
              rows={rows}
              maxLength={maxLength}
            />
          ) : (
            <Input
              {...commonProps}
              maxLength={maxLength}
            />
          );
        }}
      />
      
      {/* 字符计数 */}
      {mode === 'edit' && maxLength && (
        <Controller
          name={name}
          control={control}
          render={({ field }) => {
            const currentLength = (field.value as string)?.length || 0;
            const isNearLimit = currentLength > maxLength * 0.8;
            
            return (
              <div className={`text-xs text-right ${
                isNearLimit ? 'text-orange-500' : 'text-gray-400'
              }`}>
                {currentLength} / {maxLength}
              </div>
            );
          }}
        />
      )}
      
      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error.message}</p>
      )}
    </div>
  );
}

interface TagFieldEditorProps {
  label: string;
  name: keyof AnalysisCardFormData;
  control: Control<AnalysisCardFormData>;
  error?: FieldError;
  mode: EditMode;
  options: readonly string[];
  maxTags?: number;
  description?: string;
}

/**
 * 标签字段编辑器组件
 * 支持标签的添加、删除和查看
 */
export function TagFieldEditor({
  label,
  name,
  control,
  error,
  mode,
  options,
  maxTags = 8,
  description
}: TagFieldEditorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium text-gray-900">
        {label}
        {description && (
          <span className="ml-2 text-xs text-gray-500">({description})</span>
        )}
      </Label>
      
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const tags = (field.value as string[]) || [];
          
          if (mode === 'view') {
            // 查看模式：显示标签
            return (
              <div className="min-h-[2.5rem] p-3 bg-gray-50 border border-gray-200 rounded-md">
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 italic text-sm">暂无标签</span>
                )}
              </div>
            );
          }
          
          // 编辑模式：标签选择
          const availableOptions = options.filter(option => !tags.includes(option));
          
          const addTag = (tag: string) => {
            if (tags.length < maxTags && !tags.includes(tag)) {
              field.onChange([...tags, tag]);
            }
          };
          
          const removeTag = (tagToRemove: string) => {
            field.onChange(tags.filter(tag => tag !== tagToRemove));
          };
          
          return (
            <div className={`border rounded-md p-3 ${
              error ? 'border-red-500' : 'border-gray-200'
            }`}>
              {/* 已选择的标签 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="default" 
                      className="text-xs flex items-center gap-1"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* 可选择的标签 */}
              {availableOptions.length > 0 && tags.length < maxTags && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    点击添加标签 (最多{maxTags}个):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableOptions.map((option, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs"
                        onClick={() => addTag(option)}
                      >
                        + {option}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 标签计数 */}
              <div className={`text-xs text-right mt-2 ${
                tags.length > maxTags * 0.8 ? 'text-orange-500' : 'text-gray-400'
              }`}>
                {tags.length} / {maxTags}
              </div>
            </div>
          );
        }}
      />
      
      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error.message}</p>
      )}
    </div>
  );
}