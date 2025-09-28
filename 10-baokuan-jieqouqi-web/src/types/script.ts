/**
 * TOM-218: 脚本管理相关TypeScript类型定义
 * 与TOM-217后端API响应格式完全匹配
 */

// ==================== 枚举类型 ====================

export enum ScriptStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published', 
  ARCHIVED = 'archived'
}

export enum SectionType {
  HOOK = 'hook',
  PROBLEM = 'problem',
  SOLUTION = 'solution',
  PROOF = 'proof',
  CTA = 'cta'
}

export enum ImportanceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum ExportFormat {
  TXT = 'txt',
  MARKDOWN = 'md',
  JSON = 'json'
}

export enum EditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GENERATE = 'generate'
}

// ==================== 核心数据类型 ====================

export interface ScriptSectionDetail {
  id: string
  scriptId: string
  sectionType: SectionType
  title: string
  content: string
  tips: string[]
  timeRange?: string
  importance: ImportanceLevel
  orderIndex: number
  updatedAt: string // ISO string
}

export interface ScriptMetadata {
  generationId?: string
  totalSections: number
  lastUpdated: string // ISO string
  creatorId: string
}

export interface ScriptDetail {
  id: string
  cardId: string
  title: string
  status: ScriptStatus
  sections: ScriptSectionDetail[]
  metadata: ScriptMetadata
  createdAt: string // ISO string
  updatedAt: string // ISO string
}

export interface ScriptEditHistory {
  id: string
  scriptId: string
  sectionId?: string
  contentBefore?: string
  contentAfter?: string
  action: EditAction
  createdAt: string // ISO string
  createdBy: string
}

// ==================== API请求类型 ====================

export interface ScriptCreateRequest {
  styleConfig?: any // 脚本风格配置，类型待TOM-216确定
}

export interface ScriptSectionUpdate {
  id?: string
  sectionType: SectionType
  title: string
  content: string
  tips?: string[]
  timeRange?: string
  importance?: ImportanceLevel
  orderIndex: number
}

export interface ScriptUpdateRequest {
  title?: string
  status?: ScriptStatus
  sections?: ScriptSectionUpdate[]
}

export interface ExportRequest {
  format: ExportFormat
  includeMetadata?: boolean
  includeTips?: boolean
}

// ==================== API响应类型 ====================

export interface APIResponse<T = any> {
  code: number
  message: string
  data?: T
}

export interface ScriptGenerationResponse extends APIResponse<ScriptDetail> {}

export interface ScriptDetailResponse extends APIResponse<ScriptDetail> {}

export interface ScriptListResponse extends APIResponse<ScriptDetail[]> {}

export interface DeleteResponse extends APIResponse<{ scriptId: string }> {}

export interface CopyResponse extends APIResponse<{ content: string; format: string }> {}

export interface HealthResponse extends APIResponse<{
  scriptId: string
  accessible: boolean
  title?: string
  status?: ScriptStatus
}> {}

// ==================== 分页和查询类型 ====================

export interface ScriptQueryParams {
  page?: number
  pageSize?: number
  status?: ScriptStatus
  cardId?: string
  keyword?: string
}

export interface PagedResponse<T> {
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: T[]
}

export interface ScriptPagedResponse extends PagedResponse<ScriptDetail> {}

// ==================== 错误处理类型 ====================

export interface ErrorDetail {
  field?: string
  message: string
  code?: string
}

export interface ValidationErrorResponse extends APIResponse {
  code: 1001
  message: '数据验证失败'
  errors: ErrorDetail[]
}

// ==================== 业务状态码 ====================

export enum BusinessCode {
  SUCCESS = 0,
  INVALID_PARAMETER = 1001,
  UNAUTHORIZED = 1002, 
  FORBIDDEN = 1003,
  NOT_FOUND = 1004,
  SCRIPT_GENERATION_ERROR = 2001,
  UNKNOWN_ERROR = 9999
}

// ==================== UI状态类型 ====================

export interface ScriptLoadingState {
  isLoading: boolean
  isGenerating: boolean
  isSaving: boolean
  isExporting: boolean
  error?: string
}

export interface ScriptEditorState {
  isEditing: boolean
  hasUnsavedChanges: boolean
  lastSaveTime?: Date
  autoSaveEnabled: boolean
}

// ==================== 组件Props类型 ====================

export interface ScriptDetailPageProps {
  params: { scriptId: string }
}

export interface ScriptEditorProps {
  script: ScriptDetail
  editable?: boolean
  onUpdate?: (updates: ScriptUpdateRequest) => Promise<void>
  onSave?: () => Promise<void>
  loadingState?: ScriptLoadingState
}

export interface ScriptSectionProps {
  section: ScriptSectionDetail
  isEditing?: boolean
  onUpdate?: (sectionUpdate: ScriptSectionUpdate) => void
  onCopy?: (content: string) => void
}

export interface ScriptActionProps {
  scriptId: string
  onExport?: (format: ExportFormat) => Promise<void>
  onCopy?: (format: ExportFormat) => Promise<string>
  onDelete?: () => Promise<void>
  disabled?: boolean
}

// ==================== Hook返回类型 ====================

export interface UseScriptReturn {
  script: ScriptDetail | null
  loadingState: ScriptLoadingState
  editorState: ScriptEditorState
  updateScript: (updates: ScriptUpdateRequest) => Promise<void>
  saveScript: () => Promise<void>
  exportScript: (format: ExportFormat) => Promise<void>
  copyScript: (format?: ExportFormat) => Promise<string>
  deleteScript: () => Promise<void>
  toggleEditMode: () => void
  refresh: () => Promise<void>
}

export interface UseScriptGenerationReturn {
  generateScript: (cardId: string, config?: ScriptCreateRequest) => Promise<ScriptDetail>
  isGenerating: boolean
  error?: string
}