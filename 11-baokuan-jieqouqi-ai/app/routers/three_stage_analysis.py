"""
三段式分析API路由
"""

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from app.services.ai.factory import get_ai_service
from app.services.prompts.manager import get_prompt_manager
from app.services.analysis.orchestrator import ThreeStageAnalyzer
from app.services.database import DatabaseService
from app.models.three_stage_analysis import (
    AnalysisRequest,
    AnalysisResponse,
    ThreeStageAnalysisResult,
    HealthCheckResponse,
    ModelsResponse,
    APIResponse
)
from app.core.exceptions import (
    ThreeStageAnalysisError, 
    AIServiceError, 
    PromptManagementError,
    NotFoundError,
    DatabaseError,
    InvalidParameterError
)
from app.core.config import settings
from datetime import datetime

router = APIRouter()


async def get_three_stage_analyzer():
    """获取三段式分析器实例（依赖注入）"""
    ai_service = await get_ai_service()
    prompt_manager = await get_prompt_manager()
    return ThreeStageAnalyzer(ai_service, prompt_manager)


@router.post("/three-stage")
async def analyze_three_stage(
    request: AnalysisRequest,
    analyzer: ThreeStageAnalyzer = Depends(get_three_stage_analyzer)
):
    """
    三段式分析主接口
    
    支持两种分析模式：
    1. 直接分析模式：提供 content 字段直接分析文本内容
    2. 转录文本分析模式：提供 source_id 从数据库获取 transcript 进行分析
    
    执行完整的三段式爆款公式分析，包括：
    - 信任之钩分析
    - 共情之锚分析  
    - 价值图谱分析
    """
    try:
        # 确定分析内容
        analysis_content = None
        content_source = None
        
        if request.content:
            # 直接分析模式
            analysis_content = request.content
            content_source = "直接内容"
            logger.info(f"使用直接分析模式，内容长度: {len(analysis_content)}字符")
            
        elif request.source_id:
            # 转录文本分析模式
            try:
                analysis_content = await DatabaseService.get_transcript_by_source_id(request.source_id)
                content_source = f"数据库转录文本(source_id: {request.source_id})"
                logger.info(f"使用转录文本分析模式，source_id: {request.source_id}，内容长度: {len(analysis_content)}字符")
                
            except NotFoundError as e:
                logger.warning(f"分析源不存在: {request.source_id}")
                raise NotFoundError(f"分析源不存在: {request.source_id}")
                
            except DatabaseError as e:
                logger.error(f"获取转录文本失败: {request.source_id}, 错误: {str(e)}")
                raise DatabaseError(f"获取转录文本失败: {str(e)}")
        
        # 验证分析内容
        if not analysis_content or len(analysis_content.strip()) == 0:
            raise InvalidParameterError("分析内容不能为空")
        
        if len(analysis_content) > 10000:  # 限制内容长度
            raise InvalidParameterError("分析内容过长，请控制在10000字符以内")
        
        # 创建新的请求对象用于分析器（传递实际分析内容）
        analysis_request = AnalysisRequest(
            content=analysis_content,
            content_type=request.content_type,
            analysis_options=request.analysis_options,
            prompt_version=request.prompt_version
        )
        
        # 执行分析
        result = await analyzer.analyze(analysis_request)
        
        logger.info(f"三段式分析完成，ID: {result.meta.analysis_id}，内容来源: {content_source}")
        
        # 返回统一响应格式
        return {
            "code": 0,  # 成功状态码为0
            "message": "分析完成",
            "data": result
        }
        
    except (NotFoundError, DatabaseError, InvalidParameterError) as e:
        # 这些是客户端错误，直接抛出
        logger.warning(f"客户端错误: {str(e)}")
        raise e
        
    except ThreeStageAnalysisError as e:
        logger.error(f"三段式分析业务异常: {str(e)}")
        from app.core.exceptions import APIException
        raise APIException(code=5008, message=f"三段式分析异常: {str(e)}")
        
    except AIServiceError as e:
        logger.error(f"AI服务异常: {str(e)}")
        from app.core.exceptions import APIException
        raise APIException(code=5006, message=f"AI服务异常: {str(e)}")
        
    except PromptManagementError as e:
        logger.error(f"Prompt管理异常: {str(e)}")
        from app.core.exceptions import APIException
        raise APIException(code=5007, message=f"Prompt管理异常: {str(e)}")
        
    # 新增：服务配置错误的处理
    except Exception as e:
        # 检查是否是配置相关的错误
        error_str = str(e)
        if "未配置" in error_str or "未设置" in error_str or "configuration" in error_str.lower():
            logger.warning(f"服务配置异常: {error_str}")
            from app.core.exceptions import ServiceConfigurationError
            raise ServiceConfigurationError(f"服务配置错误: {error_str}")
        else:
            logger.error(f"三段式分析未知异常: {error_str}", exc_info=True)
            from app.core.exceptions import APIException
            raise APIException(code=9001, message="系统内部错误，请稍后重试")


@router.get("/health", operation_id="three_stage_analysis_health_check")
async def health_check(
    analyzer: ThreeStageAnalyzer = Depends(get_three_stage_analyzer)
):
    """
    健康检查接口
    
    检查AI服务和Prompt管理器的状态
    """
    try:
        # 执行健康检查
        is_healthy = await analyzer.health_check()
        
        # 获取AI服务状态
        ai_service = await get_ai_service()
        ai_healthy = await ai_service.health_check()
        
        # 获取Prompt管理器状态
        prompt_manager = await get_prompt_manager()
        prompt_healthy = prompt_manager.get_template_count() > 0
        
        health_data = {
            "status": "healthy" if is_healthy else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "ai_service": "healthy" if ai_healthy else "unhealthy",
            "prompt_manager": "healthy" if prompt_healthy else "unhealthy"
        }
        
        return {
            "code": 0,
            "message": "健康检查完成",
            "data": health_data
        }
        
    except Exception as e:
        logger.error(f"健康检查异常: {str(e)}")
        health_data = {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "ai_service": "unknown",
            "prompt_manager": "unknown"
        }
        
        return {
            "code": 0,
            "message": "健康检查完成（有异常）",
            "data": health_data
        }


@router.get("/models")
async def get_models():
    """
    获取支持的AI模型列表
    """
    try:
        # 导入工厂类获取支持的提供商
        from app.services.ai.factory import AIServiceFactory
        
        providers = AIServiceFactory.get_available_providers()
        models = [f"{provider}:{settings.ai_model}" for provider in providers]
        
        models_data = {
            "models": models,
            "current_model": f"{settings.ai_provider}:{settings.ai_model}",
            "provider": settings.ai_provider
        }
        
        return {
            "code": 0,
            "message": "获取模型列表成功",
            "data": models_data
        }
        
    except Exception as e:
        logger.error(f"获取模型列表异常: {str(e)}")
        from app.core.exceptions import APIException
        raise APIException(code=9001, message="获取模型列表失败")