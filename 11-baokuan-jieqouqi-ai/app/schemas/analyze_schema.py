from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum
import uuid


class AnalysisStatus(str, Enum):
    """分析状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class HookType(str, Enum):
    """信任之钩类型枚举"""
    AUTHORITY = "建立权威"
    CONFLICT = "制造冲突"
    SCARCITY = "展示稀缺"
    CURIOSITY = "引发好奇"


class AnalysisOptions(BaseModel):
    """分析选项"""
    enable_asr: bool = Field(default=True, description="是否启用ASR")
    enable_hook_detection: bool = Field(default=True, description="是否启用信任之钩检测")
    language: str = Field(default="zh-CN", description="语言设置")
    custom_keywords: Optional[List[str]] = Field(default=None, description="自定义关键词")
    
    @validator('language')
    def validate_language(cls, v):
        allowed_languages = ['zh-CN', 'en-US', 'ja-JP']
        if v not in allowed_languages:
            raise ValueError(f'语言设置必须是 {allowed_languages} 之一')
        return v


class AnalyzeRequest(BaseModel):
    """分析请求"""
    content_type: Literal["file", "text"] = Field(..., description="内容类型")
    text_content: Optional[str] = Field(default=None, description="文本内容")
    analysis_options: Optional[AnalysisOptions] = Field(default=None, description="分析选项")
    
    @validator('text_content')
    def validate_text_content(cls, v, values):
        if values.get('content_type') == 'text' and not v:
            raise ValueError('当内容类型为text时，text_content不能为空')
        return v


class TrustHookResult(BaseModel):
    """信任之钩结果"""
    hook_type: HookType = Field(..., description="钩子类型")
    content: str = Field(..., description="钩子内容")
    confidence: float = Field(..., ge=0.0, le=1.0, description="置信度")
    matched_keywords: List[str] = Field(default_factory=list, description="匹配的关键词")
    position_start: Optional[float] = Field(default=None, description="开始位置")
    position_end: Optional[float] = Field(default=None, description="结束位置")


class TranscriptionResult(BaseModel):
    """转录结果"""
    text: str = Field(..., description="转录文本")
    confidence: float = Field(..., ge=0.0, le=1.0, description="置信度")
    duration: Optional[float] = Field(default=None, description="音频时长")
    language: str = Field(default="zh-CN", description="识别语言")


class AnalysisResult(BaseModel):
    """分析结果"""
    task_id: str = Field(..., description="任务ID")
    status: AnalysisStatus = Field(..., description="分析状态")
    progress: float = Field(default=0.0, ge=0.0, le=1.0, description="处理进度")
    
    # 分析结果
    title: Optional[str] = Field(default=None, description="分析标题")
    summary: Optional[str] = Field(default=None, description="内容摘要")
    transcribed_text: Optional[str] = Field(default=None, description="转录文本")
    trust_hooks: List[TrustHookResult] = Field(default_factory=list, description="信任之钩列表")
    
    # 元数据
    file_url: Optional[str] = Field(default=None, description="文件URL")
    file_name: Optional[str] = Field(default=None, description="文件名")
    file_size: Optional[int] = Field(default=None, description="文件大小")
    duration: Optional[float] = Field(default=None, description="媒体时长")
    processing_time: Optional[float] = Field(default=None, description="处理耗时")
    
    # 错误信息
    error_message: Optional[str] = Field(default=None, description="错误信息")
    
    # 时间戳
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")


class AnalysisResponse(BaseModel):
    """分析响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[AnalysisResult] = Field(default=None, description="分析结果")
    error_code: Optional[str] = Field(default=None, description="错误代码")


class FileValidationResult(BaseModel):
    """文件验证结果"""
    is_valid: bool = Field(..., description="是否有效")
    file_type: str = Field(..., description="文件类型")
    file_size: int = Field(..., description="文件大小")
    mime_type: str = Field(..., description="MIME类型")
    error_message: Optional[str] = Field(default=None, description="错误信息")


class MediaInfo(BaseModel):
    """媒体信息"""
    duration: Optional[float] = Field(default=None, description="时长")
    format_name: Optional[str] = Field(default=None, description="格式名称")
    bit_rate: Optional[int] = Field(default=None, description="比特率")
    sample_rate: Optional[int] = Field(default=None, description="采样率")
    channels: Optional[int] = Field(default=None, description="声道数")
    codec: Optional[str] = Field(default=None, description="编解码器")


class ProcessingStage(BaseModel):
    """处理阶段"""
    stage_name: str = Field(..., description="阶段名称")
    status: str = Field(..., description="阶段状态")
    progress: float = Field(..., ge=0.0, le=1.0, description="阶段进度")
    start_time: Optional[datetime] = Field(default=None, description="开始时间")
    end_time: Optional[datetime] = Field(default=None, description="结束时间")
    error_message: Optional[str] = Field(default=None, description="错误信息")


class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    task_id: str = Field(..., description="任务ID")
    status: AnalysisStatus = Field(..., description="任务状态")
    progress: float = Field(..., ge=0.0, le=1.0, description="总进度")
    stages: List[ProcessingStage] = Field(default_factory=list, description="处理阶段")
    estimated_remaining_time: Optional[float] = Field(default=None, description="预计剩余时间")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")