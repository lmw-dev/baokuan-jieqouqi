import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Edit3, Save, X, Loader2 } from 'lucide-react';
import { type EditMode } from '@/lib/validations/analysis-card';

interface EditModeToggleProps {
  mode: EditMode;
  onModeChange: (mode: EditMode) => void;
  hasUnsavedChanges: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  isValid?: boolean;
  onSave?: () => Promise<void> | void;
  onCancel?: () => void;
}

/**
 * 编辑模式切换组件
 * 处理编辑/保存模式的切换，包括未保存变更的确认
 */
export function EditModeToggle({
  mode,
  onModeChange,
  hasUnsavedChanges,
  isLoading = false,
  isSaving = false,
  isValid = true,
  onSave,
  onCancel
}: EditModeToggleProps) {
  
  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
      } catch (error) {
        console.error('保存失败:', error);
        // 错误已在Hook中处理，这里不需要额外处理
      }
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleEdit = () => {
    onModeChange('edit');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">加载中...</span>
      </div>
    );
  }

  if (mode === 'view') {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          查看模式 - 点击编辑按钮开始修改内容
        </div>
        <Button 
          onClick={handleEdit}
          className="flex items-center gap-2"
        >
          <Edit3 className="h-4 w-4" />
          编辑
        </Button>
      </div>
    );
  }

  // 编辑模式
  return (
    <div className="flex items-center justify-between p-4 bg-blue-50 border-t border-blue-200">
      <div className="flex items-center gap-2 text-sm">
        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-blue-700">
          编辑模式
          {hasUnsavedChanges && ' - 有未保存的更改'}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* 取消按钮 */}
        {hasUnsavedChanges ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
                取消
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认取消编辑</AlertDialogTitle>
                <AlertDialogDescription>
                  您有未保存的更改，取消编辑将丢失这些更改。确定要继续吗？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>继续编辑</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel}>
                  确定取消
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancel}
            className="flex items-center gap-2"
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
            取消
          </Button>
        )}
        
        {/* 保存按钮 */}
        <Button 
          onClick={handleSave}
          disabled={!isValid || isSaving || !hasUnsavedChanges}
          size="sm"
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存
            </>
          )}
        </Button>
      </div>
    </div>
  );
}