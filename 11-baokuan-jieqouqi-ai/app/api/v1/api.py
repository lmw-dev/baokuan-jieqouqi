from fastapi import APIRouter

from app.api.v1.endpoints import analyze, health, web_analyze, unified_analysis
from app.routers import analysis, prompts, script_management, dev_auth

api_router = APIRouter()

# 现有路由
api_router.include_router(analyze.router, tags=["analysis"])
api_router.include_router(web_analyze.router, tags=["web-integration"])
api_router.include_router(health.router, tags=["health"])

# 新增分析模块路由（统一入口，包含三段式分析）
api_router.include_router(analysis.router, tags=["ai-analysis"])

# 新增Prompt管理路由
api_router.include_router(prompts.router, prefix="/prompts", tags=["prompt-management"])

# 新增统一分析接口路由（TOM-219重构方案）
api_router.include_router(unified_analysis.router, prefix="/analysis", tags=["unified-analysis"])

# 新增脚本管理API路由（TOM-217）
api_router.include_router(script_management.router, tags=["script-management"])

# 开发测试认证路由（仅用于API文档测试）
api_router.include_router(dev_auth.router, tags=["dev-auth"])