import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock

from app.services.tencent_asr_service import TencentASRService
from app.schemas.analyze_schema import TranscriptionResult


class TestTencentASRService:
    """腾讯云ASR服务测试"""
    
    @pytest.fixture
    def asr_service(self):
        """创建ASR服务实例"""
        with patch('app.services.tencent_asr_service.asr_client.AsrClient'):
            return TencentASRService()
    
    def test_init(self, asr_service):
        """测试ASR服务初始化"""
        assert asr_service.client is not None
        assert asr_service.cred is not None
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_file_success(self, asr_service):
        """测试录音文件识别成功"""
        audio_url = "https://example.com/audio.mp3"
        
        # Mock创建任务响应
        mock_create_response = Mock()
        mock_create_response.Data.TaskId = 12345
        
        # Mock查询响应
        mock_query_response = Mock()
        mock_query_response.Data.StatusStr = "success"
        mock_query_response.Data.ResultDetail = [
            Mock(FinalSentence="这是测试语音识别结果。"),
            Mock(FinalSentence="包含多个分段内容。")
        ]
        
        asr_service.client.CreateRecTask = Mock(return_value=mock_create_response)
        asr_service.client.DescribeTaskStatus = Mock(return_value=mock_query_response)
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.side_effect = [
                mock_create_response,  # CreateRecTask调用
                mock_query_response    # DescribeTaskStatus调用
            ]
            
            with patch('asyncio.sleep'):  # Mock sleep函数
                result = await asr_service.transcribe_audio_file(audio_url)
        
        assert isinstance(result, TranscriptionResult)
        assert result.text == "这是测试语音识别结果。包含多个分段内容。"
        assert result.confidence > 0
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_file_failure(self, asr_service):
        """测试录音文件识别失败"""
        audio_url = "https://example.com/audio.mp3"
        
        # Mock创建任务失败
        from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
        
        asr_service.client.CreateRecTask = Mock(
            side_effect=TencentCloudSDKException("AuthFailure", "认证失败")
        )
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.side_effect = TencentCloudSDKException("AuthFailure", "认证失败")
            
            with pytest.raises(RuntimeError, match="腾讯云ASR SDK异常"):
                await asr_service.transcribe_audio_file(audio_url)
    
    @pytest.mark.asyncio
    async def test_poll_task_result_success(self, asr_service):
        """测试轮询任务结果成功"""
        task_id = 12345
        
        # Mock第一次查询返回进行中，第二次返回成功
        responses = [
            Mock(Data=Mock(StatusStr="doing")),
            Mock(Data=Mock(
                StatusStr="success",
                ResultDetail=[Mock(FinalSentence="识别结果")]
            ))
        ]
        
        asr_service.client.DescribeTaskStatus = Mock(side_effect=responses)
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.side_effect = responses
            
            with patch('asyncio.sleep'):  # Mock sleep函数
                result = await asr_service._poll_task_result(task_id, max_retries=2, poll_interval=1)
        
        assert isinstance(result, TranscriptionResult)
        assert result.text == "识别结果"
    
    @pytest.mark.asyncio
    async def test_poll_task_result_timeout(self, asr_service):
        """测试轮询任务结果超时"""
        task_id = 12345
        
        # Mock一直返回进行中状态
        mock_response = Mock(Data=Mock(StatusStr="doing"))
        asr_service.client.DescribeTaskStatus = Mock(return_value=mock_response)
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.return_value = mock_response
            
            with patch('asyncio.sleep'):  # Mock sleep函数
                with pytest.raises(TimeoutError, match="ASR识别超时"):
                    await asr_service._poll_task_result(task_id, max_retries=2, poll_interval=1)
    
    @pytest.mark.asyncio
    async def test_transcribe_short_audio_success(self, asr_service):
        """测试一句话识别成功"""
        audio_data = b"fake audio data"
        
        # Mock一句话识别响应
        mock_response = Mock()
        mock_response.Result = "短音频识别结果"
        
        asr_service.client.SentenceRecognition = Mock(return_value=mock_response)
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.return_value = mock_response
            
            result = await asr_service.transcribe_short_audio(audio_data)
        
        assert isinstance(result, TranscriptionResult)
        assert result.text == "短音频识别结果"
        assert result.confidence == 0.95  # 默认置信度
    
    @pytest.mark.asyncio
    async def test_transcribe_short_audio_failure(self, asr_service):
        """测试一句话识别失败"""
        audio_data = b"fake audio data"
        
        from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
        
        asr_service.client.SentenceRecognition = Mock(
            side_effect=TencentCloudSDKException("InvalidParameter", "参数错误")
        )
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.side_effect = TencentCloudSDKException("InvalidParameter", "参数错误")
            
            with pytest.raises(RuntimeError, match="腾讯云ASR SDK异常"):
                await asr_service.transcribe_short_audio(audio_data)
    
    @pytest.mark.asyncio
    async def test_get_task_status_success(self, asr_service):
        """测试获取任务状态成功"""
        task_id = 12345
        
        mock_response = Mock()
        mock_response.Data.StatusStr = "success"
        
        asr_service.client.DescribeTaskStatus = Mock(return_value=mock_response)
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.return_value = mock_response
            
            result = await asr_service.get_task_status(task_id)
        
        assert result["task_id"] == task_id
        assert result["status"] == "success"
        assert result["error_msg"] is None
    
    @pytest.mark.asyncio
    async def test_get_task_status_failure(self, asr_service):
        """测试获取任务状态失败"""
        task_id = 12345
        
        asr_service.client.DescribeTaskStatus = Mock(
            side_effect=Exception("Network error")
        )
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.side_effect = Exception("Network error")
            
            result = await asr_service.get_task_status(task_id)
        
        assert result["task_id"] == task_id
        assert result["status"] == "error"
        assert "Network error" in result["error_msg"]
    
    def test_validate_audio_format(self, asr_service):
        """测试音频格式验证"""
        test_cases = [
            ("audio.mp3", True),
            ("audio.wav", True),
            ("audio.m4a", True),
            ("audio.aac", True),
            ("video.mp4", False),
            ("document.txt", False)
        ]
        
        for file_path, expected in test_cases:
            result = asr_service.validate_audio_format(file_path)
            assert result == expected
    
    @pytest.mark.asyncio
    async def test_test_connection_success(self, asr_service):
        """测试ASR连接测试成功"""
        from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
        
        # 使用一个预期的错误（任务不存在）来验证连接正常
        asr_service.client.DescribeTaskStatus = Mock(
            side_effect=TencentCloudSDKException("ResourceNotFound", "任务不存在")
        )
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.side_effect = TencentCloudSDKException("ResourceNotFound", "任务不存在")
            
            result = await asr_service.test_connection()
        
        assert result == True
    
    @pytest.mark.asyncio
    async def test_test_connection_auth_failure(self, asr_service):
        """测试ASR连接测试认证失败"""
        from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
        
        asr_service.client.DescribeTaskStatus = Mock(
            side_effect=TencentCloudSDKException("AuthFailure", "认证失败")
        )
        
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_executor = AsyncMock()
            mock_loop.return_value.run_in_executor = mock_executor
            mock_executor.side_effect = TencentCloudSDKException("AuthFailure", "认证失败")
            
            result = await asr_service.test_connection()
        
        assert result == False