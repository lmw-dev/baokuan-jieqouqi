"""
TOM-217: API响应工具模块 - 提供统一的响应构建函数
创建时间: 2025-07-12
"""

from typing import TypeVar, Optional, Any
from .script_management import APIResponse

# 业务状态码常量 - 与Next.js项目的ErrorCode保持一致
class BusinessCode:
    """业务状态码定义 - 与Next.js项目保持一致"""
    # 成功
    SUCCESS = 0
    
    # 通用错误 (1xxx)
    UNKNOWN_ERROR = 1000
    INVALID_PARAMETER = 1001
    MISSING_PARAMETER = 1002
    
    # 认证错误 (2xxx)
    UNAUTHORIZED = 2001
    FORBIDDEN = 2002
    TOKEN_EXPIRED = 2003
    
    # 资源错误 (3xxx)  
    RESOURCE_NOT_FOUND = 3001
    RESOURCE_ALREADY_EXISTS = 3002
    RESOURCE_CONFLICT = 3003
    
    # 文件处理错误 (4xxx)
    FILE_TOO_LARGE = 4001
    FILE_TYPE_NOT_SUPPORTED = 4002
    UPLOAD_FAILED = 4003
    FILE_NOT_FOUND = 4004
    
    # 服务错误 (5xxx)
    COS_SERVICE_ERROR = 5001
    ASR_SERVICE_ERROR = 5002
    DATABASE_SERVICE_ERROR = 5003
    MEDIA_PROCESSING_ERROR = 5004
    ANALYSIS_SERVICE_ERROR = 5005
    ANALYSIS_SERVICE_UNAVAILABLE = 5006
    ANALYSIS_SERVICE_TIMEOUT = 5007
    FILE_PROCESSING_FAILED = 5008
    ANALYSIS_INTERNAL_ERROR = 5009
    
    # 数据库错误 (6xxx)
    DATABASE_ERROR = 6001
    DATA_INTEGRITY_ERROR = 6002


# 错误信息映射
BUSINESS_MESSAGES = {
    BusinessCode.SUCCESS: "操作成功",
    
    # 通用错误
    BusinessCode.UNKNOWN_ERROR: "系统异常，请联系客服",
    BusinessCode.INVALID_PARAMETER: "参数错误",
    BusinessCode.MISSING_PARAMETER: "缺少必要参数",
    
    # 认证错误
    BusinessCode.UNAUTHORIZED: "未登录或登录已过期",
    BusinessCode.FORBIDDEN: "没有访问权限",
    BusinessCode.TOKEN_EXPIRED: "登录已过期，请重新登录",
    
    # 资源错误
    BusinessCode.RESOURCE_NOT_FOUND: "资源不存在",
    BusinessCode.RESOURCE_ALREADY_EXISTS: "资源已存在",
    BusinessCode.RESOURCE_CONFLICT: "资源冲突",
    
    # 文件处理错误
    BusinessCode.FILE_TOO_LARGE: "文件大小超过限制",
    BusinessCode.FILE_TYPE_NOT_SUPPORTED: "文件格式不支持",
    BusinessCode.UPLOAD_FAILED: "文件上传失败",
    BusinessCode.FILE_NOT_FOUND: "文件不存在或已被删除",
    
    # 服务错误
    BusinessCode.COS_SERVICE_ERROR: "云存储服务异常，请稍后重试",
    BusinessCode.ASR_SERVICE_ERROR: "语音识别服务异常，请稍后重试",
    BusinessCode.DATABASE_SERVICE_ERROR: "数据服务异常，请稍后重试",
    BusinessCode.MEDIA_PROCESSING_ERROR: "媒体文件处理失败，请检查文件格式",
    BusinessCode.ANALYSIS_SERVICE_ERROR: "分析服务异常，请稍后重试",
    BusinessCode.ANALYSIS_SERVICE_UNAVAILABLE: "服务器正忙，请稍后重试",
    BusinessCode.ANALYSIS_SERVICE_TIMEOUT: "分析超时，请重新尝试",
    BusinessCode.FILE_PROCESSING_FAILED: "文件格式不支持或已损坏",
    BusinessCode.ANALYSIS_INTERNAL_ERROR: "系统异常，请联系客服",
    
    # 数据库错误
    BusinessCode.DATABASE_ERROR: "数据操作失败",
    BusinessCode.DATA_INTEGRITY_ERROR: "数据完整性错误",
}

T = TypeVar('T')

def create_success_response(
    data: T, 
    message: str = "操作成功"
) -> APIResponse:
    """创建成功响应
    
    Args:
        data: 响应数据
        message: 成功消息，默认为"操作成功"
        
    Returns:
        符合规范的成功响应
    """
    return APIResponse(
        code=BusinessCode.SUCCESS,
        message=message,
        data=data
    )


def create_error_response(
    code: int,
    custom_message: Optional[str] = None
) -> APIResponse:
    """创建错误响应
    
    Args:
        code: 业务错误码
        custom_message: 自定义错误消息，如果不提供则使用默认消息
        
    Returns:
        符合规范的错误响应
    """
    message = custom_message or BUSINESS_MESSAGES.get(code, "未知错误")
    
    return APIResponse(
        code=code,
        message=message,
        data=None
    )


def create_validation_error_response(
    errors: list,
    message: str = "数据验证失败"
) -> APIResponse:
    """创建验证错误响应
    
    Args:
        errors: 验证错误详情列表
        message: 错误消息
        
    Returns:
        符合规范的验证错误响应
    """
    return APIResponse(
        code=BusinessCode.INVALID_PARAMETER,
        message=message,
        data={"errors": errors}
    )


# 导出常用函数和常量
__all__ = [
    "BusinessCode",
    "BUSINESS_MESSAGES", 
    "create_success_response",
    "create_error_response",
    "create_validation_error_response"
]