from sqlalchemy import Column, String, DateTime, JSON, Float, Integer, Text, Boolean, ARRAY, Enum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.db.session import Base


class SourceType(enum.Enum):
    """分析源类型枚举"""
    URL = "URL"
    FILE = "FILE"
    TEXT = "TEXT"


class AnalysisStatus(enum.Enum):
    """分析状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisCard(Base):
    """分析卡片模型 - 匹配Prisma schema"""
    __tablename__ = "AnalysisCard"
    __table_args__ = {"schema": "baokuan_app"}
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, name="createdAt")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, name="updatedAt")
    
    # 版本信息
    version_title = Column(String, nullable=False, name="versionTitle")
    
    # 核心分析字段
    hook_copy = Column(String, name="hookCopy")
    hook_types = Column(ARRAY(String), default=[], name="hookTypes")
    hook_notes = Column(String, name="hookNotes")
    
    core_idea = Column(String, name="coreIdea")
    argument_case = Column(String, name="argumentCase")
    
    value_delivery = Column(ARRAY(String), default=[], name="valueDelivery")
    reusable_elements = Column(String, name="reusableElements")
    value_notes = Column(String, name="valueNotes")
    
    # 关联字段
    source_id = Column(String, nullable=False, name="sourceId")
    
    def __repr__(self):
        return f"<AnalysisCard(id={self.id}, version_title={self.version_title})>"


class AnalysisSource(Base):
    """分析源模型 - 匹配Prisma schema"""
    __tablename__ = "AnalysisSource"
    __table_args__ = {"schema": "baokuan_app"}
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, name="createdAt")
    
    title = Column(String, nullable=False)
    source_type = Column(Enum(SourceType, name="SourceType"), nullable=False, name="sourceType")
    source_content = Column(String, nullable=False, name="sourceContent")
    transcript = Column(Text, name="transcript")
    
    # 关联字段
    owner_id = Column(String, nullable=False, name="ownerId")
    media_file_id = Column(String, unique=True, name="mediaFileId")
    
    def __repr__(self):
        return f"<AnalysisSource(id={self.id}, title={self.title}, source_type={self.source_type})>"


class MediaFile(Base):
    """媒体文件模型 - 匹配Prisma schema"""
    __tablename__ = "MediaFile"
    __table_args__ = {"schema": "baokuan_app"}
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, name="createdAt")
    
    original_filename = Column(String, nullable=False, name="originalFilename")
    storage_path = Column(String, nullable=False, name="storagePath")
    file_size = Column(Integer, nullable=False, name="fileSize")
    mime_type = Column(String, nullable=False, name="mimeType")
    status = Column(String, nullable=False)
    
    # 扩展字段
    file_hash = Column(String, name="fileHash")
    thumbnail_url = Column(String, name="thumbnailUrl")
    
    def __repr__(self):
        return f"<MediaFile(id={self.id}, filename={self.original_filename})>"


class User(Base):
    """用户模型 - 匹配Prisma schema"""
    __tablename__ = "User"
    __table_args__ = {"schema": "baokuan_app"}
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, name="createdAt")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, name="updatedAt")
    
    logto_id = Column(String, unique=True, name="logtoId")
    name = Column(String)
    email = Column(String, unique=True)
    phone_number = Column(String, unique=True, name="phoneNumber")
    image = Column(String)  # 修正：使用image而不是avatarUrl
    
    def __repr__(self):
        return f"<User(id={self.id}, name={self.name})>"