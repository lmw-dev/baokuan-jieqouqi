// AuthButton组件单元测试
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthButton } from '../AuthButton';

// Mock user store first
jest.mock('@/stores/user-store', () => ({
  useUserStore: jest.fn(),
}));

// Mock useUserStore
const mockUseUserStore = jest.fn();
jest.mock('@/stores/user-store', () => ({
  useUserStore: () => mockUseUserStore(),
}));

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as any;

describe('AuthButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
  });

  it('应该在未登录时显示登录按钮', () => {
    mockUseUserStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<AuthButton />);

    const button = screen.getByRole('button', { name: /登录.*注册/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('应该在已登录时不显示按钮', () => {
    mockUseUserStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    render(<AuthButton />);

    const button = screen.queryByRole('button', { name: /登录.*注册/i });
    expect(button).not.toBeInTheDocument();
  });

  it('应该在加载时显示加载状态', () => {
    mockUseUserStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    render(<AuthButton />);

    const button = screen.getByRole('button', { name: /加载中/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('应该在点击时重定向到登录页面', () => {
    mockUseUserStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<AuthButton redirectTo="/custom-dashboard" />);

    const button = screen.getByRole('button', { name: /登录.*注册/i });
    fireEvent.click(button);

    expect(window.location.href).toBe('/api/auth/sign-in?redirectTo=%2Fcustom-dashboard');
  });

  it('应该使用默认重定向路径', () => {
    mockUseUserStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<AuthButton />);

    const button = screen.getByRole('button', { name: /登录.*注册/i });
    fireEvent.click(button);

    expect(window.location.href).toBe('/api/auth/sign-in?redirectTo=%2Fdashboard');
  });

  it('应该支持自定义样式属性', () => {
    mockUseUserStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <AuthButton 
        variant="outline" 
        size="sm" 
        className="custom-class" 
      />
    );

    const button = screen.getByRole('button', { name: /登录.*注册/i });
    expect(button).toHaveClass('custom-class');
  });
}); 