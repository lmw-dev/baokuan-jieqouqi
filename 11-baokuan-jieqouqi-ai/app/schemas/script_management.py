"""
TOM-217: 脚本管理Pydantic模型定义 - 用于API验证和序列化
创建时间: 2025-07-12
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

from app.models.script_generation import ScriptStyleConfig


class ScriptStatusEnum(str, Enum):
    """脚本状态枚举"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SectionTypeEnum(str, Enum):
    """段落类型枚举"""
    HOOK = "hook"
    PROBLEM = "problem"
    SOLUTION = "solution"
    PROOF = "proof"
    CTA = "cta"


class ImportanceLevelEnum(str, Enum):
    """重要性级别枚举"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ExportFormatEnum(str, Enum):
    """导出格式枚举"""
    TXT = "txt"
    MARKDOWN = "md"
    JSON = "json"


class EditActionEnum(str, Enum):
    """编辑操作类型枚举"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    GENERATE = "generate"


# ==================== API请求模型 ====================

class ScriptCreateRequest(BaseModel):
    """脚本创建请求模型"""
    style_config: Optional[ScriptStyleConfig] = Field(None, description="脚本风格配置")


class ScriptSectionUpdate(BaseModel):
    """脚本段落更新模型"""
    id: Optional[str] = Field(None, description="段落ID，新建时可为空")
    section_type: SectionTypeEnum = Field(..., description="段落类型")
    title: str = Field(..., min_length=1, max_length=255, description="段落标题")
    content: str = Field(..., min_length=1, description="段落内容")
    tips: List[str] = Field(default_factory=list, description="创作提示数组")
    time_range: Optional[str] = Field(None, max_length=50, description="时间范围")
    importance: ImportanceLevelEnum = Field(ImportanceLevelEnum.MEDIUM, description="重要性级别")
    order_index: int = Field(..., ge=1, le=100, description="排序索引")


class ScriptUpdateRequest(BaseModel):
    """脚本更新请求模型"""
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="脚本标题")
    status: Optional[ScriptStatusEnum] = Field(None, description="脚本状态")
    sections: Optional[List[ScriptSectionUpdate]] = Field(None, description="段落列表")


class ExportRequest(BaseModel):
    """导出请求模型"""
    format: ExportFormatEnum = Field(..., description="导出格式")
    include_metadata: bool = Field(True, description="是否包含元数据")
    include_tips: bool = Field(True, description="是否包含创作提示")


# ==================== API响应模型 ====================

class ScriptSectionDetail(BaseModel):
    """脚本段落详情模型"""
    id: str = Field(..., description="段落ID")
    script_id: str = Field(..., description="脚本ID")
    section_type: SectionTypeEnum = Field(..., description="段落类型")
    title: str = Field(..., description="段落标题")
    content: str = Field(..., description="段落内容")
    tips: List[str] = Field(default_factory=list, description="创作提示数组")
    time_range: Optional[str] = Field(None, description="时间范围")
    importance: ImportanceLevelEnum = Field(..., description="重要性级别")
    order_index: int = Field(..., description="排序索引")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ScriptMetadata(BaseModel):
    """脚本元数据模型"""
    generation_id: Optional[str] = Field(None, description="生成ID")
    total_sections: int = Field(..., description="总段落数")
    last_updated: datetime = Field(..., description="最后更新时间")
    creator_id: str = Field(..., description="创建者ID")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ScriptDetail(BaseModel):
    """脚本详情模型"""
    id: str = Field(..., description="脚本ID")
    card_id: str = Field(..., description="关联的分析卡片ID")
    title: str = Field(..., description="脚本标题")
    status: ScriptStatusEnum = Field(..., description="脚本状态")
    sections: List[ScriptSectionDetail] = Field(default_factory=list, description="段落列表")
    metadata: ScriptMetadata = Field(..., description="脚本元数据")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ScriptEditHistoryDetail(BaseModel):
    """脚本编辑历史详情模型"""
    id: str = Field(..., description="历史记录ID")
    script_id: str = Field(..., description="脚本ID")
    section_id: Optional[str] = Field(None, description="段落ID")
    content_before: Optional[str] = Field(None, description="修改前内容")
    content_after: Optional[str] = Field(None, description="修改后内容")
    action: EditActionEnum = Field(..., description="操作类型")
    created_at: datetime = Field(..., description="创建时间")
    created_by: str = Field(..., description="操作者ID")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# ==================== 统一API响应格式 ====================

class APIResponse(BaseModel):
    """统一API响应格式 - 符合项目API设计规范"""
    code: int = Field(..., description="业务状态码，0表示成功")
    message: str = Field(..., description="响应消息")
    data: Optional[Any] = Field(None, description="响应数据，失败或无数据时为null")


class ScriptGenerationResponse(APIResponse):
    """脚本生成响应"""
    data: Optional[ScriptDetail] = Field(None, description="生成的脚本详情")


class ScriptDetailResponse(APIResponse):
    """脚本详情响应"""
    data: Optional[ScriptDetail] = Field(None, description="脚本详情")


class ScriptListResponse(APIResponse):
    """脚本列表响应"""
    data: Optional[List[ScriptDetail]] = Field(None, description="脚本列表")


class DeleteResponse(APIResponse):
    """删除响应"""
    data: Optional[Dict[str, Any]] = Field(None, description="删除结果")


class CopyResponse(APIResponse):
    """复制响应"""
    data: Optional[Dict[str, str]] = Field(None, description="复制内容")


# ==================== 分页和查询模型 ====================

class ScriptQueryParams(BaseModel):
    """脚本查询参数"""
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页大小")
    status: Optional[ScriptStatusEnum] = Field(None, description="脚本状态过滤")
    card_id: Optional[str] = Field(None, description="分析卡片ID过滤")
    keyword: Optional[str] = Field(None, description="关键词搜索")
    
    @validator('card_id')
    def validate_card_id(cls, v):
        if v:
            try:
                uuid.UUID(v)
            except ValueError:
                raise ValueError('card_id必须是有效的UUID格式')
        return v


class PagedResponse(BaseModel):
    """分页响应基类"""
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页大小")
    total: int = Field(..., description="总记录数")
    total_pages: int = Field(..., description="总页数")
    
    @validator('total_pages', pre=True, always=True)
    def calculate_total_pages(cls, v, values):
        total = values.get('total', 0)
        page_size = values.get('page_size', 20)
        return (total + page_size - 1) // page_size if page_size > 0 else 0


class ScriptPagedResponse(PagedResponse):
    """脚本分页响应"""
    items: List[ScriptDetail] = Field(default_factory=list, description="脚本列表")


# ==================== 错误响应模型 ====================

class ErrorDetail(BaseModel):
    """错误详情模型"""
    field: Optional[str] = Field(None, description="错误字段")
    message: str = Field(..., description="错误消息")
    code: Optional[str] = Field(None, description="错误码")


class ValidationErrorResponse(APIResponse):
    """验证错误响应"""
    code: int = Field(1001, description="参数错误业务码")
    message: str = Field("数据验证失败", description="错误消息")
    errors: List[ErrorDetail] = Field(default_factory=list, description="详细错误信息")


# 导出所有模型
__all__ = [
    # 枚举类型
    "ScriptStatusEnum",
    "SectionTypeEnum", 
    "ImportanceLevelEnum",
    "ExportFormatEnum",
    "EditActionEnum",
    
    # 请求模型
    "ScriptCreateRequest",
    "ScriptSectionUpdate",
    "ScriptUpdateRequest",
    "ExportRequest",
    
    # 响应模型
    "ScriptSectionDetail",
    "ScriptMetadata",
    "ScriptDetail",
    "ScriptEditHistoryDetail",
    
    # API响应格式
    "APIResponse",
    "ScriptGenerationResponse",
    "ScriptDetailResponse",
    "ScriptListResponse",
    "DeleteResponse",
    "CopyResponse",
    
    # 分页和查询
    "ScriptQueryParams",
    "PagedResponse",
    "ScriptPagedResponse",
    
    # 错误响应
    "ErrorDetail",
    "ValidationErrorResponse"
]