"""
TOM-217: 脚本管理API端点实现
提供完整的脚本生命周期管理API
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from loguru import logger

from app.core.exceptions import (
    InvalidParameterError,
    NotFoundError,
    PermissionDeniedError,
    ScriptGenerationError,
)
from app.core.security import require_auth
from app.schemas.script_management import (
    APIResponse,
    CopyResponse,
    DeleteResponse,
    ExportFormatEnum,
    ScriptCreateRequest,
    ScriptDetailResponse,
    ScriptGenerationResponse,
    ScriptListResponse,
    ScriptQueryParams,
    ScriptUpdateRequest,
)
from app.schemas.response_utils import (
    BusinessCode,
    create_success_response,
    create_error_response
)
from app.services.script.export_service import ExportService
from app.services.script.script_service import ScriptService

# 创建路由器
router = APIRouter(tags=["脚本管理"])

# 服务实例（懒加载）
script_service: ScriptService | None = None
export_service: ExportService | None = None


def get_script_service() -> ScriptService:
    """获取脚本服务实例"""
    global script_service
    if script_service is None:
        script_service = ScriptService()
    return script_service


def get_export_service() -> ExportService:
    """获取导出服务实例"""
    global export_service
    if export_service is None:
        export_service = ExportService()
    return export_service


@router.get("/scripts", response_model=ScriptListResponse)
async def list_scripts(
    request: Request,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页大小"),
    status: str = Query(None, description="状态过滤"),
    card_id: str = Query(None, description="分析卡片ID过滤"),
    keyword: str = Query(None, description="关键词搜索"),
    current_user: dict[str, Any] = Depends(require_auth),
    service: ScriptService = Depends(get_script_service)
) -> ScriptListResponse:
    """
    获取脚本列表
    
    支持分页、过滤和搜索功能
    """
    try:
        logger.info(f"用户 {current_user['id']} 获取脚本列表 - 页码: {page}, 大小: {page_size}")

        # 构建查询参数
        query_params = ScriptQueryParams(
            page=page,
            page_size=page_size,
            status=status,
            card_id=card_id,
            keyword=keyword
        )

        # 调用服务获取脚本列表
        scripts = await service.list_scripts(
            user_id=current_user["id"],
            query_params=query_params
        )

        logger.info(f"脚本列表获取成功 - 用户: {current_user['id']}, 数量: {len(scripts)}")

        return ScriptListResponse(
            code=BusinessCode.SUCCESS,
            data=scripts,
            message="脚本列表获取成功"
        )

    except InvalidParameterError as e:
        logger.warning(f"脚本列表查询参数错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except Exception as e:
        logger.error(f"获取脚本列表未知错误: {str(e)}")
        # 转换为标准异常
        from app.core.exceptions import InternalServerError
        raise InternalServerError("获取脚本列表过程中发生未知错误", str(e))


@router.post(
    "/cards/{card_id}/generate-script", response_model=ScriptGenerationResponse
)
async def generate_script(
    card_id: str,
    request: Request,
    create_request: ScriptCreateRequest,
    current_user: dict[str, Any] = Depends(require_auth),
    service: ScriptService = Depends(get_script_service)
) -> ScriptGenerationResponse:
    """
    生成脚本框架
    
    基于分析卡片和风格配置生成完整的五段式脚本框架
    """
    try:
        logger.info(f"用户 {current_user['id']} 开始生成脚本 - 卡片ID: {card_id}")

        # 调用服务生成脚本
        script_detail = await service.generate_script(
            card_id=card_id,
            user_id=current_user["id"],
            style_config=create_request.style_config
        )

        logger.success(f"脚本生成成功 - 脚本ID: {script_detail.id}")

        return ScriptGenerationResponse(
            code=BusinessCode.SUCCESS,
            data=script_detail,
            message="脚本生成成功"
        )

    except PermissionDeniedError as e:
        logger.warning(f"脚本生成权限错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except NotFoundError as e:
        logger.warning(f"脚本生成资源不存在: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except ScriptGenerationError as e:
        logger.error(f"脚本生成失败: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except InvalidParameterError as e:
        logger.warning(f"脚本生成数据验证错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except Exception as e:
        logger.error(f"脚本生成未知错误: {str(e)}")
        # 转换为标准异常
        from app.core.exceptions import InternalServerError
        raise InternalServerError("脚本生成过程中发生未知错误", str(e))


@router.get("/scripts/{script_id}", response_model=ScriptDetailResponse)
async def get_script(
    script_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(require_auth),
    service: ScriptService = Depends(get_script_service)
) -> ScriptDetailResponse:
    """
    获取脚本详情
    
    返回指定脚本的完整信息，包括所有段落和元数据
    """
    try:
        logger.info(f"用户 {current_user['id']} 获取脚本详情 - 脚本ID: {script_id}")

        # 调用服务获取脚本
        script_detail = await service.get_script(
            script_id=script_id,
            user_id=current_user["id"]
        )

        logger.info(f"脚本详情获取成功 - 脚本ID: {script_id}")

        return ScriptDetailResponse(
            code=BusinessCode.SUCCESS,
            data=script_detail,
            message="脚本详情获取成功"
        )

    except PermissionDeniedError as e:
        logger.warning(f"脚本访问权限错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except NotFoundError as e:
        logger.warning(f"脚本不存在: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except Exception as e:
        logger.error(f"获取脚本详情未知错误: {str(e)}")
        # 转换为标准异常
        from app.core.exceptions import InternalServerError
        raise InternalServerError("获取脚本详情过程中发生未知错误", str(e))


@router.put("/scripts/{script_id}", response_model=ScriptDetailResponse)
async def update_script(
    script_id: str,
    request: Request,
    update_request: ScriptUpdateRequest,
    current_user: dict[str, Any] = Depends(require_auth),
    service: ScriptService = Depends(get_script_service)
) -> ScriptDetailResponse:
    """
    更新脚本内容
    
    支持更新脚本标题、状态和段落内容，会记录编辑历史
    """
    try:
        logger.info(f"用户 {current_user['id']} 更新脚本 - 脚本ID: {script_id}")

        # 准备更新数据
        sections_data = None
        if update_request.sections:
            sections_data = [section.dict() for section in update_request.sections]

        # 调用服务更新脚本
        script_detail = await service.update_script(
            script_id=script_id,
            user_id=current_user["id"],
            title=update_request.title,
            status=update_request.status,
            sections=sections_data
        )

        logger.success(f"脚本更新成功 - 脚本ID: {script_id}")

        return ScriptDetailResponse(
            code=BusinessCode.SUCCESS,
            data=script_detail,
            message="脚本更新成功"
        )

    except PermissionDeniedError as e:
        logger.warning(f"脚本更新权限错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except NotFoundError as e:
        logger.warning(f"脚本更新资源不存在: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except InvalidParameterError as e:
        logger.warning(f"脚本更新数据验证错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except Exception as e:
        logger.error(f"脚本更新未知错误: {str(e)}")
        # 转换为标准异常
        from app.core.exceptions import InternalServerError
        raise InternalServerError("脚本更新过程中发生未知错误", str(e))


@router.delete("/scripts/{script_id}", response_model=DeleteResponse)
async def delete_script(
    script_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(require_auth),
    service: ScriptService = Depends(get_script_service)
) -> DeleteResponse:
    """
    删除脚本
    
    删除指定脚本及其所有关联数据，此操作不可逆
    """
    try:
        logger.info(f"用户 {current_user['id']} 删除脚本 - 脚本ID: {script_id}")

        # 调用服务删除脚本
        success = await service.delete_script(
            script_id=script_id,
            user_id=current_user["id"]
        )

        if success:
            logger.success(f"脚本删除成功 - 脚本ID: {script_id}")
            return DeleteResponse(
                code=BusinessCode.SUCCESS,
                data={"script_id": script_id},
                message="脚本删除成功"
            )
        else:
            # 转换为标准异常
            from app.core.exceptions import InternalServerError
            raise InternalServerError("脚本删除失败")

    except PermissionDeniedError as e:
        logger.warning(f"脚本删除权限错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except NotFoundError as e:
        logger.warning(f"脚本删除资源不存在: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except Exception as e:
        logger.error(f"脚本删除未知错误: {str(e)}")
        # 转换为标准异常
        from app.core.exceptions import InternalServerError
        raise InternalServerError("脚本删除过程中发生未知错误", str(e))


@router.get("/scripts/{script_id}/export")
async def export_script(
    script_id: str,
    request: Request,
    format: ExportFormatEnum = Query(..., description="导出格式"),
    include_metadata: bool = Query(True, description="是否包含元数据"),
    include_tips: bool = Query(True, description="是否包含创作提示"),
    current_user: dict[str, Any] = Depends(require_auth),
    script_service: ScriptService = Depends(get_script_service),
    export_service: ExportService = Depends(get_export_service)
) -> StreamingResponse:
    """
    导出脚本
    
    支持多种格式导出：TXT、Markdown、JSON
    """
    try:
        logger.info(f"用户 {current_user['id']} 导出脚本 - 脚本ID: {script_id}, 格式: {format}")

        # 先获取脚本详情
        script_detail = await script_service.get_script(
            script_id=script_id,
            user_id=current_user["id"]
        )

        # 生成导出内容
        exported_content = await export_service.export_script(
            script=script_detail,
            format=format,
            include_metadata=include_metadata,
            include_tips=include_tips
        )

        # 准备文件名和Content-Type
        filename_map = {
            ExportFormatEnum.TXT: f"script_{script_id[:8]}.txt",
            ExportFormatEnum.MARKDOWN: f"script_{script_id[:8]}.md", 
            ExportFormatEnum.JSON: f"script_{script_id[:8]}.json"
        }

        content_type_map = {
            ExportFormatEnum.TXT: "text/plain; charset=utf-8",
            ExportFormatEnum.MARKDOWN: "text/markdown; charset=utf-8",
            ExportFormatEnum.JSON: "application/json; charset=utf-8"
        }

        filename = filename_map[format]
        content_type = content_type_map[format]

        logger.success(f"脚本导出成功 - 脚本ID: {script_id}, 格式: {format}")

        # 返回流式响应
        return StreamingResponse(
            iter([exported_content.encode("utf-8")]),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\""
            }
        )

    except PermissionDeniedError as e:
        logger.warning(f"脚本导出权限错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except NotFoundError as e:
        logger.warning(f"脚本导出资源不存在: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except Exception as e:
        logger.error(f"脚本导出未知错误: {str(e)}")
        # 转换为标准异常
        from app.core.exceptions import InternalServerError
        raise InternalServerError("脚本导出过程中发生未知错误", str(e))


@router.post("/scripts/{script_id}/copy", response_model=CopyResponse)
async def copy_script(
    script_id: str,
    request: Request,
    format: ExportFormatEnum = Query(ExportFormatEnum.TXT, description="复制格式"),
    current_user: dict[str, Any] = Depends(require_auth),
    script_service: ScriptService = Depends(get_script_service),
    export_service: ExportService = Depends(get_export_service)
) -> CopyResponse:
    """
    复制脚本到剪贴板
    
    生成适合复制的脚本内容，默认为TXT格式
    """
    try:
        logger.info(f"用户 {current_user['id']} 复制脚本 - 脚本ID: {script_id}, 格式: {format}")

        # 先获取脚本详情
        script_detail = await script_service.get_script(
            script_id=script_id,
            user_id=current_user["id"]
        )

        # 生成复制内容（不包含元数据，简化格式）
        copied_content = await export_service.export_script(
            script=script_detail,
            format=format,
            include_metadata=False,
            include_tips=True
        )

        logger.success(f"脚本复制成功 - 脚本ID: {script_id}, 格式: {format}")

        return CopyResponse(
            code=BusinessCode.SUCCESS,
            data={
                "content": copied_content,
                "format": format.value
            },
            message="脚本内容已准备好复制"
        )

    except PermissionDeniedError as e:
        logger.warning(f"脚本复制权限错误: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except NotFoundError as e:
        logger.warning(f"脚本复制资源不存在: {str(e)}")
        # 直接抛出自定义异常，让全局异常处理器处理
        raise e
    except Exception as e:
        logger.error(f"脚本复制未知错误: {str(e)}")
        # 转换为标准异常
        from app.core.exceptions import InternalServerError
        raise InternalServerError("脚本复制过程中发生未知错误", str(e))


@router.get("/scripts/{script_id}/health", response_model=APIResponse)
async def script_health_check(
    script_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(require_auth),
    service: ScriptService = Depends(get_script_service)
) -> APIResponse:
    """
    脚本健康检查
    
    检查脚本是否存在且用户有权限访问
    """
    try:
        # 尝试获取脚本（这会验证权限和存在性）
        script_detail = await service.get_script(
            script_id=script_id,
            user_id=current_user["id"]
        )

        return APIResponse(
            code=BusinessCode.SUCCESS,
            data={
                "script_id": script_id,
                "accessible": True,
                "title": script_detail.title,
                "status": script_detail.status
            },
            message="脚本访问正常"
        )

    except (PermissionDeniedError, NotFoundError) as e:
        return APIResponse(
            code=BusinessCode.FORBIDDEN,
            data={
                "script_id": script_id,
                "accessible": False
            },
            message=str(e)
        )
    except Exception as e:
        logger.error(f"脚本健康检查错误: {str(e)}")
        return APIResponse(
            code=BusinessCode.UNKNOWN_ERROR,
            data={
                "script_id": script_id,
                "accessible": False
            },
            message="健康检查失败"
        )

