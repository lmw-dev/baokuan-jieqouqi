"""
三段式分析编排器 - 协调三个分析模块的执行
"""

import asyncio
import time
import uuid
from datetime import datetime
from typing import Optional
from loguru import logger

from app.services.ai.base import AIServiceBase
from app.services.prompts.manager import PromptManager
from app.services.analysis.trust_hook import TrustHookAnalyzer
from app.services.analysis.empathy_anchor import EmpathyAnchorAnalyzer
from app.services.analysis.value_map import ValueMapAnalyzer
from app.models.three_stage_analysis import (
    AnalysisRequest, 
    ThreeStageAnalysisResult,
    AnalysisMeta,
    AnalysisStatus
)
from app.core.exceptions import ThreeStageAnalysisError


class ThreeStageAnalyzer:
    """三段式分析编排器"""
    
    def __init__(self, ai_service: AIServiceBase, prompt_manager: PromptManager):
        self.ai_service = ai_service
        self.prompt_manager = prompt_manager
        
        # 初始化三个分析器
        self.trust_hook_analyzer = TrustHookAnalyzer(ai_service, prompt_manager)
        self.empathy_anchor_analyzer = EmpathyAnchorAnalyzer(ai_service, prompt_manager)
        self.value_map_analyzer = ValueMapAnalyzer(ai_service, prompt_manager)
    
    async def analyze(self, request: AnalysisRequest) -> ThreeStageAnalysisResult:
        """
        执行三段式分析
        
        Args:
            request: 分析请求
            
        Returns:
            三段式分析结果
            
        Raises:
            ThreeStageAnalysisError: 分析失败
        """
        analysis_id = str(uuid.uuid4())
        start_time = time.time()
        
        logger.info(f"开始三段式分析 [ID: {analysis_id}]")
        
        try:
            # 并行执行三个分析任务
            trust_hook_task = self._analyze_trust_hook(request.content)
            empathy_anchor_task = self._analyze_empathy_anchor(request.content)
            value_map_task = self._analyze_value_map(request.content)
            
            # 等待所有任务完成
            trust_hook_result, empathy_anchor_result, value_map_result = await asyncio.gather(
                trust_hook_task,
                empathy_anchor_task,
                value_map_task,
                return_exceptions=True
            )
            
            # 检查是否有任务失败
            if isinstance(trust_hook_result, Exception):
                raise ThreeStageAnalysisError(f"信任之钩分析失败: {trust_hook_result}")
            if isinstance(empathy_anchor_result, Exception):
                raise ThreeStageAnalysisError(f"共情之锚分析失败: {empathy_anchor_result}")
            if isinstance(value_map_result, Exception):
                raise ThreeStageAnalysisError(f"价值图谱分析失败: {value_map_result}")
            
            # 计算处理时间
            processing_time = int((time.time() - start_time) * 1000)
            
            # 创建元数据
            meta = AnalysisMeta(
                analysis_id=analysis_id,
                timestamp=datetime.utcnow(),
                processing_time_ms=processing_time,
                ai_model=self.ai_service.model,
                prompt_version=request.prompt_version or "latest",
                status=AnalysisStatus.COMPLETED
            )
            
            # 构建完整结果
            result = ThreeStageAnalysisResult(
                trust_hook=trust_hook_result,
                empathy_anchor=empathy_anchor_result,
                value_map=value_map_result,
                meta=meta
            )
            
            logger.info(f"三段式分析完成 [ID: {analysis_id}] 耗时: {processing_time}ms")
            return result
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(f"三段式分析失败 [ID: {analysis_id}] 耗时: {processing_time}ms, 错误: {str(e)}")
            
            # 创建失败的元数据
            meta = AnalysisMeta(
                analysis_id=analysis_id,
                timestamp=datetime.utcnow(),
                processing_time_ms=processing_time,
                ai_model=self.ai_service.model,
                prompt_version=request.prompt_version or "latest",
                status=AnalysisStatus.FAILED
            )
            
            raise ThreeStageAnalysisError(f"三段式分析失败: {str(e)}")
    
    async def _analyze_trust_hook(self, content: str):
        """执行信任之钩分析"""
        logger.debug("开始信任之钩分析")
        return await self.trust_hook_analyzer.analyze(content)
    
    async def _analyze_empathy_anchor(self, content: str):
        """执行共情之锚分析"""
        logger.debug("开始共情之锚分析")
        return await self.empathy_anchor_analyzer.analyze(content)
    
    async def _analyze_value_map(self, content: str):
        """执行价值图谱分析"""
        logger.debug("开始价值图谱分析")
        return await self.value_map_analyzer.analyze(content)
    
    async def analyze_sequential(self, request: AnalysisRequest) -> ThreeStageAnalysisResult:
        """
        顺序执行三段式分析（如果并行分析有问题时使用）
        
        Args:
            request: 分析请求
            
        Returns:
            三段式分析结果
        """
        analysis_id = str(uuid.uuid4())
        start_time = time.time()
        
        logger.info(f"开始顺序三段式分析 [ID: {analysis_id}]")
        
        try:
            # 顺序执行三个分析任务
            trust_hook_result = await self._analyze_trust_hook(request.content)
            empathy_anchor_result = await self._analyze_empathy_anchor(request.content)
            value_map_result = await self._analyze_value_map(request.content)
            
            # 计算处理时间
            processing_time = int((time.time() - start_time) * 1000)
            
            # 创建元数据
            meta = AnalysisMeta(
                analysis_id=analysis_id,
                timestamp=datetime.utcnow(),
                processing_time_ms=processing_time,
                ai_model=self.ai_service.model,
                prompt_version=request.prompt_version or "latest",
                status=AnalysisStatus.COMPLETED
            )
            
            # 构建完整结果
            result = ThreeStageAnalysisResult(
                trust_hook=trust_hook_result,
                empathy_anchor=empathy_anchor_result,
                value_map=value_map_result,
                meta=meta
            )
            
            logger.info(f"顺序三段式分析完成 [ID: {analysis_id}] 耗时: {processing_time}ms")
            return result
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(f"顺序三段式分析失败 [ID: {analysis_id}] 耗时: {processing_time}ms, 错误: {str(e)}")
            raise ThreeStageAnalysisError(f"顺序三段式分析失败: {str(e)}")
    
    async def health_check(self) -> bool:
        """
        健康检查
        
        Returns:
            是否健康
        """
        try:
            # 检查AI服务
            ai_healthy = await self.ai_service.health_check()
            if not ai_healthy:
                logger.warning("AI服务健康检查失败")
                return False
            
            # 检查Prompt模板
            required_templates = ["trust_hook", "empathy_anchor", "value_map"]
            for template_name in required_templates:
                if not self.prompt_manager.has_template(template_name):
                    logger.warning(f"缺少必要的Prompt模板: {template_name}")
                    return False
            
            logger.info("三段式分析器健康检查通过")
            return True
            
        except Exception as e:
            logger.error(f"三段式分析器健康检查失败: {str(e)}")
            return False