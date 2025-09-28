import subprocess
import tempfile
import os
import json
import asyncio
from typing import Tuple, Dict, Any, Optional
from pathlib import Path
from loguru import logger

from app.core.config import settings
from app.schemas.analyze_schema import MediaInfo


class MediaConverterService:
    """FFmpeg视频转音频服务"""
    
    def __init__(self):
        self.supported_video_formats = set(settings.allowed_video_formats)
        self.supported_audio_formats = set(settings.allowed_audio_formats)
        self.output_audio_format = 'mp3'
        self.ffmpeg_path = settings.ffmpeg_path
        self.max_conversion_time = settings.max_conversion_time
        self.temp_dir = Path(settings.temp_dir)
        
        # 确保临时目录存在
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    async def extract_audio_from_video(
        self, 
        video_file_path: str,
        output_format: str = "mp3"
    ) -> Tuple[str, MediaInfo]:
        """
        从视频文件中提取音频轨道
        
        Args:
            video_file_path: 视频文件路径
            output_format: 输出音频格式 (mp3, wav)
            
        Returns:
            Tuple[str, MediaInfo]: (音频文件路径, 音频信息)
        """
        if not self.is_video_file(video_file_path):
            raise ValueError(f"不支持的视频格式: {Path(video_file_path).suffix}")
        
        # 创建临时音频文件
        audio_output_path = self._create_temp_audio_path(output_format)
        
        try:
            logger.info(f"开始视频转音频: {video_file_path} -> {audio_output_path}")
            
            # 构建FFmpeg命令
            cmd = self._build_ffmpeg_command(video_file_path, audio_output_path, output_format)
            
            # 执行FFmpeg命令
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.max_conversion_time
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                self._cleanup_file(audio_output_path)
                raise TimeoutError(f"视频转换超时（{self.max_conversion_time}秒）")
            
            if process.returncode != 0:
                self._cleanup_file(audio_output_path)
                error_msg = stderr.decode() if stderr else "未知错误"
                raise RuntimeError(f"FFmpeg转换失败: {error_msg}")
            
            # 首先获取音频文件信息
            audio_info = await self.get_audio_info(audio_output_path)
            
            # 检查音频文件大小和时长，智能压缩策略
            file_size = os.path.getsize(audio_output_path)
            
            # 优先确保文件小于一句话识别限制（2MB，为3MB限制留缓冲）
            max_short_audio_size = 2 * 1024 * 1024  # 2MB，确保适合一句话识别
            
            # 检查音频时长，超过55秒的音频需要特殊处理
            if audio_info.duration > 55:  # 一句话识别限制60秒，留5秒缓冲
                logger.info(f"音频时长{audio_info.duration}秒，超过一句话识别限制，将进行切片处理")
                # 标记为需要切片处理，在ASR服务中处理
            elif file_size > max_short_audio_size:
                logger.info(f"音频文件太大({file_size} bytes)，压缩到一句话识别适用大小({max_short_audio_size} bytes)")
                audio_output_path = await self._compress_audio_for_asr(audio_output_path, max_short_audio_size)
                # 压缩后重新获取音频信息
                audio_info = await self.get_audio_info(audio_output_path)
            
            logger.info(f"视频转音频完成: {audio_output_path}, 时长: {audio_info.duration}秒")
            
            return audio_output_path, audio_info
            
        except Exception as e:
            # 清理临时文件
            if 'audio_output_path' in locals():
                self._cleanup_file(audio_output_path)
            
            logger.error(f"视频转音频失败: {str(e)}")
            raise
    
    def _build_ffmpeg_command(
        self, 
        input_path: str, 
        output_path: str, 
        output_format: str
    ) -> list[str]:
        """构建FFmpeg命令"""
        cmd = [
            self.ffmpeg_path,
            '-i', input_path,           # 输入视频文件
            '-vn',                      # 不处理视频流
            '-acodec', 'mp3' if output_format == 'mp3' else 'pcm_s16le',  # 音频编码器
            '-ar', str(settings.asr_sample_rate),  # 采样率（ASR推荐16kHz）
            '-ac', '1',                 # 单声道
            '-y',                       # 覆盖输出文件
        ]
        
        # 根据格式添加特定参数
        if output_format == 'mp3':
            cmd.extend(['-ab', '128k'])  # MP3比特率
        
        cmd.append(output_path)
        
        return cmd
    
    async def get_audio_info(self, audio_file_path: str) -> MediaInfo:
        """
        获取音频文件信息
        
        Args:
            audio_file_path: 音频文件路径
            
        Returns:
            MediaInfo: 音频信息
        """
        try:
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                audio_file_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.warning(f"无法获取音频信息: {stderr.decode()}")
                return MediaInfo(
                    duration=0.0,
                    format_name="unknown",
                    sample_rate=settings.asr_sample_rate,
                    channels=1
                )
            
            probe_data = json.loads(stdout.decode())
            format_info = probe_data.get('format', {})
            stream_info = probe_data.get('streams', [{}])[0]
            
            return MediaInfo(
                duration=float(format_info.get('duration', 0)),
                format_name=format_info.get('format_name', ''),
                bit_rate=int(format_info.get('bit_rate', 0)),
                sample_rate=int(stream_info.get('sample_rate', settings.asr_sample_rate)),
                channels=int(stream_info.get('channels', 1)),
                codec=stream_info.get('codec_name', '')
            )
            
        except Exception as e:
            logger.error(f"获取音频信息失败: {str(e)}")
            return MediaInfo(
                duration=0.0,
                format_name="unknown",
                sample_rate=settings.asr_sample_rate,
                channels=1
            )
    
    async def get_video_info(self, video_file_path: str) -> MediaInfo:
        """
        获取视频文件信息
        
        Args:
            video_file_path: 视频文件路径
            
        Returns:
            MediaInfo: 视频信息
        """
        try:
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                video_file_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"无法获取视频信息: {stderr.decode()}")
            
            probe_data = json.loads(stdout.decode())
            format_info = probe_data.get('format', {})
            
            # 查找音频流
            audio_stream = None
            for stream in probe_data.get('streams', []):
                if stream.get('codec_type') == 'audio':
                    audio_stream = stream
                    break
            
            return MediaInfo(
                duration=float(format_info.get('duration', 0)),
                format_name=format_info.get('format_name', ''),
                bit_rate=int(format_info.get('bit_rate', 0)),
                sample_rate=int(audio_stream.get('sample_rate', 0)) if audio_stream else 0,
                channels=int(audio_stream.get('channels', 0)) if audio_stream else 0,
                codec=audio_stream.get('codec_name', '') if audio_stream else ''
            )
            
        except Exception as e:
            logger.error(f"获取视频信息失败: {str(e)}")
            raise
    
    def _cleanup_file(self, file_path: str) -> None:
        """清理临时文件"""
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                logger.debug(f"已清理临时文件: {file_path}")
        except Exception as e:
            logger.warning(f"清理临时文件失败: {file_path}, 错误: {str(e)}")
    
    async def cleanup_temp_file(self, file_path: str) -> None:
        """异步清理临时文件"""
        await asyncio.get_event_loop().run_in_executor(None, self._cleanup_file, file_path)
    
    def is_video_file(self, file_path: str) -> bool:
        """检查是否为支持的视频文件"""
        return Path(file_path).suffix.lower() in self.supported_video_formats
    
    def is_audio_file(self, file_path: str) -> bool:
        """检查是否为支持的音频文件"""
        return Path(file_path).suffix.lower() in self.supported_audio_formats
    
    async def validate_ffmpeg(self) -> bool:
        """验证FFmpeg是否可用"""
        try:
            process = await asyncio.create_subprocess_exec(
                self.ffmpeg_path, '-version',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                logger.info("FFmpeg验证成功")
                return True
            else:
                logger.error(f"FFmpeg验证失败: {stderr.decode()}")
                return False
                
        except FileNotFoundError:
            logger.error(f"未找到FFmpeg: {self.ffmpeg_path}")
            return False
        except Exception as e:
            logger.error(f"FFmpeg验证异常: {str(e)}")
            return False

    def _create_temp_audio_path(self, output_format: str) -> str:
        """创建临时音频文件路径"""
        with tempfile.NamedTemporaryFile(
            suffix=f'.{output_format}', 
            delete=False,
            dir=self.temp_dir
        ) as temp_audio:
            audio_output_path = temp_audio.name
        return audio_output_path

    async def _compress_audio_for_asr(self, input_audio_path: str, target_size: int) -> str:
        """
        智能压缩音频文件以适合一句话识别处理
        
        Args:
            input_audio_path: 原始音频文件路径
            target_size: 目标文件大小（字节）
            
        Returns:
            str: 压缩后的音频文件路径
        """
        try:
            # 获取原始文件信息
            original_info = await self.get_audio_info(input_audio_path)
            original_size = os.path.getsize(input_audio_path)
            
            # 计算压缩比例
            compression_ratio = target_size / original_size
            
            # 计算新的比特率（保守估算）
            original_bitrate = original_info.bit_rate or 128000
            new_bitrate = int(original_bitrate * compression_ratio * 0.8)  # 0.8为安全系数
            new_bitrate = max(new_bitrate, 32000)  # 最低32kbps保证质量
            
            logger.info(f"压缩参数：原始大小{original_size}字节，目标大小{target_size}字节，新比特率{new_bitrate}bps")
            
            # 创建压缩后的临时文件
            compressed_path = self._create_temp_audio_path("mp3")
            
            # 构建压缩命令
            cmd = [
                self.ffmpeg_path,
                '-i', input_audio_path,
                '-vn',                          # 不处理视频流
                '-acodec', 'mp3',              # 使用MP3编码
                '-ab', f'{new_bitrate//1000}k', # 设置比特率
                '-ar', '16000',                # 降低采样率到16kHz（ASR推荐）
                '-ac', '1',                    # 单声道
                '-y',                          # 覆盖输出文件
                compressed_path
            ]
            
            # 执行压缩
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=300  # 5分钟压缩超时
            )
            
            if process.returncode != 0:
                self._cleanup_file(compressed_path)
                error_msg = stderr.decode() if stderr else "未知错误"
                raise RuntimeError(f"音频压缩失败: {error_msg}")
            
            # 检查压缩结果
            compressed_size = os.path.getsize(compressed_path)
            logger.info(f"音频压缩完成：{original_size} -> {compressed_size} bytes (压缩率: {compressed_size/original_size:.1%})")
            
            # 清理原始文件
            self._cleanup_file(input_audio_path)
            
            return compressed_path
            
        except Exception as e:
            logger.error(f"音频压缩失败: {str(e)}")
            raise