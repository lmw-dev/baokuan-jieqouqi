"""
AI服务抽象基类
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import asyncio
from loguru import logger


class AIServiceBase(ABC):
    """AI服务抽象基类"""
    
    def __init__(self, api_key: str, base_url: str, model: str, timeout: int = 30):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.timeout = timeout
    
    @abstractmethod
    async def call_llm(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4000,
        **kwargs
    ) -> str:
        """
        调用LLM API
        
        Args:
            prompt: 输入提示
            model: 模型名称（可选，使用默认模型）
            temperature: 温度参数
            max_tokens: 最大token数
            **kwargs: 其他参数
            
        Returns:
            LLM响应文本
            
        Raises:
            AIServiceError: AI服务调用异常
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """
        健康检查
        
        Returns:
            服务是否健康
        """
        pass
    
    async def call_with_retry(
        self,
        prompt: str,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        **kwargs
    ) -> str:
        """
        带重试的LLM调用
        
        Args:
            prompt: 输入提示
            max_retries: 最大重试次数
            retry_delay: 重试延迟(秒)
            **kwargs: 传递给call_llm的参数
            
        Returns:
            LLM响应文本
            
        Raises:
            AIServiceError: 重试耗尽后仍然失败
        """
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                return await self.call_llm(prompt, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < max_retries:
                    logger.warning(
                        f"AI服务调用失败，第{attempt + 1}次重试: {str(e)}"
                    )
                    await asyncio.sleep(retry_delay * (2 ** attempt))  # 指数退避
                else:
                    logger.error(f"AI服务调用失败，重试次数耗尽: {str(e)}")
        
        # 重试耗尽，抛出最后一个异常
        raise last_exception
    
    def _validate_api_key(self) -> bool:
        """验证API密钥"""
        return bool(self.api_key and len(self.api_key.strip()) > 0)
    
    def _validate_config(self) -> bool:
        """验证配置"""
        return (
            self._validate_api_key() and
            bool(self.base_url) and
            bool(self.model)
        )