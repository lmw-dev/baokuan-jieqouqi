import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Error from '../error';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  refresh: jest.fn(),
};

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('Error 组件', () => {
  const mockError = new Error('测试错误信息');
  const mockReset = jest.fn();

  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter);
    jest.clearAllMocks();
    // 模拟console.error以避免测试输出中的错误信息
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('应该渲染错误页面', () => {
    render(<Error error={mockError} reset={mockReset} />);

    expect(screen.getByText('页面加载失败')).toBeInTheDocument();
    expect(screen.getByText(/分析卡片编辑页面遇到了问题/)).toBeInTheDocument();
  });

  test('应该显示错误图标', () => {
    render(<Error error={mockError} reset={mockReset} />);

    // 检查错误图标是否存在
    const errorIcon = document.querySelector('[class*="text-red-500"]');
    expect(errorIcon).toBeInTheDocument();
  });

  test('应该显示操作按钮', () => {
    render(<Error error={mockError} reset={mockReset} />);

    expect(screen.getByText('重新加载')).toBeInTheDocument();
    expect(screen.getByText('返回上一页')).toBeInTheDocument();
    expect(screen.getByText('回到首页')).toBeInTheDocument();
  });

  test('应该在组件挂载时记录错误', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Error error={mockError} reset={mockReset} />);

    expect(consoleSpy).toHaveBeenCalledWith('分析卡片编辑页面错误:', mockError);
  });

  test('点击返回按钮应该调用router.back()', () => {
    render(<Error error={mockError} reset={mockReset} />);

    const backButtons = screen.getAllByText('返回');
    fireEvent.click(backButtons[0]);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  test('点击返回上一页按钮应该调用router.back()', () => {
    render(<Error error={mockError} reset={mockReset} />);

    const backButton = screen.getByText('返回上一页');
    fireEvent.click(backButton);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  test('点击重新加载按钮应该调用reset函数', () => {
    render(<Error error={mockError} reset={mockReset} />);

    const retryButton = screen.getByText('重新加载');
    fireEvent.click(retryButton);

    expect(mockReset).toHaveBeenCalled();
  });

  test('点击回到首页按钮应该导航到dashboard', () => {
    render(<Error error={mockError} reset={mockReset} />);

    const homeButton = screen.getByText('回到首页');
    fireEvent.click(homeButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  test('开发环境应该显示错误详情', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<Error error={mockError} reset={mockReset} />);

    expect(screen.getByText('开发调试信息:')).toBeInTheDocument();
    expect(screen.getByText('测试错误信息')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('生产环境不应该显示错误详情', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(<Error error={mockError} reset={mockReset} />);

    expect(screen.queryByText('开发调试信息:')).not.toBeInTheDocument();
    expect(screen.queryByText('测试错误信息')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('应该显示错误摘要ID（如果存在）', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const errorWithDigest = new Error('测试错误') as Error & { digest?: string };
    errorWithDigest.digest = 'error-digest-123';

    render(<Error error={errorWithDigest} reset={mockReset} />);

    expect(screen.getByText('错误ID: error-digest-123')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('没有错误摘要时不应该显示错误ID', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<Error error={mockError} reset={mockReset} />);

    expect(screen.queryByText(/错误ID:/)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('应该具有正确的响应式布局', () => {
    render(<Error error={mockError} reset={mockReset} />);

    // 检查主容器
    const container = screen.getByRole('generic').parentElement;
    expect(container).toBeInTheDocument();

    // 检查按钮容器是否有响应式类
    const buttonContainer = screen.getByText('重新加载').closest('div');
    expect(buttonContainer).toHaveClass('flex');
  });

  test('应该显示正确的错误标题样式', () => {
    render(<Error error={mockError} reset={mockReset} />);

    const title = screen.getByText('页面加载失败');
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'text-gray-900');
  });

  test('错误信息应该包含在卡片中', () => {
    render(<Error error={mockError} reset={mockReset} />);

    // 查找卡片元素
    const card = document.querySelector('[class*="card"]');
    expect(card).toBeInTheDocument();
  });
});