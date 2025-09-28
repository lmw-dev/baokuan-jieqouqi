/**
 * ReAnalyzeButton组件单元测试
 * TOM-219: 测试重新分析按钮的交互、状态管理和错误处理
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReAnalyzeButton } from '../ReAnalyzeButton';
import type { ReAnalyzeButtonProps } from '../ReAnalyzeButton';

// Mock the AIAnalysisClient
jest.mock('@/lib/ai-analysis-client', () => ({
  AIAnalysisClient: jest.fn().mockImplementation(() => ({
    analyzeContent: jest.fn(),
    healthCheck: jest.fn()
  }))
}));

describe('ReAnalyzeButton', () => {
  const defaultProps: ReAnalyzeButtonProps = {
    sourceId: 'test-source-123',
    onAnalysisStart: jest.fn(),
    onAnalysisComplete: jest.fn(),
    onAnalysisError: jest.fn(),
    disabled: false,
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该正确渲染重新分析按钮', () => {
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('应该在disabled状态下禁用按钮', () => {
      render(<ReAnalyzeButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      expect(button).toBeDisabled();
    });

    it('应该在loading状态下显示加载中', () => {
      render(<ReAnalyzeButton {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText(/重新分析中/i)).toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('应该在loading状态下显示loading图标', () => {
      render(<ReAnalyzeButton {...defaultProps} isLoading={true} />);
      
      const loadingIcon = document.querySelector('.animate-spin');
      expect(loadingIcon).toBeInTheDocument();
    });
  });

  describe('交互', () => {
    it('应该在点击时触发分析开始回调', async () => {
      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      await user.click(button);
      
      expect(defaultProps.onAnalysisStart).toHaveBeenCalledTimes(1);
    });

    it('应该在disabled状态下不响应点击', async () => {
      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(defaultProps.onAnalysisStart).not.toHaveBeenCalled();
    });

    it('应该在loading状态下不响应点击', async () => {
      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} isLoading={true} />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(defaultProps.onAnalysisStart).not.toHaveBeenCalled();
    });

    it('应该支持键盘操作（Enter键）', async () => {
      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onAnalysisStart).toHaveBeenCalledTimes(1);
    });

    it('应该支持键盘操作（Space键）', async () => {
      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      button.focus();
      await user.keyboard(' ');
      
      expect(defaultProps.onAnalysisStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('AI分析流程', () => {
    const mockAIClient = {
      analyzeContent: jest.fn(),
      healthCheck: jest.fn()
    };

    beforeEach(() => {
      const { AIAnalysisClient } = require('@/lib/ai-analysis-client');
      AIAnalysisClient.mockImplementation(() => mockAIClient);
    });

    it('应该成功执行AI分析流程', async () => {
      const mockAnalysisResult = {
        code: 0,
        message: '分析完成',
        data: {
          trust_hook: {
            hook_copy: '测试钩子',
            credibility_testimony: '测试证明',
            authority_signals: ['信号1', '信号2']
          },
          empathy_anchor: {
            pain_point: '测试痛点',
            target_audience: '测试受众',
            emotional_triggers: ['触发器1']
          },
          value_map: {
            core_value: '测试价值',
            value_delivery: ['价值1', '价值2'],
            competitive_advantage: '测试优势'
          },
          meta: {
            analysis_id: 'test-id',
            timestamp: '2025-07-11T10:00:00Z',
            processing_time_ms: 15000
          }
        }
      };

      mockAIClient.analyzeContent.mockResolvedValueOnce(mockAnalysisResult);

      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(mockAIClient.analyzeContent).toHaveBeenCalledWith({
          source_id: 'test-source-123',
          content_type: 'video_transcript'
        });
      });

      await waitFor(() => {
        expect(defaultProps.onAnalysisComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            hookCopy: '测试钩子',
            hookTypes: ['信号1', '信号2'],
            coreIdea: '测试痛点',
            argumentCase: '测试受众',
            valueDelivery: ['价值1', '价值2'],
            reusableElements: '测试价值'
          })
        );
      });
    });

    it('应该处理AI分析错误', async () => {
      const mockError = new Error('AI服务不可用');
      mockAIClient.analyzeContent.mockRejectedValueOnce(mockError);

      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(defaultProps.onAnalysisError).toHaveBeenCalledWith(mockError);
      });
    });

    it('应该处理AI分析业务错误', async () => {
      const mockBusinessError = {
        code: 4001,
        message: '分析源不存在',
        data: null
      };

      mockAIClient.analyzeContent.mockResolvedValueOnce(mockBusinessError);

      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(defaultProps.onAnalysisError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: '分析源不存在'
          })
        );
      });
    });

    it('应该在分析过程中显示loading状态', async () => {
      // 模拟一个延迟的Promise
      let resolveAnalysis: (value: any) => void;
      const analysisPromise = new Promise(resolve => {
        resolveAnalysis = resolve;
      });
      mockAIClient.analyzeContent.mockReturnValueOnce(analysisPromise);

      const user = userEvent.setup();
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      await user.click(button);
      
      // 应该显示loading状态
      expect(screen.getByText(/重新分析中/i)).toBeInTheDocument();
      expect(button).toBeDisabled();
      
      // 完成分析
      resolveAnalysis!({
        code: 0,
        message: '分析完成',
        data: expect.any(Object)
      });
      
      await waitFor(() => {
        expect(screen.getByText(/重新分析/i)).toBeInTheDocument();
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('健康检查', () => {
    const mockAIClient = {
      analyzeContent: jest.fn(),
      healthCheck: jest.fn()
    };

    beforeEach(() => {
      const { AIAnalysisClient } = require('@/lib/ai-analysis-client');
      AIAnalysisClient.mockImplementation(() => mockAIClient);
    });

    it('应该在AI服务不可用时显示警告', async () => {
      mockAIClient.healthCheck.mockResolvedValueOnce(false);

      render(<ReAnalyzeButton {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/AI服务暂时不可用/i)).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('应该在AI服务可用时启用按钮', async () => {
      mockAIClient.healthCheck.mockResolvedValueOnce(true);

      render(<ReAnalyzeButton {...defaultProps} />);
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /重新分析/i });
        expect(button).not.toBeDisabled();
      });
    });

    it('应该定期检查AI服务健康状态', async () => {
      jest.useFakeTimers();
      mockAIClient.healthCheck.mockResolvedValue(true);

      render(<ReAnalyzeButton {...defaultProps} />);
      
      expect(mockAIClient.healthCheck).toHaveBeenCalledTimes(1);
      
      // 30秒后应该再次检查
      jest.advanceTimersByTime(30000);
      
      await waitFor(() => {
        expect(mockAIClient.healthCheck).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });
  });

  describe('可访问性', () => {
    it('应该有正确的ARIA属性', () => {
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /重新分析/i });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('应该在loading状态下有正确的ARIA属性', () => {
      render(<ReAnalyzeButton {...defaultProps} isLoading={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('应该在disabled状态下有正确的ARIA属性', () => {
      render(<ReAnalyzeButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('应该有描述性的aria-label', () => {
      render(<ReAnalyzeButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('重新分析'));
    });
  });

  describe('错误边界', () => {
    it('应该处理sourceId为空的情况', () => {
      const propsWithEmptySourceId = {
        ...defaultProps,
        sourceId: ''
      };

      render(<ReAnalyzeButton {...propsWithEmptySourceId} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('应该处理回调函数为undefined的情况', () => {
      const propsWithoutCallbacks = {
        sourceId: 'test-source-123',
        onAnalysisStart: undefined as any,
        onAnalysisComplete: undefined as any,
        onAnalysisError: undefined as any
      };

      expect(() => {
        render(<ReAnalyzeButton {...propsWithoutCallbacks} />);
      }).not.toThrow();
    });
  });
});