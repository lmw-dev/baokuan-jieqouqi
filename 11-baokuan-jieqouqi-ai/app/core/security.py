"""
TOM-217: 用户认证与授权模块
实现基于可信代理的认证系统
"""

import json
import os
from typing import Any

from fastapi import HTTPException, Request, status
from loguru import logger

# 可信代理密钥
TRUSTED_PROXY_SECRET = os.getenv("TRUSTED_PROXY_SECRET", "dev-proxy-secret-2024")


async def get_current_user_from_proxy(request: Request) -> dict[str, Any] | None:
    """
    从可信代理（Next.js）获取用户信息
    
    Args:
        request: FastAPI请求对象
        
    Returns:
        用户信息字典，认证失败时返回None
    """
    try:
        # 验证请求来自可信代理
        proxy_secret = request.headers.get("X-Proxy-Secret")
        if proxy_secret != TRUSTED_PROXY_SECRET:
            logger.debug(f"代理认证失败: 无效的代理密钥")
            return None
        
        # 从代理头部获取用户信息
        user_id = request.headers.get("X-User-ID")
        user_info_header = request.headers.get("X-User-Info")
        
        if not user_id or not user_info_header:
            logger.debug("代理认证失败: 缺少用户信息头部")
            return None
        
        # 解析用户信息
        user_info = json.loads(user_info_header)
        
        # 基础验证
        if not user_info.get("id"):
            logger.warning("代理认证失败: 用户信息缺少ID字段")
            return None

        user_data = {
            "id": user_info["id"],
            "name": user_info.get("name"),
            "email": user_info.get("email"),
            "image": user_info.get("image")
        }

        logger.debug(f"代理认证成功: {user_data['id']}")
        return user_data

    except json.JSONDecodeError as e:
        logger.warning(f"代理认证失败: 用户信息JSON解析错误: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"代理认证过程未知错误: {str(e)}")
        return None


async def get_current_user(request: Request) -> dict[str, Any] | None:
    """
    从请求中获取当前用户信息（支持两种认证方式）
    
    Args:
        request: FastAPI请求对象
        
    Returns:
        用户信息字典，认证失败时返回None
    """
    # 优先尝试代理认证
    proxy_user = await get_current_user_from_proxy(request)
    if proxy_user:
        return proxy_user
    
    # 回退到原有的Cookie认证（保持兼容性）
    try:
        # 从Cookie中获取token和用户信息
        auth_token = request.cookies.get("auth_token")
        user_info_cookie = request.cookies.get("user_info")

        if not auth_token or not user_info_cookie:
            logger.debug("Cookie认证失败: 缺少必需的Cookie")
            return None

        # 解析用户信息
        user_info = json.loads(user_info_cookie)

        # 基础验证
        if not user_info.get("id"):
            logger.warning("Cookie认证失败: 用户信息缺少ID字段")
            return None

        user_data = {
            "id": user_info["id"],
            "name": user_info.get("name"),
            "email": user_info.get("email"),
            "image": user_info.get("image")
        }

        logger.debug(f"Cookie认证成功: {user_data['id']}")
        return user_data

    except json.JSONDecodeError as e:
        logger.warning(f"Cookie认证失败: 用户信息JSON解析错误: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"认证过程未知错误: {str(e)}")
        return None


async def require_auth(request: Request) -> dict[str, Any]:
    """
    强制要求用户认证的依赖函数
    
    Args:
        request: FastAPI请求对象
        
    Returns:
        用户信息字典
        
    Raises:
        HTTPException: 认证失败时抛出401错误
    """
    user = await get_current_user(request)
    if not user:
        logger.warning("API访问拒绝: 用户未认证")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证失败，请先登录",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


async def get_current_user_optional(request: Request) -> dict[str, Any] | None:
    """
    可选的用户认证依赖函数
    
    Args:
        request: FastAPI请求对象
        
    Returns:
        用户信息字典，认证失败时返回None
    """
    return await get_current_user(request)


def verify_user_access(user_id: str, resource_owner_id: str) -> bool:
    """
    验证用户是否有权限访问指定资源
    
    Args:
        user_id: 当前用户ID
        resource_owner_id: 资源所有者ID
        
    Returns:
        是否有访问权限
    """
    return user_id == resource_owner_id


def require_user_access(
    user_id: str, resource_owner_id: str, resource_name: str = "资源"
):
    """
    强制要求用户有权限访问指定资源，无权限时抛出异常
    
    Args:
        user_id: 当前用户ID
        resource_owner_id: 资源所有者ID
        resource_name: 资源名称（用于错误信息）
        
    Raises:
        HTTPException: 无权限时抛出403错误
    """
    if not verify_user_access(user_id, resource_owner_id):
        logger.warning(
            f"权限验证失败: 用户{user_id}试图访问用户{resource_owner_id}的{resource_name}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"无权限访问该{resource_name}"
        )
