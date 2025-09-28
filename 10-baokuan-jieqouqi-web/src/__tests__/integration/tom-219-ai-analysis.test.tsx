/**
 * TOM-219 AI分析功能集成测试
 * 测试完整的AI分析流程：API调用 → 字段映射 → 数据保护 → 表单更新
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisCardForm } from '@/components/analysis-card/AnalysisCardForm';
import { AIAnalysisClient } from '@/lib/ai-analysis-client';
import { FieldMapper } from '@/lib/field-mapper';
import type { AnalysisCard } from '@/lib/validations/analysis-card';

// Mock dependencies
jest.mock('@/lib/ai-analysis-client');
jest.mock('@/lib/api-client');
jest.mock('@/hooks/useAnalysisCardForm');

const mockAIClient = {
  analyzeContent: jest.fn(),
  healthCheck: jest.fn()
};

const mockAnalysisResponse = {
  code: 0,
  message: '分析完成',
  data: {
    trust_hook: {
      hook_copy: '🎯 从582款蓝牙耳机中评测选出的性价比之王！',
      credibility_testimony: '所有产品均为自费购买，无任何广告植入。',
      authority_signals: ['10年评测经验', '海量评测', '性价比之王']
    },
    empathy_anchor: {
      pain_point: '在海量618信息中，害怕买错耳机而浪费钱',
      target_audience: '追求性价比的消费者',
      emotional_triggers: ['损失厌恶', '选择困难']
    },
    value_map: {
      core_value: '帮助用户选择性价比最高的蓝牙耳机',
      value_delivery: ['专业评测', '中立推荐', '性价比分析'],
      competitive_advantage: '自费评测保证客观性'
    },
    meta: {
      analysis_id: 'integration-test-123',
      timestamp: '2025-07-11T10:00:00Z',
      processing_time_ms: 15000
    }
  }
};

const mockInitialData: AnalysisCard = {
  id: 'test-card-123',
  sourceId: 'test-source-123',
  hookCopy: '现有钩子内容',
  hookTypes: ['现有类型1'],
  hookNotes: '用户的钩子笔记，不应被覆盖',
  coreIdea: '现有核心观点',
  argumentCase: '现有论证案例',
  valueDelivery: ['现有价值1', '现有价值2'],
  valueNotes: '用户的价值笔记，不应被覆盖',
  reusableElements: '现有可复用元素',
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'test-user'
};

describe('TOM-219 AI分析功能集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AIAnalysisClient
    (AIAnalysisClient as jest.MockedClass<typeof AIAnalysisClient>).mockImplementation(() => mockAIClient);
    mockAIClient.healthCheck.mockResolvedValue(true);
    mockAIClient.analyzeContent.mockResolvedValue(mockAnalysisResponse);

    // Mock useAnalysisCardForm hook
    const mockUseAnalysisCardForm = require('@/hooks/useAnalysisCardForm');
    mockUseAnalysisCardForm.useAnalysisCardForm.mockReturnValue({
      form: {
        getValues: jest.fn().mockReturnValue(mockInitialData),
        setValue: jest.fn(),
        watch: jest.fn()
      },
      editMode: 'view',
      isSaving: false,
      toggleEdit: jest.fn(),
      save: jest.fn(),
      cancelEdit: jest.fn()
    });
  });

  describe('完整AI分析流程', () => {
    it('应该成功执行完整的AI分析流程', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisCardForm
          cardId="test-card-123"
          initialData={mockInitialData}
          onSaveSuccess={() => {}}
        />
      );

      // 1. 点击重新分析按钮
      const reAnalyzeButton = screen.getByRole('button', { name: /重新分析/i });
      expect(reAnalyzeButton).toBeInTheDocument();
      
      await user.click(reAnalyzeButton);

      // 2. 验证AI API被正确调用
      await waitFor(() => {
        expect(mockAIClient.analyzeContent).toHaveBeenCalledWith({
          source_id: 'test-source-123',
          content_type: 'video_transcript'
        });
      });

      // 3. 验证分析过程中显示loading状态
      expect(screen.getByText(/分析中/i)).toBeInTheDocument();

      // 4. 等待分析完成
      await waitFor(() => {
        expect(screen.queryByText(/分析中/i)).not.toBeInTheDocument();
      });

      // 5. 验证数据保护对话框出现（因为有冲突字段）
      expect(screen.getByText(/数据保护/i)).toBeInTheDocument();
      expect(screen.getByText(/检测到以下字段存在冲突/i)).toBeInTheDocument();
    });

    it('应该正确处理数据保护流程', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisCardForm
          cardId="test-card-123"
          initialData={mockInitialData}
          onSaveSuccess={() => {}}
        />
      );

      // 触发AI分析
      const reAnalyzeButton = screen.getByRole('button', { name: /重新分析/i });
      await user.click(reAnalyzeButton);

      // 等待数据保护对话框出现
      await waitFor(() => {
        expect(screen.getByText(/数据保护/i)).toBeInTheDocument();
      });

      // 选择保护用户数据选项
      const preserveUserDataOption = screen.getByRole('radio', { name: /保护现有内容/i });
      await user.click(preserveUserDataOption);

      // 确认应用
      const confirmButton = screen.getByRole('button', { name: /确认应用/i });
      await user.click(confirmButton);

      // 验证数据合并结果
      await waitFor(() => {
        expect(screen.queryByText(/数据保护/i)).not.toBeInTheDocument();
      });

      // 验证用户笔记被保护
      const { useAnalysisCardForm } = require('@/hooks/useAnalysisCardForm');
      const mockForm = useAnalysisCardForm.useAnalysisCardForm().form;
      
      expect(mockForm.setValue).toHaveBeenCalledWith('hookNotes', '用户的钩子笔记，不应被覆盖');
      expect(mockForm.setValue).toHaveBeenCalledWith('valueNotes', '用户的价值笔记，不应被覆盖');
    });

    it('应该在AI服务不可用时显示适当的错误信息', async () => {
      mockAIClient.healthCheck.mockResolvedValue(false);
      
      render(
        <AnalysisCardForm
          cardId="test-card-123"
          initialData={mockInitialData}
          onSaveSuccess={() => {}}
        />
      );

      // 应该显示AI服务不可用提示
      await waitFor(() => {
        expect(screen.getByText(/AI服务暂时不可用/i)).toBeInTheDocument();
      });

      // 重新分析按钮应该被禁用
      const reAnalyzeButton = screen.getByRole('button', { name: /重新分析/i });
      expect(reAnalyzeButton).toBeDisabled();
    });

    it('应该处理AI分析API错误', async () => {
      const mockError = new Error('AI服务连接失败');
      mockAIClient.analyzeContent.mockRejectedValue(mockError);
      
      const user = userEvent.setup();
      
      render(
        <AnalysisCardForm
          cardId="test-card-123"
          initialData={mockInitialData}
          onSaveSuccess={() => {}}
        />
      );

      // 点击重新分析按钮
      const reAnalyzeButton = screen.getByRole('button', { name: /重新分析/i });
      await user.click(reAnalyzeButton);

      // 等待错误信息显示
      await waitFor(() => {
        expect(screen.getByText(/AI服务连接失败/i)).toBeInTheDocument();
      });

      // 验证按钮恢复可用状态
      expect(reAnalyzeButton).not.toBeDisabled();
    });
  });

  describe('字段映射准确性测试', () => {
    it('应该正确映射所有AI分析字段', async () => {
      const mappedResult = FieldMapper.mapAIResultToFormFields(mockAnalysisResponse.data);

      expect(mappedResult).toEqual({
        hookCopy: '🎯 从582款蓝牙耳机中评测选出的性价比之王！',
        hookTypes: ['10年评测经验', '海量评测', '性价比之王'],
        coreIdea: '在海量618信息中，害怕买错耳机而浪费钱',
        argumentCase: '追求性价比的消费者',
        valueDelivery: ['专业评测', '中立推荐', '性价比分析'],
        reusableElements: '帮助用户选择性价比最高的蓝牙耳机'
      });
    });

    it('应该在保护模式下正确合并用户数据', () => {
      const aiData = FieldMapper.mapAIResultToFormFields(mockAnalysisResponse.data);
      const userData = {
        hookCopy: '用户钩子',
        hookNotes: '用户笔记',
        coreIdea: '用户核心观点'
      };

      const mergedResult = FieldMapper.mergeWithUserData(aiData, userData, {
        preserveUserNotes: true,
        showConfirmDialog: true,
        highlightAIContent: true
      });

      // 用户数据应该被保留
      expect(mergedResult.hookCopy).toBe('用户钩子');
      expect(mergedResult.coreIdea).toBe('用户核心观点');
      
      // AI数据应该填充空字段
      expect(mergedResult.argumentCase).toBe('追求性价比的消费者');
      expect(mergedResult.valueDelivery).toEqual(['专业评测', '中立推荐', '性价比分析']);
    });
  });

  describe('用户体验测试', () => {
    it('应该提供清晰的分析进度反馈', async () => {
      // 模拟慢速分析
      let resolveAnalysis: (value: any) => void;
      const slowAnalysisPromise = new Promise(resolve => {
        resolveAnalysis = resolve;
      });
      mockAIClient.analyzeContent.mockReturnValue(slowAnalysisPromise);

      const user = userEvent.setup();
      
      render(
        <AnalysisCardForm
          cardId="test-card-123"
          initialData={mockInitialData}
          onSaveSuccess={() => {}}
        />
      );

      // 点击重新分析
      const reAnalyzeButton = screen.getByRole('button', { name: /重新分析/i });
      await user.click(reAnalyzeButton);

      // 验证加载状态
      expect(screen.getByText(/分析中/i)).toBeInTheDocument();
      expect(reAnalyzeButton).toBeDisabled();
      
      // 应该显示进度指示器
      const progressIndicator = document.querySelector('.animate-spin');
      expect(progressIndicator).toBeInTheDocument();

      // 完成分析
      resolveAnalysis!(mockAnalysisResponse);

      await waitFor(() => {
        expect(screen.queryByText(/分析中/i)).not.toBeInTheDocument();
        expect(reAnalyzeButton).not.toBeDisabled();
      });
    });

    it('应该正确标识AI生成的内容', async () => {
      const user = userEvent.setup();
      
      render(
        <AnalysisCardForm
          cardId="test-card-123"
          initialData={mockInitialData}
          onSaveSuccess={() => {}}
        />
      );

      // 触发AI分析并确认应用
      const reAnalyzeButton = screen.getByRole('button', { name: /重新分析/i });
      await user.click(reAnalyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/数据保护/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /确认应用/i });
      await user.click(confirmButton);

      // 应该显示AI生成内容的标识
      await waitFor(() => {
        const aiIndicators = screen.getAllByText(/AI生成/i);
        expect(aiIndicators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('性能测试', () => {
    it('AI分析流程应该在合理时间内完成', async () => {
      const startTime = Date.now();
      
      const user = userEvent.setup();
      
      render(
        <AnalysisCardForm
          cardId="test-card-123"
          initialData={mockInitialData}
          onSaveSuccess={() => {}}
        />
      );

      const reAnalyzeButton = screen.getByRole('button', { name: /重新分析/i });
      await user.click(reAnalyzeButton);

      await waitFor(() => {
        expect(screen.queryByText(/分析中/i)).not.toBeInTheDocument();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 完整流程应该在3秒内完成（不包括实际AI API调用时间）
      expect(duration).toBeLessThan(3000);
    });

    it('应该正确处理大量数据', async () => {
      const largeData = {
        ...mockAnalysisResponse.data,
        trust_hook: {
          ...mockAnalysisResponse.data.trust_hook,
          hook_copy: 'A'.repeat(5000), // 5KB的文本
          authority_signals: Array(100).fill('权威信号')
        },
        value_map: {
          ...mockAnalysisResponse.data.value_map,
          value_delivery: Array(50).fill('价值点')
        }
      };

      mockAIClient.analyzeContent.mockResolvedValue({
        ...mockAnalysisResponse,
        data: largeData
      });

      const user = userEvent.setup();
      
      render(
        <AnalysisCardForm
          cardId="test-card-123"
          initialData={mockInitialData}
          onSaveSuccess={() => {}}
        />
      );

      const reAnalyzeButton = screen.getByRole('button', { name: /重新分析/i });
      await user.click(reAnalyzeButton);

      // 应该成功处理大量数据
      await waitFor(() => {
        expect(screen.queryByText(/分析中/i)).not.toBeInTheDocument();
      });
    });
  });
});