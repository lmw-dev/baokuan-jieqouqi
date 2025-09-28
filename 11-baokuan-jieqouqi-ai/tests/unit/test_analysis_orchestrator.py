"""
三段式分析引擎单元测试
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, patch, AsyncMock
import json

from app.services.analysis.orchestrator import ThreeStageAnalyzer
from app.models.three_stage_analysis import (
    AnalysisRequest, 
    ThreeStageAnalysisResult,
    TrustHookResult,
    EmpathyAnchorResult, 
    ValueMapResult,
    ContentType
)
from app.core.exceptions import AIServiceError, PromptManagementError, ThreeStageAnalysisError
from tests.mocks import MockAIService


class TestThreeStageAnalyzer:
    """三段式分析编排器测试"""
    
    @pytest_asyncio.fixture
    async def analyzer(self):
        """创建分析器实例"""
        mock_ai_service = MockAIService()
        mock_prompt_manager = Mock()
        
        # 设置prompt_manager的模拟响应
        mock_prompt_manager.get_template.side_effect = lambda name: f"模板内容 for {name}"
        
        # 模拟分析器
        analyzer = ThreeStageAnalyzer(
            ai_service=mock_ai_service,
            prompt_manager=mock_prompt_manager
        )
        
        # 模拟三个子分析器
        analyzer.trust_hook_analyzer = Mock()
        analyzer.empathy_anchor_analyzer = Mock()
        analyzer.value_map_analyzer = Mock()
        
        # 设置子分析器的异步返回值
        analyzer.trust_hook_analyzer.analyze = AsyncMock(return_value=TrustHookResult(
            hook_copy="从582款蓝牙耳机中评测选出的性价比之王！",
            credibility_testimony="所有产品均为自费购买，无任何广告植入",
            authority_signals=["10年评测经验", "582款评测", "性价比之王"]
        ))
        
        analyzer.empathy_anchor_analyzer.analyze = AsyncMock(return_value=EmpathyAnchorResult(
            pain_point="在海量618信息中，害怕买错耳机而浪费钱",
            target_audience="追求性价比的学生党和职场新人",
            emotional_triggers=["损失厌恶", "选择困难", "FOMO恐慌"]
        ))
        
        analyzer.value_map_analyzer.analyze = AsyncMock(return_value=ValueMapResult(
            core_value="帮助用户用最少的钱买到最适合的蓝牙耳机",
            value_delivery=["专业测试报告", "8维度评测数据", "购买建议清单"],
            competitive_advantage="582款海量评测 + 中立立场 + 自费测试保证客观性"
        ))
        
        return analyzer
    
    @pytest.mark.asyncio
    async def test_analyze_success(self, analyzer):
        """测试分析成功"""
        request = AnalysisRequest(
            content="测试蓝牙耳机评测内容",
            content_type=ContentType.TEXT
        )
        
        result = await analyzer.analyze(request)
        
        assert isinstance(result, ThreeStageAnalysisResult)
        assert result.trust_hook is not None
        assert result.empathy_anchor is not None
        assert result.value_map is not None
        assert result.meta is not None
        assert result.meta.processing_time_ms >= 0
    
    @pytest.mark.asyncio
    async def test_analyze_trust_hook_success(self, analyzer):
        """测试信任之钩分析成功"""
        request = AnalysisRequest(
            content="测试蓝牙耳机评测内容",
            content_type=ContentType.TEXT
        )
        
        result = await analyzer.analyze(request)
        
        assert isinstance(result.trust_hook, TrustHookResult)
        assert result.trust_hook.hook_copy == "从582款蓝牙耳机中评测选出的性价比之王！"
        assert result.trust_hook.credibility_testimony == "所有产品均为自费购买，无任何广告植入"
        assert len(result.trust_hook.authority_signals) == 3
    
    @pytest.mark.asyncio
    async def test_analyze_empathy_anchor_success(self, analyzer):
        """测试共情之锚分析成功"""
        request = AnalysisRequest(
            content="测试蓝牙耳机评测内容",
            content_type=ContentType.TEXT
        )
        
        result = await analyzer.analyze(request)
        
        assert isinstance(result.empathy_anchor, EmpathyAnchorResult)
        assert result.empathy_anchor.pain_point == "在海量618信息中，害怕买错耳机而浪费钱"
        assert result.empathy_anchor.target_audience == "追求性价比的学生党和职场新人"
        assert len(result.empathy_anchor.emotional_triggers) == 3
    
    @pytest.mark.asyncio
    async def test_analyze_value_map_success(self, analyzer):
        """测试价值图谱分析成功"""
        request = AnalysisRequest(
            content="测试蓝牙耳机评测内容",
            content_type=ContentType.TEXT
        )
        
        result = await analyzer.analyze(request)
        
        assert isinstance(result.value_map, ValueMapResult)
        assert result.value_map.core_value == "帮助用户用最少的钱买到最适合的蓝牙耳机"
        assert len(result.value_map.value_delivery) == 3
        assert "582款海量评测" in result.value_map.competitive_advantage
    
    @pytest.mark.asyncio
    async def test_analyze_trust_hook_failure(self, analyzer):
        """测试信任之钩分析失败"""
        # 设置信任之钩分析器抛出异常
        analyzer.trust_hook_analyzer.analyze = AsyncMock(side_effect=Exception("信任之钩分析失败"))
        
        request = AnalysisRequest(
            content="测试内容",
            content_type=ContentType.TEXT
        )
        
        with pytest.raises(ThreeStageAnalysisError) as exc_info:
            await analyzer.analyze(request)
        assert "信任之钩分析失败" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_analyze_empathy_anchor_failure(self, analyzer):
        """测试共情之锚分析失败"""
        # 设置共情之锚分析器抛出异常
        analyzer.empathy_anchor_analyzer.analyze = AsyncMock(side_effect=Exception("共情之锚分析失败"))
        
        request = AnalysisRequest(
            content="测试内容",
            content_type=ContentType.TEXT
        )
        
        with pytest.raises(ThreeStageAnalysisError) as exc_info:
            await analyzer.analyze(request)
        assert "共情之锚分析失败" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_analyze_value_map_failure(self, analyzer):
        """测试价值图谱分析失败"""
        # 设置价值图谱分析器抛出异常
        analyzer.value_map_analyzer.analyze = AsyncMock(side_effect=Exception("价值图谱分析失败"))
        
        request = AnalysisRequest(
            content="测试内容",
            content_type=ContentType.TEXT
        )
        
        with pytest.raises(ThreeStageAnalysisError) as exc_info:
            await analyzer.analyze(request)
        assert "价值图谱分析失败" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_analyze_with_video_transcript(self, analyzer):
        """测试视频转录文本分析"""
        request = AnalysisRequest(
            content="这是一个视频转录文本内容",
            content_type=ContentType.VIDEO_TRANSCRIPT,
            analysis_options={"language": "zh-CN"}
        )
        
        result = await analyzer.analyze(request)
        
        assert isinstance(result, ThreeStageAnalysisResult)
        assert result.trust_hook is not None
        assert result.empathy_anchor is not None
        assert result.value_map is not None
    
    @pytest.mark.asyncio
    async def test_analyze_with_custom_prompt_version(self, analyzer):
        """测试指定Prompt版本分析"""
        request = AnalysisRequest(
            content="测试内容",
            content_type=ContentType.TEXT,
            prompt_version="v2.0"
        )
        
        result = await analyzer.analyze(request)
        
        assert result.meta.prompt_version == "v2.0"
    
    @pytest.mark.asyncio
    async def test_analyze_performance_timing(self, analyzer):
        """测试分析性能计时"""
        request = AnalysisRequest(
            content="测试内容",
            content_type=ContentType.TEXT
        )
        
        result = await analyzer.analyze(request)
        
        # 验证性能计时 - 由于是Mock实现，时间可能为0
        assert result.meta.processing_time_ms >= 0
        assert result.meta.processing_time_ms < 10000  # 应该在10秒内完成
    
    @pytest.mark.asyncio
    async def test_analyze_parallel_execution(self, analyzer):
        """测试并行执行验证"""
        # 给分析器添加延迟来验证并行执行
        async def delayed_trust_hook(*args, **kwargs):
            import asyncio
            await asyncio.sleep(0.1)
            return TrustHookResult(
                hook_copy="测试标题",
                credibility_testimony="测试证词",
                authority_signals=["信号1"]
            )
        
        async def delayed_empathy_anchor(*args, **kwargs):
            import asyncio
            await asyncio.sleep(0.1)
            return EmpathyAnchorResult(
                pain_point="测试痛点",
                target_audience="测试受众",
                emotional_triggers=["触发器1"]
            )
        
        async def delayed_value_map(*args, **kwargs):
            import asyncio
            await asyncio.sleep(0.1)
            return ValueMapResult(
                core_value="测试价值",
                value_delivery=["交付物1"],
                competitive_advantage="测试优势"
            )
        
        analyzer.trust_hook_analyzer.analyze = delayed_trust_hook
        analyzer.empathy_anchor_analyzer.analyze = delayed_empathy_anchor
        analyzer.value_map_analyzer.analyze = delayed_value_map
        
        import time
        start_time = time.time()
        
        request = AnalysisRequest(
            content="测试内容",
            content_type=ContentType.TEXT
        )
        
        result = await analyzer.analyze(request)
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # 如果是并行执行，总时间应该接近单个任务时间(0.1s)，而不是串行时间(0.3s)
        assert execution_time < 0.3, f"执行时间 {execution_time:.3f}s 表明可能不是并行执行"
        assert result.trust_hook is not None
        assert result.empathy_anchor is not None
        assert result.value_map is not None