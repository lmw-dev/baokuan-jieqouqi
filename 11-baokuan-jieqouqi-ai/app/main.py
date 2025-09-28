from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from starlette import status
from loguru import logger

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import APIException
from app.db.session import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化
    logger.info("启动爆款解构器 AI 服务...")
    
    try:
        # 暂时跳过数据库初始化，专注于AI分析功能
        logger.info("服务初始化完成")
        
        yield
        
    finally:
        # 关闭时清理
        logger.info("关闭爆款解构器 AI 服务...")
        logger.info("服务已关闭")


# 创建FastAPI应用实例
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="爆款解构器 AI 后端服务 - 提供文件上传、视频转音频、ASR语音识别、信任之钩分析等功能",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 业务异常处理器
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    """业务异常处理器 - 按照120-spec-error-handling.mdc规范"""
    # 记录业务异常日志（包含技术详情）
    if exc.details:
        logger.warning(f"业务异常: {exc.message} | 详情: {exc.details}")
    else:
        logger.warning(f"业务异常: {exc.message}")
    
    # 根据错误码确定HTTP状态码
    if 4000 <= exc.code <= 4999:
        http_status = status.HTTP_400_BAD_REQUEST
    elif 5000 <= exc.code <= 5999:
        http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
    else:
        http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    return JSONResponse(
        status_code=http_status,
        content={
            "code": exc.code,
            "message": exc.message,
            "data": None
        }
    )

# FastAPI参数验证错误处理器
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """参数验证错误处理器 - 将422转换为统一格式的400错误"""
    logger.warning(f"参数验证错误: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "code": 4001,
            "message": "请求参数格式错误",
            "data": None
        }
    )

# 全局异常处理器
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器 - 捕获未处理的系统异常"""
    logger.error(f"未处理的系统异常: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": 9001,
            "message": "系统内部错误，请稍后重试",
            "data": None
        }
    )

# 注册API路由
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    """根路径信息"""
    return {
        "message": f"欢迎使用{settings.app_name}",
        "version": settings.app_version,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
        "status": "running"
    }


@app.get("/ping")
async def ping():
    """健康检查ping端点"""
    return {"status": "ok", "message": "pong"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )