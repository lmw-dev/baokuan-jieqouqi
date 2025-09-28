"""
AI服务模块单元测试
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, patch
import httpx

from app.services.ai.deepseek import DeepSeekService
from app.services.ai.factory import AIServiceFactory
from app.core.exceptions import AIServiceError


class TestDeepSeekService:
    """DeepSeek服务测试"""
    
    @pytest_asyncio.fixture
    async def deepseek_service(self):
        """创建DeepSeek服务实例"""
        return DeepSeekService(
            api_key="test_key",
            base_url="https://api.test.com",
            model="test-model"
        )
    
    @pytest.mark.asyncio
    async def test_call_llm_success(self, deepseek_service):
        """测试成功调用LLM"""
        # Mock httpx响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {"message": {"content": "Test response"}}
            ]
        }
        
        with patch.object(httpx.AsyncClient, 'post', return_value=mock_response):
            result = await deepseek_service.call_llm("Test prompt")
            assert result == "Test response"
    
    @pytest.mark.asyncio
    async def test_call_llm_api_error(self, deepseek_service):
        """测试API错误"""
        # Mock httpx响应错误
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"error": "Bad request"}
        mock_response.text = "Bad request"
        
        with patch.object(httpx.AsyncClient, 'post', return_value=mock_response):
            with pytest.raises(AIServiceError) as exc_info:
                await deepseek_service.call_llm("Test prompt")
            assert "DeepSeek API调用失败" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_call_llm_timeout(self, deepseek_service):
        """测试超时"""
        with patch.object(httpx.AsyncClient, 'post', side_effect=httpx.TimeoutException("Timeout")):
            with pytest.raises(AIServiceError) as exc_info:
                await deepseek_service.call_llm("Test prompt")
            assert "DeepSeek API调用超时" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, deepseek_service):
        """测试健康检查成功"""
        # Mock成功的LLM调用
        with patch.object(deepseek_service, 'call_llm', return_value="OK"):
            result = await deepseek_service.health_check()
            assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, deepseek_service):
        """测试健康检查失败"""
        # Mock失败的LLM调用
        with patch.object(deepseek_service, 'call_llm', side_effect=AIServiceError("Error")):
            result = await deepseek_service.health_check()
            assert result is False


class TestAIServiceFactory:
    """AI服务工厂测试"""
    
    def test_create_deepseek_service(self):
        """测试创建DeepSeek服务"""
        service = AIServiceFactory.create_service(
            provider="deepseek",
            api_key="test_key",
            base_url="https://api.test.com",
            model="test-model"
        )
        assert isinstance(service, DeepSeekService)
        assert service.api_key == "test_key"
        assert service.model == "test-model"
    
    def test_create_service_invalid_provider(self):
        """测试创建无效提供商服务"""
        with pytest.raises(AIServiceError) as exc_info:
            AIServiceFactory.create_service(
                provider="invalid",
                api_key="test_key",
                base_url="https://api.test.com",
                model="test-model"
            )
        assert "不支持的AI服务提供商" in str(exc_info.value)
    
    def test_create_service_missing_api_key(self):
        """测试缺少API密钥"""
        with pytest.raises(AIServiceError) as exc_info:
            AIServiceFactory.create_service(
                provider="deepseek",
                api_key="",
                base_url="https://api.test.com",
                model="test-model"
            )
        assert "AI API密钥未设置" in str(exc_info.value)
    
    def test_get_available_providers(self):
        """测试获取可用提供商"""
        providers = AIServiceFactory.get_available_providers()
        assert "deepseek" in providers
        assert "openai" in providers
        assert len(providers) >= 2