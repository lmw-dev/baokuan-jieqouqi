"""
新的分析业务接口 - 基于SharedAnalysisCore的统一API
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from loguru import logger

from app.services.shared_analysis_core import SharedAnalysisCore
from app.models.analysis import SourceType
from app.core.exceptions import AnalysisServiceError, FileNotFoundError

router = APIRouter()
shared_core = SharedAnalysisCore()


def format_for_frontend(analysis_result: dict) -> dict:
    """将统一分析结果转换为前端期望的格式"""
    logger.debug(f"=== format_for_frontend 输入数据 ===")
    logger.debug(f"analysis_result: {analysis_result}")
    logger.debug(f"empathy_anchor原始数据: {analysis_result['analysis_result']['empathy_anchor']}")
    
    formatted_data = {
        "trust_hook": analysis_result["analysis_result"]["trust_hook"],
        "empathy_anchor": analysis_result["analysis_result"]["empathy_anchor"], 
        "value_map": analysis_result["analysis_result"]["value_map"],
        "meta": {
            "analysis_id": analysis_result["source_info"]["source_id"],
            "timestamp": analysis_result["source_info"].get("timestamp", ""),
            "processing_time_ms": analysis_result["source_info"]["processing_time_ms"]
        }
    }
    
    logger.debug(f"=== format_for_frontend 输出数据 ===")
    logger.debug(f"formatted empathy_anchor: {formatted_data['empathy_anchor']}")
    
    return formatted_data


# === 请求/响应模型 ===

class VideoAnalysisRequest(BaseModel):
    """视频分析请求"""
    media_file_id: str = Field(..., description="媒体文件ID")
    user_id: str = Field(default="test-user-001", description="用户ID")
    force_reprocess: bool = Field(default=False, description="是否强制重新处理")


class TextAnalysisRequest(BaseModel):
    """文案分析请求"""
    content: str = Field(..., description="文案内容")
    title: Optional[str] = Field(default=None, description="标题")
    user_id: str = Field(default="test-user-001", description="用户ID")


class RetryAnalysisRequest(BaseModel):
    """重新分析请求"""
    user_id: str = Field(default="test-user-001", description="用户ID")
    force_new_card: bool = Field(default=False, description="是否强制创建新卡片")


class AnalysisResponse(BaseModel):
    """统一分析响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Dict[str, Any] = Field(..., description="分析结果数据")


# === API 端点 ===

@router.post("/video", response_model=AnalysisResponse)
async def analyze_video(
    request: VideoAnalysisRequest,
    background_tasks: BackgroundTasks
) -> AnalysisResponse:
    """
    视频分析接口
    
    流程: 媒体文件 → COS下载 → 视频转音频 → ASR识别 → AI三段式分析 → 数据库存储
    """
    try:
        logger.info(f"收到视频分析请求: media_file_id={request.media_file_id}")
        
        # 执行媒体文件分析
        result = await shared_core.analyze_media_file(
            media_file_id=request.media_file_id,
            user_id=request.user_id,
            force_reprocess=request.force_reprocess
        )
        
        return AnalysisResponse(
            success=True,
            message="视频分析完成",
            data=format_for_frontend(result)
        )
        
    except FileNotFoundError as e:
        logger.error(f"文件不存在: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except AnalysisServiceError as e:
        logger.error(f"分析服务错误: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"视频分析失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"视频分析失败: {str(e)}")


@router.post("/text", response_model=AnalysisResponse)
async def analyze_text(
    request: TextAnalysisRequest,
    background_tasks: BackgroundTasks
) -> AnalysisResponse:
    """
    文案分析接口
    
    流程: 文本输入 → AI三段式分析 → 数据库存储
    """
    try:
        logger.info(f"收到文案分析请求: content_length={len(request.content)}")
        
        # 执行文本分析
        result = await shared_core.analyze_content(
            content=request.content,
            user_id=request.user_id,
            source_type=SourceType.TEXT,
            title=request.title
        )
        
        return AnalysisResponse(
            success=True,
            message="文案分析完成",
            data=format_for_frontend(result)
        )
        
    except AnalysisServiceError as e:
        logger.error(f"分析服务错误: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"文案分析失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文案分析失败: {str(e)}")


@router.put("/retry/{media_file_id}", response_model=AnalysisResponse)
async def retry_analysis(
    media_file_id: str,
    request: RetryAnalysisRequest,
    background_tasks: BackgroundTasks
) -> AnalysisResponse:
    """
    重新分析接口
    
    流程: media_file_id → 获取已有transcript → AI三段式分析 → 更新数据库
    """
    try:
        logger.info(f"收到重新分析请求: media_file_id={media_file_id}")
        
        # 执行重新分析（不强制重新处理媒体文件）
        result = await shared_core.analyze_media_file(
            media_file_id=media_file_id,
            user_id=request.user_id,
            force_reprocess=False,  # 重新分析不重新处理媒体
            force_new_card=request.force_new_card
        )
        
        return AnalysisResponse(
            success=True,
            message="重新分析完成",
            data=format_for_frontend(result)
        )
        
    except FileNotFoundError as e:
        logger.error(f"文件不存在: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except AnalysisServiceError as e:
        logger.error(f"分析服务错误: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"重新分析失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"重新分析失败: {str(e)}")


@router.get("/status/{media_file_id}", response_model=AnalysisResponse)
async def get_analysis_status(media_file_id: str) -> AnalysisResponse:
    """
    获取分析状态
    
    Args:
        media_file_id: 媒体文件ID
        
    Returns:
        分析状态和结果
    """
    try:
        logger.info(f"查询分析状态: media_file_id={media_file_id}")
        
        # 这里可以实现查询现有分析结果的逻辑
        # 暂时返回简单状态
        return AnalysisResponse(
            success=True,
            message="状态查询成功",
            data={
                "media_file_id": media_file_id,
                "status": "completed",  # 可以是 processing, completed, failed
                "message": "分析已完成"
            }
        )
        
    except Exception as e:
        logger.error(f"查询状态失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"查询状态失败: {str(e)}")


@router.get("/health")
async def analysis_health_check():
    """分析服务健康检查"""
    try:
        # 可以添加AI服务健康检查
        return {
            "status": "healthy",
            "message": "分析服务运行正常",
            "services": {
                "shared_analysis_core": "ok",
                "ai_service": "ok"
            }
        }
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return {
            "status": "unhealthy",
            "message": f"服务异常: {str(e)}"
        }