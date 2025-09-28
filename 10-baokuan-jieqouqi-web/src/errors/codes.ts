// API业务错误码定义
// 按照统一响应格式规范，code=0表示成功，其他为错误码

export const ErrorCode = {
  // 成功
  SUCCESS: 0,
  
  // 通用错误 (1xxx)
  UNKNOWN_ERROR: 1000,
  INVALID_PARAMETER: 1001,
  MISSING_PARAMETER: 1002,
  
  // 认证错误 (2xxx)  
  UNAUTHORIZED: 2001,
  FORBIDDEN: 2002,
  TOKEN_EXPIRED: 2003,
  
  // 资源错误 (3xxx)
  RESOURCE_NOT_FOUND: 3001,
  RESOURCE_ALREADY_EXISTS: 3002,
  RESOURCE_CONFLICT: 3003,
  
  // 文件上传错误 (4xxx)
  FILE_TOO_LARGE: 4001,
  FILE_TYPE_NOT_SUPPORTED: 4002,
  UPLOAD_FAILED: 4003,
  
  // 分析服务错误 (4xxx-5xxx) - 与AI服务保持一致
  FILE_NOT_FOUND: 4004,                      // 文件不存在
  COS_SERVICE_ERROR: 5001,                   // COS服务异常
  ASR_SERVICE_ERROR: 5002,                   // ASR服务异常  
  DATABASE_SERVICE_ERROR: 5003,              // 数据库操作异常
  MEDIA_PROCESSING_ERROR: 5004,              // 媒体处理异常
  ANALYSIS_SERVICE_ERROR: 5005,              // AI分析服务异常
  
  // 原有分析服务错误码保持兼容（使用不同的错误码）
  ANALYSIS_SERVICE_UNAVAILABLE: 5006,        // 分析服务不可用
  ANALYSIS_SERVICE_TIMEOUT: 5007,            // 分析服务超时
  FILE_PROCESSING_FAILED: 5008,              // 文件处理失败
  ANALYSIS_INTERNAL_ERROR: 5009,             // 分析内部错误
  
  // 数据库错误 (6xxx)
  DATABASE_ERROR: 6001,
  DATA_INTEGRITY_ERROR: 6002,
  
} as const

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode]

// 错误信息映射
export const ERROR_MESSAGES: Record<ErrorCodeType, string> = {
  [ErrorCode.SUCCESS]: "操作成功",
  
  // 通用错误
  [ErrorCode.UNKNOWN_ERROR]: "系统异常，请联系客服",
  [ErrorCode.INVALID_PARAMETER]: "参数错误",
  [ErrorCode.MISSING_PARAMETER]: "缺少必要参数",
  
  // 认证错误
  [ErrorCode.UNAUTHORIZED]: "未登录或登录已过期",
  [ErrorCode.FORBIDDEN]: "没有访问权限", 
  [ErrorCode.TOKEN_EXPIRED]: "登录已过期，请重新登录",
  
  // 资源错误
  [ErrorCode.RESOURCE_NOT_FOUND]: "资源不存在",
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: "资源已存在",
  [ErrorCode.RESOURCE_CONFLICT]: "资源冲突",
  
  // 文件上传错误
  [ErrorCode.FILE_TOO_LARGE]: "文件大小超过限制",
  [ErrorCode.FILE_TYPE_NOT_SUPPORTED]: "文件格式不支持",
  [ErrorCode.UPLOAD_FAILED]: "文件上传失败",
  
  // 分析服务错误
  [ErrorCode.FILE_NOT_FOUND]: "文件不存在或已被删除",
  [ErrorCode.COS_SERVICE_ERROR]: "云存储服务异常，请稍后重试",
  [ErrorCode.ASR_SERVICE_ERROR]: "语音识别服务异常，请稍后重试",
  [ErrorCode.DATABASE_SERVICE_ERROR]: "数据服务异常，请稍后重试", 
  [ErrorCode.MEDIA_PROCESSING_ERROR]: "媒体文件处理失败，请检查文件格式",
  [ErrorCode.ANALYSIS_SERVICE_ERROR]: "分析服务异常，请稍后重试",
  [ErrorCode.ANALYSIS_SERVICE_UNAVAILABLE]: "服务器正忙，请稍后重试",
  [ErrorCode.ANALYSIS_SERVICE_TIMEOUT]: "分析超时，请重新尝试",
  [ErrorCode.FILE_PROCESSING_FAILED]: "文件格式不支持或已损坏",
  [ErrorCode.ANALYSIS_INTERNAL_ERROR]: "系统异常，请联系客服",
  
  // 数据库错误
  [ErrorCode.DATABASE_ERROR]: "数据操作失败",
  [ErrorCode.DATA_INTEGRITY_ERROR]: "数据完整性错误",
}

// 统一API响应接口
export interface ApiResponse<T = any> {
  code: ErrorCodeType;
  message: string;
  data: T | null;
}

// 创建成功响应的辅助函数
export function createSuccessResponse<T>(data: T, message = "操作成功"): ApiResponse<T> {
  return {
    code: ErrorCode.SUCCESS,
    message,
    data
  }
}

// 创建错误响应的辅助函数
export function createErrorResponse(
  code: ErrorCodeType, 
  customMessage?: string
): ApiResponse<null> {
  return {
    code,
    message: customMessage || ERROR_MESSAGES[code],
    data: null
  }
}