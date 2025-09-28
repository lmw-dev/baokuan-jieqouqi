/**
 * 字段映射工具单元测试
 * TOM-219: 测试AI分析结果到表单字段的准确映射
 */

import { FieldMapper } from '../field-mapper';
import type { AIAnalysisResponse, FieldMappingResult } from '@/types/ai-analysis';
import type { DataProtectionOptions } from '@/lib/data-protection';

describe('FieldMapper', () => {
  const mockAIData: AIAnalysisResponse['data'] = {
    trust_hook: {
      hook_copy: '从582款蓝牙耳机中评测选出的性价比之王！',
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
      analysis_id: 'uuid-test-123',
      timestamp: '2025-07-11T10:00:00Z',
      processing_time_ms: 15000
    }
  };

  describe('mapAIResultToFormFields', () => {
    it('应该正确映射所有AI分析字段到表单字段', () => {
      const result = FieldMapper.mapAIResultToFormFields(mockAIData);

      const expected: FieldMappingResult = {
        hookCopy: '从582款蓝牙耳机中评测选出的性价比之王！',
        hookTypes: ['10年评测经验', '海量评测', '性价比之王'],
        coreIdea: '在海量618信息中，害怕买错耳机而浪费钱',
        argumentCase: '追求性价比的消费者',
        valueDelivery: ['专业评测', '中立推荐', '性价比分析'],
        reusableElements: '帮助用户选择性价比最高的蓝牙耳机'
      };

      expect(result).toEqual(expected);
    });

    it('应该处理空数据', () => {
      const emptyData: AIAnalysisResponse['data'] = {
        trust_hook: {
          hook_copy: '',
          credibility_testimony: '',
          authority_signals: []
        },
        empathy_anchor: {
          pain_point: '',
          target_audience: '',
          emotional_triggers: []
        },
        value_map: {
          core_value: '',
          value_delivery: [],
          competitive_advantage: ''
        },
        meta: {
          analysis_id: '',
          timestamp: '',
          processing_time_ms: 0
        }
      };

      const result = FieldMapper.mapAIResultToFormFields(emptyData);

      expect(result).toEqual({
        hookCopy: '',
        hookTypes: [],
        coreIdea: '',
        argumentCase: '',
        valueDelivery: [],
        reusableElements: ''
      });
    });

    it('应该处理部分数据缺失', () => {
      const partialData = {
        ...mockAIData,
        trust_hook: {
          hook_copy: '测试钩子',
          credibility_testimony: '',
          authority_signals: []
        }
      };

      const result = FieldMapper.mapAIResultToFormFields(partialData);

      expect(result.hookCopy).toBe('测试钩子');
      expect(result.hookTypes).toEqual([]);
      expect(result.coreIdea).toBe(mockAIData.empathy_anchor.pain_point);
    });

    it('应该处理undefined字段', () => {
      const dataWithUndefined = {
        trust_hook: {
          hook_copy: undefined as any,
          credibility_testimony: undefined as any,
          authority_signals: undefined as any
        },
        empathy_anchor: {
          pain_point: undefined as any,
          target_audience: undefined as any,
          emotional_triggers: undefined as any
        },
        value_map: {
          core_value: undefined as any,
          value_delivery: undefined as any,
          competitive_advantage: undefined as any
        },
        meta: mockAIData.meta
      };

      const result = FieldMapper.mapAIResultToFormFields(dataWithUndefined);

      expect(result).toEqual({
        hookCopy: '',
        hookTypes: [],
        coreIdea: '',
        argumentCase: '',
        valueDelivery: [],
        reusableElements: ''
      });
    });
  });

  describe('mergeWithUserData', () => {
    const aiData: FieldMappingResult = {
      hookCopy: 'AI生成的钩子',
      hookTypes: ['AI标签1', 'AI标签2'],
      coreIdea: 'AI核心观点',
      argumentCase: 'AI论证案例',
      valueDelivery: ['AI价值1', 'AI价值2'],
      reusableElements: 'AI可复用元素'
    };

    const userData: Partial<FieldMappingResult> = {
      hookCopy: '用户钩子',
      coreIdea: '用户核心观点',
      valueDelivery: ['用户价值1']
    };

    it('应该在保护模式下保留用户数据', () => {
      const protectionOptions: DataProtectionOptions = {
        preserveUserNotes: true,
        showConfirmDialog: true,
        highlightAIContent: true
      };

      const result = FieldMapper.mergeWithUserData(aiData, userData, protectionOptions);

      expect(result.hookCopy).toBe('用户钩子'); // 保留用户数据
      expect(result.coreIdea).toBe('用户核心观点'); // 保留用户数据
      expect(result.argumentCase).toBe('AI论证案例'); // 使用AI数据（用户无数据）
      expect(result.valueDelivery).toEqual(['用户价值1']); // 保留用户数据
    });

    it('应该在非保护模式下使用AI数据', () => {
      const protectionOptions: DataProtectionOptions = {
        preserveUserNotes: false,
        showConfirmDialog: false,
        highlightAIContent: true
      };

      const result = FieldMapper.mergeWithUserData(aiData, userData, protectionOptions);

      expect(result).toEqual(aiData); // 完全使用AI数据
    });

    it('应该处理用户数据为空的情况', () => {
      const protectionOptions: DataProtectionOptions = {
        preserveUserNotes: true,
        showConfirmDialog: true,
        highlightAIContent: true
      };

      const result = FieldMapper.mergeWithUserData(aiData, {}, protectionOptions);

      expect(result).toEqual(aiData); // 用户无数据时使用AI数据
    });

    it('应该处理AI数据为空的情况', () => {
      const emptyAIData: FieldMappingResult = {
        hookCopy: '',
        hookTypes: [],
        coreIdea: '',
        argumentCase: '',
        valueDelivery: [],
        reusableElements: ''
      };

      const protectionOptions: DataProtectionOptions = {
        preserveUserNotes: true,
        showConfirmDialog: true,
        highlightAIContent: true
      };

      const result = FieldMapper.mergeWithUserData(emptyAIData, userData, protectionOptions);

      expect(result.hookCopy).toBe('用户钩子');
      expect(result.coreIdea).toBe('用户核心观点');
      expect(result.argumentCase).toBe(''); // AI和用户都无数据
      expect(result.valueDelivery).toEqual(['用户价值1']);
    });

    it('应该正确处理数组字段的合并', () => {
      const aiDataWithArrays: FieldMappingResult = {
        ...aiData,
        hookTypes: ['AI标签1', 'AI标签2', 'AI标签3'],
        valueDelivery: ['AI价值1', 'AI价值2', 'AI价值3']
      };

      const userDataWithArrays: Partial<FieldMappingResult> = {
        hookTypes: ['用户标签1'],
        valueDelivery: ['用户价值1', '用户价值2']
      };

      const protectionOptions: DataProtectionOptions = {
        preserveUserNotes: true,
        showConfirmDialog: true,
        highlightAIContent: true
      };

      const result = FieldMapper.mergeWithUserData(aiDataWithArrays, userDataWithArrays, protectionOptions);

      expect(result.hookTypes).toEqual(['用户标签1']);
      expect(result.valueDelivery).toEqual(['用户价值1', '用户价值2']);
    });
  });

  describe('detectConflicts', () => {
    const aiData: FieldMappingResult = {
      hookCopy: 'AI钩子',
      hookTypes: ['AI标签'],
      coreIdea: 'AI核心观点',
      argumentCase: 'AI论证',
      valueDelivery: ['AI价值'],
      reusableElements: 'AI元素'
    };

    const userData: Partial<FieldMappingResult> = {
      hookCopy: '用户钩子',
      coreIdea: 'AI核心观点', // 相同值，无冲突
      argumentCase: '', // 空值，无冲突
      valueDelivery: ['用户价值'] // 不同值，有冲突
    };

    it('应该正确检测字段冲突', () => {
      const conflicts = FieldMapper.detectConflicts(aiData, userData);

      expect(conflicts).toContain('hookCopy'); // 值不同
      expect(conflicts).toContain('valueDelivery'); // 值不同
      expect(conflicts).not.toContain('coreIdea'); // 值相同
      expect(conflicts).not.toContain('argumentCase'); // 用户值为空
      expect(conflicts).not.toContain('reusableElements'); // 用户无此字段
    });

    it('应该在用户数据为空时返回空冲突列表', () => {
      const conflicts = FieldMapper.detectConflicts(aiData, {});
      expect(conflicts).toEqual([]);
    });

    it('应该正确处理数组字段冲突检测', () => {
      const userDataWithArrays: Partial<FieldMappingResult> = {
        hookTypes: ['AI标签'], // 相同
        valueDelivery: ['不同价值'] // 不同
      };

      const conflicts = FieldMapper.detectConflicts(aiData, userDataWithArrays);

      expect(conflicts).not.toContain('hookTypes'); // 数组相同
      expect(conflicts).toContain('valueDelivery'); // 数组不同
    });
  });

  describe('边界情况处理', () => {
    it('应该处理null和undefined输入', () => {
      expect(() => {
        FieldMapper.mapAIResultToFormFields(null as any);
      }).not.toThrow();

      expect(() => {
        FieldMapper.mapAIResultToFormFields(undefined as any);
      }).not.toThrow();
    });

    it('应该处理极长的字符串', () => {
      const longString = 'A'.repeat(10000);
      const dataWithLongStrings = {
        ...mockAIData,
        trust_hook: {
          ...mockAIData.trust_hook,
          hook_copy: longString
        }
      };

      const result = FieldMapper.mapAIResultToFormFields(dataWithLongStrings);
      expect(result.hookCopy).toBe(longString);
    });

    it('应该处理特殊字符', () => {
      const specialChars = '🎯📊💡\n\r\t<script>alert("test")</script>';
      const dataWithSpecialChars = {
        ...mockAIData,
        trust_hook: {
          ...mockAIData.trust_hook,
          hook_copy: specialChars
        }
      };

      const result = FieldMapper.mapAIResultToFormFields(dataWithSpecialChars);
      expect(result.hookCopy).toBe(specialChars);
    });
  });
});