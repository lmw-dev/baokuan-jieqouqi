/**
 * AI分析Hook
 * TOM-219: 管理AI分析状态和逻辑的React Hook
 */

'use client';

import { useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  AIAnalysisStatus,
  AIAnalysisError,
  FieldMappingResult,
  AIAnalysisMetadata,
  UseAIAnalysisReturn,
  FieldConflict,
  DataProtectionOptions,
  DataMergeStrategy
} from '@/types/ai-analysis';
import { AnalysisCardFormData } from '@/lib/validations/analysis-card';
import { aiAnalysisClient } from '@/lib/ai-analysis-client';
import { FieldMapper } from '@/lib/field-mapper';
import { DataProtectionManager } from '@/lib/data-protection';

interface UseAIAnalysisOptions {
  form: UseFormReturn<AnalysisCardFormData>;
  cardId: string;
  onAnalysisComplete?: (result: FieldMappingResult) => void;
  onAnalysisError?: (error: AIAnalysisError) => void;
}

/**
 * AI分析管理Hook
 * 提供AI分析的完整生命周期管理
 */
export function useAIAnalysis({
  form,
  cardId,
  onAnalysisComplete,
  onAnalysisError,
}: UseAIAnalysisOptions): UseAIAnalysisReturn & {
  conflicts: FieldConflict[];
  showProtectionDialog: boolean;
  setShowProtectionDialog: (show: boolean) => void;
  applyAIResult: (result: FieldMappingResult, strategy?: DataMergeStrategy) => void;
} {
  const [status, setStatus] = useState<AIAnalysisStatus>('idle');
  const [result, setResult] = useState<FieldMappingResult | null>(null);
  const [error, setError] = useState<AIAnalysisError | null>(null);
  const [metadata, setMetadata] = useState<AIAnalysisMetadata | null>(null);
  const [conflicts, setConflicts] = useState<FieldConflict[]>([]);
  const [showProtectionDialog, setShowProtectionDialog] = useState(false);

  const analyze = useCallback(async (sourceId: string) => {
    try {
      setStatus('loading');
      setError(null);
      setResult(null);

      // 执行AI分析
      const response = await aiAnalysisClient.analyzeContent({
        source_id: sourceId,
        content_type: 'video_transcript',
      });

      // 映射分析结果
      const mappedResult = FieldMapper.mapAIResultToFormFields(response.data);

      // 验证映射结果
      if (!FieldMapper.validateMappingResult(mappedResult)) {
        throw new Error('AI分析结果映射验证失败');
      }

      // 检测数据冲突
      const currentFormData = form.getValues();
      const detectedConflicts = FieldMapper.detectFieldConflicts(mappedResult, currentFormData);

      // 设置结果和元数据
      setResult(mappedResult);
      setMetadata({
        analysisId: response.data.meta.analysis_id,
        sourceId,
        timestamp: response.data.meta.timestamp,
        processingTimeMs: response.data.meta.processing_time_ms,
        version: '1.0',
      });

      setConflicts(detectedConflicts);
      setStatus('success');

      // 如果有冲突且风险较高，显示保护对话框
      if (detectedConflicts.length > 0) {
        const riskAnalysis = DataProtectionManager.analyzeDataRisks(currentFormData, mappedResult);
        if (riskAnalysis.riskLevel === 'medium' || riskAnalysis.riskLevel === 'high') {
          setShowProtectionDialog(true);
        } else {
          // 低风险直接应用
          applyAIResultInternal(mappedResult);
        }
      } else {
        // 无冲突直接应用
        applyAIResultInternal(mappedResult);
      }

      onAnalysisComplete?.(mappedResult);

    } catch (err) {
      const analysisError: AIAnalysisError = {
        code: 'ANALYSIS_FAILED',
        message: err instanceof Error ? err.message : '分析失败',
        details: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
      };

      setError(analysisError);
      setStatus('error');
      onAnalysisError?.(analysisError);
    }
  }, [form, onAnalysisComplete, onAnalysisError]);

  const applyAIResultInternal = useCallback((
    aiResult: FieldMappingResult,
    strategy?: DataMergeStrategy
  ) => {
    try {
      const currentData = form.getValues();
      
      let mergedData: Partial<AnalysisCardFormData>;

      if (strategy) {
        // 使用指定策略合并
        mergedData = FieldMapper.mergeWithUserData(aiResult, currentData, strategy);
      } else {
        // 默认安全合并
        const safeResult = DataProtectionManager.createSafeMerge(
          currentData,
          aiResult,
          FieldMapper.createDefaultProtectionOptions()
        );
        mergedData = safeResult.mergedData;
      }

      // 应用到表单
      Object.entries(mergedData).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as keyof AnalysisCardFormData, value);
        }
      });

      // 标记AI生成的字段
      const aiFields = Object.keys(aiResult) as Array<keyof FieldMappingResult>;
      DataProtectionManager.markAIContent(
        cardId,
        aiFields,
        metadata?.analysisId || 'unknown'
      );

      // 关闭保护对话框
      setShowProtectionDialog(false);

      console.log('AI分析结果已应用到表单');

    } catch (err) {
      console.error('应用AI结果失败:', err);
      const applyError: AIAnalysisError = {
        code: 'APPLY_FAILED',
        message: '应用AI分析结果失败',
        details: err instanceof Error ? err.message : undefined,
        timestamp: new Date().toISOString(),
      };
      setError(applyError);
    }
  }, [form, cardId, metadata]);

  const applyAIResult = useCallback((
    aiResult: FieldMappingResult,
    strategy?: DataMergeStrategy
  ) => {
    applyAIResultInternal(aiResult, strategy);
  }, [applyAIResultInternal]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setMetadata(null);
    setConflicts([]);
    setShowProtectionDialog(false);
  }, []);

  return {
    analyze,
    status,
    result,
    error,
    metadata,
    isLoading: status === 'loading',
    reset,
    conflicts,
    showProtectionDialog,
    setShowProtectionDialog,
    applyAIResult,
  };
}

/**
 * 简化版AI分析Hook
 * 用于只需要基本AI分析功能的场景
 */
export function useSimpleAIAnalysis(sourceId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FieldMappingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await aiAnalysisClient.analyzeContent({
        source_id: sourceId,
        content_type: 'video_transcript',
      });

      const mappedResult = FieldMapper.mapAIResultToFormFields(response.data);
      setResult(mappedResult);

    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsLoading(false);
    }
  }, [sourceId]);

  return {
    analyze,
    isLoading,
    result,
    error,
    reset: () => {
      setResult(null);
      setError(null);
    },
  };
}

/**
 * AI服务状态检查Hook
 * 监控AI服务的可用性
 */
export function useAIServiceStatus() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      const available = await aiAnalysisClient.healthCheck();
      setIsAvailable(available);
    } catch (err) {
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    isAvailable,
    isChecking,
    checkStatus,
  };
}