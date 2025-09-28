/**
 * 数据保护工具
 * TOM-219: 负责保护用户数据，防止AI分析覆盖用户笔记等重要内容
 */

import { 
  FieldConflict,
  DataProtectionOptions,
  FieldMappingResult,
  ContentSource,
  AIContentMark,
  FieldUpdateEvent,
  FIELD_MAPPING_CONFIG
} from '@/types/ai-analysis';
import { AnalysisCardFormData } from '@/lib/validations/analysis-card';

/**
 * 数据保护管理器
 * 处理用户数据保护和AI内容标识逻辑
 */
export class DataProtectionManager {
  
  private static readonly CONTENT_MARKS_KEY = 'ai_content_marks';
  private static readonly UPDATE_HISTORY_KEY = 'field_update_history';
  
  /**
   * 分析数据冲突风险
   * @param existingData 现有表单数据
   * @param newAIData 新的AI分析数据
   * @returns 风险分析结果
   */
  static analyzeDataRisks(
    existingData: Partial<AnalysisCardFormData>,
    newAIData: FieldMappingResult
  ): {
    hasRisks: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    riskyFields: string[];
    protectedFields: string[];
    recommendations: string[];
  } {
    const riskyFields: string[] = [];
    const protectedFields: string[] = [];
    const recommendations: string[] = [];
    
    // 检查保护字段
    FIELD_MAPPING_CONFIG.PROTECTED_FIELDS.forEach(field => {
      if (existingData[field] && this.hasSignificantContent(existingData[field])) {
        protectedFields.push(field);
      }
    });
    
    // 检查可能被覆盖的有价值用户数据
    (Object.keys(newAIData) as Array<keyof FieldMappingResult>).forEach(field => {
      const existingValue = existingData[field];
      const newValue = newAIData[field];
      
      if (this.hasSignificantContent(existingValue) && 
          this.hasSignificantContent(newValue) &&
          !this.areValuesSimilar(existingValue, newValue)) {
        riskyFields.push(field);
      }
    });
    
    // 风险等级评估
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskyFields.length >= 3) {
      riskLevel = 'high';
    } else if (riskyFields.length >= 1) {
      riskLevel = 'medium';
    }
    
    // 生成建议
    if (protectedFields.length > 0) {
      recommendations.push(`已保护 ${protectedFields.length} 个用户笔记字段`);
    }
    
    if (riskyFields.length > 0) {
      recommendations.push(`${riskyFields.length} 个字段存在内容冲突，建议仔细审查`);
    } else {
      recommendations.push('可以安全应用AI分析结果');
    }
    
    return {
      hasRisks: riskyFields.length > 0,
      riskLevel,
      riskyFields,
      protectedFields,
      recommendations,
    };
  }

  /**
   * 创建安全的数据合并方案
   * @param existingData 现有数据
   * @param aiData AI数据
   * @param userPreferences 用户偏好
   * @returns 安全的合并数据
   */
  static createSafeMerge(
    existingData: Partial<AnalysisCardFormData>,
    aiData: FieldMappingResult,
    userPreferences: DataProtectionOptions = {
      preserveUserNotes: true,
      showConfirmDialog: true,
      highlightAIContent: true,
    }
  ): {
    mergedData: Partial<AnalysisCardFormData>;
    appliedProtections: string[];
    skippedFields: string[];
  } {
    const mergedData: Partial<AnalysisCardFormData> = { ...existingData };
    const appliedProtections: string[] = [];
    const skippedFields: string[] = [];
    
    // 应用用户笔记保护
    if (userPreferences.preserveUserNotes) {
      FIELD_MAPPING_CONFIG.PROTECTED_FIELDS.forEach(field => {
        if (existingData[field]) {
          appliedProtections.push(`保护字段: ${field}`);
          // 保护字段不被覆盖，已在mergedData初始化时设置
        }
      });
    }
    
    // 安全应用AI数据到非保护字段
    (Object.keys(aiData) as Array<keyof FieldMappingResult>).forEach(field => {
      const aiValue = aiData[field];
      const existingValue = existingData[field];
      
      // 跳过空的AI值
      if (!this.hasSignificantContent(aiValue)) {
        skippedFields.push(`跳过空值: ${field}`);
        return;
      }
      
      // 检查是否需要用户确认
      if (this.hasSignificantContent(existingValue) && 
          !this.areValuesSimilar(existingValue, aiValue)) {
        if (userPreferences.showConfirmDialog) {
          // 实际使用时会通过对话框确认，这里暂时保留原值
          skippedFields.push(`需要确认: ${field}`);
          return;
        }
      }
      
      // 安全应用AI值
      (mergedData as any)[field] = aiValue;
    });
    
    return {
      mergedData,
      appliedProtections,
      skippedFields,
    };
  }

  /**
   * 标记AI生成的内容
   * @param cardId 卡片ID
   * @param fields 被AI修改的字段
   * @param analysisId AI分析ID
   */
  static markAIContent(
    cardId: string,
    fields: Array<keyof FieldMappingResult>,
    analysisId: string
  ): void {
    try {
      const marks: AIContentMark[] = fields.map(fieldName => ({
        fieldName,
        isAIGenerated: true,
        lastModified: new Date().toISOString(),
      }));
      
      const key = `${this.CONTENT_MARKS_KEY}_${cardId}`;
      localStorage.setItem(key, JSON.stringify(marks));
      
      // 记录更新历史
      this.recordFieldUpdates(cardId, fields, 'ai_generated', analysisId);
      
    } catch (error) {
      console.warn('标记AI内容失败:', error);
    }
  }

  /**
   * 获取字段的AI内容标记
   * @param cardId 卡片ID
   * @param fieldName 字段名（可选）
   * @returns AI内容标记
   */
  static getAIContentMarks(
    cardId: string,
    fieldName?: keyof FieldMappingResult
  ): AIContentMark[] {
    try {
      const key = `${this.CONTENT_MARKS_KEY}_${cardId}`;
      const marks = localStorage.getItem(key);
      
      if (!marks) return [];
      
      const parsed: AIContentMark[] = JSON.parse(marks);
      
      if (fieldName) {
        return parsed.filter(mark => mark.fieldName === fieldName);
      }
      
      return parsed;
      
    } catch (error) {
      console.warn('获取AI内容标记失败:', error);
      return [];
    }
  }

  /**
   * 清除AI内容标记
   * @param cardId 卡片ID
   * @param fieldName 字段名（可选，不提供则清除所有）
   */
  static clearAIContentMarks(cardId: string, fieldName?: keyof FieldMappingResult): void {
    try {
      const key = `${this.CONTENT_MARKS_KEY}_${cardId}`;
      
      if (!fieldName) {
        localStorage.removeItem(key);
        return;
      }
      
      const marks = this.getAIContentMarks(cardId);
      const filtered = marks.filter(mark => mark.fieldName !== fieldName);
      
      if (filtered.length > 0) {
        localStorage.setItem(key, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(key);
      }
      
    } catch (error) {
      console.warn('清除AI内容标记失败:', error);
    }
  }

  /**
   * 检查字段是否为AI生成
   * @param cardId 卡片ID
   * @param fieldName 字段名
   * @returns 是否为AI生成
   */
  static isAIGenerated(cardId: string, fieldName: keyof FieldMappingResult): boolean {
    const marks = this.getAIContentMarks(cardId, fieldName);
    return marks.some(mark => mark.isAIGenerated);
  }

  /**
   * 记录字段更新历史
   * @param cardId 卡片ID
   * @param fields 更新的字段
   * @param source 更新来源
   * @param metadata 元数据
   */
  private static recordFieldUpdates(
    cardId: string,
    fields: Array<keyof FieldMappingResult>,
    source: ContentSource,
    metadata?: string
  ): void {
    try {
      const events: FieldUpdateEvent[] = fields.map(fieldName => ({
        fieldName,
        oldValue: '', // 实际使用时需要传入旧值
        newValue: '', // 实际使用时需要传入新值
        source,
        timestamp: new Date().toISOString(),
      }));
      
      const key = `${this.UPDATE_HISTORY_KEY}_${cardId}`;
      const existing = localStorage.getItem(key);
      const history = existing ? JSON.parse(existing) : [];
      
      history.push(...events);
      
      // 只保留最近50条记录
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }
      
      localStorage.setItem(key, JSON.stringify(history));
      
    } catch (error) {
      console.warn('记录字段更新历史失败:', error);
    }
  }

  /**
   * 获取字段更新历史
   * @param cardId 卡片ID
   * @param fieldName 字段名（可选）
   * @returns 更新历史
   */
  static getFieldUpdateHistory(
    cardId: string,
    fieldName?: keyof FieldMappingResult
  ): FieldUpdateEvent[] {
    try {
      const key = `${this.UPDATE_HISTORY_KEY}_${cardId}`;
      const history = localStorage.getItem(key);
      
      if (!history) return [];
      
      const parsed: FieldUpdateEvent[] = JSON.parse(history);
      
      if (fieldName) {
        return parsed.filter(event => event.fieldName === fieldName);
      }
      
      return parsed;
      
    } catch (error) {
      console.warn('获取字段更新历史失败:', error);
      return [];
    }
  }

  /**
   * 检查内容是否有意义
   * @param value 内容值
   * @returns 是否有意义
   */
  private static hasSignificantContent(value: any): boolean {
    if (!value) return false;
    
    if (typeof value === 'string') {
      return value.trim().length > 2; // 至少3个字符
    }
    
    if (Array.isArray(value)) {
      return value.length > 0 && value.some(item => 
        typeof item === 'string' && item.trim().length > 0
      );
    }
    
    return false;
  }

  /**
   * 检查两个值是否相似
   * @param value1 值1
   * @param value2 值2
   * @returns 是否相似
   */
  private static areValuesSimilar(value1: any, value2: any): boolean {
    const str1 = this.normalizeForComparison(value1);
    const str2 = this.normalizeForComparison(value2);
    
    if (str1 === str2) return true;
    
    // 简单的相似度检测：长度相近且有相同的词汇
    if (Math.abs(str1.length - str2.length) > Math.max(str1.length, str2.length) * 0.5) {
      return false;
    }
    
    const words1 = str1.split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return false;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarityRatio = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarityRatio > 0.6; // 60%相似度阈值
  }

  /**
   * 规范化内容用于比较
   * @param value 原始值
   * @returns 规范化字符串
   */
  private static normalizeForComparison(value: any): string {
    if (Array.isArray(value)) {
      return value.join(' ').toLowerCase().trim();
    }
    
    return String(value || '').toLowerCase().trim();
  }

  /**
   * 创建冲突解决建议
   * @param conflicts 冲突数组
   * @returns 解决建议
   */
  static createConflictResolutions(conflicts: FieldConflict[]): {
    autoResolvable: FieldConflict[];
    requiresUserInput: FieldConflict[];
    recommendations: Record<string, string>;
  } {
    const autoResolvable: FieldConflict[] = [];
    const requiresUserInput: FieldConflict[] = [];
    const recommendations: Record<string, string> = {};
    
    conflicts.forEach(conflict => {
      if (conflict.recommended === 'merge' && 
          FIELD_MAPPING_CONFIG.ARRAY_FIELDS.includes(conflict.fieldName as any)) {
        autoResolvable.push(conflict);
        recommendations[conflict.fieldName] = '自动合并数组内容';
      } else if (conflict.userValue.length < 10 && conflict.aiValue.length > 20) {
        autoResolvable.push(conflict);
        recommendations[conflict.fieldName] = 'AI内容更详细，建议采用';
      } else {
        requiresUserInput.push(conflict);
        recommendations[conflict.fieldName] = '需要人工判断选择哪个版本';
      }
    });
    
    return {
      autoResolvable,
      requiresUserInput,
      recommendations,
    };
  }

  /**
   * 清理过期的本地存储数据
   * @param maxAge 最大保存时间（毫秒）
   */
  static cleanupExpiredData(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        if (key.startsWith(this.CONTENT_MARKS_KEY) || key.startsWith(this.UPDATE_HISTORY_KEY)) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              const lastModified = Array.isArray(parsed) && parsed.length > 0 
                ? new Date(parsed[parsed.length - 1].lastModified || parsed[parsed.length - 1].timestamp).getTime()
                : 0;
              
              if (now - lastModified > maxAge) {
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            // 解析失败的数据也删除
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        console.log(`清理了 ${keysToRemove.length} 条过期的数据保护记录`);
      }
      
    } catch (error) {
      console.warn('清理过期数据失败:', error);
    }
  }
}