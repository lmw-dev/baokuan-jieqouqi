import asyncio
import time
from typing import Any, Optional
from loguru import logger

from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.asr.v20190614 import asr_client, models
from tencentcloud.common.exception.tencent_cloud_sdk_exception import (
    TencentCloudSDKException,
)

from app.core.config import settings
from app.schemas.analyze_schema import TranscriptionResult


class TencentASRService:
    """
    腾讯云语音识别服务
    文档: https://cloud.tencent.com/document/product/1093/52554
    支持: 录音文件识别、一句话识别
    """

    def __init__(self):
        # 初始化客户端凭证
        self.cred = credential.Credential(
            settings.tencent_secret_id, settings.tencent_secret_key
        )

        # 配置HTTP请求参数
        http_profile = HttpProfile()
        http_profile.endpoint = "asr.tencentcloudapi.com"

        # 配置客户端参数
        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile

        # 创建ASR客户端
        self.client = asr_client.AsrClient(
            self.cred, settings.tencent_region, client_profile
        )

        logger.info(f"腾讯云ASR服务初始化完成，区域: {settings.tencent_region}")

    async def transcribe_audio_file(
        self,
        audio_file_url: str,
        source_type: int = 0,  # 0: URL, 1: 数据
        engine_type: str = "16k_zh",
    ) -> TranscriptionResult:
        """
        录音文件识别（支持MP3, WAV格式）

        Args:
            audio_file_url: 音频文件的COS访问URL或本地文件路径
            source_type: 语音数据来源 0: URL 1: 数据
            engine_type: 引擎模型类型 16k_zh:中文普通话通用

        Returns:
            TranscriptionResult: 转录结果

        Raises:
            RuntimeError: ASR服务调用失败
        """
        try:
            logger.info(
                f"开始录音文件识别: {audio_file_url}, source_type: {source_type}"
            )

            # 创建录音文件识别请求
            req = models.CreateRecTaskRequest()

            # 设置引擎模型类型
            req.EngineModelType = engine_type
            req.ChannelNum = 1  # 声道数
            req.ResTextFormat = 0  # 识别结果文本编码方式 0: UTF-8
            req.SourceType = source_type

            if source_type == 0:
                # URL方式
                req.Url = audio_file_url
            elif source_type == 1:
                # 数据方式 - 从本地文件读取并编码
                import base64
                import os

                if not os.path.exists(audio_file_url):
                    raise FileNotFoundError(f"音频文件不存在: {audio_file_url}")

                # 读取音频文件
                with open(audio_file_url, "rb") as f:
                    audio_data = f.read()

                # Base64编码
                req.Data = base64.b64encode(audio_data).decode("utf-8")
                req.DataLen = len(audio_data)

                logger.info(f"音频文件大小: {len(audio_data)} bytes")
            else:
                raise ValueError(f"不支持的source_type: {source_type}")

            # 调用录音文件识别接口
            resp = await asyncio.get_event_loop().run_in_executor(
                None, self.client.CreateRecTask, req
            )

            # 获取任务ID
            task_id = resp.Data.TaskId
            logger.info(f"录音文件识别任务创建成功，任务ID: {task_id}")

            # 轮询获取识别结果
            result = await self._poll_task_result(task_id)

            logger.info(f"录音文件识别完成，文本长度: {len(result.text)}")
            return result

        except TencentCloudSDKException as e:
            error_msg = f"腾讯云ASR SDK异常: {e.get_code()} - {e.get_message()}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            error_msg = f"录音文件识别失败: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    async def transcribe_local_audio_file(
        self, audio_file_path: str, engine_type: str = "16k_zh"
    ) -> TranscriptionResult:
        """
        本地音频文件识别（智能版本，支持切片处理）
        根据音频时长和文件大小智能选择处理策略

        Args:
            audio_file_path: 本地音频文件路径
            engine_type: 引擎模型类型

        Returns:
            TranscriptionResult: 转录结果
        """
        import os

        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"音频文件不存在: {audio_file_path}")

        # 获取文件大小和时长信息
        file_size = os.path.getsize(audio_file_path)
        audio_duration = await self._get_audio_duration(audio_file_path)
        logger.info(f"音频文件: {file_size} bytes, 时长: {audio_duration}秒")

        # 腾讯云ASR限制
        max_short_audio_size = 3 * 1024 * 1024  # 3MB，一句话识别限制
        max_short_audio_duration = 60  # 60秒，一句话识别限制
        max_data_size = 5 * 1024 * 1024  # 5MB，长音频识别限制

        # 智能策略选择
        if audio_duration > max_short_audio_duration:
            # 时长超过60秒，必须切片处理
            logger.info(f"音频时长{audio_duration}秒超过60秒限制，开始切片处理")
            return await self._transcribe_audio_with_chunking(
                audio_file_path, engine_type
            )

        elif file_size > max_data_size:
            # 文件超过5MB，切片处理
            logger.info(f"音频文件{file_size} bytes超过5MB限制，开始切片处理")
            return await self._transcribe_audio_with_chunking(
                audio_file_path, engine_type
            )

        elif (
            file_size <= max_short_audio_size
            and audio_duration <= max_short_audio_duration
        ):
            # 符合一句话识别条件，优先使用
            try:
                logger.info("使用一句话识别（短音频优化）")
                with open(audio_file_path, "rb") as f:
                    audio_data = f.read()
                return await self.transcribe_short_audio(audio_data, engine_type)
            except Exception as e:
                logger.warning(f"一句话识别失败，降级到长音频识别: {str(e)}")
                # 降级到长音频识别

        # 使用数据方式长音频识别
        logger.info("使用长音频识别（数据方式）")
        return await self.transcribe_audio_file(
            audio_file_path, source_type=1, engine_type=engine_type
        )

    async def _poll_task_result(
        self, task_id: int, max_retries: int = 60, poll_interval: int = 5
    ) -> TranscriptionResult:
        """
        轮询获取识别结果

        Args:
            task_id: 任务ID
            max_retries: 最大重试次数（默认60次，共5分钟）
            poll_interval: 轮询间隔（秒，默认5秒）

        Returns:
            TranscriptionResult: 转录结果
        """
        for attempt in range(max_retries):
            try:
                # 创建查询请求
                req = models.DescribeTaskStatusRequest()
                req.TaskId = task_id

                # 查询任务状态
                resp = await asyncio.get_event_loop().run_in_executor(
                    None, self.client.DescribeTaskStatus, req
                )

                status = resp.Data.StatusStr
                logger.debug(f"任务状态查询 {attempt + 1}/{max_retries}: {status}")

                if status == "success":
                    # 识别成功，解析结果
                    result_detail = resp.Data.ResultDetail

                    # 合并所有分段的识别文本
                    full_text = ""
                    total_confidence = 0.0
                    segment_count = 0

                    for segment in result_detail:
                        if hasattr(segment, "FinalSentence"):
                            full_text += segment.FinalSentence
                            if hasattr(segment, "SliceName"):
                                # 计算平均置信度
                                total_confidence += 1.0  # 腾讯云API可能不返回具体置信度
                                segment_count += 1

                    avg_confidence = (
                        total_confidence / segment_count if segment_count > 0 else 0.95
                    )

                    return TranscriptionResult(
                        text=full_text.strip(),
                        confidence=avg_confidence,
                        language=settings.asr_language,
                    )

                elif status == "failed":
                    error_msg = getattr(resp.Data, "ErrorMsg", "识别失败")
                    raise RuntimeError(f"ASR识别失败: {error_msg}")

                elif status in ["waiting", "doing"]:
                    # 任务进行中，等待下次轮询
                    await asyncio.sleep(poll_interval)
                    continue

                else:
                    logger.warning(f"未知任务状态: {status}")
                    await asyncio.sleep(poll_interval)
                    continue

            except TencentCloudSDKException as e:
                logger.error(f"查询任务状态失败: {e.get_code()} - {e.get_message()}")
                await asyncio.sleep(poll_interval)
                continue
            except Exception as e:
                logger.error(f"轮询任务结果异常: {str(e)}")
                await asyncio.sleep(poll_interval)
                continue

        # 超时失败
        raise TimeoutError(f"ASR识别超时，任务ID: {task_id}")

    async def transcribe_short_audio(
        self, audio_data: bytes, engine_type: str = "16k_zh"
    ) -> TranscriptionResult:
        """
        一句话识别（适用于短音频，<60秒）

        Args:
            audio_data: 音频二进制数据
            engine_type: 引擎模型类型

        Returns:
            TranscriptionResult: 转录结果
        """
        try:
            logger.info("开始一句话识别")

            # 创建一句话识别请求
            req = models.SentenceRecognitionRequest()

            # 设置请求参数
            req.ProjectId = 0
            req.SubServiceType = 2  # 一句话识别
            req.EngSerViceType = engine_type
            req.SourceType = 1  # 数据方式
            req.VoiceFormat = "mp3"  # 音频格式
            req.UsrAudioKey = f"audio_{int(time.time())}"  # 音频唯一标识

            # 设置音频数据（需要base64编码）
            import base64

            req.Data = base64.b64encode(audio_data).decode("utf-8")
            req.DataLen = len(audio_data)

            # 调用一句话识别接口
            resp = await asyncio.get_event_loop().run_in_executor(
                None, self.client.SentenceRecognition, req
            )

            # 解析识别结果
            result_text = resp.Result
            confidence = 0.95  # 腾讯云一句话识别不返回置信度，给默认值

            logger.info(f"一句话识别完成: {result_text}")

            return TranscriptionResult(
                text=result_text, confidence=confidence, language=settings.asr_language
            )

        except TencentCloudSDKException as e:
            error_msg = f"腾讯云ASR SDK异常: {e.get_code()} - {e.get_message()}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            error_msg = f"一句话识别失败: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    async def get_task_status(self, task_id: int) -> dict[str, Any]:
        """
        获取任务状态

        Args:
            task_id: 任务ID

        Returns:
            Dict: 任务状态信息
        """
        try:
            req = models.DescribeTaskStatusRequest()
            req.TaskId = task_id

            resp = await asyncio.get_event_loop().run_in_executor(
                None, self.client.DescribeTaskStatus, req
            )

            return {
                "task_id": task_id,
                "status": resp.Data.StatusStr,
                "error_msg": getattr(resp.Data, "ErrorMsg", None),
            }

        except Exception as e:
            logger.error(f"获取任务状态失败: {str(e)}")
            return {"task_id": task_id, "status": "error", "error_msg": str(e)}

    def validate_audio_format(self, file_path: str) -> bool:
        """
        验证音频格式是否支持

        Args:
            file_path: 音频文件路径

        Returns:
            bool: 是否支持
        """
        from pathlib import Path

        supported_formats = {".mp3", ".wav", ".m4a", ".aac"}
        file_extension = Path(file_path).suffix.lower()

        return file_extension in supported_formats

    async def _get_audio_duration(self, audio_file_path: str) -> float:
        """
        获取音频文件时长

        Args:
            audio_file_path: 音频文件路径

        Returns:
            float: 音频时长（秒）
        """
        try:
            import json
            import subprocess

            cmd = [
                "ffprobe",
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                audio_file_path,
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                probe_data = json.loads(stdout.decode())
                duration = float(probe_data.get("format", {}).get("duration", 0))
                return duration
            else:
                logger.warning(f"无法获取音频时长: {stderr.decode()}")
                return 0.0

        except Exception as e:
            logger.error(f"获取音频时长失败: {str(e)}")
            return 0.0

    async def _transcribe_audio_with_chunking(
        self, audio_file_path: str, engine_type: str = "16k_zh"
    ) -> TranscriptionResult:
        """
        对长音频进行切片处理后进行识别

        Args:
            audio_file_path: 音频文件路径
            engine_type: 引擎模型类型

        Returns:
            TranscriptionResult: 转录结果
        """
        import os
        import tempfile

        temp_chunks = []
        try:
            logger.info("开始音频切片处理")

            # 获取音频时长
            total_duration = await self._get_audio_duration(audio_file_path)
            chunk_duration = 50  # 50秒一段，保证在60秒限制内

            if total_duration <= 60:
                # 时长未超过60秒，直接使用长音频识别
                return await self.transcribe_audio_file(
                    audio_file_path, source_type=1, engine_type=engine_type
                )

            # 切片处理
            chunk_count = int(total_duration / chunk_duration) + 1
            logger.info(f"音频总时长{total_duration}秒，将分割为{chunk_count}个片段")

            all_transcripts = []
            total_confidence = 0.0

            for i in range(chunk_count):
                start_time = i * chunk_duration

                # 创建临时文件
                with tempfile.NamedTemporaryFile(
                    suffix=".mp3", delete=False
                ) as temp_chunk:
                    chunk_path = temp_chunk.name
                    temp_chunks.append(chunk_path)

                # 使用FFmpeg切片
                cmd = [
                    "ffmpeg",
                    "-i",
                    audio_file_path,
                    "-ss",
                    str(start_time),
                    "-t",
                    str(chunk_duration),
                    "-acodec",
                    "mp3",
                    "-ar",
                    "16000",
                    "-ac",
                    "1",
                    "-y",
                    chunk_path,
                ]

                process = await asyncio.create_subprocess_exec(
                    *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                )

                stdout, stderr = await process.communicate()

                if process.returncode != 0:
                    logger.error(f"切片{i + 1}失败: {stderr.decode()}")
                    continue

                # 检查切片文件大小
                chunk_size = os.path.getsize(chunk_path)
                if chunk_size == 0:
                    logger.warning(f"切片{i + 1}为空文件，跳过")
                    continue

                # 识别切片
                try:
                    logger.info(f"识别切片{i + 1}/{chunk_count}: {chunk_size} bytes")

                    # 优先使用一句话识别
                    with open(chunk_path, "rb") as f:
                        chunk_data = f.read()

                    if len(chunk_data) <= 3 * 1024 * 1024:  # 3MB以内使用一句话识别
                        chunk_result = await self.transcribe_short_audio(
                            chunk_data, engine_type
                        )
                    else:
                        chunk_result = await self.transcribe_audio_file(
                            chunk_path, source_type=1, engine_type=engine_type
                        )

                    if chunk_result.text.strip():
                        all_transcripts.append(chunk_result.text.strip())
                        total_confidence += chunk_result.confidence
                        logger.info(
                            f"切片{i + 1}识别成功: {len(chunk_result.text)}个字符"
                        )

                except Exception as e:
                    logger.error(f"切片{i + 1}识别失败: {str(e)}")
                    continue

            # 合并结果
            if not all_transcripts:
                raise RuntimeError("所有切片识别都失败")

            final_text = "".join(all_transcripts)
            avg_confidence = (
                total_confidence / len(all_transcripts) if all_transcripts else 0.0
            )

            logger.info(
                f"切片识别完成: {len(all_transcripts)}个片段，"
                f"总文本长度{len(final_text)}字符"
            )

            return TranscriptionResult(
                text=final_text,
                confidence=avg_confidence,
                language=settings.asr_language,
            )

        except Exception as e:
            logger.error(f"切片识别失败: {str(e)}")
            raise RuntimeError(f"切片识别失败: {str(e)}")
        finally:
            # 清理临时文件
            for chunk_path in temp_chunks:
                try:
                    if os.path.exists(chunk_path):
                        os.unlink(chunk_path)
                except Exception as e:
                    logger.warning(f"清理临时文件失败 {chunk_path}: {str(e)}")

    async def test_connection(self) -> bool:
        """
        测试ASR服务连接

        Returns:
            bool: 连接是否成功
        """
        try:
            # 创建一个简单的测试请求
            req = models.DescribeTaskStatusRequest()
            req.TaskId = 999999999  # 使用一个不存在的任务ID进行连接测试

            # 执行请求（预期会失败，但能验证连接）
            await asyncio.get_event_loop().run_in_executor(
                None, self.client.DescribeTaskStatus, req
            )

            return True

        except TencentCloudSDKException as e:
            # 如果是认证或权限问题，说明连接有问题
            if e.get_code() in ["AuthFailure", "UnauthorizedOperation"]:
                logger.error(f"ASR服务认证失败: {e.get_message()}")
                return False
            # 其他错误（如任务不存在）说明连接正常
            return True
        except Exception as e:
            logger.error(f"ASR服务连接测试失败: {str(e)}")
            return False

