"""
脚本生成相关数据模型定义
"""

from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid


class ScriptSection(BaseModel):
    """脚本段落模型"""
    title: str = Field(..., description="段落标题")
    content: str = Field(..., description="段落内容")
    tips: str = Field(..., description="创作要点和技巧说明")
    duration: str = Field(..., description="建议时长")
    keywords: List[str] = Field(default_factory=list, description="关键词列表")
    
    @validator('content')
    def content_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('段落内容不能为空')
        return v.strip()
    
    @validator('tips')
    def tips_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('创作要点不能为空')
        return v.strip()


class ScriptMeta(BaseModel):
    """脚本元数据 - 复用TOM-220的元数据模式"""
    generation_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="生成ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="生成时间")
    processing_time_ms: int = Field(..., description="处理时间(毫秒)")
    ai_model: str = Field(..., description="使用的AI模型")
    prompt_version: str = Field(default="latest", description="Prompt版本")
    status: Literal["generating", "completed", "failed"] = Field(default="generating", description="生成状态")
    
    @validator('processing_time_ms')
    def processing_time_positive(cls, v):
        if v < 0:
            raise ValueError('处理时间不能为负数')
        return v


class ScriptFramework(BaseModel):
    """脚本框架结果模型"""
    title: str = Field(..., description="脚本标题")
    hook: ScriptSection = Field(..., description="开场钩子(0-15秒)")
    problem: ScriptSection = Field(..., description="痛点共鸣(15-45秒)")
    solution: ScriptSection = Field(..., description="解决方案(45秒-3分钟)")
    proof: ScriptSection = Field(..., description="价值证明(3-4分钟)")
    cta: ScriptSection = Field(..., description="行动召唤(4-5分钟)")
    meta: ScriptMeta = Field(..., description="生成元数据")
    
    @validator('title')
    def title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('脚本标题不能为空')
        return v.strip()


class ScriptStyleConfig(BaseModel):
    """脚本风格配置"""
    tone: Literal["professional", "casual", "creative"] = Field(default="professional", description="语调风格")
    target_audience: Optional[str] = Field(None, description="目标受众")
    brand_voice: Optional[str] = Field(None, description="品牌语调")
    length_preference: Literal["short", "medium", "long"] = Field(default="medium", description="长度偏好")
    
    class Config:
        schema_extra = {
            "example": {
                "tone": "professional",
                "target_audience": "20-35岁的数码产品消费者",
                "brand_voice": "专业、可信、实用",
                "length_preference": "medium"
            }
        }


class FieldMappingConfig(BaseModel):
    """字段映射配置"""
    hook_sources: List[str] = Field(
        default=["hookCopy", "hookTypes", "hookNotes"],
        description="钩子段落数据来源字段"
    )
    problem_sources: List[str] = Field(
        default=["coreIdea", "argumentCase"],
        description="痛点段落数据来源字段"
    )
    solution_sources: List[str] = Field(
        default=["valueDelivery", "reusableElements"],
        description="解决方案段落数据来源字段"
    )
    proof_sources: List[str] = Field(
        default=["argumentCase", "valueDelivery"],
        description="价值证明段落数据来源字段"
    )
    cta_sources: List[str] = Field(
        default=["hookTypes", "valueDelivery"],
        description="行动召唤段落数据来源字段"
    )


class AnalysisCardSchema(BaseModel):
    """AnalysisCard数据模型 - 用于脚本生成"""
    id: str = Field(..., description="分析卡片ID")
    version_title: str = Field(..., description="版本标题")
    
    # 核心分析字段
    hook_copy: Optional[str] = Field(None, description="钩子文案")
    hook_types: List[str] = Field(default_factory=list, description="钩子类型")
    hook_notes: Optional[str] = Field(None, description="钩子备注")
    
    core_idea: Optional[str] = Field(None, description="核心理念")
    argument_case: Optional[str] = Field(None, description="论证案例")
    
    value_delivery: List[str] = Field(default_factory=list, description="价值交付")
    reusable_elements: Optional[str] = Field(None, description="可复用元素")
    value_notes: Optional[str] = Field(None, description="价值备注")
    
    # 来自TOM-220三段式分析的扩展字段（如果可用）
    credibility_testimony: Optional[str] = Field(None, description="可信度证言")
    authority_signals: List[str] = Field(default_factory=list, description="权威信号")
    pain_point: Optional[str] = Field(None, description="痛点描述")
    target_audience: Optional[str] = Field(None, description="目标受众")
    emotional_triggers: List[str] = Field(default_factory=list, description="情感触发点")
    competitive_advantage: Optional[str] = Field(None, description="竞争优势")
    
    @validator('version_title')
    def version_title_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('版本标题不能为空')
        return v.strip()


class ScriptGenerationRequest(BaseModel):
    """脚本生成请求"""
    analysis_card: AnalysisCardSchema = Field(..., description="分析卡片数据")
    style_config: Optional[ScriptStyleConfig] = Field(None, description="脚本风格配置")
    field_mapping_config: Optional[FieldMappingConfig] = Field(None, description="字段映射配置")
    
    class Config:
        schema_extra = {
            "example": {
                "analysis_card": {
                    "id": "card_123",
                    "version_title": "iPhone购买避坑指南",
                    "hook_copy": "从582款蓝牙耳机中评测选出的性价比之王！",
                    "hook_types": ["数据震撼", "权威背书"],
                    "core_idea": "帮助用户选择性价比最高的蓝牙耳机",
                    "value_delivery": ["提供选购标准", "避免踩坑", "节省开支"]
                },
                "style_config": {
                    "tone": "professional",
                    "target_audience": "想要购买蓝牙耳机的普通消费者"
                }
            }
        }


class SectionGenerationResult(BaseModel):
    """单个段落生成结果 - 内部使用，不直接返回给API"""
    section_type: str = Field(..., description="段落类型")
    code: int = Field(..., description="生成状态码，0表示成功")
    content: Optional[ScriptSection] = Field(None, description="生成的段落内容")
    error_message: Optional[str] = Field(None, description="错误信息")
    processing_time_ms: int = Field(..., description="处理时间(毫秒)")
    
    @validator('section_type')
    def valid_section_type(cls, v):
        valid_types = ["hook", "problem", "solution", "proof", "cta"]
        if v not in valid_types:
            raise ValueError(f'段落类型必须是以下之一: {valid_types}')
        return v