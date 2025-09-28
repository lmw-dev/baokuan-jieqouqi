"""
完整的分析服务 - 实现端到端的文件分析流程
"""
import os
import uuid
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
from loguru import logger
import asyncio

from app.db.session import get_db_session
from app.models.analysis import AnalysisSource, AnalysisCard, MediaFile, User, SourceType
from app.services.hook_analysis_service import HookAnalysisService
from app.services.media_converter_service import MediaConverterService
from app.services.tencent_asr_service import TencentASRService, TranscriptionResult
from app.services.cos_service import COSService
from app.services.ai.factory import get_ai_service
from app.core.exceptions import (
    FileNotFoundError, COSServiceError, ASRServiceError, 
    MediaProcessingError, DatabaseError, AnalysisServiceError
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class CompleteAnalysisService:
    """完整的分析服务 - 实现端到端流程"""
    
    def __init__(self):
        self.hook_analyzer = HookAnalysisService()
        self.media_converter = MediaConverterService()
        self.asr_service = TencentASRService()
        self.cos_service = COSService()
        logger.info("完整分析服务初始化完成")
    
    async def analyze_media_file(
        self, 
        media_file_id: str, 
        user_id: str = "test-user-001",
        force_reprocess: bool = False,
        force_new_card: bool = False
    ) -> Dict[str, Any]:
        """
        严谨的媒体文件分析流程
        
        流程步骤：
        1. 验证MediaFile是否存在
        2. 检查AnalysisSource中是否已有transcript
        3. 如果无transcript，验证COS文件存在后下载转录
        4. 进行信任之钩分析
        5. 保存分析结果
        
        Args:
            media_file_id: 媒体文件ID
            user_id: 用户ID
            force_reprocess: 是否强制重新处理（忽略现有transcript）
            force_new_card: 是否强制创建新分析卡片（支持多版本分析）
            
        Returns:
            Dict[str, Any]: 完整的分析结果
        """
        try:
            logger.info(f"开始严谨分析流程: media_file_id={media_file_id}, user_id={user_id}, force_reprocess={force_reprocess}, force_new_card={force_new_card}")
            
            async with get_db_session() as db:
                # 1. 严格验证：查询MediaFile是否存在
                media_file = await self._get_media_file(db, media_file_id)
                if not media_file:
                    logger.error(f"❌ 步骤1失败: MediaFile不存在 - {media_file_id}")
                    raise FileNotFoundError(
                        message="媒体文件记录不存在，请检查文件ID是否正确",
                        details=f"MediaFile ID: {media_file_id}"
                    )
                
                logger.info(f"✅ 步骤1成功: 找到MediaFile - {media_file.original_filename}, 存储路径: {media_file.storage_path}")
                
                # 2. 严格验证：检查AnalysisSource中是否已有transcript
                existing_analysis = await self._get_existing_analysis(db, media_file_id)
                
                if existing_analysis and existing_analysis.transcript and not force_reprocess:
                    logger.info(f"✅ 步骤2成功: 发现已有transcript，跳过下载转录，直接复用")
                    transcript = existing_analysis.transcript
                    metadata = {
                        "processing_method": "reuse_existing_transcript",
                        "reused_transcript": True,
                        "original_analysis_id": existing_analysis.id,
                        "video_path": media_file.storage_path,
                        "transcript_length": len(transcript)
                    }
                else:
                    logger.info(f"⚠️ 步骤2结果: 无可用transcript (existing_analysis={existing_analysis is not None}, force_reprocess={force_reprocess})")
                    
                    # 3. 严格验证：检查COS文件是否存在
                    cos_exists, cos_error = await self._verify_cos_file_exists_with_details(media_file.storage_path)
                    if not cos_exists:
                        logger.error(f"❌ 步骤3失败: COS文件验证失败 - {media_file.storage_path}")
                        logger.error(f"COS错误详情: {cos_error}")
                        raise COSServiceError(
                            message="云存储中的文件不存在或无法访问，请重新上传文件",
                            details=f"COS路径: {media_file.storage_path}, 错误: {cos_error}"
                        )
                    
                    logger.info(f"✅ 步骤3成功: COS文件存在，开始下载转录流程")
                    
                    # 4. 执行媒体文件处理和转录
                    transcript, metadata = await self._process_media_file(media_file.storage_path)
                    metadata["reused_transcript"] = False
                    metadata["force_reprocess"] = force_reprocess
                
                # 5. 创建或更新AnalysisSource记录
                analysis_source = await self._create_or_update_analysis_source(
                    db, media_file, transcript, user_id
                )
                logger.info(f"✅ 步骤5成功: AnalysisSource记录已保存 - {analysis_source.id}")
                
                # 6. 进行信任之钩分析
                trust_hooks = await self.hook_analyzer.analyze_text_hooks(transcript)
                logger.info(f"✅ 步骤6成功: 信任之钩分析完成，识别到 {len(trust_hooks)} 个钩子")
                
                # 7. 创建或更新AnalysisCard记录
                analysis_card = await self._create_or_update_analysis_card(
                    db, analysis_source, trust_hooks, transcript, force_new_card
                )
                logger.info(f"✅ 步骤7成功: AnalysisCard记录已保存 - {analysis_card.id}")
                
                # 8. 构建返回结果
                result = self._build_analysis_result(
                    analysis_source, analysis_card, trust_hooks, transcript, media_file, metadata
                )
                
                logger.info(f"🎉 分析流程全部完成: 识别到 {len(trust_hooks)} 个信任之钩, 处理方式: {metadata.get('processing_method')}")
                return result
                
        except (FileNotFoundError, COSServiceError, ASRServiceError, MediaProcessingError, DatabaseError) as be:
            # 业务逻辑错误，直接抛出，由上层处理
            logger.error(f"❌ 分析流程业务异常: {be}")
            raise
        except Exception as e:
            logger.error(f"❌ 分析流程系统异常: {str(e)}")
            raise AnalysisServiceError(
                message="分析服务内部异常，请稍后重试", 
                details=str(e)
            )
    
    async def _verify_cos_file_exists_with_details(self, storage_path: str) -> tuple[bool, str]:
        """
        验证COS文件是否存在，返回详细错误信息
        
        Args:
            storage_path: COS存储路径
            
        Returns:
            tuple[bool, str]: (文件是否存在, 错误详情)
        """
        try:
            logger.info(f"🔍 详细验证COS文件存在性: {storage_path}")
            
            # 调用COS服务检查文件
            exists = await self.cos_service.file_exists(storage_path)
            
            if exists:
                logger.info(f"✅ COS文件验证成功: {storage_path}")
                return True, ""
            else:
                # 文件不存在，获取更详细的信息
                logger.warning(f"⚠️ COS文件不存在，尝试列出相似文件: {storage_path}")
                
                # 尝试列出父目录的文件
                from pathlib import Path
                parent_path = str(Path(storage_path).parent) + "/"
                try:
                    similar_files = await self.cos_service.list_files(parent_path, max_keys=20)
                    file_list = [f["key"] for f in similar_files] if similar_files else []
                    
                    error_details = f"文件不存在: {storage_path}. "
                    if file_list:
                        error_details += f"目录 {parent_path} 中存在的文件: {', '.join(file_list[:5])}"
                        if len(file_list) > 5:
                            error_details += f" 等共{len(file_list)}个文件"
                    else:
                        error_details += f"目录 {parent_path} 为空或不存在"
                    
                    logger.warning(f"COS文件详情: {error_details}")
                    return False, error_details
                    
                except Exception as list_error:
                    error_details = f"文件不存在: {storage_path}. 无法列出目录内容: {str(list_error)}"
                    logger.warning(f"COS目录列表失败: {error_details}")
                    return False, error_details
                    
        except Exception as e:
            error_details = f"COS验证异常: {str(e)}"
            logger.error(f"❌ COS文件验证失败: {error_details}")
            return False, error_details
    
    async def _verify_cos_file_exists(self, storage_path: str) -> bool:
        """
        验证COS文件是否存在
        
        Args:
            storage_path: COS存储路径
            
        Returns:
            bool: 文件是否存在
        """
        try:
            logger.info(f"验证COS文件存在性: {storage_path}")
            return await self.cos_service.file_exists(storage_path)
        except Exception as e:
            logger.error(f"验证COS文件存在性失败: {str(e)}")
            return False
    
    async def _get_media_file(self, db: AsyncSession, media_file_id: str) -> Optional[MediaFile]:
        """获取媒体文件信息"""
        try:
            stmt = select(MediaFile).where(MediaFile.id == media_file_id)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"查询媒体文件失败: {str(e)}")
            return None
    
    async def _get_existing_analysis(self, db: AsyncSession, media_file_id: str) -> Optional[AnalysisSource]:
        """获取现有的分析结果"""
        try:
            stmt = select(AnalysisSource).where(AnalysisSource.media_file_id == media_file_id)
            result = await db.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"查询现有分析结果失败: {str(e)}")
            return None
    
    async def _process_media_file(self, media_file_path: str) -> Tuple[str, dict]:
        """
        处理媒体文件（视频转音频+语音识别） - 严谨版本
        
        严格的错误处理：任何环节失败都立即抛出异常，不继续执行
        
        Args:
            media_file_path: COS中的媒体文件路径
            
        Returns:
            Tuple[str, dict]: (transcript_text, metadata)
            
        Raises:
            RuntimeError: 任何处理环节失败时抛出
        """
        temp_video_path = None
        temp_audio_path = None
        
        try:
            # 1. 从COS下载视频文件到本地临时目录
            logger.info(f"开始下载视频文件: {media_file_path}")
            temp_video_path = await self.cos_service.download_file_to_path(media_file_path)
            logger.info(f"✅ 视频文件下载成功: {temp_video_path}")
            
            # 2. 视频转音频处理
            logger.info("开始视频转音频处理")
            audio_result = await self.media_converter.extract_audio_from_video(temp_video_path)
            temp_audio_path, audio_info = audio_result
            logger.info(f"✅ 视频转音频成功: {temp_audio_path}, 时长: {getattr(audio_info, 'duration', 0)}秒")
            
            # 3. 并行执行：COS上传 + 本地ASR识别
            logger.info("开始并行处理：COS上传和ASR识别")
            
            # 创建并发任务
            cos_upload_task = asyncio.create_task(
                self._upload_audio_to_cos(temp_audio_path, media_file_path)
            )
            
            asr_task = asyncio.create_task(
                self._transcribe_local_audio(temp_audio_path)
            )
            
            # 等待两个任务完成
            audio_cos_path, transcript_result = await asyncio.gather(
                cos_upload_task, 
                asr_task,
                return_exceptions=True
            )
            
            # 检查COS上传结果（允许失败，不影响分析）
            if isinstance(audio_cos_path, Exception):
                logger.warning(f"⚠️ 音频COS上传失败（不影响分析）: {audio_cos_path}")
                audio_cos_path = None
            else:
                logger.info(f"✅ 音频已上传到COS: {audio_cos_path}")
            
            # 检查ASR识别结果（必须成功）
            if isinstance(transcript_result, Exception):
                logger.error(f"❌ ASR识别失败，终止分析流程: {transcript_result}")
                raise RuntimeError(f"语音识别失败: {transcript_result}")
            
            logger.info(f"✅ ASR识别成功，文本长度: {len(transcript_result.text)}")
            
            # 4. 构建返回结果
            metadata = {
                "video_path": media_file_path,
                "audio_path": audio_cos_path,
                "audio_info": audio_info,
                "transcript_confidence": transcript_result.confidence,
                "processing_method": "strict_validation_pipeline"
            }
            
            logger.info(f"✅ 媒体文件处理完成，转录文本长度: {len(transcript_result.text)}")
            return transcript_result.text, metadata
            
        except Exception as e:
            logger.error(f"❌ 媒体文件处理失败，立即终止: {str(e)}")
            raise RuntimeError(f"媒体文件处理失败: {str(e)}")
        finally:
            # 清理临时文件
            await self._cleanup_temp_files([temp_video_path, temp_audio_path])
    
    async def _upload_audio_to_cos(self, local_audio_path: str, original_media_path: str) -> str:
        """
        将音频文件上传到COS（用于归档存储）
        
        Args:
            local_audio_path: 本地音频文件路径
            original_media_path: 原始媒体文件在COS中的路径
            
        Returns:
            str: COS中音频文件的路径
        """
        try:
            import os
            from pathlib import Path
            
            # 构建音频文件的COS路径
            media_path = Path(original_media_path)
            audio_filename = f"{media_path.stem}_audio.mp3"
            audio_cos_path = str(media_path.parent / audio_filename)
            
            # 读取音频文件数据
            with open(local_audio_path, 'rb') as f:
                audio_data = f.read()
            
            # 上传到COS
            await self.cos_service.upload_file(audio_data, audio_cos_path)
            
            logger.info(f"音频文件已上传到COS: {audio_cos_path}")
            return audio_cos_path
            
        except Exception as e:
            logger.error(f"音频COS上传失败: {str(e)}")
            raise
    
    async def _transcribe_local_audio(self, local_audio_path: str) -> TranscriptionResult:
        """
        使用本地音频文件进行ASR识别（优化版本）
        
        Args:
            local_audio_path: 本地音频文件路径
            
        Returns:
            TranscriptionResult: 转录结果
        """
        try:
            logger.info(f"开始本地音频ASR识别: {local_audio_path}")
            
            # 使用优化的本地音频识别方法
            transcript_result = await self.asr_service.transcribe_local_audio_file(
                local_audio_path
            )
            
            logger.info(f"ASR识别完成，文本长度: {len(transcript_result.text)}, 置信度: {transcript_result.confidence}")
            return transcript_result
            
        except Exception as e:
            logger.error(f"本地音频ASR识别失败: {str(e)}")
            raise
    
    async def _cleanup_temp_files(self, file_paths: list):
        """
        清理临时文件
        
        Args:
            file_paths: 需要清理的文件路径列表
        """
        import os
        
        for file_path in file_paths:
            if file_path and os.path.exists(file_path):
                try:
                    os.unlink(file_path)
                    logger.debug(f"临时文件已清理: {file_path}")
                except Exception as e:
                    logger.warning(f"清理临时文件失败 {file_path}: {str(e)}")
    
    def _get_demo_transcript(self, filename: str) -> str:
        """获取演示用的转录文本"""
        filename_lower = filename.lower()
        
        if "iphone" in filename_lower or "手机" in filename_lower:
            return """作为一个用了10年iPhone的老用户，今天我要告诉你一个残酷的真相。我是数码评测博主，测试过200+款手机，每次换手机都纠结，怕买错后悔，但是通过我的专业测试，我发现了iPhone购买的核心秘密。99%的人都不知道这个技巧，能帮你省下好几千块钱。作为业内专家，我必须告诉你这个重要信息，机会稀缺，只有前100名用户可以获得这个独家方法。"""
        
        elif "视频" in filename_lower or "内容" in filename_lower:
            return """作为专业的内容分析师，我要告诉大家一个重要发现。通过深度分析，我们识别出了关键的价值点和情感触发器。99%的创作者都忽略了这些细节，但是掌握这些技巧，你就能制作出真正有影响力的内容。这些发现对内容创作者来说非常珍贵，你肯定很好奇为什么大多数内容都无法触动观众吧？"""
        
        else:
            return f"""基于文件 {filename} 的演示分析结果。作为专业分析师，我要告诉大家一个重要发现。通过深度分析，我们识别出了关键的价值点和情感触发器。99%的用户都忽略了这些细节，但是掌握这些技巧，你就能获得更好的效果。这些发现非常珍贵，机会稀缺，你肯定很好奇背后的原理吧？"""
    
    def _get_demo_transcript_for_real_video(self, filename: str) -> str:
        """为真实视频文件生成高质量演示转录文本（当ASR失败时使用）"""
        return """大家好，我是一个在短视频领域深耕5年的创作者。今天我要和大家分享一个残酷的真相：99%的人做短视频都在犯同一个错误！作为专业的内容分析师，我研究了超过10000个爆款视频，发现了其中的核心秘密。

首先，我必须告诉你们，大多数人以为拍视频就是随便拍拍就能火，这是大错特错的！真正的爆款视频背后，都隐藏着科学的创作方法。我花了整整三年时间，总结出了这套"爆款公式"，帮助无数学员从0粉丝做到百万大V。

你们知道吗？一个视频能不能火，前3秒就决定了！如果你不能在开头就抓住观众的注意力，后面做得再好也没用。这就是为什么很多人辛辛苦苦拍了视频，却只有几十个播放量的原因。

但是今天，我要免费分享给大家这个价值万元的核心技巧。机会非常难得，因为这套方法我之前只在内部培训中讲过。记住，想要做出爆款内容，你必须掌握"信任之钩"的使用方法。

什么是信任之钩？简单来说，就是让观众在最短时间内相信你、认可你的技巧。比如我刚才说的"99%的人都在犯错误"，这就是制造冲突的钩子。当观众听到这句话，就会想：我是不是也犯了这个错误？然后就会继续看下去。

除了制造冲突，还有建立权威、展示稀缺、引发好奇等多种钩子技巧。掌握了这些，你就能让任何人对你的内容欲罢不能。这些技巧看似简单，但背后蕴含着深层的心理学原理。

最重要的是，这些方法不仅适用于短视频，在日常沟通、演讲、写作中都能发挥巨大作用。想想看，如果你能在任何场合都迅速抓住别人的注意力，你的人生会发生什么样的改变？

我知道很多人会怀疑这些技巧的真实性，但我要告诉你们，我的学员已经用这套方法创造了无数成功案例。有人用这个方法，在3个月内从普通上班族变成了百万粉丝的网红；有人用这个技巧，让自己的产品销量翻了10倍。

时间关系，今天只能分享这么多。如果你想了解更多爆款创作的秘密，记得关注我。下期视频，我会继续为大家揭秘更多实用技巧。记住，机会稀缺，先学会的人就能抢占先机！"""
    
    async def _create_or_update_analysis_source(
        self, 
        db: AsyncSession, 
        media_file: MediaFile, 
        transcript: str, 
        user_id: str
    ) -> AnalysisSource:
        """创建或更新AnalysisSource记录"""
        try:
            # 先查询是否已存在
            stmt = select(AnalysisSource).where(AnalysisSource.media_file_id == media_file.id)
            result = await db.execute(stmt)
            existing_source = result.scalar_one_or_none()
            
            if existing_source:
                # 更新现有记录
                existing_source.title = f"视频分析 - {media_file.original_filename}"
                existing_source.transcript = transcript
                existing_source.source_content = f"cos://{media_file.storage_path}"
                
                logger.info(f"更新AnalysisSource记录: {existing_source.id}")
                return existing_source
            else:
                # 创建新记录
                analysis_source = AnalysisSource(
                    id=str(uuid.uuid4()),
                    title=f"视频分析 - {media_file.original_filename}",
                    source_type=SourceType.FILE,
                    source_content=f"cos://{media_file.storage_path}",
                    transcript=transcript,
                    owner_id=user_id,
                    media_file_id=media_file.id,
                    created_at=datetime.utcnow()
                )
                
                db.add(analysis_source)
                await db.flush()  # 刷新以获取ID
                
                logger.info(f"创建AnalysisSource记录: {analysis_source.id}")
                return analysis_source
            
        except Exception as e:
            logger.error(f"创建或更新AnalysisSource失败: {str(e)}")
            raise
    
    async def _create_or_update_analysis_card(
        self, 
        db: AsyncSession, 
        analysis_source: AnalysisSource, 
        trust_hooks: list, 
        transcript: str,
        force_new_card: bool = False
    ) -> AnalysisCard:
        """
        创建或更新AnalysisCard记录
        
        Args:
            db: 数据库会话
            analysis_source: 分析源记录
            trust_hooks: 信任之钩分析结果
            transcript: 转录文本
            force_new_card: 是否强制创建新卡片（支持多版本分析）
            
        Returns:
            AnalysisCard: 创建或更新的分析卡片
        """
        try:
            # 提取钩子信息
            hook_types = [hook.hook_type.value for hook in trust_hooks] if trust_hooks else []
            hook_copy = trust_hooks[0].content if trust_hooks else ""
            
            if not force_new_card:
                # 原有逻辑：查找现有卡片并更新
                stmt = select(AnalysisCard).where(AnalysisCard.source_id == analysis_source.id)
                result = await db.execute(stmt)
                existing_card = result.scalar_one_or_none()
            else:
                # 强制创建新卡片模式
                existing_card = None
            
            if existing_card:
                # 更新现有记录
                existing_card.version_title = f"AI分析结果-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                existing_card.hook_copy = hook_copy
                existing_card.hook_types = hook_types
                existing_card.hook_notes = f"识别到 {len(trust_hooks)} 个信任之钩: {', '.join(hook_types)}"
                existing_card.core_idea = self._extract_core_idea(transcript)
                existing_card.argument_case = self._extract_argument_case(transcript)
                existing_card.value_delivery = ["内容分析", "钩子识别", "价值提取"]
                existing_card.updated_at = datetime.utcnow()
                
                logger.info(f"更新AnalysisCard记录: {existing_card.id}")
                return existing_card
            else:
                # 创建新记录
                if force_new_card:
                    # 查询现有卡片数量来生成版本号
                    count_stmt = select(AnalysisCard).where(AnalysisCard.source_id == analysis_source.id)
                    count_result = await db.execute(count_stmt)
                    existing_cards = count_result.scalars().all()
                    version_num = len(existing_cards) + 1
                    version_title = f"AI分析结果-v{version_num}-{datetime.now().strftime('%m%d_%H%M')}"
                    logger.info(f"创建多版本分析卡片: {version_title} (共{version_num}个版本)")
                else:
                    version_title = f"AI分析结果-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                analysis_card = AnalysisCard(
                    id=str(uuid.uuid4()),
                    version_title=version_title,
                    hook_copy=hook_copy,
                    hook_types=hook_types,
                    hook_notes=f"识别到 {len(trust_hooks)} 个信任之钩: {', '.join(hook_types)}",
                    core_idea=self._extract_core_idea(transcript),
                    argument_case=self._extract_argument_case(transcript),
                    value_delivery=["内容分析", "钩子识别", "价值提取"],
                    reusable_elements="可复用的内容创作技巧和情感触发点",
                    value_notes="基于AI分析的价值映射结果",
                    source_id=analysis_source.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                db.add(analysis_card)
                await db.flush()  # 刷新以获取ID
                
                logger.info(f"创建AnalysisCard记录: {analysis_card.id}")
                return analysis_card
            
        except Exception as e:
            logger.error(f"创建或更新AnalysisCard失败: {str(e)}")
            raise
    
    def _extract_core_idea(self, transcript: str) -> str:
        """
        使用AI提取核心观点
        
        Args:
            transcript: 转录文本
            
        Returns:
            str: 核心观点
        """
        if not transcript:
            return "暂无核心观点"
        
        try:
            # 使用简化版AI分析
            import asyncio
            return asyncio.run(self._extract_core_idea_with_ai(transcript))
        except Exception as e:
            logger.warning(f"AI提取核心观点失败: {str(e)}，使用回退方法")
            return self._extract_core_idea_fallback(transcript)
    
    async def _extract_core_idea_with_ai(self, transcript: str) -> str:
        """
        使用AI提取核心观点
        
        Args:
            transcript: 转录文本
            
        Returns:
            str: 核心观点
        """
        try:
            ai_service = await get_ai_service()
            
            # 构建提示词
            prompt = f"""请分析以下文本的核心观点，用一句话总结主要想要表达的观点或主张。

文本内容：
{transcript[:800]}

请直接返回核心观点，不超过50个字。"""
            
            response = await ai_service.call_llm(
                prompt=prompt,
                temperature=0.3,
                max_tokens=200
            )
            
            core_idea = response.strip().replace('"', '').replace('。', '')
            return core_idea[:50] if len(core_idea) > 50 else core_idea
            
        except Exception as e:
            logger.error(f"AI提取核心观点异常: {str(e)}")
            raise
    
    def _extract_core_idea_fallback(self, transcript: str) -> str:
        """
        回退方法：使用规则提取核心观点
        
        Args:
            transcript: 转录文本
            
        Returns:
            str: 核心观点
        """
        # 简单的核心观点提取逻辑
        sentences = transcript.split('。')
        for sentence in sentences:
            if any(keyword in sentence for keyword in ['关键', '核心', '重要', '秘密', '真相', '发现']):
                return sentence.strip() + '。'
        
        # 如果没有找到特殊句子，返回前50个字符
        return transcript[:50] + "..." if len(transcript) > 50 else transcript
    
    def _extract_argument_case(self, transcript: str) -> str:
        """
        使用AI提取论证案例
        
        Args:
            transcript: 转录文本
            
        Returns:
            str: 论证案例
        """
        try:
            # 使用简化版AI分析
            import asyncio
            return asyncio.run(self._extract_argument_case_with_ai(transcript))
        except Exception as e:
            logger.warning(f"AI提取论证案例失败: {str(e)}，使用回退方法")
            return self._extract_argument_case_fallback(transcript)
    
    async def _extract_argument_case_with_ai(self, transcript: str) -> str:
        """
        使用AI提取论证案例
        
        Args:
            transcript: 转录文本
            
        Returns:
            str: 论证案例
        """
        try:
            ai_service = await get_ai_service()
            
            # 构建提示词
            prompt = f"""请分析以下文本中的论证方式和案例，找出作者用来证明观点的具体例子、数据或经验。

文本内容：
{transcript[:800]}

请用简洁的语言描述主要的论证方式，不超过80个字。"""
            
            response = await ai_service.call_llm(
                prompt=prompt,
                temperature=0.3,
                max_tokens=300
            )
            
            argument_case = response.strip().replace('"', '')
            return argument_case[:80] if len(argument_case) > 80 else argument_case
            
        except Exception as e:
            logger.error(f"AI提取论证案例异常: {str(e)}")
            raise
    
    def _extract_argument_case_fallback(self, transcript: str) -> str:
        """
        回退方法：使用规则提取论证案例
        
        Args:
            transcript: 转录文本
            
        Returns:
            str: 论证案例
        """
        if any(keyword in transcript for keyword in ['测试', '数据', '经验', '研究', '验证']):
            return "基于实际测试数据和专业经验的验证"
        elif any(keyword in transcript for keyword in ['专家', '博主', '分析师', '从业者']):
            return "基于专业人士的权威观点和实践经验"
        else:
            return "通过具体案例和实证数据进行论证"
    
    def _build_analysis_result(
        self, 
        analysis_source: AnalysisSource, 
        analysis_card: AnalysisCard, 
        trust_hooks: list, 
        transcript: str, 
        media_file: MediaFile,
        metadata: dict
    ) -> Dict[str, Any]:
        """构建分析结果"""
        return {
            "success": True,
            "analysis_source_id": analysis_source.id,
            "analysis_card_id": analysis_card.id,
            "transcript": transcript,
            "hook_types": analysis_card.hook_types or [],
            "hook_copy": analysis_card.hook_copy or "",
            "trust_hooks_count": len(trust_hooks),
            "core_idea": analysis_card.core_idea,
            "argument_case": analysis_card.argument_case,
            "value_delivery": analysis_card.value_delivery or [],
            "media_file_id": media_file.id,
            "created_at": analysis_source.created_at.isoformat(),
            "updated_at": analysis_card.updated_at.isoformat(),
            "metadata": metadata,
            # 添加详细的钩子信息用于调试
            "trust_hooks_detail": [
                {
                    "type": hook.hook_type.value,
                    "content": hook.content,
                    "confidence": hook.confidence,
                    "keywords": hook.matched_keywords
                }
                for hook in trust_hooks
            ]
        }
    
    async def get_analysis_by_media_file(self, media_file_id: str) -> Optional[Dict[str, Any]]:
        """根据媒体文件ID获取分析结果"""
        try:
            async with get_db_session() as db:
                # 查询AnalysisSource
                stmt = select(AnalysisSource).where(AnalysisSource.media_file_id == media_file_id)
                result = await db.execute(stmt)
                analysis_source = result.scalar_one_or_none()
                
                if not analysis_source:
                    return None
                
                # 查询AnalysisCard
                stmt = select(AnalysisCard).where(AnalysisCard.source_id == analysis_source.id)
                result = await db.execute(stmt)
                analysis_card = result.scalar_one_or_none()
                
                if not analysis_card:
                    return None
                
                # 构建结果
                return {
                    "analysis_source_id": analysis_source.id,
                    "analysis_card_id": analysis_card.id,
                    "transcript": analysis_source.transcript,
                    "hook_types": analysis_card.hook_types or [],
                    "hook_copy": analysis_card.hook_copy or "",
                    "core_idea": analysis_card.core_idea,
                    "argument_case": analysis_card.argument_case,
                    "value_delivery": analysis_card.value_delivery or [],
                    "created_at": analysis_source.created_at.isoformat(),
                    "updated_at": analysis_card.updated_at.isoformat()
                }
                
        except Exception as e:
            logger.error(f"查询分析结果失败: {str(e)}")
            return None