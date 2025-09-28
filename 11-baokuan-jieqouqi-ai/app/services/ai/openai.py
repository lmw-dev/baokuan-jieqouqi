"""
OpenAI AI服务实现（备用）
"""

import httpx
import json
from typing import Optional, Dict, Any
from loguru import logger

from app.services.ai.base import AIServiceBase
from app.core.exceptions import AIServiceError


class OpenAIService(AIServiceBase):
    """OpenAI AI服务实现"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.openai.com/v1", model: str = "gpt-4", timeout: int = 30):
        super().__init__(api_key, base_url, model, timeout)
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )
    
    async def call_llm(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4000,
        **kwargs
    ) -> str:
        """
        调用OpenAI API
        
        Args:
            prompt: 输入提示
            model: 模型名称（可选）
            temperature: 温度参数
            max_tokens: 最大token数
            **kwargs: 其他参数
            
        Returns:
            OpenAI响应文本
            
        Raises:
            AIServiceError: API调用失败
        """
        if not self._validate_config():
            raise AIServiceError("OpenAI配置无效", "API密钥、base_url或model未设置")
        
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
            logger.debug(f"调用OpenAI API: {url}")
            
            async with self.client as client:
                response = await client.post(url, json=request_data)
                
                # 检查响应状态
                if response.status_code != 200:
                    error_msg = f"OpenAI API调用失败，状态码: {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg += f", 错误详情: {error_detail}"
                    except:
                        error_msg += f", 响应内容: {response.text}"
                    
                    raise AIServiceError(error_msg, f"HTTP {response.status_code}")
                
                # 解析响应
                response_data = response.json()
                
                # 提取生成的文本
                if "choices" in response_data and len(response_data["choices"]) > 0:
                    content = response_data["choices"][0]["message"]["content"]
                    logger.debug(f"OpenAI响应长度: {len(content)}字符")
                    return content.strip()
                else:
                    raise AIServiceError("OpenAI响应格式异常", "响应中没有找到choices字段")
                    
        except httpx.TimeoutException:
            raise AIServiceError("OpenAI API调用超时", f"超时时间: {self.timeout}秒")
        except httpx.RequestError as e:
            raise AIServiceError(f"OpenAI API请求失败: {str(e)}", str(e))
        except json.JSONDecodeError as e:
            raise AIServiceError("OpenAI响应JSON解析失败", str(e))
        except Exception as e:
            if isinstance(e, AIServiceError):
                raise
            raise AIServiceError(f"OpenAI服务调用异常: {str(e)}", str(e))
    
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
            logger.warning(f"OpenAI健康检查失败: {str(e)}")
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