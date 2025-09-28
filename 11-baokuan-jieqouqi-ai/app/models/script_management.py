"""
TOM-217: 脚本管理SQLAlchemy模型定义
创建时间: 2025-07-12
"""

from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.session import Base


class ScriptStatus(enum.Enum):
    """脚本状态枚举"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SectionType(enum.Enum):
    """段落类型枚举"""
    HOOK = "hook"
    PROBLEM = "problem"
    SOLUTION = "solution"
    PROOF = "proof"
    CTA = "cta"


class ImportanceLevel(enum.Enum):
    """重要性级别枚举"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EditAction(enum.Enum):
    """编辑操作类型枚举"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    GENERATE = "generate"


class Script(Base):
    """
    脚本主表 - 存储脚本的基本信息
    对应数据库表: baokuan_app.scripts
    """
    __tablename__ = "scripts"
    __table_args__ = {"schema": "baokuan_app"}
    
    # 主键和基本字段
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    card_id = Column(String, ForeignKey("baokuan_app.AnalysisCard.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default=ScriptStatus.DRAFT.value)
    
    # 时间戳字段
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 用户关联字段
    created_by = Column(String, ForeignKey("baokuan_app.User.id", ondelete="CASCADE"), nullable=False)
    
    # 关系定义
    sections = relationship("ScriptSection", back_populates="script", cascade="all, delete-orphan", order_by="ScriptSection.order_index")
    edit_history = relationship("ScriptEditHistory", back_populates="script", cascade="all, delete-orphan", order_by="ScriptEditHistory.created_at.desc()")
    
    # 表约束
    __table_args__ = (
        CheckConstraint(status.in_([s.value for s in ScriptStatus]), name="chk_scripts_status"),
        CheckConstraint("LENGTH(title) >= 1", name="chk_scripts_title_length"),
        {"schema": "baokuan_app"}
    )
    
    def __repr__(self):
        return f"<Script(id={self.id}, title={self.title}, status={self.status})>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": self.id,
            "card_id": self.card_id,
            "title": self.title,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by,
            "sections": [section.to_dict() for section in self.sections] if self.sections else []
        }


class ScriptSection(Base):
    """
    脚本段落表 - 存储脚本的五个段落内容
    对应数据库表: baokuan_app.script_sections
    """
    __tablename__ = "script_sections"
    __table_args__ = {"schema": "baokuan_app"}
    
    # 主键和基本字段
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    script_id = Column(String, ForeignKey("baokuan_app.scripts.id", ondelete="CASCADE"), nullable=False)
    section_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    
    # JSON字段和其他属性
    tips = Column(JSONB, default=list, nullable=False)
    time_range = Column(String(50))
    importance = Column(String(20), nullable=False, default=ImportanceLevel.MEDIUM.value)
    order_index = Column(Integer, nullable=False)
    
    # 时间戳字段
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系定义
    script = relationship("Script", back_populates="sections")
    edit_history = relationship("ScriptEditHistory", back_populates="section", cascade="all, delete-orphan")
    
    # 表约束
    __table_args__ = (
        CheckConstraint(section_type.in_([s.value for s in SectionType]), name="chk_section_type"),
        CheckConstraint(importance.in_([i.value for i in ImportanceLevel]), name="chk_importance"),
        CheckConstraint("order_index >= 1 AND order_index <= 100", name="chk_order_index"),
        CheckConstraint("LENGTH(content) >= 1", name="chk_content_length"),
        CheckConstraint("LENGTH(title) >= 1", name="chk_title_length"),
        UniqueConstraint("script_id", "section_type", name="uk_script_sections_script_type"),
        UniqueConstraint("script_id", "order_index", name="uk_script_sections_script_order"),
        {"schema": "baokuan_app"}
    )
    
    def __repr__(self):
        return f"<ScriptSection(id={self.id}, script_id={self.script_id}, section_type={self.section_type})>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": self.id,
            "script_id": self.script_id,
            "section_type": self.section_type,
            "title": self.title,
            "content": self.content,
            "tips": self.tips or [],
            "time_range": self.time_range,
            "importance": self.importance,
            "order_index": self.order_index,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class ScriptEditHistory(Base):
    """
    脚本编辑历史表 - 记录所有编辑操作的审计日志
    对应数据库表: baokuan_app.script_edit_history
    """
    __tablename__ = "script_edit_history"
    __table_args__ = {"schema": "baokuan_app"}
    
    # 主键和基本字段
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    script_id = Column(String, ForeignKey("baokuan_app.scripts.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(String, ForeignKey("baokuan_app.script_sections.id", ondelete="SET NULL"), nullable=True)
    
    # 内容字段
    content_before = Column(Text)
    content_after = Column(Text)
    action = Column(String(50), nullable=False)
    
    # 时间戳和用户字段
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    created_by = Column(String, ForeignKey("baokuan_app.User.id", ondelete="CASCADE"), nullable=False)
    
    # 关系定义
    script = relationship("Script", back_populates="edit_history")
    section = relationship("ScriptSection", back_populates="edit_history")
    
    # 表约束
    __table_args__ = (
        CheckConstraint(action.in_([a.value for a in EditAction]), name="chk_action"),
        CheckConstraint(
            "(action = 'delete') OR (action != 'delete' AND content_after IS NOT NULL AND LENGTH(content_after) > 0)",
            name="chk_content_after"
        ),
        {"schema": "baokuan_app"}
    )
    
    def __repr__(self):
        return f"<ScriptEditHistory(id={self.id}, script_id={self.script_id}, action={self.action})>"
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": self.id,
            "script_id": self.script_id,
            "section_id": self.section_id if self.section_id else None,
            "content_before": self.content_before,
            "content_after": self.content_after,
            "action": self.action,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": self.created_by
        }


# 为了向后兼容，导出常用的枚举类型
__all__ = [
    "Script",
    "ScriptSection", 
    "ScriptEditHistory",
    "ScriptStatus",
    "SectionType",
    "ImportanceLevel",
    "EditAction"
]