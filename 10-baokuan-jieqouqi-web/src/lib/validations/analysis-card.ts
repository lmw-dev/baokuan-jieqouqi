import { z } from 'zod';

/**
 * 分析卡片表单验证Schema
 * 基于Prisma AnalysisCard模型定义
 */
export const analysisCardFormSchema = z.object({
  versionTitle: z
    .string()
    .min(1, "版本标题不能为空")
    .max(50, "版本标题不能超过50个字符"),
  
  hookCopy: z
    .string()
    .max(1000, "钩子文案不能超过1000个字符")
    .optional()
    .or(z.literal("")),
  
  hookTypes: z
    .array(z.string())
    .max(5, "钩子类型最多选择5个")
    .default([]),
  
  hookNotes: z
    .string()
    .max(500, "钩子笔记不能超过500个字符")
    .optional()
    .or(z.literal("")),
  
  coreIdea: z
    .string()
    .max(800, "核心观点不能超过800个字符")
    .optional()
    .or(z.literal("")),
  
  argumentCase: z
    .string()
    .max(1000, "论证案例不能超过1000个字符")
    .optional()
    .or(z.literal("")),
  
  valueDelivery: z
    .array(z.string())
    .max(8, "价值交付最多选择8个")
    .default([]),
  
  reusableElements: z
    .string()
    .max(600, "可复用要素不能超过600个字符")
    .optional()
    .or(z.literal("")),
  
  valueNotes: z
    .string()
    .max(500, "价值点笔记不能超过500个字符")
    .optional()
    .or(z.literal("")),
});

/**
 * 分析卡片表单数据类型
 */
export type AnalysisCardFormData = z.infer<typeof analysisCardFormSchema>;

/**
 * 编辑模式类型
 */
export type EditMode = 'view' | 'edit';

/**
 * 权限检查结果类型
 */
export interface PermissionResult {
  hasPermission: boolean;
  card?: AnalysisCard;
  error?: string;
}

/**
 * 分析卡片包含来源信息的完整类型
 */
export interface AnalysisCardWithSource {
  id: string;
  versionTitle: string;
  hookCopy: string | null;
  hookTypes: string[];
  hookNotes: string | null;
  coreIdea: string | null;
  argumentCase: string | null;
  valueDelivery: string[];
  reusableElements: string | null;
  valueNotes: string | null;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
  source: {
    id: string;
    ownerId: string;
    title: string;
  };
}

/**
 * 基础AnalysisCard类型（从Prisma模型推导）
 */
export interface AnalysisCard {
  id: string;
  versionTitle: string;
  hookCopy: string | null;
  hookTypes: string[];
  hookNotes: string | null;
  coreIdea: string | null;
  argumentCase: string | null;
  valueDelivery: string[];
  reusableElements: string | null;
  valueNotes: string | null;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 预定义的钩子类型选项
 */
export const HOOK_TYPE_OPTIONS = [
  "建立权威",
  "制造冲突", 
  "展示稀缺",
  "引发好奇",
  "情感共鸣",
  "问题痛点",
  "价值承诺",
  "社会证明"
] as const;

/**
 * 预定义的价值交付选项
 */
export const VALUE_DELIVERY_OPTIONS = [
  "知识技能",
  "工具资源",
  "实用方法",
  "行业洞察",
  "案例分析",
  "数据报告",
  "解决方案",
  "经验分享",
  "趋势预测",
  "专业指导"
] as const;

/**
 * 表单默认值
 */
export const ANALYSIS_CARD_FORM_DEFAULTS: Partial<AnalysisCardFormData> = {
  versionTitle: "AI初稿",
  hookTypes: [],
  valueDelivery: [],
  hookCopy: "",
  hookNotes: "",
  coreIdea: "",
  argumentCase: "",
  reusableElements: "",
  valueNotes: "",
};