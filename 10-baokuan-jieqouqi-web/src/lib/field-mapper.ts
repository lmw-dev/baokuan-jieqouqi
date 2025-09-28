/**
 * 字段映射工具
 * TOM-219: 负责AI分析结果到表单字段的映射和数据合并
 */

import { 
  AIAnalysisResponse, 
  FieldMappingResult, 
  FieldConflict,
  DataProtectionOptions,
  DataMergeStrategy,
  FIELD_MAPPING_CONFIG
} from '@/types/ai-analysis';
import { AnalysisCardFormData } from '@/lib/validations/analysis-card';

/**
 * 字段映射工具类
 * 处理AI分析结果到表单字段的映射逻辑
 */
export class FieldMapper {
  
  /**
   * 将AI分析结果映射到表单字段
   * @param aiResult AI分析响应数据
   * @returns 映射后的表单字段数据
   */
  static mapAIResultToFormFields(aiResult: AIAnalysisResponse['data']): FieldMappingResult {
    try {
      return {
        // 信任之钩 -> 钩子文案
        hookCopy: aiResult.trust_hook.hook_copy || '',
        
        // 权威信号 -> 钩子类型
        hookTypes: Array.isArray(aiResult.trust_hook.authority_signals) 
          ? aiResult.trust_hook.authority_signals.slice(0, 5) // 最多5个
          : [],
        
        // 痛点 -> 核心观点
        coreIdea: aiResult.empathy_anchor.pain_point || '',
        
        // 目标受众 -> 论证案例
        argumentCase: aiResult.empathy_anchor.target_audience || '',
        
        // 价值交付 -> 价值交付
        valueDelivery: Array.isArray(aiResult.value_map.value_delivery)
          ? aiResult.value_map.value_delivery.slice(0, 8) // 最多8个
          : [],
        
        // 核心价值 -> 可复用要素
        reusableElements: aiResult.value_map.core_value || '',
      };
    } catch (error) {
      console.error('AI结果映射失败:', error);
      throw new Error(`字段映射失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检测字段冲突
   * @param aiData AI分析的数据
   * @param userData 用户现有数据
   * @returns 冲突检测结果
   */
  static detectFieldConflicts(
    aiData: FieldMappingResult, 
    userData: Partial<AnalysisCardFormData>
  ): FieldConflict[] {
    const conflicts: FieldConflict[] = [];
    
    // 检查每个可映射字段的冲突
    (Object.keys(aiData) as Array<keyof FieldMappingResult>).forEach(fieldName => {
      const aiValue = aiData[fieldName];
      const userValue = userData[fieldName];
      
      // 检查是否存在用户数据
      const hasUserData = this.hasSignificantUserData(userValue);
      
      if (hasUserData && aiValue) {
        const conflict: FieldConflict = {
          fieldName,
          hasUserData: true,
          userValue: this.normalizeValue(userValue),
          aiValue: this.normalizeValue(aiValue),
          recommended: this.getRecommendedAction(fieldName, userValue, aiValue),
        };
        
        conflicts.push(conflict);
      }
    });
    
    return conflicts;
  }

  /**
   * 智能合并AI数据和用户数据
   * @param aiData AI分析数据
   * @param userData 用户现有数据
   * @param strategy 合并策略
   * @returns 合并后的数据
   */
  static mergeWithUserData(
    aiData: FieldMappingResult,
    userData: Partial<AnalysisCardFormData>,
    strategy: DataMergeStrategy
  ): Partial<AnalysisCardFormData> {
    const { conflictingFields, protectionOptions, mergeMode } = strategy;
    const mergedData: Partial<AnalysisCardFormData> = { ...userData };
    
    // 根据合并模式处理数据
    switch (mergeMode) {
      case 'replace_all':
        // 替换所有字段，但保护用户笔记
        Object.assign(mergedData, aiData);
        if (protectionOptions.preserveUserNotes) {
          this.preserveUserNotes(mergedData, userData);
        }
        break;
        
      case 'merge_smart':
        // 智能合并：有冲突的字段保留用户数据，无冲突的使用AI数据
        this.applySmartMerge(mergedData, aiData, userData, conflictingFields);
        break;
        
      case 'user_choice':
        // 用户选择：根据冲突处理结果合并
        this.applyUserChoices(mergedData, aiData, conflictingFields);
        break;
    }
    
    return mergedData;
  }

  /**
   * 保护用户笔记字段
   * @param mergedData 合并后的数据
   * @param userData 原始用户数据
   */
  private static preserveUserNotes(
    mergedData: Partial<AnalysisCardFormData>, 
    userData: Partial<AnalysisCardFormData>
  ): void {
    FIELD_MAPPING_CONFIG.PROTECTED_FIELDS.forEach(field => {
      if (userData[field]) {
        mergedData[field] = userData[field];
      }
    });
  }

  /**
   * 智能合并逻辑
   * @param mergedData 目标数据
   * @param aiData AI数据
   * @param userData 用户数据
   * @param conflicts 冲突字段
   */
  private static applySmartMerge(
    mergedData: Partial<AnalysisCardFormData>,
    aiData: FieldMappingResult,
    userData: Partial<AnalysisCardFormData>,
    conflicts: FieldConflict[]
  ): void {
    const conflictFieldNames = new Set(conflicts.map(c => c.fieldName));
    
    // 处理无冲突字段：直接使用AI数据
    (Object.keys(aiData) as Array<keyof FieldMappingResult>).forEach(fieldName => {
      if (!conflictFieldNames.has(fieldName)) {
        (mergedData as any)[fieldName] = aiData[fieldName];
      }
    });
    
    // 冲突字段根据推荐策略处理
    conflicts.forEach(conflict => {
      switch (conflict.recommended) {
        case 'use_ai':
          (mergedData as any)[conflict.fieldName] = aiData[conflict.fieldName];
          break;
        case 'keep_user':
          (mergedData as any)[conflict.fieldName] = userData[conflict.fieldName];
          break;
        case 'merge':
          (mergedData as any)[conflict.fieldName] = this.mergeFieldValues(
            userData[conflict.fieldName],
            aiData[conflict.fieldName],
            conflict.fieldName
          );
          break;
      }
    });
    
    // 始终保护用户笔记
    this.preserveUserNotes(mergedData, userData);
  }

  /**
   * 应用用户选择的冲突处理方案
   * @param mergedData 目标数据
   * @param aiData AI数据  
   * @param conflicts 冲突处理结果
   */
  private static applyUserChoices(
    mergedData: Partial<AnalysisCardFormData>,
    aiData: FieldMappingResult,
    conflicts: FieldConflict[]
  ): void {
    // 默认使用AI数据，然后应用用户的冲突处理选择
    Object.assign(mergedData, aiData);
    
    conflicts.forEach(conflict => {
      if (conflict.recommended === 'keep_user') {
        // 用户选择保留原数据时，需要从外部获取用户数据
        // 这里暂时跳过，实际使用时会在调用层处理
      }
    });
  }

  /**
   * 合并字段值（用于数组或字符串字段的智能合并）
   * @param userValue 用户值
   * @param aiValue AI值
   * @param fieldName 字段名
   * @returns 合并后的值
   */
  private static mergeFieldValues(
    userValue: any,
    aiValue: any,
    fieldName: keyof FieldMappingResult
  ): any {
    // 数组字段合并
    if (FIELD_MAPPING_CONFIG.ARRAY_FIELDS.includes(fieldName as any)) {
      const userArray = Array.isArray(userValue) ? userValue : [];
      const aiArray = Array.isArray(aiValue) ? aiValue : [];
      
      // 去重合并
      const merged = [...new Set([...userArray, ...aiArray])];
      
      // 限制数量
      const maxLength = fieldName === 'hookTypes' ? 5 : 8;
      return merged.slice(0, maxLength);
    }
    
    // 字符串字段：优先使用用户数据
    return userValue || aiValue || '';
  }

  /**
   * 检查是否有有意义的用户数据
   * @param value 值
   * @returns 是否有意义的数据
   */
  private static hasSignificantUserData(value: any): boolean {
    if (!value) return false;
    
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    
    if (Array.isArray(value)) {
      return value.length > 0 && value.some(item => 
        typeof item === 'string' && item.trim().length > 0
      );
    }
    
    return false;
  }

  /**
   * 规范化值为字符串（用于比较和显示）
   * @param value 任意类型的值
   * @returns 字符串形式
   */
  private static normalizeValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return String(value || '');
  }

  /**
   * 获取推荐的冲突处理动作
   * @param fieldName 字段名
   * @param userValue 用户值
   * @param aiValue AI值
   * @returns 推荐动作
   */
  private static getRecommendedAction(
    fieldName: keyof FieldMappingResult,
    userValue: any,
    aiValue: any
  ): 'keep_user' | 'use_ai' | 'merge' {
    // 数组字段：推荐合并
    if (FIELD_MAPPING_CONFIG.ARRAY_FIELDS.includes(fieldName as any)) {
      return 'merge';
    }
    
    // 如果用户数据较短，可能是初始值，推荐使用AI
    if (typeof userValue === 'string' && userValue.trim().length < 10) {
      return 'use_ai';
    }
    
    // 默认保留用户数据
    return 'keep_user';
  }

  /**
   * 验证映射结果
   * @param result 映射结果
   * @returns 是否有效
   */
  static validateMappingResult(result: FieldMappingResult): boolean {
    try {
      // 检查必要字段
      if (!result.hookCopy && !result.coreIdea && !result.reusableElements) {
        return false;
      }
      
      // 检查数组字段格式
      if (!Array.isArray(result.hookTypes) || !Array.isArray(result.valueDelivery)) {
        return false;
      }
      
      // 检查数组长度限制
      if (result.hookTypes.length > 5 || result.valueDelivery.length > 8) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('映射结果验证失败:', error);
      return false;
    }
  }

  /**
   * 创建默认的数据保护选项
   * @returns 默认保护选项
   */
  static createDefaultProtectionOptions(): DataProtectionOptions {
    return {
      preserveUserNotes: true,
      showConfirmDialog: true,
      highlightAIContent: true,
    };
  }

  /**
   * 创建合并策略
   * @param conflicts 冲突数组
   * @param options 保护选项
   * @param mode 合并模式
   * @returns 合并策略
   */
  static createMergeStrategy(
    conflicts: FieldConflict[],
    options: DataProtectionOptions,
    mode: DataMergeStrategy['mergeMode'] = 'merge_smart'
  ): DataMergeStrategy {
    return {
      conflictingFields: conflicts,
      protectionOptions: options,
      mergeMode: mode,
    };
  }
}