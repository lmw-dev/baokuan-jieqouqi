// 工作台页面相关类型定义

/**
 * 分析卡片列表项类型
 * 用于在工作台页面展示用户的分析卡片列表
 */
export interface AnalysisCardListItem {
  /** 卡片ID */
  id: string;
  /** 分析源标题 */
  sourceTitle: string;
  /** 分析版本标题 */
  versionTitle: string;
  /** 创建时间 */
  createdAt: Date | string;
  /** 更新时间 */
  updatedAt: Date | string;
  /** 分析源ID（用于跳转） */
  sourceId: string;
  /** 分析类型（从hookTypes或valueDelivery中提取） */
  analysisType?: string;
  /** 标签列表 */
  tags?: string[];
}

/**
 * 工作台页面Props类型
 */
export interface DashboardPageProps {
  // 当前为Server Component，暂不需要props
}

/**
 * 工作台页面状态类型
 */
export interface DashboardPageState {
  /** 卡片列表 */
  cards: AnalysisCardListItem[];
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否为空状态 */
  isEmpty: boolean;
}

/**
 * 卡片组件Props类型
 */
export interface AnalysisCardItemProps {
  /** 卡片数据 */
  card: AnalysisCardListItem;
  /** 点击事件处理 */
  onClick?: (card: AnalysisCardListItem) => void;
}

/**
 * 空状态组件Props类型
 */
export interface EmptyStateProps {
  /** 空状态标题 */
  title?: string;
  /** 空状态描述 */
  description?: string;
  /** 操作按钮文本 */
  actionText?: string;
  /** 操作按钮点击事件 */
  onAction?: () => void;
}

/**
 * 排序选项类型
 */
export type SortOption = 'time-desc' | 'time-asc' | 'title-asc' | 'title-desc';

/**
 * 筛选选项类型
 */
export interface FilterOptions {
  /** 分析类型筛选 */
  analysisType?: string;
  /** 时间范围筛选 */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** 标签筛选 */
  tags?: string[];
} 