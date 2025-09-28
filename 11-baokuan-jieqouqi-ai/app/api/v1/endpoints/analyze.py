from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import json
from pathlib import Path
from loguru import logger

from app.schemas.analyze_schema import (
    AnalyzeRequest, AnalysisResult, AnalysisOptions, 
    AnalysisResponse, FileValidationResult
)
from app.services.analysis_service import AnalysisService
from app.core.config import settings

router = APIRouter()

# 初始化分析服务
analysis_service = AnalysisService()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_content(
    content_type: str = Form(..., description="内容类型: file 或 text"),
    file: Optional[UploadFile] = File(None, description="上传的文件"),
    text_content: Optional[str] = Form(None, description="文本内容"),
    analysis_options: Optional[str] = Form(None, description="分析选项JSON字符串")
) -> AnalysisResponse:
    """
    分析上传的文件或文本内容，提取信任之钩和关键信息
    
    Args:
        content_type: 内容类型 ("file" 或 "text")
        file: 上传的文件（视频/音频）
        text_content: 文本内容（当content_type为"text"时）
        analysis_options: 分析选项JSON字符串
    
    Returns:
        AnalysisResponse: 包含任务ID和分析结果的响应
    """
    try:
        # 1. 验证请求参数
        if content_type not in ["file", "text"]:
            raise HTTPException(
                status_code=400,
                detail="content_type 必须是 'file' 或 'text'"
            )
        
        # 2. 解析分析选项
        options = None
        if analysis_options:
            try:
                options_dict = json.loads(analysis_options)
                options = AnalysisOptions(**options_dict)
            except (json.JSONDecodeError, ValueError) as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"分析选项格式错误: {str(e)}"
                )
        
        # 3. 验证内容
        file_data = None
        original_filename = None
        
        if content_type == "file":
            if not file:
                raise HTTPException(
                    status_code=400,
                    detail="当内容类型为file时，必须提供文件"
                )
            
            # 验证文件
            validation_result = await validate_uploaded_file(file)
            if not validation_result.is_valid:
                raise HTTPException(
                    status_code=400,
                    detail=validation_result.error_message
                )
            
            # 读取文件数据
            file_data = await file.read()
            original_filename = file.filename
            
        elif content_type == "text":
            if not text_content or not text_content.strip():
                raise HTTPException(
                    status_code=400,
                    detail="当内容类型为text时，text_content不能为空"
                )
        
        # 4. 构建分析请求
        request = AnalyzeRequest(
            content_type=content_type,
            text_content=text_content,
            analysis_options=options
        )
        
        # 5. 执行分析
        logger.info(f"收到分析请求: 类型={content_type}, 文件={original_filename}")
        
        result = await analysis_service.analyze_content(
            request=request,
            file_data=file_data,
            original_filename=original_filename
        )
        
        # 6. 返回结果
        return AnalysisResponse(
            success=True,
            message="分析完成",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"分析请求处理失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"服务器内部错误: {str(e)}"
        )


@router.get("/analyze/{task_id}/status", response_model=AnalysisResponse)
async def get_analysis_status(task_id: str) -> AnalysisResponse:
    """
    获取分析任务状态
    
    Args:
        task_id: 任务ID
        
    Returns:
        AnalysisResponse: 任务状态响应
    """
    try:
        result = await analysis_service.get_analysis_status(task_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"任务不存在: {task_id}"
            )
        
        return AnalysisResponse(
            success=True,
            message="获取状态成功",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分析状态失败: {task_id}, 错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"服务器内部错误: {str(e)}"
        )


@router.get("/analyze/{task_id}/result", response_model=AnalysisResponse)
async def get_analysis_result(task_id: str) -> AnalysisResponse:
    """
    获取分析结果（与status端点相同，提供兼容性）
    
    Args:
        task_id: 任务ID
        
    Returns:
        AnalysisResponse: 分析结果响应
    """
    return await get_analysis_status(task_id)


@router.get("/health", response_model=Dict[str, Any])
async def health_check() -> Dict[str, Any]:
    """
    健康检查端点
    
    Returns:
        Dict[str, Any]: 服务健康状态
    """
    try:
        # 验证各个服务的可用性
        service_status = await analysis_service.validate_services()
        
        # 计算总体健康状态
        all_healthy = all(service_status.values())
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": "2025-07-07T14:00:00Z",
            "services": service_status,
            "version": settings.app_version
        }
        
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": "2025-07-07T14:00:00Z",
            "error": str(e),
            "version": settings.app_version
        }


async def validate_uploaded_file(file: UploadFile) -> FileValidationResult:
    """
    验证上传的文件
    
    Args:
        file: 上传的文件
        
    Returns:
        FileValidationResult: 验证结果
    """
    try:
        # 1. 检查文件名
        if not file.filename:
            return FileValidationResult(
                is_valid=False,
                file_type="unknown",
                file_size=0,
                mime_type="",
                error_message="文件名不能为空"
            )
        
        # 2. 检查文件扩展名
        file_ext = Path(file.filename).suffix.lower()
        allowed_formats = settings.allowed_video_formats + settings.allowed_audio_formats
        
        if file_ext not in allowed_formats:
            return FileValidationResult(
                is_valid=False,
                file_type="unsupported",
                file_size=0,
                mime_type=file.content_type or "",
                error_message=f"不支持的文件格式: {file_ext}。支持的格式: {', '.join(allowed_formats)}"
            )
        
        # 3. 检查文件大小
        file_data = await file.read()
        file_size = len(file_data)
        
        if file_size == 0:
            return FileValidationResult(
                is_valid=False,
                file_type="empty",
                file_size=0,
                mime_type=file.content_type or "",
                error_message="文件为空"
            )
        
        if file_size > settings.max_file_size:
            max_size_mb = settings.max_file_size / (1024 * 1024)
            current_size_mb = file_size / (1024 * 1024)
            return FileValidationResult(
                is_valid=False,
                file_type="oversized",
                file_size=file_size,
                mime_type=file.content_type or "",
                error_message=f"文件过大: {current_size_mb:.1f}MB，最大允许: {max_size_mb:.1f}MB"
            )
        
        # 4. 重置文件指针
        await file.seek(0)
        
        # 5. 确定文件类型
        file_type = "video" if file_ext in settings.allowed_video_formats else "audio"
        
        return FileValidationResult(
            is_valid=True,
            file_type=file_type,
            file_size=file_size,
            mime_type=file.content_type or "",
            error_message=None
        )
        
    except Exception as e:
        logger.error(f"文件验证失败: {str(e)}")
        return FileValidationResult(
            is_valid=False,
            file_type="error",
            file_size=0,
            mime_type="",
            error_message=f"文件验证异常: {str(e)}"
        )