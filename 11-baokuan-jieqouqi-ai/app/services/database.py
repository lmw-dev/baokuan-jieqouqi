"""
数据库服务模块
"""

from typing import Optional
from sqlalchemy import select
from loguru import logger

from app.db.session import get_db_session
from app.models.analysis import AnalysisSource
from app.core.exceptions import DatabaseError, NotFoundError


class DatabaseService:
    """数据库服务类"""
    
    @staticmethod
    async def get_analysis_source_by_id(source_id: str) -> Optional[AnalysisSource]:
        """
        根据ID获取分析源
        
        Args:
            source_id: 分析源ID
            
        Returns:
            分析源对象，如果不存在则返回None
            
        Raises:
            DatabaseError: 数据库查询失败
        """
        try:
            async with get_db_session() as session:
                query = select(AnalysisSource).where(AnalysisSource.id == source_id)
                result = await session.execute(query)
                analysis_source = result.scalar_one_or_none()
                
                if analysis_source:
                    logger.debug(f"找到分析源: {source_id}, 标题: {analysis_source.title}")
                else:
                    logger.warning(f"未找到分析源: {source_id}")
                    
                return analysis_source
                
        except Exception as e:
            logger.error(f"查询分析源失败: {source_id}, 错误: {str(e)}")
            raise DatabaseError(f"查询分析源失败: {str(e)}", source_id)
    
    @staticmethod
    async def get_transcript_by_source_id(source_id: str) -> str:
        """
        根据分析源ID获取转录文本
        
        Args:
            source_id: 分析源ID
            
        Returns:
            转录文本
            
        Raises:
            NotFoundError: 分析源不存在
            DatabaseError: 数据库查询失败或转录文本为空
        """
        analysis_source = await DatabaseService.get_analysis_source_by_id(source_id)
        
        if not analysis_source:
            raise NotFoundError(f"分析源不存在: {source_id}")
        
        if not analysis_source.transcript:
            raise DatabaseError(
                f"分析源 {source_id} 的转录文本为空", 
                f"标题: {analysis_source.title}"
            )
        
        transcript_length = len(analysis_source.transcript)
        logger.info(f"获取到转录文本: {source_id}, 长度: {transcript_length}字符")
        
        return analysis_source.transcript