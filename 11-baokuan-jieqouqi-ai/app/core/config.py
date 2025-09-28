from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings
import os
from pathlib import Path


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用基础配置
    app_name: str = "爆款解构器 AI Service"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, description="调试模式")
    
    # 数据库配置 - 使用与Web服务相同的数据库
    database_url: str = Field(
        default="postgresql://postgres:password@localhost:5432/deconstructor_db?schema=baokuan_app", 
        description="数据库连接URL"
    )
    database_pool_size: int = Field(default=10, description="数据库连接池大小")
    
    # 腾讯云配置
    tencent_secret_id: str = Field(default="", description="腾讯云SecretId", alias="cos_secret_id")
    tencent_secret_key: str = Field(default="", description="腾讯云SecretKey", alias="cos_secret_key")
    tencent_region: str = Field(default="ap-guangzhou", description="腾讯云区域")
    
    # COS配置
    cos_bucket_name: str = Field(default="", description="COS存储桶名称", alias="cos_bucket")
    cos_region: str = Field(default="ap-guangzhou", description="COS区域")
    cos_domain: Optional[str] = Field(default=None, description="COS自定义域名")
    
    # 文件上传配置
    max_file_size: int = Field(default=100 * 1024 * 1024, description="最大文件大小(字节)")
    allowed_video_formats: list[str] = Field(
        default=[".mp4", ".mov", ".avi", ".webm"],
        description="允许的视频格式"
    )
    allowed_audio_formats: list[str] = Field(
        default=[".mp3", ".wav", ".m4a", ".aac"],
        description="允许的音频格式"
    )
    
    # FFmpeg配置
    ffmpeg_path: str = Field(default="ffmpeg", description="FFmpeg可执行文件路径")
    max_conversion_time: int = Field(default=300, description="最大转换时间(秒)")
    temp_dir: str = Field(default="/tmp/media_conversion", description="临时文件目录")
    
    # ASR配置
    asr_engine: str = Field(default="tencent", description="ASR引擎")
    asr_language: str = Field(default="zh", description="ASR语言")
    asr_sample_rate: int = Field(default=16000, description="ASR采样率")
    
    # 信任之钩分析配置
    hook_rules_file: str = Field(
        default="app/services/rules/hook_rules.json",
        description="钩子规则文件路径"
    )
    hook_confidence_threshold: float = Field(
        default=0.05,
        description="钩子识别置信度阈值"
    )
    
    # API配置
    api_prefix: str = Field(default="/api/v1", description="API前缀")
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        description="CORS允许的源"
    )
    
    # 日志配置
    log_level: str = Field(default="INFO", description="日志级别")
    log_file: Optional[str] = Field(default=None, description="日志文件路径")
    
    # AI服务配置
    ai_provider: str = Field(default="deepseek", description="AI服务提供商")
    ai_model: str = Field(default="deepseek-v3", description="AI模型")
    ai_api_key: str = Field(default="", description="AI API密钥")
    ai_base_url: str = Field(default="https://api.deepseek.com/v1", description="AI服务URL")
    ai_max_tokens: int = Field(default=4000, description="AI最大token数")
    ai_temperature: float = Field(default=0.3, description="AI温度参数")
    ai_timeout: int = Field(default=30, description="AI请求超时时间(秒)")
    
    # Prompt配置
    prompt_templates_dir: str = Field(
        default="app/services/prompts/templates",
        description="Prompt模板目录"
    )
    prompt_reload_enabled: bool = Field(default=True, description="是否启用Prompt热更新")
    
    class Config:
        # 指向主目录的.env文件 - 使用绝对路径
        env_file = Path(__file__).parent.parent.parent.parent / ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "allow"  # 允许额外的环境变量
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 确保临时目录存在
        Path(self.temp_dir).mkdir(parents=True, exist_ok=True)
        
        # 调试环境变量加载
        print(f"=== AI Service Config Debug ===")
        print(f"COS_SECRET_ID loaded: {'✅' if self.tencent_secret_id else '❌'}")
        print(f"COS_SECRET_KEY loaded: {'✅' if self.tencent_secret_key else '❌'}")
        print(f"COS_BUCKET loaded: {self.cos_bucket_name or '❌ Empty'}")
        print(f"COS_REGION: {self.cos_region}")
        print(f"================================")
    
    @property
    def cos_client_config(self) -> dict:
        """获取COS客户端配置"""
        return {
            "Region": self.cos_region,
            "SecretId": self.tencent_secret_id,
            "SecretKey": self.tencent_secret_key,
            "Scheme": "https",
        }
    
    @property
    def asr_client_config(self) -> dict:
        """获取ASR客户端配置"""
        return {
            "SecretId": self.tencent_secret_id,
            "SecretKey": self.tencent_secret_key,
            "Region": self.tencent_region,
        }


# 全局配置实例
settings = Settings()