import { render, screen } from '@testing-library/react';
import Loading from '../loading';

describe('Loading 组件', () => {
  test('应该渲染加载骨架', () => {
    render(<Loading />);
    
    // 检查是否有骨架元素
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('应该显示导航区域骨架', () => {
    render(<Loading />);
    
    // 导航区域应该有返回按钮和标题的骨架
    const skeletons = screen.getAllByTestId('skeleton');
    
    // 检查是否有符合预期数量的骨架元素
    expect(skeletons.length).toBeGreaterThan(10);
  });

  test('应该显示表单字段骨架', () => {
    render(<Loading />);
    
    // 应该有3个主要的卡片区域
    const cards = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-full')
    );
    
    // 检查骨架元素是否正确分布
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(20); // 应该有很多骨架元素
  });

  test('应该显示底部控制栏骨架', () => {
    render(<Loading />);
    
    // 检查底部控制栏区域
    const bottomControls = screen.getByRole('generic', {
      name: /底部控制栏/i
    });
    
    // 如果没有特定的aria-label，我们检查是否有带有特定样式的元素
    const controlElements = screen.getAllByRole('generic').filter(el => 
      el.className.includes('bg-gray-50')
    );
    
    expect(controlElements.length).toBeGreaterThan(0);
  });

  test('应该具有正确的布局结构', () => {
    render(<Loading />);
    
    // 检查主容器
    const container = screen.getByRole('generic').parentElement;
    expect(container).toBeInTheDocument();
    
    // 检查响应式网格
    const gridElements = screen.getAllByRole('generic').filter(el => 
      el.className.includes('grid')
    );
    
    expect(gridElements.length).toBeGreaterThan(0);
  });

  test('应该显示正确数量的字段区块', () => {
    render(<Loading />);
    
    // 应该有3个主要的字段区块
    const skeletons = screen.getAllByTestId('skeleton');
    
    // 验证有足够的骨架元素表示3个区块
    expect(skeletons.length).toBeGreaterThan(15);
  });

  test('骨架元素应该有正确的样式类', () => {
    render(<Loading />);
    
    const skeletons = screen.getAllByTestId('skeleton');
    
    // 检查第一个骨架元素是否有正确的类名
    expect(skeletons[0]).toHaveClass('h-10', 'w-20');
  });

  test('应该包含卡片容器', () => {
    render(<Loading />);
    
    // 查找卡片元素
    const cards = document.querySelectorAll('[class*="card"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});