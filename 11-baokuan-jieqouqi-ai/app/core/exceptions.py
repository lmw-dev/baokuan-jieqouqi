"""
自定义异常类 - 按照120-spec-error-handling.mdc规范
"""

from typing import Optional

# 业务错误码映射表
ERROR_CODE_MAP = {
    # 客户端错误 (4xxx)
    4001: "参数错误",
    4002: "文件不存在",
    4003: "文件格式不支持",
    4004: "文件过大",
    4005: "用户未认证",
    4006: "权限不足",
    4007: "服务配置错误",  # 新增：用于AI服务配置错误
    4008: "资源不存在",  # 新增：用于数据库资源不存在
    
    # 服务器错误 (5xxx) 
    5001: "COS服务异常",
    5002: "ASR服务异常",
    5003: "数据库操作异常",
    5004: "媒体处理异常",
    5005: "AI分析服务异常",
    5006: "AI服务异常",
    5007: "Prompt管理异常",
    5008: "三段式分析异常",
    5009: "脚本生成异常",
    
    # 通用错误
    9001: "系统内部错误"
}


class APIException(Exception):
    """API异常基类"""
    
    def __init__(self, code: int, message: Optional[str] = None, details: Optional[str] = None, retryable: bool = None):
        self.code = code
        self.message = message or ERROR_CODE_MAP.get(code, "未知错误")
        self.details = details  # 技术详情，用于日志
        # 基于错误码自动判断是否可重试，可以手动覆盖
        if retryable is None:
            self.retryable = 5000 <= code <= 5999  # 5xx错误默认可重试，4xx错误默认不可重试
        else:
            self.retryable = retryable
        super().__init__(self.message)


# ============ 客户端错误 (4xxx) ============

class InvalidParameterError(APIException):
    """参数错误"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=4001, message=message, details=details)


class FileNotFoundError(APIException):
    """文件不存在"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=4002, message=message, details=details)


class UnsupportedFileFormatError(APIException):
    """文件格式不支持"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=4003, message=message, details=details)


class FileTooLargeError(APIException):
    """文件过大"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=4004, message=message, details=details)


class NotAuthenticatedError(APIException):
    """用户未认证"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=4005, message=message, details=details)


class PermissionDeniedError(APIException):
    """权限不足"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=4006, message=message, details=details)


class ServiceConfigurationError(APIException):
    """服务配置错误"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=4007, message=message, details=details)


class NotFoundError(APIException):
    """资源不存在"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=4008, message=message, details=details)


# ============ 服务器错误 (5xxx) ============

class COSServiceError(APIException):
    """COS服务异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=5001, message=message, details=details)


class ASRServiceError(APIException):
    """ASR服务异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=5002, message=message, details=details)


class DatabaseError(APIException):
    """数据库操作异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=5003, message=message, details=details)


class MediaProcessingError(APIException):
    """媒体处理异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=5004, message=message, details=details)


class AnalysisServiceError(APIException):
    """AI分析服务异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=5005, message=message, details=details)


class AIServiceError(APIException):
    """AI服务异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None, retryable: Optional[bool] = None):
        super().__init__(code=5006, message=message, details=details, retryable=retryable)


class PromptManagementError(APIException):
    """Prompt管理异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=5007, message=message, details=details)


class ThreeStageAnalysisError(APIException):
    """三段式分析异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=5008, message=message, details=details)


class ScriptGenerationError(APIException):
    """脚本生成异常"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=5009, message=message, details=details)


# ============ 通用错误 ============

class InternalServerError(APIException):
    """系统内部错误"""
    def __init__(self, message: Optional[str] = None, details: Optional[str] = None):
        super().__init__(code=9001, message=message, details=details)