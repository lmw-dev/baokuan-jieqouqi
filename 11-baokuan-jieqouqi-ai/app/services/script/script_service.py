"""
TOM-217: 脚本管理核心服务
集成TOM-216脚本生成算法，提供完整的脚本生命周期管理
"""

import asyncio
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db_session
from app.models.script_management import Script, ScriptSection, ScriptEditHistory, ScriptStatus, SectionType, EditAction
from app.models.analysis import AnalysisCard
from app.models.script_generation import AnalysisCardSchema, ScriptStyleConfig, ScriptFramework
from app.services.analysis.script_generator import ScriptGenerator
from app.services.ai.factory import AIServiceFactory
from app.services.prompts.manager import PromptManager
from app.core.exceptions import ScriptGenerationError, InvalidParameterError, PermissionDeniedError, NotFoundError
from app.schemas.script_management import ScriptDetail, ScriptSectionDetail, ScriptMetadata, ScriptQueryParams


class ScriptService:
    """脚本管理核心服务"""
    
    def __init__(self):
        """初始化脚本服务"""
        self.ai_service = None
        self.prompt_manager = None
        self.script_generator = None
        logger.info("ScriptService初始化完成")
    
    async def _get_script_generator(self) -> ScriptGenerator:
        """获取脚本生成器实例（懒加载）"""
        if self.script_generator is None:
            if self.ai_service is None:
                self.ai_service = AIServiceFactory.create_default_service()
            if self.prompt_manager is None:
                self.prompt_manager = PromptManager()
                await self.prompt_manager.initialize()  # 确保初始化并加载模板
            self.script_generator = ScriptGenerator(self.ai_service, self.prompt_manager)
        return self.script_generator
    
    async def _verify_card_access(self, session: AsyncSession, card_id: str, user_id: str) -> AnalysisCard:
        """验证用户对分析卡片的访问权限"""
        try:
            # 查询分析卡片
            stmt = select(AnalysisCard).where(AnalysisCard.id == card_id)
            result = await session.execute(stmt)
            card = result.scalar_one_or_none()
            
            if not card:
                raise NotFoundError(f"分析卡片不存在: {card_id}")
            
            # 查询分析源验证权限
            from app.models.analysis import AnalysisSource
            stmt = select(AnalysisSource).where(AnalysisSource.id == card.source_id)
            result = await session.execute(stmt)
            source = result.scalar_one_or_none()
            
            if not source:
                raise NotFoundError(f"分析源不存在: {card.source_id}")
            
            if source.owner_id != user_id:
                raise PermissionDeniedError(f"用户无权访问此分析卡片: {card_id}")
            
            return card
            
        except Exception as e:
            if isinstance(e, (NotFoundError, PermissionDeniedError)):
                raise e
            logger.error(f"验证卡片访问权限失败: {str(e)}")
            raise InvalidParameterError(f"权限验证失败: {str(e)}")
    
    async def _verify_script_access(self, session: AsyncSession, script_id: str, user_id: str) -> Script:
        """验证用户对脚本的访问权限"""
        try:
            # 查询脚本及其关联的段落
            stmt = select(Script).options(
                selectinload(Script.sections),
                selectinload(Script.edit_history)
            ).where(Script.id == script_id)
            
            result = await session.execute(stmt)
            script = result.scalar_one_or_none()
            
            if not script:
                raise NotFoundError(f"脚本不存在: {script_id}")
            
            if script.created_by != user_id:
                raise PermissionDeniedError(f"用户无权访问此脚本: {script_id}")
            
            return script
            
        except Exception as e:
            if isinstance(e, (NotFoundError, PermissionDeniedError)):
                raise e
            logger.error(f"验证脚本访问权限失败: {str(e)}")
            raise InvalidParameterError(f"权限验证失败: {str(e)}")
    
    async def _convert_card_to_schema(self, card: AnalysisCard) -> AnalysisCardSchema:
        """将数据库AnalysisCard转换为TOM-216需要的AnalysisCardSchema"""
        try:
            return AnalysisCardSchema(
                id=card.id,
                version_title=card.version_title or "",
                # 使用数据库原始字段名，与AnalysisCardSchema保持一致
                hook_copy=card.hook_copy or "",
                hook_types=card.hook_types or [],
                hook_notes=card.hook_notes or "",
                core_idea=card.core_idea or "",
                argument_case=card.argument_case or "",
                value_delivery=card.value_delivery or [],
                reusable_elements=card.reusable_elements or "",
                value_notes=card.value_notes or ""
            )
        except Exception as e:
            logger.error(f"转换AnalysisCard失败: {str(e)}")
            raise InvalidParameterError(f"数据转换失败: {str(e)}")
    
    async def _save_script_framework(self, session: AsyncSession, framework: ScriptFramework, card_id: str, user_id: str) -> Script:
        """将ScriptFramework保存到数据库"""
        try:
            # 创建脚本主记录
            script = Script(
                id=str(uuid.uuid4()),
                card_id=card_id,
                title=framework.title,
                status=ScriptStatus.DRAFT.value,
                created_by=user_id
            )
            session.add(script)
            await session.flush()  # 获取script.id
            
            # 创建段落记录
            section_mapping = {
                "hook": framework.hook,
                "problem": framework.problem, 
                "solution": framework.solution,
                "proof": framework.proof,
                "cta": framework.cta
            }
            
            section_titles = {
                "hook": "开场钩子 (0-15秒)",
                "problem": "痛点共鸣 (15-45秒)",
                "solution": "解决方案 (45秒-3分钟)",
                "proof": "价值证明 (3-4分钟)",
                "cta": "行动召唤 (4-5分钟)"
            }
            
            order_index = 1
            for section_type, section_data in section_mapping.items():
                if section_data:
                    # 处理tips字段：将字符串转换为列表格式
                    tips_list = []
                    if section_data.tips:
                        if isinstance(section_data.tips, str):
                            # 将字符串按行分割转换为列表
                            tips_list = [tip.strip() for tip in section_data.tips.split('\n') if tip.strip()]
                        elif isinstance(section_data.tips, list):
                            tips_list = section_data.tips
                        else:
                            tips_list = [str(section_data.tips)]
                    
                    script_section = ScriptSection(
                        id=str(uuid.uuid4()),
                        script_id=script.id,
                        section_type=section_type,
                        title=section_titles.get(section_type, f"{section_type}段落"),
                        content=section_data.content,
                        tips=tips_list,
                        time_range=section_data.duration if hasattr(section_data, 'duration') else None,
                        order_index=order_index
                    )
                    session.add(script_section)
                    order_index += 1
            
            # 创建生成历史记录
            history = ScriptEditHistory(
                id=str(uuid.uuid4()),
                script_id=script.id,
                action=EditAction.GENERATE.value,
                content_after=f"生成完整脚本：{framework.title}",
                created_by=user_id
            )
            session.add(history)
            
            await session.commit()
            
            # 重新查询完整的脚本数据
            stmt = select(Script).options(
                selectinload(Script.sections),
                selectinload(Script.edit_history)
            ).where(Script.id == script.id)
            result = await session.execute(stmt)
            saved_script = result.scalar_one()
            
            return saved_script
            
        except Exception as e:
            await session.rollback()
            logger.error(f"保存脚本框架失败: {str(e)}")
            raise ScriptGenerationError(f"保存脚本失败: {str(e)}")
    
    async def _convert_script_to_detail(self, script: Script) -> ScriptDetail:
        """将数据库Script转换为ScriptDetail响应"""
        try:
            # 转换段落
            sections = []
            for section in sorted(script.sections, key=lambda x: x.order_index):
                # 处理tips字段：确保它是列表格式
                tips_list = []
                if section.tips:
                    if isinstance(section.tips, list):
                        tips_list = section.tips
                    elif isinstance(section.tips, str):
                        # 将字符串按行分割转换为列表
                        tips_list = [tip.strip() for tip in section.tips.split('\n') if tip.strip()]
                    else:
                        tips_list = [str(section.tips)]
                
                section_detail = ScriptSectionDetail(
                    id=section.id,
                    script_id=section.script_id,
                    section_type=section.section_type,
                    title=section.title,
                    content=section.content,
                    tips=tips_list,
                    time_range=section.time_range,
                    importance=section.importance,
                    order_index=section.order_index,
                    updated_at=section.updated_at
                )
                sections.append(section_detail)
            
            # 创建元数据
            metadata = ScriptMetadata(
                generation_id=None,  # 添加显式的None值
                total_sections=len(sections),
                last_updated=script.updated_at,
                creator_id=script.created_by
            )
            
            # 创建脚本详情
            return ScriptDetail(
                id=script.id,
                card_id=script.card_id,
                title=script.title,
                status=script.status,
                sections=sections,
                metadata=metadata,
                created_at=script.created_at,
                updated_at=script.updated_at
            )
            
        except Exception as e:
            logger.error(f"转换脚本详情失败: {str(e)}")
            raise InvalidParameterError(f"数据转换失败: {str(e)}")
    
    async def generate_script(
        self, 
        card_id: str, 
        user_id: str, 
        style_config: Optional[ScriptStyleConfig] = None
    ) -> ScriptDetail:
        """
        生成脚本框架
        
        Args:
            card_id: 分析卡片ID
            user_id: 用户ID
            style_config: 脚本风格配置
            
        Returns:
            生成的脚本详情
            
        Raises:
            ScriptGenerationError: 脚本生成失败
            PermissionDeniedError: 权限不足
            NotFoundError: 资源不存在
        """
        logger.info(f"开始生成脚本 - 卡片ID: {card_id}, 用户ID: {user_id}")
        
        async with get_db_session() as session:
            try:
                # 1. 验证用户对分析卡片的访问权限
                card = await self._verify_card_access(session, card_id, user_id)
                
                # 2. 转换为TOM-216需要的格式
                card_schema = await self._convert_card_to_schema(card)
                
                # 3. 调用TOM-216脚本生成算法
                generator = await self._get_script_generator()
                framework = await generator.generate_script_framework(card_schema, style_config)
                
                # 4. 保存到数据库
                script = await self._save_script_framework(session, framework, card_id, user_id)
                
                # 5. 转换为响应格式
                script_detail = await self._convert_script_to_detail(script)
                
                logger.success(f"脚本生成成功 - 脚本ID: {script.id}")
                return script_detail
                
            except Exception as e:
                if isinstance(e, (ScriptGenerationError, PermissionDeniedError, NotFoundError, InvalidParameterError)):
                    raise e
                logger.error(f"脚本生成异常: {str(e)}")
                raise ScriptGenerationError(f"脚本生成失败: {str(e)}")
    
    async def get_script(self, script_id: str, user_id: str) -> ScriptDetail:
        """
        获取脚本详情
        
        Args:
            script_id: 脚本ID
            user_id: 用户ID
            
        Returns:
            脚本详情
        """
        logger.info(f"获取脚本详情 - 脚本ID: {script_id}, 用户ID: {user_id}")
        
        async with get_db_session() as session:
            try:
                # 验证权限并获取脚本
                script = await self._verify_script_access(session, script_id, user_id)
                
                # 转换为响应格式
                script_detail = await self._convert_script_to_detail(script)
                
                logger.info(f"脚本详情获取成功 - 脚本ID: {script_id}")
                return script_detail
                
            except Exception as e:
                if isinstance(e, (PermissionDeniedError, NotFoundError, InvalidParameterError)):
                    raise e
                logger.error(f"获取脚本详情异常: {str(e)}")
                raise InvalidParameterError(f"获取脚本失败: {str(e)}")
    
    async def update_script(
        self, 
        script_id: str, 
        user_id: str,
        title: Optional[str] = None,
        status: Optional[str] = None,
        sections: Optional[List[Dict[str, Any]]] = None
    ) -> ScriptDetail:
        """
        更新脚本内容
        
        Args:
            script_id: 脚本ID
            user_id: 用户ID
            title: 新标题
            status: 新状态
            sections: 段落更新列表
            
        Returns:
            更新后的脚本详情
        """
        logger.info(f"更新脚本 - 脚本ID: {script_id}, 用户ID: {user_id}")
        
        async with get_db_session() as session:
            try:
                # 验证权限并获取脚本
                script = await self._verify_script_access(session, script_id, user_id)
                
                # 更新脚本基础信息
                if title:
                    old_title = script.title
                    script.title = title
                    
                    # 记录标题变更历史
                    history = ScriptEditHistory(
                        id=str(uuid.uuid4()),
                        script_id=script_id,
                        action=EditAction.UPDATE.value,
                        content_before=f"标题: {old_title}",
                        content_after=f"标题: {title}",
                        created_by=user_id
                    )
                    session.add(history)
                
                if status and status in [s.value for s in ScriptStatus]:
                    script.status = status
                
                script.updated_at = datetime.utcnow()
                
                # 更新段落
                if sections:
                    for section_data in sections:
                        section_id = section_data.get('id')
                        
                        if section_id:
                            # 更新现有段落
                            stmt = select(ScriptSection).where(
                                and_(ScriptSection.id == section_id, ScriptSection.script_id == script_id)
                            )
                            result = await session.execute(stmt)
                            section = result.scalar_one_or_none()
                            
                            if section:
                                old_content = section.content
                                
                                # 更新段落属性
                                if 'title' in section_data:
                                    section.title = section_data['title']
                                if 'content' in section_data:
                                    section.content = section_data['content']
                                if 'tips' in section_data:
                                    section.tips = section_data['tips']
                                if 'time_range' in section_data:
                                    section.time_range = section_data['time_range']
                                if 'importance' in section_data:
                                    section.importance = section_data['importance']
                                if 'order_index' in section_data:
                                    section.order_index = section_data['order_index']
                                
                                section.updated_at = datetime.utcnow()
                                
                                # 记录段落变更历史
                                if 'content' in section_data and section_data['content'] != old_content:
                                    history = ScriptEditHistory(
                                        id=str(uuid.uuid4()),
                                        script_id=script_id,
                                        section_id=section_id,
                                        action=EditAction.UPDATE.value,
                                        content_before=old_content,
                                        content_after=section_data['content'],
                                        created_by=user_id
                                    )
                                    session.add(history)
                        else:
                            # 创建新段落
                            new_section = ScriptSection(
                                id=str(uuid.uuid4()),
                                script_id=script_id,
                                section_type=section_data.get('section_type', 'custom'),
                                title=section_data.get('title', ''),
                                content=section_data.get('content', ''),
                                tips=section_data.get('tips', []),
                                time_range=section_data.get('time_range'),
                                importance=section_data.get('importance', 'medium'),
                                order_index=section_data.get('order_index', 999)
                            )
                            session.add(new_section)
                            
                            # 记录段落创建历史
                            history = ScriptEditHistory(
                                id=str(uuid.uuid4()),
                                script_id=script_id,
                                section_id=new_section.id,
                                action=EditAction.CREATE.value,
                                content_after=new_section.content,
                                created_by=user_id
                            )
                            session.add(history)
                
                await session.commit()
                
                # 重新获取更新后的脚本
                updated_script = await self._verify_script_access(session, script_id, user_id)
                script_detail = await self._convert_script_to_detail(updated_script)
                
                logger.success(f"脚本更新成功 - 脚本ID: {script_id}")
                return script_detail
                
            except Exception as e:
                await session.rollback()
                if isinstance(e, (PermissionDeniedError, NotFoundError, InvalidParameterError)):
                    raise e
                logger.error(f"更新脚本异常: {str(e)}")
                raise InvalidParameterError(f"更新脚本失败: {str(e)}")
    
    async def delete_script(self, script_id: str, user_id: str) -> bool:
        """
        删除脚本
        
        Args:
            script_id: 脚本ID
            user_id: 用户ID
            
        Returns:
            是否删除成功
        """
        logger.info(f"删除脚本 - 脚本ID: {script_id}, 用户ID: {user_id}")
        
        async with get_db_session() as session:
            try:
                # 验证权限
                script = await self._verify_script_access(session, script_id, user_id)
                
                # 记录删除历史（在删除前记录）
                history = ScriptEditHistory(
                    id=str(uuid.uuid4()),
                    script_id=script_id,
                    action=EditAction.DELETE.value,
                    content_before=f"删除脚本: {script.title}",
                    created_by=user_id
                )
                session.add(history)
                
                # 删除脚本（级联删除关联的段落）
                stmt = delete(Script).where(Script.id == script_id)
                await session.execute(stmt)
                
                await session.commit()
                
                logger.success(f"脚本删除成功 - 脚本ID: {script_id}")
                return True
                
            except Exception as e:
                await session.rollback()
                if isinstance(e, (PermissionDeniedError, NotFoundError)):
                    raise e
                logger.error(f"删除脚本异常: {str(e)}")
                raise InvalidParameterError(f"删除脚本失败: {str(e)}")
    
    async def list_scripts(self, user_id: str, query_params: 'ScriptQueryParams') -> List[ScriptDetail]:
        """
        获取脚本列表
        
        Args:
            user_id: 用户ID
            query_params: 查询参数
            
        Returns:
            脚本列表
        """
        logger.info(f"获取脚本列表 - 用户ID: {user_id}, 参数: {query_params}")
        
        async with get_db_session() as session:
            try:
                # 构建基础查询
                stmt = select(Script).options(
                    selectinload(Script.sections),
                    selectinload(Script.edit_history)
                ).where(Script.created_by == user_id)
                
                # 添加状态过滤
                if query_params.status and query_params.status != 'all':
                    stmt = stmt.where(Script.status == query_params.status)
                
                # 添加卡片ID过滤
                if query_params.card_id:
                    stmt = stmt.where(Script.card_id == query_params.card_id)
                
                # 添加关键词搜索
                if query_params.keyword:
                    keyword_filter = f"%{query_params.keyword}%"
                    stmt = stmt.where(Script.title.ilike(keyword_filter))
                
                # 按更新时间倒序排列
                stmt = stmt.order_by(Script.updated_at.desc())
                
                # 添加分页
                offset = (query_params.page - 1) * query_params.page_size
                stmt = stmt.offset(offset).limit(query_params.page_size)
                
                # 执行查询
                result = await session.execute(stmt)
                scripts = result.scalars().all()
                
                # 转换为响应格式
                script_details = []
                for script in scripts:
                    script_detail = await self._convert_script_to_detail(script)
                    script_details.append(script_detail)
                
                logger.info(f"脚本列表获取成功 - 用户: {user_id}, 数量: {len(script_details)}")
                return script_details
                
            except Exception as e:
                logger.error(f"获取脚本列表异常: {str(e)}")
                raise InvalidParameterError(f"获取脚本列表失败: {str(e)}")

    async def health_check(self) -> bool:
        """服务健康检查"""
        try:
            # 检查数据库连接
            async with get_db_session() as session:
                await session.execute("SELECT 1")
            
            # 检查脚本生成器
            generator = await self._get_script_generator()
            if not await generator.health_check():
                return False
            
            logger.info("ScriptService健康检查通过")
            return True
            
        except Exception as e:
            logger.error(f"ScriptService健康检查失败: {str(e)}")
            return False