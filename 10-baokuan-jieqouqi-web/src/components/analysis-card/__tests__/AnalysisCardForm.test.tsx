import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisCardForm } from '@/components/analysis-card/AnalysisCardForm';
import { type AnalysisCard } from '@/lib/validations/analysis-card';

// Mock dependencies
jest.mock('@/hooks/useAnalysisCardForm');
jest.mock('@/lib/auth-service');

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseAnalysisCardForm = require('@/hooks/useAnalysisCardForm').useAnalysisCardForm as jest.MockedFunction<any>;

describe('AnalysisCardForm Component', () => {
  const mockCard: AnalysisCard = {
    id: 'card-1',
    versionTitle: 'AI初稿',
    hookCopy: '测试钩子文案',
    hookTypes: ['建立权威'],
    hookNotes: '测试笔记',
    coreIdea: '测试核心观点',
    argumentCase: '测试论证案例',
    valueDelivery: ['知识技能'],
    reusableElements: '测试可复用要素',
    valueNotes: '测试价值笔记',
    sourceId: 'source-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFormReturn = {
    form: {
      control: {},
      getValues: jest.fn(),
    },
    control: {},
    errors: {},
    onSubmit: jest.fn(),
    editMode: 'view' as const,
    isSaving: false,
    hasUnsavedChanges: false,
    isValid: true,
    toggleEditMode: jest.fn(),
    cancelEdit: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalysisCardForm.mockReturnValue(mockFormReturn);
  });

  it('应该在查看模式下正确渲染', () => {
    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    // 检查主要区块是否存在
    expect(screen.getByText('分析卡片')).toBeInTheDocument();
    expect(screen.getByText('钩子分析')).toBeInTheDocument();
    expect(screen.getByText('核心观点')).toBeInTheDocument();
    expect(screen.getByText('价值交付')).toBeInTheDocument();
    
    // 检查编辑按钮
    expect(screen.getByRole('button', { name: /编辑/i })).toBeInTheDocument();
  });

  it('应该在编辑模式下显示保存和取消按钮', () => {
    mockUseAnalysisCardForm.mockReturnValue({
      ...mockFormReturn,
      editMode: 'edit',
      hasUnsavedChanges: true,
    });

    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取消/i })).toBeInTheDocument();
    expect(screen.getByText('编辑模式')).toBeInTheDocument();
  });

  it('应该在有未保存更改时显示相应提示', () => {
    mockUseAnalysisCardForm.mockReturnValue({
      ...mockFormReturn,
      editMode: 'edit',
      hasUnsavedChanges: true,
    });

    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    expect(screen.getByText(/有未保存的更改/i)).toBeInTheDocument();
  });

  it('应该在保存时显示加载状态', () => {
    mockUseAnalysisCardForm.mockReturnValue({
      ...mockFormReturn,
      editMode: 'edit',
      isSaving: true,
      hasUnsavedChanges: true,
    });

    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    expect(screen.getByText(/保存中.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存中.../i })).toBeDisabled();
  });

  it('应该在点击编辑按钮时调用toggleEditMode', async () => {
    const user = userEvent.setup();
    
    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    const editButton = screen.getByRole('button', { name: /编辑/i });
    await user.click(editButton);

    expect(mockFormReturn.toggleEditMode).toHaveBeenCalledWith('edit');
  });

  it('应该在点击保存按钮时调用save方法', async () => {
    const user = userEvent.setup();
    
    mockUseAnalysisCardForm.mockReturnValue({
      ...mockFormReturn,
      editMode: 'edit',
      hasUnsavedChanges: true,
    });

    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    const saveButton = screen.getByRole('button', { name: /保存/i });
    await user.click(saveButton);

    expect(mockFormReturn.save).toHaveBeenCalled();
  });

  it('应该在点击取消按钮时调用cancelEdit', async () => {
    const user = userEvent.setup();
    
    mockUseAnalysisCardForm.mockReturnValue({
      ...mockFormReturn,
      editMode: 'edit',
      hasUnsavedChanges: false,
    });

    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /取消/i });
    await user.click(cancelButton);

    expect(mockFormReturn.cancelEdit).toHaveBeenCalled();
  });

  it('应该调用onSaveSuccess回调当保存成功时', () => {
    const onSaveSuccess = jest.fn();
    
    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
        onSaveSuccess={onSaveSuccess}
      />
    );

    // 验证Hook被正确调用
    expect(mockUseAnalysisCardForm).toHaveBeenCalledWith({
      cardId: 'card-1',
      initialData: mockCard,
      onSaveSuccess,
    });
  });

  it('应该在表单无效时禁用保存按钮', () => {
    mockUseAnalysisCardForm.mockReturnValue({
      ...mockFormReturn,
      editMode: 'edit',
      hasUnsavedChanges: true,
      isValid: false,
    });

    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });

  it('应该在没有未保存更改时禁用保存按钮', () => {
    mockUseAnalysisCardForm.mockReturnValue({
      ...mockFormReturn,
      editMode: 'edit',
      hasUnsavedChanges: false,
      isValid: true,
    });

    render(
      <AnalysisCardForm
        cardId="card-1"
        initialData={mockCard}
      />
    );

    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });
});