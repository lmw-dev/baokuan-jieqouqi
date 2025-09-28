import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  analysisCardFormSchema, 
  type AnalysisCardFormData, 
  type EditMode,
  type AnalysisCard,
  ANALYSIS_CARD_FORM_DEFAULTS
} from '@/lib/validations/analysis-card';
import { toast } from 'sonner';

interface UseAnalysisCardFormOptions {
  cardId: string;
  initialData?: AnalysisCard;
  onSaveSuccess?: (data: AnalysisCard) => void;
}

/**
 * 分析卡片表单管理Hook
 * 封装表单状态管理、编辑模式切换、保存逻辑
 */
export function useAnalysisCardForm({ 
  cardId, 
  initialData, 
  onSaveSuccess 
}: UseAnalysisCardFormOptions) {
  
  // 编辑模式状态
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // React Hook Form配置
  const form = useForm<AnalysisCardFormData>({
    resolver: zodResolver(analysisCardFormSchema),
    defaultValues: {
      ...ANALYSIS_CARD_FORM_DEFAULTS,
      ...(initialData && {
        versionTitle: initialData.versionTitle,
        hookCopy: initialData.hookCopy || "",
        hookTypes: initialData.hookTypes || [],
        hookNotes: initialData.hookNotes || "",
        coreIdea: initialData.coreIdea || "",
        argumentCase: initialData.argumentCase || "",
        valueDelivery: initialData.valueDelivery || [],
        reusableElements: initialData.reusableElements || "",
        valueNotes: initialData.valueNotes || "",
      })
    },
    mode: 'onChange', // 实时验证
  });

  const { 
    control, 
    handleSubmit, 
    formState: { errors, isDirty, isValid }, 
    reset,
    watch
  } = form;

  // 监听表单变化，更新未保存状态
  const watchAllFields = watch();
  
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  // 重置表单到初始数据
  const resetForm = useCallback(() => {
    if (initialData) {
      reset({
        versionTitle: initialData.versionTitle,
        hookCopy: initialData.hookCopy || "",
        hookTypes: initialData.hookTypes || [],
        hookNotes: initialData.hookNotes || "",
        coreIdea: initialData.coreIdea || "",
        argumentCase: initialData.argumentCase || "",
        valueDelivery: initialData.valueDelivery || [],
        reusableElements: initialData.reusableElements || "",
        valueNotes: initialData.valueNotes || "",
      });
    }
    setHasUnsavedChanges(false);
  }, [initialData, reset]);

  // 切换编辑模式
  const toggleEditMode = useCallback((newMode: EditMode) => {
    if (editMode === 'edit' && newMode === 'view' && hasUnsavedChanges) {
      // 如果有未保存的更改，显示确认对话框
      const confirmed = window.confirm('您有未保存的更改，确定要离开编辑模式吗？');
      if (!confirmed) {
        return;
      }
      // 用户确认后重置表单
      resetForm();
    }
    setEditMode(newMode);
  }, [editMode, hasUnsavedChanges, resetForm]);

  // 保存表单数据
  const saveForm = useCallback(async (data: AnalysisCardFormData) => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失败');
      }

      const result = await response.json();
      
      // 保存成功
      toast.success('分析卡片保存成功');
      setHasUnsavedChanges(false);
      setEditMode('view');
      
      // 调用成功回调
      if (onSaveSuccess && result.data) {
        onSaveSuccess(result.data);
      }

      return result.data;

    } catch (error) {
      console.error('保存分析卡片失败:', error);
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [cardId, onSaveSuccess]);

  // 处理表单提交
  const onSubmit = handleSubmit(saveForm);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('您有未保存的更改，确定要取消编辑吗？');
      if (!confirmed) {
        return;
      }
    }
    resetForm();
    setEditMode('view');
  }, [hasUnsavedChanges, resetForm]);

  // 自动保存功能（可选）
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      if (hasUnsavedChanges && isValid && editMode === 'edit') {
        const data = form.getValues();
        saveForm(data).catch(console.error);
      }
    }, 30000); // 30秒后自动保存
    
    setAutoSaveTimer(timer);
  }, [autoSaveTimer, hasUnsavedChanges, isValid, editMode, form, saveForm]);

  // 监听表单变化，触发自动保存
  useEffect(() => {
    if (editMode === 'edit' && hasUnsavedChanges) {
      triggerAutoSave();
    }
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [watchAllFields, editMode, hasUnsavedChanges, triggerAutoSave, autoSaveTimer]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return {
    // 表单相关
    form,
    control,
    errors,
    onSubmit,
    
    // 状态
    editMode,
    isSaving,
    hasUnsavedChanges,
    isValid,
    
    // 操作方法
    toggleEditMode,
    cancelEdit,
    resetForm,
    
    // 手动保存（用于保存按钮）
    save: () => {
      const data = form.getValues();
      return saveForm(data);
    }
  };
}