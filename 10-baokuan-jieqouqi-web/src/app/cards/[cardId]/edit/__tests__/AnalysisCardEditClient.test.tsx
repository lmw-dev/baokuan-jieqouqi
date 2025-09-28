import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AnalysisCardEditClient } from '../AnalysisCardEditClient';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import type { AnalysisCard } from '@/lib/validations/analysis-card';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/usePermissionCheck');

jest.mock('@/components/analysis-card/AnalysisCardForm', () => ({
  AnalysisCardForm: ({ cardId, initialData, onSaveSuccess }: any) => (
    <div data-testid="analysis-card-form">
      <div>Card ID: {cardId}</div>
      <div>Initial Data: {initialData?.versionTitle}</div>
      <button
        onClick={() => onSaveSuccess({ ...initialData, versionTitle: '保存成功' })}
      >
        保存
      </button>
    </div>
  ),
}));

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  refresh: jest.fn(),
};

const mockCardData: AnalysisCard = {
  id: 'test-card-id',
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

const mockUsePermissionCheck = usePermissionCheck as jest.MockedFunction<typeof usePermissionCheck>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('AnalysisCardEditClient', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe('加载状态', () => {
    test('应该显示加载骨架', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '' },
        isLoading: true,
        error: null,
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });
  });

  describe('权限错误处理', () => {
    test('应该显示权限错误信息', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '权限不足' },
        isLoading: false,
        error: '权限不足',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.getByText('无权限访问')).toBeInTheDocument();
      expect(screen.getByText(/您没有权限编辑此分析卡片/)).toBeInTheDocument();
    });

    test('应该显示未找到错误信息', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '卡片不存在' },
        isLoading: false,
        error: '卡片不存在',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.getByText('分析卡片不存在')).toBeInTheDocument();
      expect(screen.getByText(/您要查找的分析卡片不存在/)).toBeInTheDocument();
    });

    test('应该显示通用错误信息', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '网络错误' },
        isLoading: false,
        error: '网络错误',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.getByText('加载失败')).toBeInTheDocument();
      expect(screen.getByText(/加载分析卡片时发生错误/)).toBeInTheDocument();
    });

    test('权限错误时不应该显示重新加载按钮', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '权限不足' },
        isLoading: false,
        error: '权限不足',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.queryByText('重新加载')).not.toBeInTheDocument();
    });

    test('通用错误时应该显示重新加载按钮', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '网络错误' },
        isLoading: false,
        error: '网络错误',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.getByText('重新加载')).toBeInTheDocument();
    });
  });

  describe('正常加载', () => {
    test('应该渲染分析卡片表单', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: true, card: mockCardData },
        isLoading: false,
        error: null,
        hasPermission: true,
        card: mockCardData,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.getByTestId('analysis-card-form')).toBeInTheDocument();
      expect(screen.getByText('Card ID: test-card-id')).toBeInTheDocument();
      expect(screen.getByText('Initial Data: 测试版本')).toBeInTheDocument();
    });

    test('应该显示页面标题和导航', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: true, card: mockCardData },
        isLoading: false,
        error: null,
        hasPermission: true,
        card: mockCardData,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.getByText('编辑分析卡片')).toBeInTheDocument();
      expect(screen.getByText('返回')).toBeInTheDocument();
    });

    test('应该处理保存成功回调', async () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: true, card: mockCardData },
        isLoading: false,
        error: null,
        hasPermission: true,
        card: mockCardData,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Initial Data: 保存成功')).toBeInTheDocument();
      });
    });
  });

  describe('导航功能', () => {
    test('点击返回按钮应该调用router.back()', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: true, card: mockCardData },
        isLoading: false,
        error: null,
        hasPermission: true,
        card: mockCardData,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      const backButton = screen.getByText('返回');
      fireEvent.click(backButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    test('错误状态下点击返回按钮应该调用router.back()', () => {
      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '权限不足' },
        isLoading: false,
        error: '权限不足',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      const backButtons = screen.getAllByText('返回');
      fireEvent.click(backButtons[0]);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('开发环境错误信息', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('开发环境应该显示详细错误信息', () => {
      process.env.NODE_ENV = 'development';

      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '详细错误信息' },
        isLoading: false,
        error: '详细错误信息',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.getByText('详细错误信息')).toBeInTheDocument();
      expect(screen.getByText('开发调试信息:')).toBeInTheDocument();
    });

    test('生产环境不应该显示详细错误信息', () => {
      process.env.NODE_ENV = 'production';

      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '详细错误信息' },
        isLoading: false,
        error: '详细错误信息',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      expect(screen.queryByText('开发调试信息:')).not.toBeInTheDocument();
    });
  });

  describe('重新加载功能', () => {
    test('点击重新加载按钮应该刷新页面', () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      mockUsePermissionCheck.mockReturnValue({
        permissionResult: { hasPermission: false, error: '网络错误' },
        isLoading: false,
        error: '网络错误',
        hasPermission: false,
        card: null,
      });

      render(<AnalysisCardEditClient cardId="test-card-id" />);

      const reloadButton = screen.getByText('重新加载');
      fireEvent.click(reloadButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });
});