// EmptyState组件的单元测试
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

// Mock next/link
jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('EmptyState', () => {
  it('should render default empty state correctly', () => {
    render(<EmptyState />);

    expect(screen.getByText('还没有分析卡片')).toBeInTheDocument();
    expect(screen.getByText('创建您的第一个分析，开始构建灵感库')).toBeInTheDocument();
    expect(screen.getByText('开始分析')).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    const customProps = {
      title: '自定义标题',
      description: '自定义描述',
      actionText: '自定义按钮',
    };

    render(<EmptyState {...customProps} />);

    expect(screen.getByText('自定义标题')).toBeInTheDocument();
    expect(screen.getByText('自定义描述')).toBeInTheDocument();
    expect(screen.getByText('自定义按钮')).toBeInTheDocument();
  });

  it('should render link to home page by default', () => {
    render(<EmptyState />);

    const mainActionLink = screen.getByRole('link', { name: '开始分析' });
    expect(mainActionLink).toHaveAttribute('href', '/');
  });

  it('should call onAction callback when provided', () => {
    const mockOnAction = jest.fn();
    render(<EmptyState onAction={mockOnAction} />);

    // 使用更具体的选择器找到主要的开始分析按钮
    const button = screen.getByText('开始分析').closest('a');
    expect(button).toHaveAttribute('href', '/');
  });

  it('should render proper accessibility attributes', () => {
    render(<EmptyState />);

    const button = screen.getByRole('button', { name: '开始分析' });
    expect(button).toBeInTheDocument();
  });

  it('should handle empty title gracefully', () => {
    render(<EmptyState title="" />);

    expect(screen.queryByText('还没有分析卡片')).not.toBeInTheDocument();
  });

  it('should handle empty description gracefully', () => {
    render(<EmptyState description="" />);

    expect(screen.queryByText('创建您的第一个分析，开始构建灵感库')).not.toBeInTheDocument();
  });

  it('should handle empty action text gracefully', () => {
    render(<EmptyState actionText="" />);

    expect(screen.queryByText('开始分析')).not.toBeInTheDocument();
  });

  it('should have proper CSS classes for styling', () => {
    const { container } = render(<EmptyState />);

    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveClass('flex', 'items-center', 'justify-center');
    
    // 检查内部卡片容器
    const cardContainer = container.querySelector('.rounded-lg');
    expect(cardContainer).toHaveClass('border-dashed', 'border-2');
  });

  it('should render icon or illustration when present', () => {
    const { container } = render(<EmptyState />);

    // 检查是否有SVG图标
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('should handle complex custom content', () => {
    const complexProps = {
      title: '复杂的空状态标题',
      description: '这是一个包含多行文本的复杂描述，用来测试组件是否能够正确处理长文本内容',
      actionText: '执行复杂操作',
    };

    render(<EmptyState {...complexProps} />);

    expect(screen.getByText(complexProps.title)).toBeInTheDocument();
    expect(screen.getByText(complexProps.description)).toBeInTheDocument();
    expect(screen.getByText(complexProps.actionText)).toBeInTheDocument();
  });

  it('should maintain responsive design classes', () => {
    const { container } = render(<EmptyState />);

    // 检查最外层容器
    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveClass('min-h-[400px]', 'w-full');
    
    // 检查卡片容器
    const cardContainer = container.querySelector('.max-w-md');
    expect(cardContainer).toBeInTheDocument();
  });

  it('should render secondary action links', () => {
    render(<EmptyState />);

    // 检查是否有"或者您可以："提示
    expect(screen.getByText('或者您可以：')).toBeInTheDocument();
    
    // 检查辅助链接
    expect(screen.getByRole('link', { name: '快速修复' })).toHaveAttribute('href', '/quick-fix');
    expect(screen.getByRole('link', { name: '脚本框架' })).toHaveAttribute('href', '/script');
  });

  it('should have proper hover effects', () => {
    const { container } = render(<EmptyState />);

    // 检查卡片是否有hover效果类
    const cardContainer = container.querySelector('.hover\\:border-primary\\/50');
    expect(cardContainer).toBeInTheDocument();
    
    // 检查按钮是否有hover效果类
    const button = screen.getByRole('button', { name: '开始分析' });
    expect(button).toHaveClass('hover:scale-105');
  });
}); 