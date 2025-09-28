"""
分析模块API路由 - 统一入口
"""

from fastapi import APIRouter
from app.routers.three_stage_analysis import router as three_stage_router
from app.routers.prompts import router as prompts_router

# 创建分析模块的主路由
router = APIRouter(prefix="/analysis", tags=["analysis"])

# 注册子路由
router.include_router(three_stage_router, prefix="", tags=["three-stage-analysis"])

# 将来可以在这里添加其他分析功能的路由
# router.include_router(sentiment_router, prefix="/sentiment", tags=["sentiment-analysis"])
# router.include_router(keyword_router, prefix="/keywords", tags=["keyword-analysis"])

@router.get("/")
async def analysis_overview():
    """
    分析模块概览
    """
    return {
        "code": 0,
        "message": "爆款解构器分析模块",
        "data": {
            "available_analyses": [
                {
                    "name": "三段式爆款公式分析",
                    "endpoint": "/api/v1/analysis/three-stage",
                    "description": "基于信任之钩、共情之锚、价值图谱的三段式分析"
                }
            ],
            "management": [
                {
                    "name": "Prompt模板管理",
                    "endpoint": "/api/v1/prompts",
                    "description": "管理和重新加载AI分析的Prompt模板"
                }
            ]
        }
    }