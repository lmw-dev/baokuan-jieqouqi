// AnalysisCardItem组件的单元测试
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalysisCardItem } from '../AnalysisCardItem';
import { AnalysisCardListItem } from '@/types/dashboard';

// Mock next/link
jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('AnalysisCardItem', () => {
  const mockCard: AnalysisCardListItem = {
    id: 'card-123',
    sourceTitle: 'iPhone评测视频',
    versionTitle: '深度解构分析',
    createdAt: new Date('2025-01-01T10:30:00Z'),
    updatedAt: new Date('2025-01-01T10:30:00Z'),
    sourceId: 'source-123',
    analysisType: '视频解构',
    tags: ['数码评测', 'iPhone', '消费电子'],
  };

  it('should render card information correctly', () => {
    render(<AnalysisCardItem card={mockCard} />);

    expect(screen.getByText('iPhone评测视频')).toBeInTheDocument();
    expect(screen.getByText('深度解构分析')).toBeInTheDocument();
    expect(screen.getByText('2025年1月1日')).toBeInTheDocument();
    
    // 检查分析类型
    if (mockCard.analysisType) {
      expect(screen.getByText(mockCard.analysisType)).toBeInTheDocument();
    }
  });

  it('should render correct link to analysis page', () => {
    render(<AnalysisCardItem card={mockCard} />);

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', '/analysis?card=card-123');
  });

  it('should display correct date format', () => {
    const cardWithDifferentDate = {
      ...mockCard,
      createdAt: new Date('2024-12-25T10:30:00Z'),
    };

    render(<AnalysisCardItem card={cardWithDifferentDate} />);

    expect(screen.getByText('2024年12月25日')).toBeInTheDocument();
  });

  it('should display analysis type when provided', () => {
    render(<AnalysisCardItem card={mockCard} />);

    expect(screen.getByText('视频解构')).toBeInTheDocument();
  });

  it('should display tags when provided', () => {
    render(<AnalysisCardItem card={mockCard} />);

    expect(screen.getByText('数码评测')).toBeInTheDocument();
    expect(screen.getByText('iPhone')).toBeInTheDocument();
    expect(screen.getByText('消费电子')).toBeInTheDocument();
  });

  it('should handle tags array correctly', () => {
    const cardWithoutTags = {
      ...mockCard,
      tags: [],
    };

    render(<AnalysisCardItem card={cardWithoutTags} />);

    // 仍然应该正常渲染，不应该报错
    expect(screen.getByText('iPhone评测视频')).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(<AnalysisCardItem card={mockCard} />);
    
    const cardElement = container.querySelector('.transition-all');
    expect(cardElement).toBeInTheDocument();
    expect(cardElement).toHaveClass('hover:shadow-xl');
  });

  it('should handle edge case with future date', () => {
    const futureCard = {
      ...mockCard,
      createdAt: new Date('2026-01-01T10:30:00Z'),
    };

    render(<AnalysisCardItem card={futureCard} />);

    expect(screen.getByText('2026年1月1日')).toBeInTheDocument();
  });

  it('should render all required UI elements', () => {
    render(<AnalysisCardItem card={mockCard} />);

    // 检查是否有图标
    expect(screen.getByRole('link')).toBeInTheDocument();
    
    // 检查是否有时间显示
    expect(screen.getByText('2025年1月1日')).toBeInTheDocument();
  });

  it('should show updated time when different from created time', () => {
    const cardWithDifferentUpdatedTime = {
      ...mockCard,
      updatedAt: new Date('2025-01-02T10:30:00Z'),
    };

    render(<AnalysisCardItem card={cardWithDifferentUpdatedTime} />);

    expect(screen.getByText('更新于 2025年1月2日')).toBeInTheDocument();
  });

  it('should handle missing analysis type gracefully', () => {
    const cardWithoutAnalysisType = {
      ...mockCard,
      analysisType: undefined,
    };

    render(<AnalysisCardItem card={cardWithoutAnalysisType} />);

    // 应该正常渲染其他内容
    expect(screen.getByText('iPhone评测视频')).toBeInTheDocument();
  });

  it('should handle missing tags gracefully', () => {
    const cardWithoutTags = {
      ...mockCard,
      tags: undefined,
    };

    render(<AnalysisCardItem card={cardWithoutTags} />);

    // 应该正常渲染其他内容
    expect(screen.getByText('iPhone评测视频')).toBeInTheDocument();
  });
}); 