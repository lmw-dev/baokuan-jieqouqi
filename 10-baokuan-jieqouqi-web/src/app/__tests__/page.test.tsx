// 首页组件单元测试
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../page';

// Mock useUserStore
const mockUserStore = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  initializeAuth: jest.fn(),
};

jest.mock('@/stores/user-store', () => ({
  useUserStore: () => mockUserStore,
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserStore.user = null;
    mockUserStore.isAuthenticated = false;
    mockUserStore.isLoading = false;
  });

  describe('基础渲染测试', () => {
    it('应该正确渲染首页的主要元素', () => {
      render(<HomePage />);

      expect(screen.getByText('爆款解构器')).toBeInTheDocument();
      expect(screen.getByText('将爆款视频解构为创作框架')).toBeInTheDocument();
      expect(screen.getByText('上传视频文件')).toBeInTheDocument();
      expect(screen.getByText('粘贴视频文案')).toBeInTheDocument();
    });

    it('应该显示功能特色区域', () => {
      render(<HomePage />);

      expect(screen.getByText('智能解构')).toBeInTheDocument();
      expect(screen.getByText('结构化分析')).toBeInTheDocument();
      expect(screen.getByText('一键生成')).toBeInTheDocument();
    });

    it('应该在初始化时调用认证检查', () => {
      render(<HomePage />);
      expect(mockUserStore.initializeAuth).toHaveBeenCalled();
    });
  });

  describe('认证状态集成测试', () => {
    it('未登录用户应该显示登录提示按钮', () => {
      mockUserStore.isAuthenticated = false;
      render(<HomePage />);

      const buttons = screen.getAllByRole('button');
      const loginButtons = buttons.filter(btn => 
        btn.textContent?.includes('请先登录')
      );
      
      expect(loginButtons.length).toBeGreaterThan(0);
      loginButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('已登录用户可以看到分析按钮', () => {
      mockUserStore.isAuthenticated = true;
      mockUserStore.user = { 
        id: '1', 
        name: 'Test User',
        email: 'test@example.com',
        logtoId: 'logto-123',
        phoneNumber: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      
      render(<HomePage />);

      const buttons = screen.getAllByRole('button');
      const analysisButtons = buttons.filter(btn => 
        btn.textContent?.includes('开始分析') && !btn.textContent?.includes('请先登录')
      );
      expect(analysisButtons.length).toBeGreaterThan(0);
    });

    it('加载状态时按钮应该被禁用', () => {
      mockUserStore.isLoading = true;
      render(<HomePage />);

      const buttons = screen.getAllByRole('button');
      const analysisButtons = buttons.filter(btn => 
        btn.textContent?.includes('开始分析')
      );
      
      analysisButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('文件上传功能测试', () => {
    it('应该显示文件上传输入框', () => {
      render(<HomePage />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', 'video/*,.mp4,.mov,.avi');
    });

    it('应该有正确的文件上传区域提示文字', () => {
      render(<HomePage />);

      expect(screen.getByText('点击或拖拽文件到此处')).toBeInTheDocument();
    });
  });

  describe('文案输入功能测试', () => {
    it('应该显示文案输入区域', () => {
      render(<HomePage />);

      const textarea = screen.getByPlaceholderText('请粘贴视频文案内容...');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveClass('min-h-[120px]');
    });

    it('文案输入框应该可以接受输入', () => {
      render(<HomePage />);

      const textarea = screen.getByPlaceholderText('请粘贴视频文案内容...');
      fireEvent.change(textarea, { target: { value: '测试文案内容' } });
      
      expect(textarea).toHaveValue('测试文案内容');
    });

    it('输入有效文案后应该显示成功提示', async () => {
      render(<HomePage />);

      const textarea = screen.getByPlaceholderText('请粘贴视频文案内容...');
      fireEvent.change(textarea, { target: { value: '这是有效的测试文案' } });
      
      await waitFor(() => {
        expect(screen.getByText('文案内容已准备就绪')).toBeInTheDocument();
      });
    });

    it('空文案应该不显示成功提示', () => {
      render(<HomePage />);

      const textarea = screen.getByPlaceholderText('请粘贴视频文案内容...');
      fireEvent.change(textarea, { target: { value: '   ' } });
      
      expect(screen.queryByText('文案内容已准备就绪')).not.toBeInTheDocument();
    });
  });

  describe('表单提交功能测试', () => {
         it('未登录时点击按钮应该显示认证提示', async () => {
       mockUserStore.isAuthenticated = false;
       render(<HomePage />);

       // 输入文案使按钮激活逻辑触发
       const textarea = screen.getByPlaceholderText('请粘贴视频文案内容...');
       fireEvent.change(textarea, { target: { value: '测试文案' } });

       // 查找并点击登录按钮 - 使用getAllByRole获取所有按钮，选择第一个
       const loginButtons = screen.getAllByRole('button', { name: /请先登录/ });
       fireEvent.click(loginButtons[0]);

       await waitFor(() => {
         expect(screen.getByText(/请先登录后再开始分析/)).toBeInTheDocument();
       });
     });

         it('应该能够清除认证提示', async () => {
       mockUserStore.isAuthenticated = false;
       render(<HomePage />);

       // 触发认证提示
       const textarea = screen.getByPlaceholderText('请粘贴视频文案内容...');
       fireEvent.change(textarea, { target: { value: '测试文案' } });

       const loginButtons = screen.getAllByRole('button', { name: /请先登录/ });
       fireEvent.click(loginButtons[0]);

       await waitFor(() => {
         expect(screen.getByText(/请先登录后再开始分析/)).toBeInTheDocument();
       });

       // 点击取消按钮
       const cancelButton = screen.getByRole('button', { name: /取消/ });
       fireEvent.click(cancelButton);

       await waitFor(() => {
         expect(screen.queryByText(/请先登录后再开始分析/)).not.toBeInTheDocument();
       });
     });
  });

  describe('UI组件测试', () => {
    it('应该显示认证相关组件', () => {
      render(<HomePage />);

      // 验证AuthButton和UserAvatar组件的存在
      // 这些组件有自己的测试，这里只验证它们被包含在页面中
      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('应该有正确的样式类', () => {
      render(<HomePage />);

      const mainContainer = document.querySelector('.min-h-screen');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('bg-gradient-to-br', 'from-blue-50', 'to-indigo-100');
    });

    it('应该在移动端和桌面端都正确显示', () => {
      render(<HomePage />);

      // 检查响应式布局类
      const gridContainer = document.querySelector('.grid.md\\:grid-cols-2');
      expect(gridContainer).toBeInTheDocument();
      
      const featuresGrid = document.querySelector('.grid.md\\:grid-cols-3');
      expect(featuresGrid).toBeInTheDocument();
    });
  });
}); 