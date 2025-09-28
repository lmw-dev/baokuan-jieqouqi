from typing import Dict, Any
from fastapi import APIRouter, Response, HTTPException, status
from pydantic import BaseModel
from loguru import logger
from app.schemas.response_utils import create_success_response, BusinessCode

router = APIRouter(prefix="/dev-auth", tags=["开发测试认证"])


class TestLoginRequest(BaseModel):
    """测试登录请求"""
    user_id: str = "test-user-001"
    name: str = "测试用户"
    email: str = "test@example.com"


class LoginData(BaseModel):
    """登录数据"""
    user_info: Dict[str, Any]


@router.post("/login")
async def test_login(
    response: Response,
    login_request: TestLoginRequest = TestLoginRequest()
):
    """
    开发测试用登录端点
    
    此端点仅用于开发和测试环境，用于在FastAPI docs中测试需要认证的API。
    生产环境中应禁用此端点。
    """
    try:
        logger.info(f"开发测试登录: {login_request.user_id}")
        
        # 创建测试用户信息
        user_info = {
            "id": login_request.user_id,
            "name": login_request.name,
            "email": login_request.email,
            "image": None
        }
        
        # 设置认证Cookie
        response.set_cookie(
            key="auth_token",
            value="dev-test-token",
            secure=False,  # 开发环境不使用HTTPS
            httponly=True,
            samesite="lax",
            max_age=24 * 60 * 60  # 24小时
        )
        
        # 为避免编码问题，使用简化的用户信息
        import json
        user_info_str = json.dumps({
            "id": user_info["id"],
            "name": user_info["name"],
            "email": user_info["email"],
            "image": user_info["image"]
        }, ensure_ascii=True)
        
        response.set_cookie(
            key="user_info",
            value=user_info_str,
            secure=False,
            httponly=False,  # 前端需要读取
            samesite="lax",
            max_age=24 * 60 * 60
        )
        
        logger.success(f"开发测试登录成功: {login_request.user_id}")
        
        return create_success_response(
            data={"user_info": user_info},
            message="开发测试登录成功，已设置认证Cookie"
        )
        
    except Exception as e:
        logger.error(f"开发测试登录失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录失败"
        )


@router.post("/logout")
async def test_logout(response: Response):
    """
    开发测试用登出端点
    
    清除认证Cookie
    """
    try:
        logger.info("开发测试登出")
        
        # 清除认证Cookie
        response.delete_cookie(key="auth_token")
        response.delete_cookie(key="user_info")
        
        return create_success_response(
            data=None,
            message="登出成功，已清除认证Cookie"
        )
        
    except Exception as e:
        logger.error(f"开发测试登出失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登出失败"
        )


@router.get("/status")
async def auth_status(response: Response):
    """
    检查当前认证状态
    
    用于验证Cookie是否正确设置
    """
    return {
        "message": "请检查浏览器Cookie中是否有auth_token和user_info",
        "instructions": [
            "1. 调用 POST /dev-auth/login 设置测试Cookie",
            "2. 在浏览器开发者工具中检查Cookie",
            "3. 然后就可以测试脚本管理API了",
            "4. 使用 POST /dev-auth/logout 清除Cookie"
        ]
    }