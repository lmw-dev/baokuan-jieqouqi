/**
 * AI分析相关类型定义
 * TOM-219: 分析卡片详情页AI集成功能
 */

/**
 * AI分析请求参数
 */
export interface AIAnalysisRequest {
  source_id: string;
  content_type: 'video_transcript';
}

/**
 * AI分析API响应结构
 * 基于TOM-220 AI分析引擎的实际响应格式
 */
export interface AIAnalysisResponse {
  code: number;
  message: string;
  data: {
    trust_hook: {
      hook_copy: string;
      credibility_testimony: string;
      authority_signals: string[];
    };
    empathy_anchor: {
      pain_point: string;
      target_audience: string;
      emotional_triggers: string[];
    };
    value_map: {
      core_value: string;
      value_delivery: string[];
      competitive_advantage: string;
    };
    meta: {
      analysis_id: string;
      timestamp: string;
      processing_time_ms: number;
    };
  };
}

/**
 * 字段映射结果类型
 * 映射AI分析结果到表单字段的数据结构
 */
export interface FieldMappingResult {
  hookCopy: string;
  hookTypes: string[];
  coreIdea: string;
  argumentCase: string;
  valueDelivery: string[];
  reusableElements: string;
}

/**
 * 内容来源标识
 */
export type ContentSource = 'ai_generated' | 'user_edited' | 'user_notes';

/**
 * 数据保护选项配置
 */
export interface DataProtectionOptions {
  preserveUserNotes: boolean;
  showConfirmDialog: boolean;
  highlightAIContent: boolean;
}

/**
 * AI分析状态
 */
export type AIAnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * AI分析错误类型
 */
export interface AIAnalysisError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
}

/**
 * AI分析元数据
 */
export interface AIAnalysisMetadata {
  analysisId: string;
  sourceId: string;
  timestamp: string;
  processingTimeMs: number;
  version: string;
}

/**
 * 字段冲突检测结果
 */
export interface FieldConflict {
  fieldName: keyof FieldMappingResult;
  hasUserData: boolean;
  userValue: string;
  aiValue: string;
  recommended: 'keep_user' | 'use_ai' | 'merge';
}

/**
 * 数据合并策略
 */
export interface DataMergeStrategy {
  conflictingFields: FieldConflict[];
  protectionOptions: DataProtectionOptions;
  mergeMode: 'replace_all' | 'merge_smart' | 'user_choice';
}

/**
 * AI分析Hook返回值类型
 */
export interface UseAIAnalysisReturn {
  analyze: (sourceId: string) => Promise<void>;
  status: AIAnalysisStatus;
  result: FieldMappingResult | null;
  error: AIAnalysisError | null;
  metadata: AIAnalysisMetadata | null;
  isLoading: boolean;
  reset: () => void;
}

/**
 * 重新分析操作配置
 */
export interface ReAnalysisConfig {
  sourceId: string;
  preserveUserNotes?: boolean;
  autoApply?: boolean;
  showProgress?: boolean;
  timeout?: number;
}

/**
 * 字段更新事件数据
 */
export interface FieldUpdateEvent {
  fieldName: keyof FieldMappingResult;
  oldValue: string | string[];
  newValue: string | string[];
  source: ContentSource;
  timestamp: string;
}

/**
 * AI内容标识配置
 */
export interface AIContentMark {
  fieldName: keyof FieldMappingResult;
  isAIGenerated: boolean;
  lastModified: string;
  confidence?: number;
}

/**
 * API客户端配置
 */
export interface AIAnalysisClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * 默认配置常量
 */
export const AI_ANALYSIS_DEFAULTS = {
  CLIENT_CONFIG: {
    baseUrl: 'http://localhost:8000',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  } as AIAnalysisClientConfig,
  
  DATA_PROTECTION: {
    preserveUserNotes: true,
    showConfirmDialog: true,
    highlightAIContent: true,
  } as DataProtectionOptions,
  
  RE_ANALYSIS: {
    preserveUserNotes: true,
    autoApply: false,
    showProgress: true,
    timeout: 30000,
  } as ReAnalysisConfig,
} as const;

/**
 * 字段映射配置
 * 定义AI分析结果到表单字段的映射关系
 */
export const FIELD_MAPPING_CONFIG = {
  // AI -> Form 字段映射
  MAPPINGS: {
    hookCopy: 'data.trust_hook.hook_copy',
    hookTypes: 'data.trust_hook.authority_signals',
    coreIdea: 'data.empathy_anchor.pain_point',
    argumentCase: 'data.empathy_anchor.target_audience',
    valueDelivery: 'data.value_map.value_delivery',
    reusableElements: 'data.value_map.core_value',
  },
  
  // 用户保护字段（不被AI覆盖）
  PROTECTED_FIELDS: ['hookNotes', 'valueNotes'] as const,
  
  // 数组类型字段
  ARRAY_FIELDS: ['hookTypes', 'valueDelivery'] as const,
} as const;