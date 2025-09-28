import asyncio
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from loguru import logger

from app.schemas.analyze_schema import (
    AnalyzeRequest, AnalysisResult, TrustHookResult,
    TranscriptionResult, AnalysisOptions, AnalysisStatus
)
from app.services.hook_analysis_service import HookAnalysisService


class AnalysisService:
    """综合分析服务 - 协调所有分析步骤"""
    
    def __init__(self):
        self.hook_analyzer = HookAnalysisService()
        logger.info("综合分析服务初始化完成")
    
    async def analyze_content(
        self, 
        request: AnalyzeRequest,
        file_data: Optional[bytes] = None,
        original_filename: Optional[str] = None
    ) -> AnalysisResult:
        """
        分析内容主入口
        
        Args:
            request: 分析请求
            file_data: 文件数据（当content_type为file时）
            original_filename: 原始文件名
            
        Returns:
            AnalysisResult: 分析结果
        """
        # 生成任务ID
        task_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        logger.info(f"开始分析任务: {task_id}, 类型: {request.content_type}")
        
        try:
            # 根据内容类型执行不同的分析流程
            if request.content_type == "file":
                result = await self._analyze_file(
                    file_data, original_filename, request.analysis_options
                )
            else:
                result = await self._analyze_text(
                    request.text_content, request.analysis_options
                )
            
            # 更新处理时间
            end_time = datetime.utcnow()
            processing_time = (end_time - start_time).total_seconds()
            
            # 更新结果中的任务信息
            result.task_id = task_id
            result.status = AnalysisStatus.COMPLETED
            result.progress = 1.0
            result.created_at = start_time
            result.updated_at = end_time
            
            logger.info(f"分析任务完成: {task_id}, 耗时: {processing_time:.2f}秒")
            return result
                
        except Exception as e:
            error_msg = f"分析任务失败: {task_id}, 错误: {str(e)}"
            logger.error(error_msg)
            
            # 返回错误结果
            return AnalysisResult(
                task_id=task_id,
                status=AnalysisStatus.FAILED,
                progress=0.0,
                error_message=str(e),
                created_at=start_time,
                updated_at=datetime.utcnow()
            )
    
    async def _analyze_file(
        self,
        file_data: bytes,
        filename: str,
        options: Optional[AnalysisOptions]
    ) -> AnalysisResult:
        """
        分析文件内容 - 简化版本
        """
        logger.info(f"开始分析文件: {filename}")
        
        # 对于演示，我们返回一个模拟的分析结果
        mock_text = f"这是从文件 {filename} 提取的模拟文本内容。作为专家，我要告诉你99%的人都不知道的秘密。"
        
        # 分析信任之钩
        trust_hooks = []
        if options is None or options.enable_hook_detection:
            trust_hooks = await self.hook_analyzer.analyze_text_hooks(mock_text)
        
        # 生成摘要
        summary = self._generate_summary(mock_text, trust_hooks)
        
        return AnalysisResult(
            task_id="",  # 将在上层设置
            status=AnalysisStatus.COMPLETED,
            progress=1.0,
            title=f"文件分析 - {filename}",
            summary=summary,
            transcribed_text=mock_text,
            trust_hooks=trust_hooks,
            file_name=filename,
            file_size=len(file_data),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    async def _analyze_text(
        self,
        text_content: str,
        options: Optional[AnalysisOptions]
    ) -> AnalysisResult:
        """
        分析文本内容
        """
        try:
            # 1. 分析信任之钩
            logger.info("步骤1: 分析信任之钩")
            
            trust_hooks = []
            if options is None or options.enable_hook_detection:
                trust_hooks = await self.hook_analyzer.analyze_text_hooks(text_content)
            
            # 2. 生成摘要
            logger.info("步骤2: 生成摘要")
            summary = self._generate_summary(text_content, trust_hooks)
            
            return AnalysisResult(
                task_id="",  # 将在上层设置
                status=AnalysisStatus.COMPLETED,
                progress=1.0,
                title="文本分析",
                summary=summary,
                transcribed_text=text_content,
                trust_hooks=trust_hooks,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"文本分析失败: {str(e)}")
            raise
    
    def _generate_summary(
        self, 
        text: str, 
        trust_hooks: list[TrustHookResult]
    ) -> str:
        """
        生成内容摘要
        
        Args:
            text: 原始文本
            trust_hooks: 识别到的信任之钩
            
        Returns:
            str: 摘要文本
        """
        if not text:
            return "无内容"
        
        # 简单的摘要生成逻辑
        text_preview = text[:100] + "..." if len(text) > 100 else text
        
        hook_summary = ""
        if trust_hooks:
            hook_types = list(set(hook.hook_type.value for hook in trust_hooks))
            hook_summary = f"识别到信任之钩: {', '.join(hook_types)}"
        else:
            hook_summary = "未识别到明显的信任之钩"
        
        return f"{text_preview}\n\n{hook_summary}"
    
    async def validate_services(self) -> Dict[str, bool]:
        """
        验证所有服务的可用性
        
        Returns:
            Dict[str, bool]: 各服务的可用性状态
        """
        results = {}
        
        # 验证Hook分析
        results["hook_analyzer"] = self.hook_analyzer.get_rule_count() > 0
        
        logger.info(f"服务可用性检查结果: {results}")
        return results