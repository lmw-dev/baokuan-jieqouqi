"""
三段式分析相关的数据模型
"""

from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class AnalysisStatus(str, Enum):
    """分析状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ContentType(str, Enum):
    """内容类型"""
    TEXT = "text"
    VIDEO_TRANSCRIPT = "video_transcript"


# ============ 分析结果模型 ============

class TrustHookResult(BaseModel):
    """信任之钩分析结果"""
    hook_copy: str = Field(..., description="开场钩子文案")
    credibility_testimony: str = Field(..., description="可信度证言")
    authority_signals: List[str] = Field(..., description="权威信号列表")


class EmpathyAnchorResult(BaseModel):
    """共情之锚分析结果"""
    pain_point: str = Field(..., description="核心痛点")
    target_audience: str = Field(..., description="目标受众")
    emotional_triggers: List[str] = Field(..., description="情感触发器列表")


class ValueMapResult(BaseModel):
    """价值图谱分析结果"""
    core_value: str = Field(..., description="核心价值")
    value_delivery: List[str] = Field(..., description="价值交付物列表")
    competitive_advantage: str = Field(..., description="竞争优势")


class AnalysisMeta(BaseModel):
    """分析元数据"""
    analysis_id: str = Field(..., description="分析ID")
    timestamp: datetime = Field(..., description="分析时间戳")
    processing_time_ms: int = Field(..., description="处理时间(毫秒)")
    ai_model: str = Field(..., description="使用的AI模型")
    prompt_version: str = Field(..., description="Prompt版本")
    status: AnalysisStatus = Field(..., description="分析状态")
    
    class Config:
        """Pydantic配置 - 确保JSON输出使用snake_case"""
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ThreeStageAnalysisResult(BaseModel):
    """三段式分析完整结果"""
    trust_hook: TrustHookResult = Field(..., description="信任之钩分析")
    empathy_anchor: EmpathyAnchorResult = Field(..., description="共情之锚分析")
    value_map: ValueMapResult = Field(..., description="价值图谱分析")
    meta: AnalysisMeta = Field(..., description="分析元数据")


# ============ 请求模型 ============

class AnalysisRequest(BaseModel):
    """分析请求"""
    content: Optional[str] = Field(default=None, description="待分析内容（直接分析模式）")
    source_id: Optional[str] = Field(default=None, description="分析源ID（从数据库获取transcript分析）")
    content_type: ContentType = Field(default=ContentType.TEXT, description="内容类型")
    analysis_options: Optional[Dict[str, Any]] = Field(default=None, description="分析选项")
    prompt_version: Optional[str] = Field(default=None, description="指定Prompt版本")
    
    @model_validator(mode='before')
    @classmethod
    def validate_content_or_source_id(cls, values):
        """验证请求参数：content和source_id必须提供其中一个"""
        content = values.get('content')
        source_id = values.get('source_id')
        
        if not content and not source_id:
            raise ValueError('content和source_id必须提供其中一个')
        
        if content and source_id:
            raise ValueError('content和source_id不能同时提供，请选择其中一种分析模式')
            
        if content and len(content.strip()) == 0:
            raise ValueError('content不能为空')
            
        return values


class AnalysisResponse(BaseModel):
    """分析响应"""
    code: int = Field(..., description="响应码")
    message: str = Field(..., description="响应消息")
    data: Optional[ThreeStageAnalysisResult] = Field(default=None, description="分析结果")


# ============ Prompt模板模型 ============

class PromptTemplate(BaseModel):
    """Prompt模板"""
    name: str = Field(..., description="模板名称")
    version: str = Field(..., description="模板版本")
    content: str = Field(..., description="模板内容")
    description: Optional[str] = Field(default=None, description="模板描述")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


class PromptTemplateInfo(BaseModel):
    """Prompt模板信息"""
    name: str = Field(..., description="模板名称")
    version: str = Field(..., description="模板版本")
    description: Optional[str] = Field(default=None, description="模板描述")
    updated_at: datetime = Field(..., description="更新时间")


class PromptReloadRequest(BaseModel):
    """Prompt重新加载请求"""
    template_names: Optional[List[str]] = Field(default=None, description="指定重新加载的模板")


class PromptReloadResponse(BaseModel):
    """Prompt重新加载响应"""
    code: int = Field(..., description="响应码")
    message: str = Field(..., description="响应消息")
    data: Optional[Dict[str, Any]] = Field(default=None, description="重新加载结果")


# ============ API响应模型 ============

class APIResponse(BaseModel):
    """通用API响应"""
    code: int = Field(..., description="响应码")
    message: str = Field(..., description="响应消息")
    data: Optional[Any] = Field(default=None, description="响应数据")


class HealthCheckResponse(BaseModel):
    """健康检查响应"""
    status: str = Field(..., description="服务状态")
    timestamp: datetime = Field(..., description="检查时间")
    ai_service: str = Field(..., description="AI服务状态")
    prompt_manager: str = Field(..., description="Prompt管理器状态")


class ModelsResponse(BaseModel):
    """支持的模型响应"""
    models: List[str] = Field(..., description="支持的模型列表")
    current_model: str = Field(..., description="当前使用的模型")
    provider: str = Field(..., description="AI服务提供商")