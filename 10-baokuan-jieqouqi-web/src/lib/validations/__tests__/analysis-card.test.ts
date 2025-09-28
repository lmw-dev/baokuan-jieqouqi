import { 
  analysisCardFormSchema, 
  HOOK_TYPE_OPTIONS,
  VALUE_DELIVERY_OPTIONS,
  ANALYSIS_CARD_FORM_DEFAULTS 
} from '@/lib/validations/analysis-card';

describe('Analysis Card Validation Schema', () => {
  describe('analysisCardFormSchema', () => {
    const validData = {
      versionTitle: 'AI初稿',
      hookCopy: '这是一个测试钩子文案',
      hookTypes: ['建立权威', '制造冲突'],
      hookNotes: '这是测试笔记',
      coreIdea: '这是核心观点',
      argumentCase: '这是论证案例',
      valueDelivery: ['知识技能', '实用方法'],
      reusableElements: '这是可复用要素',
      valueNotes: '这是价值笔记',
    };

    it('应该验证有效的数据', () => {
      const result = analysisCardFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.versionTitle).toBe('AI初稿');
        expect(result.data.hookTypes).toEqual(['建立权威', '制造冲突']);
        expect(result.data.valueDelivery).toEqual(['知识技能', '实用方法']);
      }
    });

    it('应该验证只有必填字段的数据', () => {
      const minimalData = {
        versionTitle: 'AI初稿',
      };
      
      const result = analysisCardFormSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.versionTitle).toBe('AI初稿');
        expect(result.data.hookTypes).toEqual([]);
        expect(result.data.valueDelivery).toEqual([]);
      }
    });

    describe('versionTitle 验证', () => {
      it('应该拒绝空的版本标题', () => {
        const data = { ...validData, versionTitle: '' };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('版本标题不能为空');
        }
      });

      it('应该拒绝过长的版本标题', () => {
        const data = { 
          ...validData, 
          versionTitle: 'a'.repeat(51) // 51个字符，超过50的限制
        };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('版本标题不能超过50个字符');
        }
      });

      it('应该接受最大长度的版本标题', () => {
        const data = { 
          ...validData, 
          versionTitle: 'a'.repeat(50) // 正好50个字符
        };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(true);
      });
    });

    describe('hookCopy 验证', () => {
      it('应该接受空的钩子文案', () => {
        const data = { ...validData, hookCopy: '' };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(true);
      });

      it('应该拒绝过长的钩子文案', () => {
        const data = { 
          ...validData, 
          hookCopy: 'a'.repeat(1001) // 1001个字符，超过1000的限制
        };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('钩子文案不能超过1000个字符');
        }
      });

      it('应该接受最大长度的钩子文案', () => {
        const data = { 
          ...validData, 
          hookCopy: 'a'.repeat(1000) // 正好1000个字符
        };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(true);
      });
    });

    describe('hookTypes 验证', () => {
      it('应该接受空的钩子类型数组', () => {
        const data = { ...validData, hookTypes: [] };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(true);
      });

      it('应该拒绝过多的钩子类型', () => {
        const data = { 
          ...validData, 
          hookTypes: ['type1', 'type2', 'type3', 'type4', 'type5', 'type6'] // 6个，超过5个限制
        };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('钩子类型最多选择5个');
        }
      });

      it('应该接受最大数量的钩子类型', () => {
        const data = { 
          ...validData, 
          hookTypes: ['type1', 'type2', 'type3', 'type4', 'type5'] // 正好5个
        };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(true);
      });
    });

    describe('valueDelivery 验证', () => {
      it('应该接受空的价值交付数组', () => {
        const data = { ...validData, valueDelivery: [] };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(true);
      });

      it('应该拒绝过多的价值交付标签', () => {
        const data = { 
          ...validData, 
          valueDelivery: new Array(9).fill('value') // 9个，超过8个限制
        };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('价值交付最多选择8个');
        }
      });

      it('应该接受最大数量的价值交付标签', () => {
        const data = { 
          ...validData, 
          valueDelivery: new Array(8).fill('value') // 正好8个
        };
        const result = analysisCardFormSchema.safeParse(data);
        
        expect(result.success).toBe(true);
      });
    });

    describe('文本字段长度验证', () => {
      const textFields = [
        { name: 'hookNotes', maxLength: 500 },
        { name: 'coreIdea', maxLength: 800 },
        { name: 'argumentCase', maxLength: 1000 },
        { name: 'reusableElements', maxLength: 600 },
        { name: 'valueNotes', maxLength: 500 },
      ];

      textFields.forEach(({ name, maxLength }) => {
        it(`应该拒绝过长的${name}`, () => {
          const data = { 
            ...validData, 
            [name]: 'a'.repeat(maxLength + 1) 
          };
          const result = analysisCardFormSchema.safeParse(data);
          
          expect(result.success).toBe(false);
        });

        it(`应该接受最大长度的${name}`, () => {
          const data = { 
            ...validData, 
            [name]: 'a'.repeat(maxLength) 
          };
          const result = analysisCardFormSchema.safeParse(data);
          
          expect(result.success).toBe(true);
        });

        it(`应该接受空的${name}`, () => {
          const data = { ...validData, [name]: '' };
          const result = analysisCardFormSchema.safeParse(data);
          
          expect(result.success).toBe(true);
        });
      });
    });
  });

  describe('常量和枚举', () => {
    it('HOOK_TYPE_OPTIONS 应该包含预期的钩子类型', () => {
      expect(HOOK_TYPE_OPTIONS).toContain('建立权威');
      expect(HOOK_TYPE_OPTIONS).toContain('制造冲突');
      expect(HOOK_TYPE_OPTIONS).toContain('展示稀缺');
      expect(HOOK_TYPE_OPTIONS).toContain('引发好奇');
      expect(HOOK_TYPE_OPTIONS.length).toBeGreaterThan(0);
    });

    it('VALUE_DELIVERY_OPTIONS 应该包含预期的价值交付类型', () => {
      expect(VALUE_DELIVERY_OPTIONS).toContain('知识技能');
      expect(VALUE_DELIVERY_OPTIONS).toContain('实用方法');
      expect(VALUE_DELIVERY_OPTIONS).toContain('工具资源');
      expect(VALUE_DELIVERY_OPTIONS.length).toBeGreaterThan(0);
    });

    it('ANALYSIS_CARD_FORM_DEFAULTS 应该提供正确的默认值', () => {
      expect(ANALYSIS_CARD_FORM_DEFAULTS.versionTitle).toBe('AI初稿');
      expect(ANALYSIS_CARD_FORM_DEFAULTS.hookTypes).toEqual([]);
      expect(ANALYSIS_CARD_FORM_DEFAULTS.valueDelivery).toEqual([]);
      expect(ANALYSIS_CARD_FORM_DEFAULTS.hookCopy).toBe('');
    });
  });
});