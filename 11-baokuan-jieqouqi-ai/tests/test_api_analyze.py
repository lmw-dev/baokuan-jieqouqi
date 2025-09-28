import pytest
import json
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient
import asyncio

from app.main import app
from app.schemas.analyze_schema import AnalysisResult, AnalysisStatus


class TestAnalyzeAPI:
    """分析API端点测试"""
    
    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_analysis_service(self):
        """模拟分析服务"""
        with patch('app.api.v1.endpoints.analyze.analysis_service') as mock:
            yield mock
    
    def test_analyze_content_missing_content_type(self, client):
        """测试缺少content_type参数"""
        response = client.post("/api/v1/analyze")
        assert response.status_code == 422  # Validation error
    
    def test_analyze_content_invalid_content_type(self, client):
        """测试无效的content_type"""
        response = client.post(
            "/api/v1/analyze",
            data={"content_type": "invalid"}
        )
        assert response.status_code == 400
        assert "content_type 必须是 'file' 或 'text'" in response.json()["detail"]
    
    def test_analyze_content_text_missing_content(self, client):
        """测试文本类型缺少内容"""
        response = client.post(
            "/api/v1/analyze",
            data={"content_type": "text"}
        )
        assert response.status_code == 400
        assert "text_content不能为空" in response.json()["detail"]
    
    def test_analyze_content_text_empty_content(self, client):
        """测试文本类型空内容"""
        response = client.post(
            "/api/v1/analyze",
            data={
                "content_type": "text",
                "text_content": "   "
            }
        )
        assert response.status_code == 400
        assert "text_content不能为空" in response.json()["detail"]
    
    def test_analyze_content_file_missing_file(self, client):
        """测试文件类型缺少文件"""
        response = client.post(
            "/api/v1/analyze",
            data={"content_type": "file"}
        )
        assert response.status_code == 400
        assert "必须提供文件" in response.json()["detail"]
    
    def test_analyze_content_invalid_analysis_options(self, client):
        """测试无效的分析选项"""
        response = client.post(
            "/api/v1/analyze",
            data={
                "content_type": "text",
                "text_content": "测试文本",
                "analysis_options": "invalid json"
            }
        )
        assert response.status_code == 400
        assert "分析选项格式错误" in response.json()["detail"]
    
    def test_analyze_content_text_success(self, client, mock_analysis_service):
        """测试文本分析成功"""
        # 模拟分析结果
        mock_result = AnalysisResult(
            task_id="test-task-id",
            status=AnalysisStatus.COMPLETED,
            progress=1.0,
            title="测试分析",
            summary="测试摘要",
            transcribed_text="测试文本",
            trust_hooks=[],
            created_at="2025-07-07T14:00:00Z",
            updated_at="2025-07-07T14:00:00Z"
        )
        
        mock_analysis_service.analyze_content = AsyncMock(return_value=mock_result)
        
        response = client.post(
            "/api/v1/analyze",
            data={
                "content_type": "text",
                "text_content": "测试文本内容"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["message"] == "分析完成"
        assert data["data"]["task_id"] == "test-task-id"
        assert data["data"]["status"] == "completed"
    
    def test_analyze_content_text_with_options(self, client, mock_analysis_service):
        """测试带选项的文本分析"""
        mock_result = AnalysisResult(
            task_id="test-task-id",
            status=AnalysisStatus.COMPLETED,
            progress=1.0,
            created_at="2025-07-07T14:00:00Z",
            updated_at="2025-07-07T14:00:00Z"
        )
        
        mock_analysis_service.analyze_content = AsyncMock(return_value=mock_result)
        
        options = {
            "enable_asr": False,
            "enable_hook_detection": True,
            "language": "zh-CN"
        }
        
        response = client.post(
            "/api/v1/analyze",
            data={
                "content_type": "text",
                "text_content": "测试文本",
                "analysis_options": json.dumps(options)
            }
        )
        
        assert response.status_code == 200
        
        # 验证服务被正确调用
        mock_analysis_service.analyze_content.assert_called_once()
        call_args = mock_analysis_service.analyze_content.call_args
        request = call_args[1]['request']
        assert request.content_type == "text"
        assert request.text_content == "测试文本"
        assert request.analysis_options.enable_asr == False
        assert request.analysis_options.enable_hook_detection == True
    
    def test_analyze_content_file_unsupported_format(self, client):
        """测试不支持的文件格式"""
        response = client.post(
            "/api/v1/analyze",
            data={"content_type": "file"},
            files={"file": ("test.txt", b"test content", "text/plain")}
        )
        
        assert response.status_code == 400
        assert "不支持的文件格式" in response.json()["detail"]
    
    def test_analyze_content_file_empty(self, client):
        """测试空文件"""
        response = client.post(
            "/api/v1/analyze",
            data={"content_type": "file"},
            files={"file": ("test.mp4", b"", "video/mp4")}
        )
        
        assert response.status_code == 400
        assert "文件为空" in response.json()["detail"]
    
    def test_analyze_content_file_oversized(self, client):
        """测试文件过大"""
        # 创建一个大文件（模拟）
        large_content = b"x" * (101 * 1024 * 1024)  # 101MB
        
        response = client.post(
            "/api/v1/analyze",
            data={"content_type": "file"},
            files={"file": ("test.mp4", large_content, "video/mp4")}
        )
        
        assert response.status_code == 400
        assert "文件过大" in response.json()["detail"]
    
    def test_analyze_content_file_success(self, client, mock_analysis_service):
        """测试文件分析成功"""
        mock_result = AnalysisResult(
            task_id="test-task-id",
            status=AnalysisStatus.COMPLETED,
            progress=1.0,
            file_name="test.mp4",
            file_size=1024,
            created_at="2025-07-07T14:00:00Z",
            updated_at="2025-07-07T14:00:00Z"
        )
        
        mock_analysis_service.analyze_content = AsyncMock(return_value=mock_result)
        
        file_content = b"fake video content"
        
        response = client.post(
            "/api/v1/analyze",
            data={"content_type": "file"},
            files={"file": ("test.mp4", file_content, "video/mp4")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["file_name"] == "test.mp4"
        
        # 验证服务调用
        mock_analysis_service.analyze_content.assert_called_once()
        call_args = mock_analysis_service.analyze_content.call_args
        assert call_args[1]['file_data'] == file_content
        assert call_args[1]['original_filename'] == "test.mp4"
    
    def test_analyze_content_service_exception(self, client, mock_analysis_service):
        """测试服务异常"""
        mock_analysis_service.analyze_content = AsyncMock(
            side_effect=Exception("服务错误")
        )
        
        response = client.post(
            "/api/v1/analyze",
            data={
                "content_type": "text",
                "text_content": "测试文本"
            }
        )
        
        assert response.status_code == 500
        assert "服务器内部错误" in response.json()["detail"]
    
    def test_get_analysis_status_success(self, client, mock_analysis_service):
        """测试获取分析状态成功"""
        mock_result = AnalysisResult(
            task_id="test-task-id",
            status=AnalysisStatus.PROCESSING,
            progress=0.5,
            created_at="2025-07-07T14:00:00Z",
            updated_at="2025-07-07T14:00:00Z"
        )
        
        mock_analysis_service.get_analysis_status = AsyncMock(return_value=mock_result)
        
        response = client.get("/api/v1/analyze/test-task-id/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["task_id"] == "test-task-id"
        assert data["data"]["status"] == "processing"
    
    def test_get_analysis_status_not_found(self, client, mock_analysis_service):
        """测试任务不存在"""
        mock_analysis_service.get_analysis_status = AsyncMock(return_value=None)
        
        response = client.get("/api/v1/analyze/nonexistent-task/status")
        
        assert response.status_code == 404
        assert "任务不存在" in response.json()["detail"]
    
    def test_get_analysis_status_service_exception(self, client, mock_analysis_service):
        """测试获取状态服务异常"""
        mock_analysis_service.get_analysis_status = AsyncMock(
            side_effect=Exception("数据库错误")
        )
        
        response = client.get("/api/v1/analyze/test-task-id/status")
        
        assert response.status_code == 500
        assert "服务器内部错误" in response.json()["detail"]
    
    def test_get_analysis_result(self, client, mock_analysis_service):
        """测试获取分析结果"""
        mock_result = AnalysisResult(
            task_id="test-task-id",
            status=AnalysisStatus.COMPLETED,
            progress=1.0,
            created_at="2025-07-07T14:00:00Z",
            updated_at="2025-07-07T14:00:00Z"
        )
        
        mock_analysis_service.get_analysis_status = AsyncMock(return_value=mock_result)
        
        response = client.get("/api/v1/analyze/test-task-id/result")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["status"] == "completed"
    
    def test_health_check_healthy(self, client, mock_analysis_service):
        """测试健康检查 - 健康状态"""
        mock_analysis_service.validate_services = AsyncMock(return_value={
            "ffmpeg": True,
            "cos": True,
            "asr": True,
            "hook_analyzer": True
        })
        
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["services"]["ffmpeg"] == True
        assert data["services"]["cos"] == True
        assert data["services"]["asr"] == True
        assert data["services"]["hook_analyzer"] == True
    
    def test_health_check_degraded(self, client, mock_analysis_service):
        """测试健康检查 - 降级状态"""
        mock_analysis_service.validate_services = AsyncMock(return_value={
            "ffmpeg": True,
            "cos": False,  # COS服务异常
            "asr": True,
            "hook_analyzer": True
        })
        
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["services"]["cos"] == False
    
    def test_health_check_exception(self, client, mock_analysis_service):
        """测试健康检查异常"""
        mock_analysis_service.validate_services = AsyncMock(
            side_effect=Exception("健康检查失败")
        )
        
        response = client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "健康检查失败" in data["error"]


@pytest.mark.asyncio
class TestAnalyzeAPIAsync:
    """异步API测试"""
    
    @pytest.fixture
    async def async_client(self):
        """创建异步测试客户端"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    
    async def test_analyze_content_concurrent_requests(self, async_client):
        """测试并发分析请求"""
        with patch('app.api.v1.endpoints.analyze.analysis_service') as mock_service:
            mock_result = AnalysisResult(
                task_id="test-task-id",
                status=AnalysisStatus.COMPLETED,
                progress=1.0,
                created_at="2025-07-07T14:00:00Z",
                updated_at="2025-07-07T14:00:00Z"
            )
            mock_service.analyze_content = AsyncMock(return_value=mock_result)
            
            # 创建多个并发请求
            tasks = []
            for i in range(5):
                task = async_client.post(
                    "/api/v1/analyze",
                    data={
                        "content_type": "text",
                        "text_content": f"测试文本 {i}"
                    }
                )
                tasks.append(task)
            
            # 等待所有请求完成
            responses = await asyncio.gather(*tasks)
            
            # 验证所有请求都成功
            for response in responses:
                assert response.status_code == 200
                data = response.json()
                assert data["success"] == True
            
            # 验证服务被调用了5次
            assert mock_service.analyze_content.call_count == 5