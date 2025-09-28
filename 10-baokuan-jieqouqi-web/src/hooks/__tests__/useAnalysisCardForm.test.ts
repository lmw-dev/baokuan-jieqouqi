import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useAnalysisCardForm } from '../useAnalysisCardForm';
import type { AnalysisCard } from '@/lib/validations/analysis-card';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: jest.fn(),
  writable: true,
});

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('useAnalysisCardForm', () => {
  const mockCardId = 'test-card-id';
  const mockInitialData: AnalysisCard = {
    id: mockCardId,
    versionTitle: '测试版本',
    hookCopy: '测试钩子文案',
    hookTypes: ['情感触动'],
    hookNotes: '测试钩子备注',
    coreIdea: '测试核心观点',
    argumentCase: '测试论证案例',
    valueDelivery: ['实用性'],
    reusableElements: '测试可复用元素',
    valueNotes: '测试价值备注',
    sourceId: 'source-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOnSaveSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (fetch as jest.Mock).mockClear();
    (window.confirm as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('初始化', () => {
    test('应该正确初始化表单状态', () => {
      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
          onSaveSuccess: mockOnSaveSuccess,
        })
      );

      expect(result.current.editMode).toBe('view');
      expect(result.current.isSaving).toBe(false);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.form).toBeDefined();
      expect(result.current.control).toBeDefined();
    });

    test('应该使用初始数据设置表单默认值', () => {
      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      const formValues = result.current.form.getValues();
      expect(formValues.versionTitle).toBe(mockInitialData.versionTitle);
      expect(formValues.hookCopy).toBe(mockInitialData.hookCopy);
      expect(formValues.hookTypes).toEqual(mockInitialData.hookTypes);
    });

    test('应该处理缺失的初始数据', () => {
      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
        })
      );

      const formValues = result.current.form.getValues();
      expect(formValues.versionTitle).toBe('AI初稿');
      expect(formValues.hookCopy).toBe('');
      expect(formValues.hookTypes).toEqual([]);
    });
  });

  describe('编辑模式切换', () => {
    test('应该能够切换到编辑模式', () => {
      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
      });

      expect(result.current.editMode).toBe('edit');
    });

    test('有未保存更改时切换到查看模式应该显示确认对话框', async () => {
      (window.confirm as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      // 切换到编辑模式并修改表单
      act(() => {
        result.current.toggleEditMode('edit');
        result.current.form.setValue('versionTitle', '修改后的标题');
      });

      // 等待表单状态更新
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // 尝试切换回查看模式
      act(() => {
        result.current.toggleEditMode('view');
      });

      expect(window.confirm).toHaveBeenCalledWith(
        '您有未保存的更改，确定要离开编辑模式吗？'
      );
      expect(result.current.editMode).toBe('edit'); // 应该保持在编辑模式
    });

    test('用户确认后应该重置表单并切换到查看模式', () => {
      (window.confirm as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      // 切换到编辑模式并修改表单
      act(() => {
        result.current.toggleEditMode('edit');
        result.current.form.setValue('versionTitle', '修改后的标题');
      });

      // 尝试切换回查看模式
      act(() => {
        result.current.toggleEditMode('view');
      });

      expect(result.current.editMode).toBe('view');
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('表单保存', () => {
    test('应该成功保存表单数据', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: { ...mockInitialData, versionTitle: '更新后的标题' },
        }),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
          onSaveSuccess: mockOnSaveSuccess,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
        result.current.form.setValue('versionTitle', '更新后的标题');
      });

      await act(async () => {
        await result.current.save();
      });

      expect(fetch).toHaveBeenCalledWith(`/api/cards/${mockCardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: expect.any(String),
      });

      expect(toast.success).toHaveBeenCalledWith('分析卡片保存成功');
      expect(result.current.editMode).toBe('view');
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(mockOnSaveSuccess).toHaveBeenCalled();
    });

    test('应该处理保存失败的情况', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: '权限不足',
        }),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
      });

      await act(async () => {
        try {
          await result.current.save();
        } catch (error) {
          // 预期的错误
        }
      });

      expect(toast.error).toHaveBeenCalledWith('权限不足');
      expect(result.current.isSaving).toBe(false);
    });

    test('应该处理网络错误', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('网络错误'));

      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
      });

      await act(async () => {
        try {
          await result.current.save();
        } catch (error) {
          // 预期的错误
        }
      });

      expect(toast.error).toHaveBeenCalledWith('网络错误');
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('取消编辑', () => {
    test('没有未保存更改时应该直接切换到查看模式', () => {
      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
        result.current.cancelEdit();
      });

      expect(result.current.editMode).toBe('view');
      expect(window.confirm).not.toHaveBeenCalled();
    });

    test('有未保存更改时应该显示确认对话框', async () => {
      (window.confirm as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
        result.current.form.setValue('versionTitle', '修改后的标题');
      });

      // 等待表单状态更新
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.cancelEdit();
      });

      expect(window.confirm).toHaveBeenCalledWith(
        '您有未保存的更改，确定要取消编辑吗？'
      );
      expect(result.current.editMode).toBe('edit');
    });
  });

  describe('表单重置', () => {
    test('应该重置表单到初始值', () => {
      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
        result.current.form.setValue('versionTitle', '修改后的标题');
        result.current.resetForm();
      });

      const formValues = result.current.form.getValues();
      expect(formValues.versionTitle).toBe(mockInitialData.versionTitle);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('自动保存', () => {
    test('应该在30秒后自动保存有效的表单', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: mockInitialData }),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
        result.current.form.setValue('versionTitle', '自动保存测试');
      });

      // 快进30秒
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    test('表单无效时不应该自动保存', () => {
      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
        // 设置无效值（超长字符串）
        result.current.form.setValue('versionTitle', 'a'.repeat(1001));
      });

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('表单验证', () => {
    test('应该反映表单验证状态', () => {
      const { result } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      expect(result.current.isValid).toBeTruthy();

      act(() => {
        result.current.form.setValue('versionTitle', 'a'.repeat(1001)); // 超长
      });

      expect(result.current.errors.versionTitle).toBeDefined();
    });
  });

  describe('清理', () => {
    test('应该在组件卸载时清理定时器', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() =>
        useAnalysisCardForm({
          cardId: mockCardId,
          initialData: mockInitialData,
        })
      );

      act(() => {
        result.current.toggleEditMode('edit');
        result.current.form.setValue('versionTitle', '修改值');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});