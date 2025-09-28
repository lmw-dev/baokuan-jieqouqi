"""
集成测试 - 三段式分析完整流程
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import Mock, patch
from fastapi import FastAPI
import json

from app.main import app
from app.models.three_stage_analysis import AnalysisRequest, ContentType
from tests.mocks import MockAIService


class TestThreeStageAnalysisIntegration:
    """三段式分析集成测试"""
    
    @pytest_asyncio.fixture
    async def client(self):
        """创建测试客户端"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    
    @pytest.mark.asyncio
    async def test_full_analysis_workflow(self, client):
        """测试完整分析工作流"""
        # 模拟AI服务和Prompt管理器
        with patch('app.services.ai.factory.AIServiceFactory.create_service') as mock_create_service, \
             patch('app.services.prompts.manager.get_prompt_manager') as mock_get_prompt_manager:
            
            # 设置AI服务模拟
            mock_ai_service = MockAIService()
            mock_create_service.return_value = mock_ai_service
            
            # 设置Prompt管理器模拟
            mock_prompt_manager = Mock()
            mock_prompt_manager.get_template.side_effect = lambda name: f"模板内容 for {name}"
            mock_get_prompt_manager.return_value = mock_prompt_manager
            
            # 发送分析请求
            request_data = {
                "content": "大家好，今天我要为大家评测蓝牙耳机...",
                "content_type": "text"
            }
            
            response = await client.post("/api/v1/analysis/three-stage", json=request_data)
            
            # 验证响应
            assert response.status_code == 200
            data = response.json()
            
            assert data["trust_hook"] is not None
            assert data["empathy_anchor"] is not None
            assert data["value_map"] is not None
            assert data["meta"] is not None
            assert data["meta"]["processing_time_ms"] > 0
            
            # 验证信任之钩结果
            trust_hook = data["trust_hook"]
            assert trust_hook["hook_copy"] == "从582款蓝牙耳机中评测选出的性价比之王！"
            assert trust_hook["credibility_testimony"] == "所有产品均为自费购买，无任何广告植入"
            assert len(trust_hook["authority_signals"]) == 3
            
            # 验证共情之锚结果
            empathy_anchor = data["empathy_anchor"]
            assert empathy_anchor["pain_point"] == "在海量618信息中，害怕买错耳机而浪费钱"
            assert empathy_anchor["target_audience"] == "追求性价比的学生党和职场新人"
            assert len(empathy_anchor["emotional_triggers"]) == 3
            
            # 验证价值图谱结果
            value_map = data["value_map"]
            assert value_map["core_value"] == "帮助用户用最少的钱买到最适合的蓝牙耳机"
            assert len(value_map["value_delivery"]) == 3
            assert "582款海量评测" in value_map["competitive_advantage"]
    
    @pytest.mark.asyncio
    async def test_analysis_with_invalid_data(self, client):
        """测试使用无效数据进行分析"""
        # 缺少必填字段
        request_data = {
            "content_type": "text"
            # 缺少 content
        }
        
        response = await client.post("/api/v1/analysis/three-stage", json=request_data)
        
        assert response.status_code == 422  # 验证错误
        data = response.json()
        assert "detail" in data
    
    @pytest.mark.asyncio
    async def test_analysis_with_ai_service_error(self, client):
        """测试AI服务错误情况"""
        with patch('app.services.ai.factory.AIServiceFactory.create_service') as mock_create_service, \
             patch('app.services.prompts.manager.get_prompt_manager') as mock_get_prompt_manager:
            
            # 设置AI服务抛出异常
            from app.core.exceptions import AIServiceError
            mock_ai_service = Mock()
            mock_ai_service.call_llm.side_effect = AIServiceError("API调用失败")
            mock_create_service.return_value = mock_ai_service
            
            # 设置Prompt管理器模拟
            mock_prompt_manager = Mock()
            mock_prompt_manager.get_template.return_value = "模板内容"
            mock_get_prompt_manager.return_value = mock_prompt_manager
            
            request_data = {
                "content": "测试内容",
                "content_type": "text"
            }
            
            response = await client.post("/api/v1/analysis/three-stage", json=request_data)
            
            # 根据实际的错误处理逻辑，应该抛出异常而不是返回错误响应
            # 如果API设计为返回异常，则状态码应该是500
            assert response.status_code == 500
    
    @pytest.mark.asyncio
    async def test_get_models_endpoint(self, client):
        """测试获取模型列表接口"""
        response = await client.get("/api/v1/analysis/models")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "trust_hook" in data
        assert "empathy_anchor" in data
        assert "value_map" in data
        
        # 验证模型结构
        trust_hook_model = data["trust_hook"]
        assert "properties" in trust_hook_model
        assert "hook_copy" in trust_hook_model["properties"]
        assert "credibility_testimony" in trust_hook_model["properties"]
        assert "authority_signals" in trust_hook_model["properties"]
    
    @pytest.mark.asyncio
    async def test_health_check_endpoint(self, client):
        """测试健康检查接口"""
        with patch('app.services.ai.factory.AIServiceFactory.create_service') as mock_create_service:
            # 设置AI服务健康检查成功
            mock_ai_service = Mock()
            mock_ai_service.health_check.return_value = True
            mock_create_service.return_value = mock_ai_service
            
            response = await client.get("/api/v1/analysis/health")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "healthy"
            assert data["ai_service"] == "healthy"
    
    @pytest.mark.asyncio
    async def test_health_check_ai_service_unhealthy(self, client):
        """测试AI服务不健康的情况"""
        with patch('app.services.ai.factory.AIServiceFactory.create_service') as mock_create_service:
            # 设置AI服务健康检查失败
            mock_ai_service = Mock()
            mock_ai_service.health_check.return_value = False
            mock_create_service.return_value = mock_ai_service
            
            response = await client.get("/api/v1/analysis/health")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "unhealthy"
            assert data["ai_service"] == "unhealthy"


class TestPromptManagementIntegration:
    """Prompt管理集成测试"""
    
    @pytest_asyncio.fixture
    async def client(self):
        """创建测试客户端"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    
    @pytest.mark.asyncio
    async def test_get_prompt_templates(self, client):
        """测试获取Prompt模板列表"""
        with patch('app.services.prompts.manager.get_prompt_manager') as mock_get_prompt_manager:
            # 设置Prompt管理器模拟
            mock_prompt_manager = Mock()
            mock_templates = [
                Mock(name="trust_hook", file_path="/path/trust_hook.md", 
                     last_modified=1234567890.0, metadata={"版本": "v1.0"}),
                Mock(name="empathy_anchor", file_path="/path/empathy_anchor.md",
                     last_modified=1234567891.0, metadata={"版本": "v1.0"}),
                Mock(name="value_map", file_path="/path/value_map.md",
                     last_modified=1234567892.0, metadata={"版本": "v1.0"})
            ]
            mock_prompt_manager.list_templates.return_value = mock_templates
            mock_get_prompt_manager.return_value = mock_prompt_manager
            
            response = await client.get("/api/v1/prompts/templates")
            
            assert response.status_code == 200
            data = response.json()
            
            assert len(data) == 3
            assert data[0]["name"] == "trust_hook"
            assert data[1]["name"] == "empathy_anchor"
            assert data[2]["name"] == "value_map"
    
    @pytest.mark.asyncio
    async def test_get_specific_prompt_template(self, client):
        """测试获取特定Prompt模板"""
        with patch('app.services.prompts.manager.get_prompt_manager') as mock_get_prompt_manager:
            # 设置Prompt管理器模拟
            mock_prompt_manager = Mock()
            mock_template = Mock(
                name="trust_hook", 
                file_path="/path/trust_hook.md",
                last_modified=1234567890.0, 
                metadata={"版本": "v1.0", "用途": "信任分析"}
            )
            mock_prompt_manager.get_template_info.return_value = mock_template
            mock_get_prompt_manager.return_value = mock_prompt_manager
            
            response = await client.get("/api/v1/prompts/templates/trust_hook")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["name"] == "trust_hook"
            assert data["file_path"] == "/path/trust_hook.md"
            assert data["metadata"]["版本"] == "v1.0"
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_prompt_template(self, client):
        """测试获取不存在的Prompt模板"""
        with patch('app.services.prompts.manager.get_prompt_manager') as mock_get_prompt_manager:
            # 设置Prompt管理器返回None
            mock_prompt_manager = Mock()
            mock_prompt_manager.get_template_info.return_value = None
            mock_get_prompt_manager.return_value = mock_prompt_manager
            
            response = await client.get("/api/v1/prompts/templates/nonexistent")
            
            assert response.status_code == 404
            data = response.json()
            
            assert data["detail"]["code"] == 4002
            assert "Prompt模板不存在" in data["detail"]["message"]
    
    @pytest.mark.asyncio
    async def test_reload_prompt_templates(self, client):
        """测试重新加载Prompt模板"""
        with patch('app.services.prompts.manager.get_prompt_manager') as mock_get_prompt_manager:
            # 设置Prompt管理器模拟
            mock_prompt_manager = Mock()
            mock_prompt_manager.reload_templates.return_value = None
            mock_prompt_manager.get_template_count.return_value = 3
            mock_get_prompt_manager.return_value = mock_prompt_manager
            
            request_data = {
                "template_names": ["trust_hook", "empathy_anchor"]
            }
            
            response = await client.post("/api/v1/prompts/reload", json=request_data)
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["code"] == 200
            assert "成功重新加载 2 个模板" in data["message"]
            assert data["data"]["total_templates"] == 3
    
    @pytest.mark.asyncio
    async def test_get_prompt_manager_status(self, client):
        """测试获取Prompt管理器状态"""
        with patch('app.services.prompts.manager.get_prompt_manager') as mock_get_prompt_manager:
            # 设置Prompt管理器模拟
            mock_prompt_manager = Mock()
            mock_prompt_manager.get_template_count.return_value = 3
            mock_templates = [
                Mock(name="trust_hook"),
                Mock(name="empathy_anchor"),
                Mock(name="value_map")
            ]
            mock_prompt_manager.list_templates.return_value = mock_templates
            mock_prompt_manager._initialized = True
            mock_get_prompt_manager.return_value = mock_prompt_manager
            
            response = await client.get("/api/v1/prompts/status")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["code"] == 200
            assert data["data"]["status"] == "healthy"
            assert data["data"]["template_count"] == 3
            assert data["data"]["initialized"] is True
            assert len(data["data"]["templates"]) == 3