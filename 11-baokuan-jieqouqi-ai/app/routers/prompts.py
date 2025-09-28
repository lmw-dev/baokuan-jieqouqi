"""
Prompt管理API路由
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from loguru import logger

from app.services.prompts.manager import get_prompt_manager, PromptManager
from app.models.three_stage_analysis import (
    PromptTemplateInfo,
    PromptReloadRequest,
    PromptReloadResponse,
    APIResponse
)
from app.core.exceptions import PromptManagementError

router = APIRouter()


@router.get("/templates")
async def get_prompt_templates(
    prompt_manager: PromptManager = Depends(get_prompt_manager)
):
    """
    获取所有Prompt模板列表
    
    返回系统中可用的所有Prompt模板信息
    """
    try:
        templates = prompt_manager.list_templates()
        logger.info(f"返回 {len(templates)} 个Prompt模板")
        return {
            "code": 0,
            "message": "获取模板列表成功",
            "data": templates
        }
        
    except Exception as e:
        logger.error(f"获取Prompt模板列表异常: {str(e)}")
        from app.core.exceptions import APIException
        raise APIException(code=5007, message=f"获取Prompt模板失败: {str(e)}")


@router.get("/templates/{template_name}")
async def get_prompt_template(
    template_name: str,
    prompt_manager: PromptManager = Depends(get_prompt_manager)
):
    """
    获取指定Prompt模板信息
    
    Args:
        template_name: 模板名称
    """
    try:
        template_info = prompt_manager.get_template_info(template_name)
        
        if template_info is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": 4002,
                    "message": f"Prompt模板不存在: {template_name}",
                    "data": None
                }
            )
        
        return template_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取Prompt模板异常: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": 5007,
                "message": f"获取Prompt模板失败: {str(e)}",
                "data": None
            }
        )


@router.post("/reload", response_model=PromptReloadResponse)
async def reload_prompt_templates(
    request: PromptReloadRequest,
    prompt_manager: PromptManager = Depends(get_prompt_manager)
):
    """
    重新加载Prompt模板
    
    支持重新加载指定的模板或所有模板
    """
    try:
        logger.info(f"收到Prompt重新加载请求: {request.template_names}")
        
        # 执行重新加载
        await prompt_manager.reload_templates(request.template_names)
        
        # 获取重新加载后的模板数量
        template_count = prompt_manager.get_template_count()
        
        if request.template_names:
            message = f"成功重新加载 {len(request.template_names)} 个模板"
            data = {
                "reloaded_templates": request.template_names,
                "total_templates": template_count
            }
        else:
            message = f"成功重新加载所有模板，共 {template_count} 个"
            data = {
                "reloaded_templates": "all",
                "total_templates": template_count
            }
        
        logger.info(message)
        
        return PromptReloadResponse(
            code=200,
            message=message,
            data=data
        )
        
    except PromptManagementError as e:
        logger.error(f"Prompt重新加载业务异常: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": 5007,
                "message": str(e),
                "data": None
            }
        )
    except Exception as e:
        logger.error(f"Prompt重新加载未知异常: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": 9001,
                "message": "系统内部错误，请稍后重试",
                "data": None
            }
        )


@router.get("/templates/{template_name}/content")
async def get_prompt_template_content(
    template_name: str,
    version: str = "latest",
    prompt_manager: PromptManager = Depends(get_prompt_manager)
):
    """
    获取Prompt模板的原始内容
    
    Args:
        template_name: 模板名称
        version: 模板版本（默认为latest）
        
    注意：此接口主要用于调试和开发，生产环境中应谨慎使用
    """
    try:
        if not prompt_manager.has_template(template_name):
            raise HTTPException(
                status_code=404,
                detail={
                    "code": 4002,
                    "message": f"Prompt模板不存在: {template_name}",
                    "data": None
                }
            )
        
        content = prompt_manager.get_template(template_name, version)
        
        return {
            "code": 200,
            "message": "获取成功",
            "data": {
                "template_name": template_name,
                "version": version,
                "content": content
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取Prompt模板内容异常: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": 5007,
                "message": f"获取Prompt模板内容失败: {str(e)}",
                "data": None
            }
        )


@router.get("/status")
async def get_prompt_manager_status(
    prompt_manager: PromptManager = Depends(get_prompt_manager)
):
    """
    获取Prompt管理器状态
    """
    try:
        template_count = prompt_manager.get_template_count()
        templates = prompt_manager.list_templates()
        
        return {
            "code": 200,
            "message": "获取状态成功",
            "data": {
                "status": "healthy" if template_count > 0 else "warning",
                "template_count": template_count,
                "templates": [t.name for t in templates],
                "initialized": prompt_manager._initialized
            }
        }
        
    except Exception as e:
        logger.error(f"获取Prompt管理器状态异常: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "code": 9001,
                "message": "获取状态失败",
                "data": None
            }
        )