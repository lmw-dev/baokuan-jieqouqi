// 文件上传相关类型定义

// 上传状态枚举 - 与Prisma schema一致
export enum UploadStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING', 
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// ===== 核心接口定义 =====

export interface UploadOptions {
  // 文件限制
  maxSize?: number // 最大文件大小，默认100MB
  allowedTypes?: string[] // 允许的文件类型
  
  // 上传行为
  autoRetry?: boolean // 是否自动重试，默认true
  maxRetries?: number // 最大重试次数，默认3
  chunkSize?: number // 分片大小，默认5MB
  
  // 回调函数
  onProgress?: (progress: UploadProgress) => void
  onSuccess?: (result: UploadResult) => void
  onError?: (error: UploadError) => void
  
  // 自定义配置
  generateThumbnail?: boolean // 是否生成缩略图
  customPath?: string // 自定义COS路径
  metadata?: Record<string, any> // 自定义元数据
}

export interface BatchUploadOptions extends UploadOptions {
  maxConcurrent?: number // 最大并发上传数，默认3
  onBatchProgress?: (progress: BatchUploadProgress) => void
  onBatchComplete?: (results: BatchUploadResult) => void
}

export interface UploadProgress {
  sessionId: string;
  fileName: string;
  status: UploadStatus;
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
}

export interface BatchUploadProgress {
  totalFiles: number
  completedFiles: number
  failedFiles: number
  totalSize: number
  uploadedSize: number
  overallPercentage: number
  currentFile?: UploadProgress
}

export interface UploadResult {
  success: boolean
  sessionId: string
  mediaFileId?: string
  cosUrl?: string
  thumbnailUrl?: string
  fileSize: number
  duration?: number // 视频时长(秒)
  error?: UploadError
}

export interface BatchUploadResult {
  success: boolean
  results: UploadResult[]
  totalFiles: number
  successCount: number
  failureCount: number
}

// ===== 错误类型定义 =====

export enum UploadErrorCode {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  COS_UPLOAD_FAILED = 'COS_UPLOAD_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UPLOAD_CANCELLED = 'UPLOAD_CANCELLED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  API_ERROR = 'API_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  CREDENTIALS_EXPIRED = 'CREDENTIALS_EXPIRED',
  CONCURRENT_LIMIT_EXCEEDED = 'CONCURRENT_LIMIT_EXCEEDED',
  DUPLICATE_FILE = 'DUPLICATE_FILE'
}

export class UploadError extends Error {
  constructor(
    public code: UploadErrorCode,
    message: string,
    public retryable: boolean = false,
    public metadata?: any
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

// ===== API 请求/响应类型 =====

export interface InitUploadRequest {
  fileName: string
  fileSize: number
  fileType: string
  fileHash?: string // 可选，用于去重检测
  metadata?: Record<string, any>
  options?: Partial<UploadOptions>
}

export interface InitUploadResponse {
  sessionId: string
  mediaFileId: string
  uploadUrl?: string // 如果文件已存在，直接返回URL
  isDuplicate: boolean // 是否为重复文件
  expiresAt: string // 会话过期时间
  chunkSize: number // 建议的分片大小
}

export interface GetCredentialsRequest {
  sessionId: string
}

export interface GetCredentialsResponse {
    success: boolean;
    key: string;
    cosConfig: {
        bucket: string;
        region: string;
        key: string;
    };
    stsCredentials: {
        tmpSecretId: string;
        tmpSecretKey: string;
        sessionToken: string;
        startTime: number;
        expiredTime: number;
    };
}

export interface CompleteUploadRequest {
  sessionId: string
  cosUrl: string
  actualFileSize: number
  fileHash?: string
}

export interface CompleteUploadResponse {
  success: boolean
  mediaFile: {
    id: string
    originalFilename: string
    storagePath: string
    fileSize: number
    mimeType: string
    status: string
  }
  analysisTaskId?: string // 如果触发了分析任务
  thumbnailUrl?: string
}

export interface UploadStatusResponse {
  sessionId: string
  status: UploadStatus
  progress: number
  fileName: string
  fileSize: number
  cosUrl?: string
  error?: string
  createdAt: string
  updatedAt: string
}

// ===== 服务接口定义 =====

export interface FileUploadService {
  // 单文件上传
  uploadFile(file: File, options?: UploadOptions): Promise<UploadResult>
  
  // 批量上传
  uploadFiles(files: File[], options?: BatchUploadOptions): Promise<BatchUploadResult>
  
  // 查询上传状态
  getUploadStatus(sessionId: string): Promise<UploadStatusResponse>
  
  // 取消上传
  cancelUpload(sessionId: string): Promise<void>
  
  // 重试上传
  retryUpload(sessionId: string): Promise<UploadResult>
  
  // 清理过期会话
  cleanupExpiredSessions(): Promise<void>
}

// ===== 配置类型 =====

export interface UploadConfig {
  // COS配置
  cos: {
    region: string
    bucket: string
    secretId: string
    secretKey: string
  }
  
  // 文件限制
  limits: {
    maxFileSize: number
    allowedTypes: string[]
    maxConcurrentUploads: number
  }
  
  // 上传设置
  upload: {
    chunkSize: number
    maxRetries: number
    retryDelay: number
    sessionTimeout: number // 会话超时时间(秒)
  }
  
  // 功能开关
  features: {
    enableDeduplication: boolean
    enableThumbnail: boolean
    enableProgressTracking: boolean
  }
}

// ===== React Hook 相关类型 =====

export interface UseFileUploadState {
  isUploading: boolean
  progress: UploadProgress | null
  error: UploadError | null
  result: UploadResult | null
  sessionId: string | null
}

export interface UseFileUploadActions {
  uploadFile: (file: File) => Promise<UploadResult>
  cancelUpload: () => void
  retryUpload: () => void
  reset: () => void
  uploadFiles: (files: File[]) => Promise<BatchUploadResult>
}

export interface UseFileUploadReturn extends UseFileUploadState, UseFileUploadActions {}

// ===== 常量定义 =====

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  cos: {
    region: 'ap-guangzhou',
    bucket: '',
    secretId: '',
    secretKey: ''
  },
  limits: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'video/mp4',
      'video/mov',
      'video/avi',
      'video/webm',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/mpeg'
    ],
    maxConcurrentUploads: 3
  },
  upload: {
    chunkSize: 5 * 1024 * 1024, // 5MB
    maxRetries: 3,
    retryDelay: 1000, // 1秒
    sessionTimeout: 3600 // 1小时
  },
  features: {
    enableDeduplication: true,
    enableThumbnail: true,
    enableProgressTracking: true
  }
}

export const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  [UploadErrorCode.FILE_TOO_LARGE]: '文件大小超过限制',
  [UploadErrorCode.INVALID_FILE_TYPE]: '不支持的文件类型',
  [UploadErrorCode.NETWORK_ERROR]: '网络连接错误',
  [UploadErrorCode.CREDENTIALS_EXPIRED]: '上传凭证已过期',
  [UploadErrorCode.COS_UPLOAD_FAILED]: '文件上传失败',
  [UploadErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [UploadErrorCode.SESSION_EXPIRED]: '上传会话已过期',
  [UploadErrorCode.CONCURRENT_LIMIT_EXCEEDED]: '超出并发上传数量限制',
  [UploadErrorCode.DUPLICATE_FILE]: '文件已存在',
  [UploadErrorCode.UPLOAD_CANCELLED]: '上传已取消',
  [UploadErrorCode.UNKNOWN_ERROR]: '未知错误',
  [UploadErrorCode.API_ERROR]: 'API请求失败',
  [UploadErrorCode.NOT_IMPLEMENTED]: '功能未实现',
}; 