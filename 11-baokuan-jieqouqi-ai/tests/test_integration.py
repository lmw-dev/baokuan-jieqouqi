import pytest
import tempfile
import os
from unittest.mock import patch, AsyncMock
from pathlib import Path

from app.services.analysis_service import AnalysisService
from app.schemas.analyze_schema import AnalyzeRequest, AnalysisOptions, AnalysisStatus


class TestIntegration:
    """集成测试"""
    
    @pytest.fixture
    def analysis_service(self):
        """创建分析服务实例"""
        with patch('app.services.analysis_service.get_db_session'):
            return AnalysisService()
    
    @pytest.fixture
    def mock_external_services(self):
        """模拟所有外部服务"""
        with patch.multiple(
            'app.services.analysis_service',
            # 模拟COS服务
            COSService=lambda: AsyncMock(
                upload_file=AsyncMock(return_value="https://example.com/file.mp4"),
                generate_file_key=lambda filename, prefix: f"{prefix}/{filename}"
            ),
            # 模拟ASR服务
            TencentASRService=lambda: AsyncMock(
                transcribe_audio_file=AsyncMock(return_value=AsyncMock(
                    text="这是转录的文本内容，包含一些营销词汇和专家观点",
                    confidence=0.95,
                    duration=120.5
                ))
            ),
            # 模拟媒体转换服务
            MediaConverterService=lambda: AsyncMock(
                is_video_file=lambda filename: filename.endswith('.mp4'),
                is_audio_file=lambda filename: filename.endswith('.mp3'),
                extract_audio_from_video=AsyncMock(return_value=(
                    "/tmp/audio.mp3",
                    AsyncMock(duration=120.5)
                )),
                cleanup_temp_file=AsyncMock()
            ),
            # 模拟钩子分析服务
            HookAnalysisService=lambda: AsyncMock(
                analyze_text_hooks=AsyncMock(return_value=[
                    AsyncMock(
                        hook_type=AsyncMock(value="建立权威"),
                        content="作为专家，我要说",
                        confidence=0.8,
                        matched_keywords=["专家"]
                    )
                ])
            )
        ):
            yield
    
    @pytest.fixture
    def mock_database(self):
        """模拟数据库操作"""
        with patch('app.services.analysis_service.get_db_session') as mock_session:
            mock_db = AsyncMock()
            mock_session.return_value.__aenter__.return_value = mock_db
            mock_db.add = AsyncMock()
            mock_db.flush = AsyncMock()
            mock_db.commit = AsyncMock()
            mock_db.get = AsyncMock()
            yield mock_db
    
    @pytest.mark.asyncio
    async def test_text_analysis_end_to_end(
        self, 
        analysis_service, 
        mock_external_services, 
        mock_database
    ):
        """测试文本分析端到端流程"""
        # 准备请求
        request = AnalyzeRequest(
            content_type="text",
            text_content="作为一个有10年经验的专家，我要告诉大家一个重要的观点",
            analysis_options=AnalysisOptions(
                enable_hook_detection=True,
                language="zh-CN"
            )
        )
        
        # 执行分析
        result = await analysis_service.analyze_content(request)
        
        # 验证结果
        assert result.status == AnalysisStatus.COMPLETED
        assert result.progress == 1.0
        assert result.transcribed_text == request.text_content
        assert len(result.trust_hooks) > 0
        assert result.summary is not None
        
        # 验证数据库操作
        mock_database.add.assert_called()
        mock_database.commit.assert_called()
    
    @pytest.mark.asyncio
    async def test_video_file_analysis_end_to_end(
        self, 
        analysis_service, 
        mock_external_services, 
        mock_database
    ):
        """测试视频文件分析端到端流程"""
        # 准备请求
        request = AnalyzeRequest(
            content_type="file",
            analysis_options=AnalysisOptions(
                enable_asr=True,
                enable_hook_detection=True
            )
        )
        
        # 模拟视频文件数据
        file_data = b"fake video content"
        filename = "test_video.mp4"
        
        # 执行分析
        result = await analysis_service.analyze_content(
            request=request,
            file_data=file_data,
            original_filename=filename
        )
        
        # 验证结果
        assert result.status == AnalysisStatus.COMPLETED
        assert result.progress == 1.0
        assert result.file_name == filename
        assert result.file_size == len(file_data)
        assert result.file_url is not None
        assert result.transcribed_text is not None
        assert result.duration > 0
        assert len(result.trust_hooks) > 0
        
        # 验证服务调用
        mock_database.add.assert_called()
        mock_database.commit.assert_called()
    
    @pytest.mark.asyncio
    async def test_audio_file_analysis_end_to_end(
        self, 
        analysis_service, 
        mock_external_services, 
        mock_database
    ):
        """测试音频文件分析端到端流程"""
        # 修改媒体转换服务的行为以支持音频文件
        with patch.object(analysis_service.media_converter, 'is_audio_file', return_value=True), \
             patch.object(analysis_service.media_converter, 'is_video_file', return_value=False):
            
            request = AnalyzeRequest(
                content_type="file",
                analysis_options=AnalysisOptions(enable_asr=True)
            )
            
            file_data = b"fake audio content"
            filename = "test_audio.mp3"
            
            result = await analysis_service.analyze_content(
                request=request,
                file_data=file_data,
                original_filename=filename
            )
            
            assert result.status == AnalysisStatus.COMPLETED
            assert result.file_name == filename
            assert result.transcribed_text is not None
    
    @pytest.mark.asyncio
    async def test_analysis_with_disabled_features(
        self, 
        analysis_service, 
        mock_external_services, 
        mock_database
    ):
        """测试禁用某些功能的分析"""
        request = AnalyzeRequest(
            content_type="text",
            text_content="测试文本内容",
            analysis_options=AnalysisOptions(
                enable_asr=False,
                enable_hook_detection=False
            )
        )
        
        result = await analysis_service.analyze_content(request)
        
        assert result.status == AnalysisStatus.COMPLETED
        assert result.transcribed_text == request.text_content
        # 钩子分析被禁用，应该没有钩子
        assert len(result.trust_hooks) == 0
    
    @pytest.mark.asyncio
    async def test_analysis_service_validation(self, analysis_service):
        """测试分析服务验证"""
        with patch.object(analysis_service.media_converter, 'validate_ffmpeg', return_value=True), \
             patch.object(analysis_service.cos_service, 'test_connection', return_value=True), \
             patch.object(analysis_service.asr_service, 'test_connection', return_value=True), \
             patch.object(analysis_service.hook_analyzer, 'get_rule_count', return_value=5):
            
            results = await analysis_service.validate_services()
            
            assert results["ffmpeg"] == True
            assert results["cos"] == True
            assert results["asr"] == True
            assert results["hook_analyzer"] == True
    
    @pytest.mark.asyncio
    async def test_analysis_error_handling(
        self, 
        analysis_service, 
        mock_database
    ):
        """测试分析过程中的错误处理"""
        # 模拟COS上传失败
        with patch.object(analysis_service.cos_service, 'upload_file', side_effect=Exception("COS上传失败")):
            
            request = AnalyzeRequest(
                content_type="file",
                analysis_options=AnalysisOptions()
            )
            
            result = await analysis_service.analyze_content(
                request=request,
                file_data=b"test data",
                original_filename="test.mp4"
            )
            
            assert result.status == AnalysisStatus.FAILED
            assert "COS上传失败" in result.error_message
    
    @pytest.mark.asyncio
    async def test_get_analysis_status_integration(
        self, 
        analysis_service, 
        mock_database
    ):
        """测试获取分析状态的集成"""
        task_id = "test-task-id"
        
        # 模拟数据库返回
        mock_analysis_card = AsyncMock()
        mock_analysis_card.id = task_id
        mock_analysis_card.status = AnalysisStatus.COMPLETED
        mock_analysis_card.progress = 1.0
        mock_analysis_card.title = "测试分析"
        mock_analysis_card.transcribed_text = "测试文本"
        mock_analysis_card.trust_hooks = []
        mock_analysis_card.created_at = "2025-07-07T14:00:00Z"
        mock_analysis_card.updated_at = "2025-07-07T14:00:00Z"
        
        mock_database.get.return_value = mock_analysis_card
        
        result = await analysis_service.get_analysis_status(task_id)
        
        assert result is not None
        assert result.task_id == task_id
        assert result.status == AnalysisStatus.COMPLETED
        assert result.progress == 1.0
    
    @pytest.mark.asyncio
    async def test_unsupported_file_type(
        self, 
        analysis_service, 
        mock_external_services, 
        mock_database
    ):
        """测试不支持的文件类型"""
        request = AnalyzeRequest(
            content_type="file",
            analysis_options=AnalysisOptions()
        )
        
        # 模拟不支持的文件类型
        with patch.object(analysis_service.media_converter, 'is_video_file', return_value=False), \
             patch.object(analysis_service.media_converter, 'is_audio_file', return_value=False):
            
            result = await analysis_service.analyze_content(
                request=request,
                file_data=b"unsupported file",
                original_filename="test.txt"
            )
            
            assert result.status == AnalysisStatus.FAILED
            assert "不支持的文件类型" in result.error_message
    
    @pytest.mark.asyncio
    async def test_complete_workflow_with_hooks(
        self, 
        analysis_service, 
        mock_external_services, 
        mock_database
    ):
        """测试包含多个钩子的完整工作流程"""
        # 设置更丰富的钩子分析结果
        mock_hooks = [
            AsyncMock(
                hook_type=AsyncMock(value="建立权威"),
                content="作为专家",
                confidence=0.85,
                matched_keywords=["专家"],
                dict=lambda: {
                    "hook_type": "建立权威",
                    "content": "作为专家",
                    "confidence": 0.85,
                    "matched_keywords": ["专家"]
                }
            ),
            AsyncMock(
                hook_type=AsyncMock(value="制造冲突"),
                content="99%的人都不知道",
                confidence=0.75,
                matched_keywords=["99%的人"],
                dict=lambda: {
                    "hook_type": "制造冲突",
                    "content": "99%的人都不知道",
                    "confidence": 0.75,
                    "matched_keywords": ["99%的人"]
                }
            )
        ]
        
        analysis_service.hook_analyzer.analyze_text_hooks.return_value = mock_hooks
        
        request = AnalyzeRequest(
            content_type="text",
            text_content="作为一个专家，我要告诉大家99%的人都不知道的秘密",
            analysis_options=AnalysisOptions(enable_hook_detection=True)
        )
        
        result = await analysis_service.analyze_content(request)
        
        assert result.status == AnalysisStatus.COMPLETED
        assert len(result.trust_hooks) == 2
        assert any(hook.hook_type.value == "建立权威" for hook in result.trust_hooks)
        assert any(hook.hook_type.value == "制造冲突" for hook in result.trust_hooks)
        assert "专家" in result.summary or "99%的人" in result.summary