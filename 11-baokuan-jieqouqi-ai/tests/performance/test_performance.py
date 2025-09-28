"""
性能测试
"""

import pytest
import pytest_asyncio
import asyncio
import time
from unittest.mock import Mock, AsyncMock

from app.services.analysis.orchestrator import ThreeStageAnalyzer
from app.models.three_stage_analysis import AnalysisRequest, ContentType
from tests.mocks import MockAIService


class TestPerformance:
    """性能测试"""
    
    @pytest_asyncio.fixture
    async def orchestrator(self):
        """创建编排器实例"""
        mock_ai_service = MockAIService()
        mock_prompt_manager = Mock()
        mock_prompt_manager.get_template.side_effect = lambda name: f"模板内容 for {name}"
        
        return ThreeStageAnalyzer(
            ai_service=mock_ai_service,
            prompt_manager=mock_prompt_manager
        )
    
    @pytest.mark.asyncio
    async def test_single_analysis_performance(self, orchestrator):
        """测试单次分析性能"""
        request = AnalysisRequest(
            content="测试转录文本" * 100,  # 较长的文本
            content_type=ContentType.TEXT
        )
        
        start_time = time.time()
        result = await orchestrator.analyze(request)
        end_time = time.time()
        
        analysis_time = end_time - start_time
        
        # 验证性能要求（应该在5秒内完成）
        assert analysis_time < 5.0, f"分析耗时 {analysis_time:.2f}s 超过5秒限制"
        assert result.trust_hook is not None
        assert result.meta.processing_time_ms > 0
        
        print(f"单次分析耗时: {analysis_time:.2f}s")
    
    @pytest.mark.asyncio
    async def test_concurrent_analysis_performance(self, orchestrator):
        """测试并发分析性能"""
        requests = [
            AnalysisRequest(
                content=f"测试转录文本 {i}" * 50,
                content_type=ContentType.TEXT
            )
            for i in range(5)  # 5个并发请求
        ]
        
        start_time = time.time()
        
        # 并发执行分析
        tasks = [orchestrator.analyze(req) for req in requests]
        results = await asyncio.gather(*tasks)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # 验证所有结果
        for result in results:
            assert result.trust_hook is not None
        
        # 验证并发性能（应该比串行执行快）
        # 5个请求如果串行执行可能需要15秒，并发应该在10秒内完成
        assert total_time < 10.0, f"并发分析耗时 {total_time:.2f}s 超过10秒限制"
        
        print(f"5个并发分析总耗时: {total_time:.2f}s")
        print(f"平均每个分析耗时: {total_time/5:.2f}s")
    
    @pytest.mark.asyncio
    async def test_large_text_analysis_performance(self, orchestrator):
        """测试大文本分析性能"""
        # 创建一个包含大量文本的请求
        large_text = "这是一个很长的视频转录文本。" * 1000  # 约30KB文本
        
        request = AnalysisRequest(
            content=large_text,
            content_type=ContentType.TEXT
        )
        
        start_time = time.time()
        result = await orchestrator.analyze(request)
        end_time = time.time()
        
        analysis_time = end_time - start_time
        
        # 验证大文本性能（应该在10秒内完成）
        assert analysis_time < 10.0, f"大文本分析耗时 {analysis_time:.2f}s 超过10秒限制"
        assert result.trust_hook is not None
        
        print(f"大文本分析耗时: {analysis_time:.2f}s")
        print(f"文本长度: {len(large_text)} 字符")
    
    @pytest.mark.asyncio
    async def test_memory_usage_stability(self, orchestrator):
        """测试内存使用稳定性"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # 执行多次分析以测试内存稳定性
        for i in range(10):
            request = AnalysisRequest(
                content=f"测试转录文本 {i}" * 100,
                content_type=ContentType.TEXT
            )
            
            result = await orchestrator.analyze(request)
            assert result.trust_hook is not None
            
            # 检查内存使用
            current_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = current_memory - initial_memory
            
            # 内存增长不应该超过50MB
            assert memory_increase < 50, f"内存增长 {memory_increase:.2f}MB 过多"
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        total_memory_increase = final_memory - initial_memory
        
        print(f"初始内存: {initial_memory:.2f}MB")
        print(f"最终内存: {final_memory:.2f}MB")
        print(f"总内存增长: {total_memory_increase:.2f}MB")
    
    @pytest.mark.asyncio
    async def test_ai_service_timeout_handling(self):
        """测试AI服务超时处理"""
        # 创建会超时的AI服务
        class SlowAIService(MockAIService):
            async def call_llm(self, prompt: str, **kwargs) -> str:
                await asyncio.sleep(6)  # 模拟6秒超时
                return await super().call_llm(prompt, **kwargs)
        
        slow_ai_service = SlowAIService()
        mock_prompt_manager = Mock()
        mock_prompt_manager.get_template.side_effect = lambda name: f"模板内容 for {name}"
        
        orchestrator = ThreeStageAnalyzer(
            ai_service=slow_ai_service,
            prompt_manager=mock_prompt_manager
        )
        
        request = AnalysisRequest(
            content="测试转录文本",
            content_type=ContentType.TEXT
        )
        
        start_time = time.time()
        
        # 使用超时控制
        try:
            result = await asyncio.wait_for(orchestrator.analyze(request), timeout=5.0)
            # 如果没有超时，应该会抛出异常因为AI服务调用失败
            assert False, "应该因为AI服务调用超时而失败"
        except asyncio.TimeoutError:
            # 预期的超时行为
            pass
        except Exception as e:
            # 也可能因为AI服务内部超时而抛出异常
            pass
        
        end_time = time.time()
        analysis_time = end_time - start_time
        
        # 确保在合理时间内返回（不超过6秒）
        assert analysis_time < 6.0, f"超时处理时间 {analysis_time:.2f}s 过长"
        
        print(f"超时处理耗时: {analysis_time:.2f}s")