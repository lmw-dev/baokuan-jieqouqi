"""
AI服务工厂 - 支持多种AI服务提供商
"""

from typing import Dict, Type, Optional
from loguru import logger

from app.services.ai.base import AIServiceBase
from app.services.ai.deepseek import DeepSeekService
from app.services.ai.openai import OpenAIService
from app.core.exceptions import AIServiceError
from app.core.config import settings


class AIServiceFactory:
    """AI服务工厂"""
    
    # 注册的AI服务类
    _services: Dict[str, Type[AIServiceBase]] = {
        "deepseek": DeepSeekService,
        "openai": OpenAIService,
    }
    
    @classmethod
    def create_service(
        cls,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[int] = None,
        **kwargs
    ) -> AIServiceBase:
        """
        创建AI服务实例
        
        Args:
            provider: AI服务提供商（如果不提供则使用配置中的默认值）
            api_key: API密钥（如果不提供则使用配置中的默认值）
            base_url: 服务URL（如果不提供则使用配置中的默认值）
            model: 模型名称（如果不提供则使用配置中的默认值）
            timeout: 超时时间（如果不提供则使用配置中的默认值）
            **kwargs: 其他参数
            
        Returns:
            AI服务实例
            
        Raises:
            AIServiceError: 不支持的提供商或配置错误
        """
        # 使用配置中的默认值
        provider = provider or settings.ai_provider
        api_key = api_key or settings.ai_api_key
        base_url = base_url or settings.ai_base_url
        model = model or settings.ai_model
        timeout = timeout or settings.ai_timeout
        
        # 验证提供商
        if provider not in cls._services:
            available_providers = list(cls._services.keys())
            raise AIServiceError(
                f"不支持的AI服务提供商: {provider}",
                f"支持的提供商: {available_providers}"
            )
        
        # 验证必要参数 - 配置错误应该返回4xx而不是5xx
        if not api_key:
            from app.core.exceptions import ServiceConfigurationError
            raise ServiceConfigurationError("AI API密钥未配置", "请在环境变量中设置AI_API_KEY")
        
        if not base_url:
            from app.core.exceptions import ServiceConfigurationError
            raise ServiceConfigurationError("AI服务URL未配置", "请在环境变量中设置AI_BASE_URL")
        
        if not model:
            from app.core.exceptions import ServiceConfigurationError
            raise ServiceConfigurationError("AI模型未配置", "请在环境变量中设置AI_MODEL")
        
        try:
            # 创建服务实例
            service_class = cls._services[provider]
            service = service_class(
                api_key=api_key,
                base_url=base_url,
                model=model,
                timeout=timeout,
                **kwargs
            )
            
            logger.info(f"创建AI服务实例: {provider} ({model})")
            return service
            
        except Exception as e:
            raise AIServiceError(
                f"创建AI服务实例失败: {str(e)}",
                f"提供商: {provider}, 模型: {model}"
            )
    
    @classmethod
    def register_service(cls, name: str, service_class: Type[AIServiceBase]):
        """
        注册新的AI服务类
        
        Args:
            name: 服务名称
            service_class: 服务类
        """
        if not issubclass(service_class, AIServiceBase):
            raise ValueError(f"服务类必须继承自AIServiceBase: {service_class}")
        
        cls._services[name] = service_class
        logger.info(f"注册AI服务: {name} -> {service_class.__name__}")
    
    @classmethod
    def get_available_providers(cls) -> list[str]:
        """
        获取所有可用的AI服务提供商
        
        Returns:
            提供商名称列表
        """
        return list(cls._services.keys())
    
    @classmethod
    def create_default_service(cls) -> AIServiceBase:
        """
        使用默认配置创建AI服务
        
        Returns:
            AI服务实例
        """
        return cls.create_service()


# 全局AI服务实例（单例模式）
_ai_service: Optional[AIServiceBase] = None


async def get_ai_service() -> AIServiceBase:
    """
    获取AI服务实例（依赖注入使用）
    
    Returns:
        AI服务实例
    """
    global _ai_service
    
    if _ai_service is None:
        _ai_service = AIServiceFactory.create_default_service()
        
        # 可选：进行健康检查
        try:
            is_healthy = await _ai_service.health_check()
            if not is_healthy:
                logger.warning("AI服务健康检查失败，但将继续使用")
        except Exception as e:
            logger.warning(f"AI服务健康检查异常: {str(e)}")
    
    return _ai_service


def reset_ai_service():
    """重置AI服务实例（主要用于测试）"""
    global _ai_service
    _ai_service = None