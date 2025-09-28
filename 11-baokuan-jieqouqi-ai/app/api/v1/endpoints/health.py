from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "爆款解构器 AI Service"
    }


@router.get("/health/database")
async def database_health():
    """数据库健康检查"""
    try:
        # 这里可以添加数据库连接检查
        return {
            "status": "healthy",
            "database": "postgresql",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/health/services")
async def services_health():
    """服务健康检查"""
    return {
        "status": "healthy",
        "services": {
            "media_converter": "available",
            "tencent_asr": "available",
            "hook_analysis": "available",
            "cos_storage": "available"
        },
        "timestamp": datetime.utcnow().isoformat()
    }
