/**
 * AI分析客户端
 * TOM-219: 负责与TOM-220 AI分析引擎的通信
 */

import { 
  AIAnalysisRequest, 
  AIAnalysisResponse, 
  AIAnalysisError,
  AIAnalysisClientConfig,
  AI_ANALYSIS_DEFAULTS
} from '@/types/ai-analysis';

/**
 * AI分析客户端类
 * 封装与TOM-220 AI分析API的通信逻辑
 */
export class AIAnalysisClient {
  private config: AIAnalysisClientConfig;

  constructor(config?: Partial<AIAnalysisClientConfig>) {
    this.config = {
      ...AI_ANALYSIS_DEFAULTS.CLIENT_CONFIG,
      ...config,
    };
  }

  /**
   * 执行AI分析
   * @param request 分析请求参数
   * @returns AI分析结果
   */
  async analyzeContent(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const { baseUrl, timeout, retryAttempts, retryDelay } = this.config;
    
    let lastError: Error | null = null;
    
    // 重试机制
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`${baseUrl}/api/v1/analysis/three-stage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 验证响应格式
        this.validateResponse(data);
        
        return data as AIAnalysisResponse;
        
      } catch (error) {
        lastError = error as Error;
        
        // 最后一次尝试失败，抛出错误
        if (attempt === retryAttempts) {
          throw this.createAnalysisError(lastError, request.source_id);
        }
        
        // 等待后重试
        if (retryDelay > 0) {
          await this.sleep(retryDelay * attempt);
        }
        
        console.warn(`AI分析第${attempt}次尝试失败，${retryDelay * attempt}ms后重试:`, error);
      }
    }
    
    // 理论上不会执行到这里
    throw this.createAnalysisError(lastError!, request.source_id);
  }

  /**
   * 检查AI服务健康状态
   * @returns 服务是否可用
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
      
    } catch (error) {
      console.warn('AI服务健康检查失败:', error);
      return false;
    }
  }

  /**
   * 获取AI服务信息
   */
  async getServiceInfo(): Promise<{ version: string; status: string } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.config.baseUrl}/api/v1/info`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return await response.json();
      }
      
      return null;
      
    } catch (error) {
      console.warn('获取AI服务信息失败:', error);
      return null;
    }
  }

  /**
   * 验证AI分析响应格式
   * @param data 响应数据
   */
  private validateResponse(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('响应数据格式无效');
    }
    
    if (typeof data.code !== 'number') {
      throw new Error('响应缺少code字段');
    }
    
    if (data.code !== 0) {
      throw new Error(`AI分析失败: ${data.message || '未知错误'}`);
    }
    
    if (!data.data || typeof data.data !== 'object') {
      throw new Error('响应缺少data字段');
    }
    
    const { trust_hook, empathy_anchor, value_map } = data.data;
    
    // 验证必要的字段结构
    if (!trust_hook || !trust_hook.hook_copy) {
      throw new Error('响应缺少trust_hook.hook_copy字段');
    }
    
    if (!empathy_anchor || !empathy_anchor.pain_point) {
      throw new Error('响应缺少empathy_anchor.pain_point字段');
    }
    
    if (!value_map || !value_map.core_value) {
      throw new Error('响应缺少value_map.core_value字段');
    }
    
    // 验证数组字段
    if (!Array.isArray(trust_hook.authority_signals)) {
      throw new Error('trust_hook.authority_signals必须是数组');
    }
    
    if (!Array.isArray(value_map.value_delivery)) {
      throw new Error('value_map.value_delivery必须是数组');
    }
  }

  /**
   * 创建标准化的分析错误对象
   * @param error 原始错误
   * @param sourceId 来源ID
   * @returns 格式化的分析错误
   */
  private createAnalysisError(error: Error, sourceId: string): AIAnalysisError {
    let code = 'UNKNOWN_ERROR';
    let message = error.message;
    
    if (error.name === 'AbortError') {
      code = 'TIMEOUT_ERROR';
      message = '分析请求超时，请检查网络连接或稍后重试';
    } else if (error.message.includes('HTTP 404')) {
      code = 'API_NOT_FOUND';
      message = 'AI分析服务暂时不可用';
    } else if (error.message.includes('HTTP 500')) {
      code = 'SERVER_ERROR';
      message = 'AI分析服务内部错误';
    } else if (error.message.includes('fetch')) {
      code = 'NETWORK_ERROR';
      message = '网络连接失败，请检查AI服务是否运行';
    }
    
    return {
      code,
      message,
      details: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 延迟执行
   * @param ms 延迟毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新客户端配置
   * @param config 新配置
   */
  updateConfig(config: Partial<AIAnalysisClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): AIAnalysisClientConfig {
    return { ...this.config };
  }
}

/**
 * 默认AI分析客户端实例
 */
export const aiAnalysisClient = new AIAnalysisClient();

/**
 * 创建自定义配置的AI分析客户端
 * @param config 客户端配置
 * @returns AI分析客户端实例
 */
export function createAIAnalysisClient(config?: Partial<AIAnalysisClientConfig>): AIAnalysisClient {
  return new AIAnalysisClient(config);
}