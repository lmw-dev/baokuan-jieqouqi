import pytest
import asyncio
import tempfile
import os
import json
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

from app.services.media_converter_service import MediaConverterService
from app.schemas.analyze_schema import MediaInfo


class TestMediaConverterService:
    """媒体转换服务测试"""
    
    @pytest.fixture
    def media_converter(self):
        """创建媒体转换服务实例"""
        return MediaConverterService()
    
    @pytest.fixture
    def mock_video_file(self):
        """创建模拟视频文件"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
            f.write(b'fake video data')
            yield f.name
        os.unlink(f.name)
    
    def test_init(self, media_converter):
        """测试初始化"""
        assert media_converter.output_audio_format == 'mp3'
        assert media_converter.ffmpeg_path == 'ffmpeg'
        assert '.mp4' in media_converter.supported_video_formats
        assert '.mp3' in media_converter.supported_audio_formats
    
    def test_is_video_file(self, media_converter):
        """测试视频文件检测"""
        assert media_converter.is_video_file('test.mp4') == True
        assert media_converter.is_video_file('test.mov') == True
        assert media_converter.is_video_file('test.avi') == True
        assert media_converter.is_video_file('test.webm') == True
        assert media_converter.is_video_file('test.txt') == False
        assert media_converter.is_video_file('test.mp3') == False
    
    def test_is_audio_file(self, media_converter):
        """测试音频文件检测"""
        assert media_converter.is_audio_file('test.mp3') == True
        assert media_converter.is_audio_file('test.wav') == True
        assert media_converter.is_audio_file('test.m4a') == True
        assert media_converter.is_audio_file('test.aac') == True
        assert media_converter.is_audio_file('test.mp4') == False
        assert media_converter.is_audio_file('test.txt') == False
    
    def test_build_ffmpeg_command(self, media_converter):
        """测试FFmpeg命令构建"""
        input_path = "/path/to/input.mp4"
        output_path = "/path/to/output.mp3"
        
        cmd = media_converter._build_ffmpeg_command(input_path, output_path, "mp3")
        
        assert cmd[0] == 'ffmpeg'
        assert '-i' in cmd
        assert input_path in cmd
        assert '-vn' in cmd
        assert '-acodec' in cmd
        assert 'mp3' in cmd
        assert output_path == cmd[-1]
    
    @pytest.mark.asyncio
    async def test_validate_ffmpeg_success(self, media_converter):
        """测试FFmpeg验证成功"""
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            # 模拟成功的FFmpeg调用
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (b'ffmpeg version 4.4.0', b'')
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            result = await media_converter.validate_ffmpeg()
            assert result == True
    
    @pytest.mark.asyncio
    async def test_validate_ffmpeg_failure(self, media_converter):
        """测试FFmpeg验证失败"""
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            # 模拟失败的FFmpeg调用
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (b'', b'command not found')
            mock_process.returncode = 1
            mock_subprocess.return_value = mock_process
            
            result = await media_converter.validate_ffmpeg()
            assert result == False
    
    @pytest.mark.asyncio
    async def test_validate_ffmpeg_not_found(self, media_converter):
        """测试FFmpeg不存在"""
        with patch('asyncio.create_subprocess_exec', side_effect=FileNotFoundError):
            result = await media_converter.validate_ffmpeg()
            assert result == False
    
    @pytest.mark.asyncio
    async def test_get_audio_info_success(self, media_converter):
        """测试获取音频信息成功"""
        mock_probe_data = {
            "format": {
                "duration": "120.5",
                "bit_rate": "128000",
                "size": "1024000"
            },
            "streams": [{
                "sample_rate": "16000",
                "channels": "1",
                "codec_name": "mp3"
            }]
        }
        
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (
                json.dumps(mock_probe_data).encode(), b''
            )
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            import json
            audio_info = await media_converter.get_audio_info("/fake/path.mp3")
            
            assert isinstance(audio_info, MediaInfo)
            assert audio_info.duration == 120.5
            assert audio_info.sample_rate == 16000
            assert audio_info.channels == 1
            assert audio_info.codec == "mp3"
    
    @pytest.mark.asyncio
    async def test_get_audio_info_failure(self, media_converter):
        """测试获取音频信息失败"""
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (b'', b'error')
            mock_process.returncode = 1
            mock_subprocess.return_value = mock_process
            
            audio_info = await media_converter.get_audio_info("/fake/path.mp3")
            
            assert isinstance(audio_info, MediaInfo)
            assert audio_info.duration == 0.0
            assert audio_info.format_name == "unknown"
    
    @pytest.mark.asyncio
    async def test_extract_audio_from_video_file_not_found(self, media_converter):
        """测试视频文件不存在"""
        with pytest.raises(FileNotFoundError):
            await media_converter.extract_audio_from_video("/nonexistent/file.mp4")
    
    @pytest.mark.asyncio
    async def test_extract_audio_from_video_unsupported_format(self, media_converter):
        """测试不支持的视频格式"""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
            f.write(b'not a video')
            temp_path = f.name
        
        try:
            with pytest.raises(ValueError, match="不支持的视频格式"):
                await media_converter.extract_audio_from_video(temp_path)
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_extract_audio_timeout(self, media_converter):
        """测试转换超时"""
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
            f.write(b'fake video')
            temp_path = f.name
        
        try:
            with patch('asyncio.create_subprocess_exec') as mock_subprocess:
                mock_process = AsyncMock()
                mock_process.communicate.side_effect = asyncio.TimeoutError()
                mock_subprocess.return_value = mock_process
                
                with pytest.raises(TimeoutError, match="视频转换超时"):
                    await media_converter.extract_audio_from_video(temp_path)
        finally:
            os.unlink(temp_path)
    
    def test_cleanup_file(self, media_converter):
        """测试文件清理"""
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False) as f:
            temp_path = f.name
        
        # 确认文件存在
        assert os.path.exists(temp_path)
        
        # 清理文件
        media_converter._cleanup_file(temp_path)
        
        # 确认文件被删除
        assert not os.path.exists(temp_path)
    
    def test_cleanup_nonexistent_file(self, media_converter):
        """测试清理不存在的文件"""
        # 应该不抛出异常
        media_converter._cleanup_file("/nonexistent/file.tmp")
    
    @pytest.mark.asyncio
    async def test_cleanup_temp_file_async(self, media_converter):
        """测试异步文件清理"""
        with tempfile.NamedTemporaryFile(delete=False) as f:
            temp_path = f.name
        
        assert os.path.exists(temp_path)
        
        await media_converter.cleanup_temp_file(temp_path)
        
        assert not os.path.exists(temp_path)