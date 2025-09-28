"""
Web集成分析API端点
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from loguru import logger

from app.services.complete_analysis_service import CompleteAnalysisService
from app.services.shared_analysis_core import SharedAnalysisCore

router = APIRouter()
analysis_service = CompleteAnalysisService()
shared_analysis_core = SharedAnalysisCore()


class FileInfo(BaseModel):
    """文件信息"""

    filename: str = Field(..., description="原始文件名")
    storage_path: str = Field(..., description="存储路径")
    mime_type: str = Field(..., description="MIME类型")
    file_size: int = Field(..., description="文件大小")


class WebAnalyzeRequest(BaseModel):
    """Web分析请求"""

    media_file_id: str = Field(..., description="媒体文件ID")
    user_id: str = Field(default="test-user-001", description="用户ID")
    file_info: Optional[FileInfo] = Field(default=None, description="文件信息（可选）")
    force_reprocess: bool = Field(
        default=False, description="是否强制重新处理（忽略现有transcript）"
    )
    force_new_card: bool = Field(
        default=False, description="是否强制创建新分析卡片（支持多版本分析）"
    )


class WebAnalyzeResponse(BaseModel):
    """Web分析响应"""

    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Dict[str, Any] = Field(default_factory=dict, description="分析结果")
    error: str = Field(default="", description="错误信息")
    error_code: str = Field(default="", description="错误代码")


def _get_user_friendly_error(error_msg: str) -> tuple[str, str]:
    """
    将技术错误信息转换为用户友好的错误信息
    
    Returns:
        tuple: (user_friendly_message, error_code)
    """
    error_lower = error_msg.lower()
    
    if "nosuchkey" in error_lower or "does not exist" in error_lower:
        return "文件不存在或已被删除，请重新上传文件", "FILE_NOT_FOUND"
    elif "cos下载失败" in error_msg:
        return "文件下载失败，请检查文件是否完整上传", "DOWNLOAD_FAILED"
    elif "ffmpeg" in error_lower:
        return "视频格式处理失败，请确保文件格式正确", "VIDEO_PROCESSING_FAILED"
    elif "asr" in error_lower or "speech" in error_lower:
        return "语音识别失败，请确保音频清晰可听", "ASR_FAILED"
    elif "database" in error_lower or "connection" in error_lower:
        return "数据库连接异常，请稍后重试", "DATABASE_ERROR"
    elif "timeout" in error_lower:
        return "处理超时，请稍后重试", "TIMEOUT_ERROR"
    elif "permission" in error_lower or "access" in error_lower:
        return "访问权限不足，请联系管理员", "ACCESS_DENIED"
    else:
        return "分析处理失败，请稍后重试", "UNKNOWN_ERROR"


@router.post("/web/analyze", response_model=WebAnalyzeResponse)
async def analyze_media_file(
    request: WebAnalyzeRequest, background_tasks: BackgroundTasks
) -> WebAnalyzeResponse:
    """
    分析已上传的媒体文件 - 使用新的统一分析引擎
    
    Args:
        request: 分析请求
        background_tasks: 后台任务
        
    Returns:
        WebAnalyzeResponse: 分析响应
    """
    logger.info(f"收到Web分析请求: media_file_id={request.media_file_id}")
    
    try:
        # 使用新的统一分析核心
        result = await shared_analysis_core.analyze_media_file(
            media_file_id=request.media_file_id,
            user_id=request.user_id,
            force_reprocess=request.force_reprocess,
            force_new_card=request.force_new_card,
        )
        
        # 转换为前端期望的格式 - 避免双重嵌套
        formatted_result = {
            "trust_hook": result["analysis_result"]["trust_hook"],
            "empathy_anchor": result["analysis_result"]["empathy_anchor"], 
            "value_map": result["analysis_result"]["value_map"],
            "meta": {
                "analysis_id": result["source_info"]["source_id"],
                "timestamp": result["source_info"].get("timestamp", ""),
                "processing_time_ms": result["source_info"]["processing_time_ms"]
            }
        }
        
        return WebAnalyzeResponse(success=True, message="分析完成", data=formatted_result)
        
    except Exception as e:
        error_msg = str(e)
        user_message, error_code = _get_user_friendly_error(error_msg)
        logger.error(f"分析失败: {error_msg}")
        
        return WebAnalyzeResponse(
            success=False,
            message=user_message,
            error=error_msg,
            error_code=error_code
        )


@router.get("/web/analyze/{media_file_id}", response_model=WebAnalyzeResponse)
async def get_analysis_result(media_file_id: str) -> WebAnalyzeResponse:
    """
    获取分析结果

    Args:
        media_file_id: 媒体文件ID

    Returns:
        WebAnalyzeResponse: 分析结果
    """
    try:
        logger.info(f"获取分析结果: media_file_id={media_file_id}")

        result = await analysis_service.get_analysis_by_media_file(media_file_id)

        if result:
            return WebAnalyzeResponse(success=True, message="获取成功", data=result)
        else:
            return WebAnalyzeResponse(
                success=False,
                message="未找到分析结果，该文件可能尚未分析",
                error="该文件尚未进行分析或分析失败",
                error_code="NOT_FOUND"
            )

    except Exception as e:
        error_msg = str(e)
        user_message, error_code = _get_user_friendly_error(error_msg)
        
        logger.error(f"获取分析结果错误: {error_msg}")
        
        return WebAnalyzeResponse(
            success=False,
            message=user_message,
            error=error_msg,
            error_code=error_code
        )


@router.post("/web/analyze/{media_file_id}/retry", response_model=WebAnalyzeResponse)
async def retry_analysis(
    media_file_id: str, background_tasks: BackgroundTasks
) -> WebAnalyzeResponse:
    """
    重新分析媒体文件

    Args:
        media_file_id: 媒体文件ID
        background_tasks: 后台任务

    Returns:
        WebAnalyzeResponse: 分析响应
    """
    try:
        logger.info(f"重新分析文件: media_file_id={media_file_id}")

        # 执行重新分析
        result = await analysis_service.analyze_media_file(
            media_file_id=media_file_id, user_id="test-user-001", force_reprocess=True
        )

        if result["success"]:
            return WebAnalyzeResponse(success=True, message="重新分析完成", data=result)
        else:
            error_msg = result.get("error", "未知错误")
            user_message, error_code = _get_user_friendly_error(error_msg)
            
            return WebAnalyzeResponse(
                success=False,
                message=user_message,
                error=error_msg,
                error_code=error_code
            )

    except Exception as e:
        error_msg = str(e)
        user_message, error_code = _get_user_friendly_error(error_msg)
        
        logger.error(f"重新分析错误: {error_msg}")
        
        return WebAnalyzeResponse(
            success=False,
            message=user_message,
            error=error_msg,
            error_code=error_code
        )
