"""
DeepSeek AI服务实现
"""

import httpx
import json
from typing import Optional, Dict, Any
from loguru import logger

from app.services.ai.base import AIServiceBase
from app.core.exceptions import AIServiceError


class DeepSeekService(AIServiceBase):
    """DeepSeek AI服务实现"""
    
    def __init__(self, api_key: str, base_url: str, model: str = "deepseek-v3", timeout: int = 30):
        super().__init__(api_key, base_url, model, timeout)
        self._client = None
        self._timeout = timeout
    
    @property
    def client(self):
        """延迟初始化的httpx客户端"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self._timeout),
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
        return self._client
    
    async def call_llm(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4000,
        **kwargs
    ) -> str:
        """
        调用DeepSeek API
        
        Args:
            prompt: 输入提示
            model: 模型名称（可选）
            temperature: 温度参数
            max_tokens: 最大token数
            **kwargs: 其他参数
            
        Returns:
            DeepSeek响应文本
            
        Raises:
            AIServiceError: API调用失败
        """
        if not self._validate_config():
            raise AIServiceError("DeepSeek配置无效", "API密钥、base_url或model未设置")
        
        try:
            # 构建请求数据
            request_data = {
                "model": model or self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
                **kwargs
            }
            
            # 发送请求
            url = f"{self.base_url.rstrip('/')}/chat/completions"
            logger.debug(f"调用DeepSeek API: {url}")
            
            response = await self.client.post(url, json=request_data)
            
            # 增强状态码处理
            if response.status_code == 429:
                # API限流，应该重试
                raise AIServiceError("DeepSeek API请求频率过高，请稍后重试", "RATE_LIMIT_EXCEEDED", retryable=True)
            elif response.status_code == 401:
                # 认证错误，不应该重试
                raise AIServiceError("DeepSeek API认证失败，请检查API密钥", "UNAUTHORIZED", retryable=False)
            elif response.status_code == 403:
                # 权限错误，不应该重试
                raise AIServiceError("DeepSeek API权限不足", "FORBIDDEN", retryable=False)
            elif response.status_code in [500, 502, 503, 504]:
                # 服务器错误，应该重试
                raise AIServiceError(f"DeepSeek服务器错误: {response.status_code}", "SERVER_ERROR", retryable=True)
            elif response.status_code != 200:
                error_msg = f"DeepSeek API调用失败，状态码: {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f", 错误详情: {error_detail}"
                except:
                    error_msg += f", 响应内容: {response.text}"
                
                # 其他4xx错误通常不应该重试
                retryable = response.status_code >= 500
                raise AIServiceError(error_msg, f"HTTP_{response.status_code}", retryable=retryable)
            
            # 解析响应
            response_data = response.json()
            
            # 提取生成的文本
            if "choices" in response_data and len(response_data["choices"]) > 0:
                content = response_data["choices"][0]["message"]["content"]
                logger.debug(f"DeepSeek响应长度: {len(content)}字符")
                return content.strip()
            else:
                raise AIServiceError("DeepSeek响应格式异常", "响应中没有找到choices字段")
                    
        except httpx.ConnectError as e:
            raise AIServiceError(f"DeepSeek网络连接失败: {str(e)}", "NETWORK_ERROR", retryable=True)
        except httpx.TimeoutException:
            raise AIServiceError("DeepSeek API调用超时", f"超时时间: {self._timeout}秒", retryable=True)
        except httpx.RequestError as e:
            raise AIServiceError(f"DeepSeek网络请求失败: {str(e)}", str(e), retryable=True)
        except json.JSONDecodeError as e:
            raise AIServiceError("DeepSeek响应JSON解析失败", str(e))
        except Exception as e:
            if isinstance(e, AIServiceError):
                raise
            raise AIServiceError(f"DeepSeek服务调用异常: {str(e)}", str(e))
    
    async def health_check(self) -> bool:
        """
        健康检查
        
        Returns:
            服务是否健康
        """
        try:
            # 发送简单的测试请求
            test_prompt = "Hello, this is a health check."
            response = await self.call_llm(
                test_prompt,
                max_tokens=10,
                temperature=0.1
            )
            return bool(response and len(response.strip()) > 0)
        except Exception as e:
            logger.warning(f"DeepSeek健康检查失败: {str(e)}")
            return False
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.client.aclose()
    
    def __del__(self):
        """析构函数，确保客户端关闭"""
        if hasattr(self, 'client') and self.client:
            try:
                # 在同步上下文中关闭客户端
                import asyncio
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self.client.aclose())
                else:
                    loop.run_until_complete(self.client.aclose())
            except Exception:
                pass