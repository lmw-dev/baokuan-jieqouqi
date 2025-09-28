"""
共享分析核心服务 - 统一AI分析引擎和业务逻辑
"""

import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from loguru import logger

from app.services.analysis.orchestrator import ThreeStageAnalyzer
from app.services.ai.factory import get_ai_service
from app.services.prompts.manager import PromptManager
from app.db.session import get_db_session
from app.models.analysis import AnalysisSource, AnalysisCard, MediaFile, SourceType
from app.models.three_stage_analysis import AnalysisRequest, ThreeStageAnalysisResult
from app.core.exceptions import AnalysisServiceError, FileNotFoundError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class SharedAnalysisCore:
    """共享分析核心服务 - 统一的AI分析引擎"""
    
    def __init__(self):
        self.prompt_manager = PromptManager()
        self._initialized = False
        logger.info("共享分析核心服务初始化完成")
    
    async def _ensure_initialized(self):
        """确保Prompt管理器已初始化"""
        if not self._initialized:
            await self.prompt_manager.initialize()
            self._initialized = True
    
    async def analyze_content(
        self,
        content: str,
        user_id: str = "test-user-001",
        source_type: SourceType = SourceType.TEXT,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        分析文本内容 - 核心分析方法
        
        Args:
            content: 待分析的文本内容
            user_id: 用户ID
            source_type: 来源类型
            title: 标题（可选）
            
        Returns:
            Dict[str, Any]: 标准化的分析结果
        """
        try:
            logger.info(f"开始分析内容，长度: {len(content)}")
            
            # 0. 确保初始化
            await self._ensure_initialized()
            
            # 1. 创建AI服务和三段式分析器
            ai_service = await get_ai_service()
            analyzer = ThreeStageAnalyzer(ai_service, self.prompt_manager)
            
            # 2. 执行三段式AI分析
            request = AnalysisRequest(content=content)
            analysis_result = await analyzer.analyze(request)
            
            # 3. 保存到数据库
            source_id, card_id = await self._save_analysis_to_db(
                content=content,
                analysis_result=analysis_result,
                user_id=user_id,
                source_type=source_type,
                title=title
            )
            
            # 4. 构建标准化响应
            return self._build_standard_response(
                analysis_result=analysis_result,
                source_id=source_id,
                card_id=card_id,
                content=content
            )
            
        except Exception as e:
            logger.error(f"分析内容失败: {str(e)}")
            raise AnalysisServiceError(f"内容分析失败: {str(e)}")
    
    async def analyze_media_file(
        self,
        media_file_id: str,
        user_id: str = "test-user-001",
        force_reprocess: bool = False,
        force_new_card: bool = False
    ) -> Dict[str, Any]:
        """
        分析媒体文件 - 包含完整的媒体处理流程
        
        Args:
            media_file_id: 媒体文件ID
            user_id: 用户ID
            force_reprocess: 是否强制重新处理
            force_new_card: 是否强制创建新卡片
            
        Returns:
            Dict[str, Any]: 标准化的分析结果
        """
        try:
            logger.info(f"开始分析媒体文件: {media_file_id}")
            
            # 0. 确保初始化
            await self._ensure_initialized()
            
            # 1. 获取或生成transcript
            transcript = await self._get_or_process_transcript(
                media_file_id, force_reprocess
            )
            
            # 2. 执行AI分析
            analysis_result = await self._perform_ai_analysis(transcript)
            
            # 3. 保存或更新数据库记录
            source_id, card_id = await self._save_media_analysis_to_db(
                media_file_id=media_file_id,
                transcript=transcript,
                analysis_result=analysis_result,
                user_id=user_id,
                force_new_card=force_new_card
            )
            
            # 4. 构建标准化响应
            return self._build_standard_response(
                analysis_result=analysis_result,
                source_id=source_id,
                card_id=card_id,
                content=transcript,
                media_file_id=media_file_id
            )
            
        except Exception as e:
            logger.error(f"分析媒体文件失败: {str(e)}")
            raise AnalysisServiceError(f"媒体文件分析失败: {str(e)}")
    
    async def _get_or_process_transcript(
        self, 
        media_file_id: str, 
        force_reprocess: bool
    ) -> str:
        """获取或处理transcript"""
        try:
            async with get_db_session() as db:
                # 检查是否已有transcript
                if not force_reprocess:
                    stmt = select(AnalysisSource).where(
                        AnalysisSource.media_file_id == media_file_id
                    )
                    result = await db.execute(stmt)
                    existing_source = result.scalar_one_or_none()
                    
                    if existing_source and existing_source.transcript:
                        logger.info("使用已有transcript")
                        return existing_source.transcript
                
                # 需要处理媒体文件
                logger.info("需要处理媒体文件获取transcript")
                
                # 这里调用完整的媒体处理服务
                from app.services.complete_analysis_service import CompleteAnalysisService
                complete_service = CompleteAnalysisService()
                
                # 获取MediaFile信息
                stmt = select(MediaFile).where(MediaFile.id == media_file_id)
                result = await db.execute(stmt)
                media_file = result.scalar_one_or_none()
                
                if not media_file:
                    raise FileNotFoundError(f"媒体文件不存在: {media_file_id}")
                
                # 处理媒体文件获取transcript
                transcript, _ = await complete_service._process_media_file(
                    media_file.storage_path
                )
                
                return transcript
                
        except Exception as e:
            logger.error(f"获取transcript失败: {str(e)}")
            raise
    
    async def _perform_ai_analysis(self, content: str) -> ThreeStageAnalysisResult:
        """执行AI分析"""
        await self._ensure_initialized()
        ai_service = await get_ai_service()
        analyzer = ThreeStageAnalyzer(ai_service, self.prompt_manager)
        
        request = AnalysisRequest(content=content)
        return await analyzer.analyze(request)
    
    async def _save_analysis_to_db(
        self,
        content: str,
        analysis_result: ThreeStageAnalysisResult,
        user_id: str,
        source_type: SourceType,
        title: Optional[str] = None
    ) -> tuple[str, str]:
        """保存分析结果到数据库"""
        try:
            async with get_db_session() as db:
                # 确保用户存在，如果不存在则创建测试用户
                await self._ensure_user_exists(db, user_id)
                
                # 创建AnalysisSource
                source_id = str(uuid.uuid4())
                analysis_source = AnalysisSource(
                    id=source_id,
                    title=title or f"文本分析-{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    source_type=source_type,
                    source_content=content,
                    transcript=content,
                    owner_id=user_id,
                    created_at=datetime.utcnow()
                )
                
                db.add(analysis_source)
                await db.flush()
                
                # 创建AnalysisCard
                card_id = str(uuid.uuid4())
                analysis_card = AnalysisCard(
                    id=card_id,
                    version_title=f"AI分析结果-{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    hook_copy=analysis_result.trust_hook.hook_copy,
                    hook_types=[],  # 可以从trust_hook中提取
                    hook_notes=analysis_result.trust_hook.credibility_testimony,
                    core_idea=analysis_result.empathy_anchor.pain_point,
                    argument_case=analysis_result.value_map.competitive_advantage,
                    value_delivery=analysis_result.value_map.value_delivery,
                    reusable_elements="基于AI三段式分析的可复用元素",
                    value_notes=analysis_result.value_map.core_value,
                    source_id=source_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                db.add(analysis_card)
                await db.commit()
                
                return source_id, card_id
                
        except Exception as e:
            logger.error(f"保存分析结果失败: {str(e)}")
            raise
    
    async def _ensure_user_exists(self, db: AsyncSession, user_id: str):
        """确保用户存在，如果不存在则创建"""
        try:
            from app.models.analysis import User
            
            # 检查用户是否存在
            stmt = select(User).where(User.id == user_id)
            result = await db.execute(stmt)
            existing_user = result.scalar_one_or_none()
            
            if not existing_user:
                # 创建测试用户
                user = User(
                    id=user_id,
                    email=f"{user_id}@test.com",
                    name=user_id,
                    image=None,  # 修正字段名：avatar_url -> image
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(user)
                await db.flush()
                logger.info(f"创建测试用户: {user_id}")
                
        except Exception as e:
            logger.warning(f"确保用户存在失败: {str(e)}")
            # 如果创建用户失败，使用默认用户
            raise
    
    async def _save_media_analysis_to_db(
        self,
        media_file_id: str,
        transcript: str,
        analysis_result: ThreeStageAnalysisResult,
        user_id: str,
        force_new_card: bool = False
    ) -> tuple[str, str]:
        """保存媒体分析结果到数据库"""
        try:
            async with get_db_session() as db:
                # 查找或创建AnalysisSource
                stmt = select(AnalysisSource).where(
                    AnalysisSource.media_file_id == media_file_id
                ).limit(1)  # 添加limit限制
                result = await db.execute(stmt)
                existing_source = result.scalar_one_or_none()
                
                if existing_source:
                    # 更新现有source
                    existing_source.transcript = transcript
                    existing_source.updated_at = datetime.utcnow()
                    source_id = existing_source.id
                else:
                    # 创建新source
                    source_id = str(uuid.uuid4())
                    analysis_source = AnalysisSource(
                        id=source_id,
                        title=f"视频分析-{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                        source_type=SourceType.FILE,
                        source_content=f"media://{media_file_id}",
                        transcript=transcript,
                        owner_id=user_id,
                        media_file_id=media_file_id,
                        created_at=datetime.utcnow()
                    )
                    db.add(analysis_source)
                    await db.flush()
                
                # 处理AnalysisCard
                if not force_new_card and existing_source:
                    # 查找现有card并更新
                    stmt = select(AnalysisCard).where(
                        AnalysisCard.source_id == source_id
                    ).limit(1)  # 添加limit限制
                    result = await db.execute(stmt)
                    existing_card = result.scalar_one_or_none()
                    
                    if existing_card:
                        # 更新现有card
                        existing_card.hook_copy = analysis_result.trust_hook.hook_copy
                        existing_card.hook_notes = analysis_result.trust_hook.credibility_testimony
                        existing_card.core_idea = analysis_result.empathy_anchor.pain_point
                        existing_card.argument_case = analysis_result.value_map.competitive_advantage
                        existing_card.value_delivery = analysis_result.value_map.value_delivery
                        existing_card.value_notes = analysis_result.value_map.core_value
                        existing_card.updated_at = datetime.utcnow()
                        card_id = existing_card.id
                    else:
                        force_new_card = True
                
                if force_new_card or not existing_source:
                    # 创建新card
                    card_id = str(uuid.uuid4())
                    version_num = ""
                    if force_new_card:
                        # 计算版本号
                        stmt = select(AnalysisCard).where(
                            AnalysisCard.source_id == source_id
                        )
                        result = await db.execute(stmt)
                        existing_cards = result.scalars().all()
                        version_num = f"-v{len(existing_cards) + 1}"
                    
                    analysis_card = AnalysisCard(
                        id=card_id,
                        version_title=f"AI分析结果{version_num}-{datetime.now().strftime('%m%d_%H%M')}",
                        hook_copy=analysis_result.trust_hook.hook_copy,
                        hook_types=[],
                        hook_notes=analysis_result.trust_hook.credibility_testimony,
                        core_idea=analysis_result.empathy_anchor.pain_point,
                        argument_case=analysis_result.value_map.competitive_advantage,
                        value_delivery=analysis_result.value_map.value_delivery,
                        reusable_elements="基于AI三段式分析的可复用元素",
                        value_notes=analysis_result.value_map.core_value,
                        source_id=source_id,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(analysis_card)
                
                await db.commit()
                return source_id, card_id
                
        except Exception as e:
            logger.error(f"保存媒体分析结果失败: {str(e)}")
            raise
    
    def _build_standard_response(
        self,
        analysis_result: ThreeStageAnalysisResult,
        source_id: str,
        card_id: str,
        content: str,
        media_file_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """构建标准化响应格式"""
        return {
            "success": True,
            "analysis_result": {
                "trust_hook": {
                    "hook_copy": analysis_result.trust_hook.hook_copy,
                    "credibility_testimony": analysis_result.trust_hook.credibility_testimony,
                    "authority_signals": analysis_result.trust_hook.authority_signals
                },
                "empathy_anchor": {
                    "pain_point": analysis_result.empathy_anchor.pain_point,
                    "target_audience": analysis_result.empathy_anchor.target_audience,
                    "emotional_triggers": analysis_result.empathy_anchor.emotional_triggers
                },
                "value_map": {
                    "core_value": analysis_result.value_map.core_value,
                    "value_delivery": analysis_result.value_map.value_delivery,
                    "competitive_advantage": analysis_result.value_map.competitive_advantage
                }
            },
            "source_info": {
                "source_id": source_id,
                "card_id": card_id,
                "transcript": content[:500] + "..." if len(content) > 500 else content,
                "processing_time_ms": analysis_result.meta.processing_time_ms,
                "media_file_id": media_file_id
            }
        }