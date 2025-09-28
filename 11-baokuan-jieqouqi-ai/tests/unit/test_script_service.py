"""
TOM-217: 脚本管理服务单元测试
测试ScriptService的所有核心功能
"""

import pytest
import asyncio
import uuid
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime
from typing import Dict, Any

from app.services.script.script_service import ScriptService
from app.models.script_management import Script, ScriptSection, ScriptEditHistory, ScriptStatus
from app.models.analysis import AnalysisCard, AnalysisSource
from app.models.script_generation import AnalysisCardSchema, ScriptFramework, ScriptSection as GeneratorScriptSection, ScriptStyleConfig
from app.schemas.script_management import ScriptDetail, ScriptSectionDetail, ScriptMetadata
from app.core.exceptions import (
    ScriptGenerationError, 
    NotFoundError, 
    PermissionDeniedError, 
    InvalidParameterError
)


class TestScriptService:
    """脚本服务测试类"""
    
    def setup_method(self):
        """每个测试方法执行前的准备"""
        self.script_service = ScriptService()
        
        # 创建测试数据
        self.test_user_id = "test-user-001"
        self.test_card_id = str(uuid.uuid4())
        self.test_script_id = str(uuid.uuid4())
        
        # 模拟AnalysisCard
        self.mock_analysis_card = Mock(spec=AnalysisCard)
        self.mock_analysis_card.id = self.test_card_id
        self.mock_analysis_card.version_title = "测试视频分析"
        self.mock_analysis_card.hook_copy = "震撼钩子文案"
        self.mock_analysis_card.hook_types = ["数据震撼", "权威背书"]
        self.mock_analysis_card.hook_notes = "钩子笔记"
        self.mock_analysis_card.core_idea = "核心观点"
        self.mock_analysis_card.argument_case = "论证案例"
        self.mock_analysis_card.value_delivery = ["价值1", "价值2"]
        self.mock_analysis_card.reusable_elements = "可复用要素"
        self.mock_analysis_card.value_notes = "价值笔记"
        self.mock_analysis_card.source_id = str(uuid.uuid4())
        
        # 模拟AnalysisSource
        self.mock_analysis_source = Mock(spec=AnalysisSource)
        self.mock_analysis_source.id = self.mock_analysis_card.source_id
        self.mock_analysis_source.owner_id = self.test_user_id
        
        # 模拟Script和ScriptSection
        self.mock_script = Mock(spec=Script)
        self.mock_script.id = self.test_script_id
        self.mock_script.card_id = self.test_card_id
        self.mock_script.title = "测试脚本"
        self.mock_script.status = ScriptStatus.DRAFT.value
        self.mock_script.created_by = self.test_user_id
        self.mock_script.created_at = datetime.utcnow()
        self.mock_script.updated_at = datetime.utcnow()
        
        # 模拟ScriptSection列表
        self.mock_sections = []
        for i, (section_type, title) in enumerate([
            ("hook", "开场钩子 (0-15秒)"),
            ("problem", "痛点共鸣 (15-45秒)"),
            ("solution", "解决方案 (45秒-3分钟)"),
            ("proof", "价值证明 (3-4分钟)"),
            ("cta", "行动召唤 (4-5分钟)")
        ]):
            section = Mock(spec=ScriptSection)
            section.id = str(uuid.uuid4())
            section.script_id = self.test_script_id
            section.section_type = section_type
            section.title = title
            section.content = f"测试{title}内容"
            section.tips = [f"{title}创作要点"]
            section.time_range = f"{i*30}-{(i+1)*30}秒"
            section.importance = "high"
            section.order_index = i + 1
            section.updated_at = datetime.utcnow()
            self.mock_sections.append(section)
        
        self.mock_script.sections = self.mock_sections
        self.mock_script.edit_history = []
    
    @pytest.mark.asyncio
    async def test_verify_card_access_success(self):
        """测试验证卡片访问权限成功"""
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            # 模拟session
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            # 模拟查询结果
            mock_result_card = Mock()
            mock_result_card.scalar_one_or_none.return_value = self.mock_analysis_card
            
            mock_result_source = Mock()
            mock_result_source.scalar_one_or_none.return_value = self.mock_analysis_source
            
            mock_session.execute.side_effect = [mock_result_card, mock_result_source]
            
            # 调用方法
            result = await self.script_service._verify_card_access(
                mock_session, self.test_card_id, self.test_user_id
            )
            
            # 验证结果
            assert result == self.mock_analysis_card
            assert mock_session.execute.call_count == 2
    
    @pytest.mark.asyncio
    async def test_verify_card_access_card_not_found(self):
        """测试验证卡片访问权限 - 卡片不存在"""
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            # 模拟卡片不存在
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = None
            mock_session.execute.return_value = mock_result
            
            # 测试异常
            with pytest.raises(NotFoundError, match="分析卡片不存在"):
                await self.script_service._verify_card_access(
                    mock_session, self.test_card_id, self.test_user_id
                )
    
    @pytest.mark.asyncio
    async def test_verify_card_access_permission_denied(self):
        """测试验证卡片访问权限 - 权限不足"""
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            # 模拟不同用户的source
            different_source = Mock(spec=AnalysisSource)
            different_source.id = self.mock_analysis_card.source_id
            different_source.owner_id = "different-user"
            
            mock_result_card = Mock()
            mock_result_card.scalar_one_or_none.return_value = self.mock_analysis_card
            
            mock_result_source = Mock()
            mock_result_source.scalar_one_or_none.return_value = different_source
            
            mock_session.execute.side_effect = [mock_result_card, mock_result_source]
            
            # 测试异常
            with pytest.raises(PermissionDeniedError, match="用户无权访问此分析卡片"):
                await self.script_service._verify_card_access(
                    mock_session, self.test_card_id, self.test_user_id
                )
    
    @pytest.mark.asyncio
    async def test_verify_script_access_success(self):
        """测试验证脚本访问权限成功"""
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            # 模拟查询结果
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = self.mock_script
            mock_session.execute.return_value = mock_result
            
            # 调用方法
            result = await self.script_service._verify_script_access(
                mock_session, self.test_script_id, self.test_user_id
            )
            
            # 验证结果
            assert result == self.mock_script
    
    @pytest.mark.asyncio
    async def test_verify_script_access_script_not_found(self):
        """测试验证脚本访问权限 - 脚本不存在"""
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            # 模拟脚本不存在
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = None
            mock_session.execute.return_value = mock_result
            
            # 测试异常
            with pytest.raises(NotFoundError, match="脚本不存在"):
                await self.script_service._verify_script_access(
                    mock_session, self.test_script_id, self.test_user_id
                )
    
    @pytest.mark.asyncio
    async def test_verify_script_access_permission_denied(self):
        """测试验证脚本访问权限 - 权限不足"""
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            # 模拟不同用户的脚本
            different_script = Mock(spec=Script)
            different_script.id = self.test_script_id
            different_script.created_by = "different-user"
            
            mock_result = Mock()
            mock_result.scalar_one_or_none.return_value = different_script
            mock_session.execute.return_value = mock_result
            
            # 测试异常
            with pytest.raises(PermissionDeniedError, match="用户无权访问此脚本"):
                await self.script_service._verify_script_access(
                    mock_session, self.test_script_id, self.test_user_id
                )
    
    @pytest.mark.asyncio
    async def test_convert_card_to_schema_success(self):
        """测试转换AnalysisCard为Schema成功"""
        result = await self.script_service._convert_card_to_schema(self.mock_analysis_card)
        
        assert isinstance(result, AnalysisCardSchema)
        assert result.id == self.test_card_id
        assert result.version_title == "测试视频分析"
        assert result.hook_copy == "震撼钩子文案"
        assert result.hook_types == ["数据震撼", "权威背书"]
        assert result.core_idea == "核心观点"
    
    @pytest.mark.asyncio
    async def test_convert_card_to_schema_with_none_values(self):
        """测试转换包含None值的AnalysisCard - 应该抛出验证错误"""
        # 创建包含None值的卡片
        card_with_nones = Mock(spec=AnalysisCard)
        card_with_nones.id = self.test_card_id
        card_with_nones.version_title = None  # 这会导致验证失败
        card_with_nones.hook_copy = None
        card_with_nones.hook_types = None
        card_with_nones.hook_notes = None
        card_with_nones.core_idea = None
        card_with_nones.argument_case = None
        card_with_nones.value_delivery = None
        card_with_nones.reusable_elements = None
        card_with_nones.value_notes = None
        
        # 测试应该抛出InvalidParameterError，因为version_title不能为空
        with pytest.raises(InvalidParameterError, match="数据转换失败"):
            await self.script_service._convert_card_to_schema(card_with_nones)
    
    @pytest.mark.asyncio
    async def test_convert_script_to_detail_success(self):
        """测试转换Script为ScriptDetail成功"""
        result = await self.script_service._convert_script_to_detail(self.mock_script)
        
        assert isinstance(result, ScriptDetail)
        assert result.id == self.test_script_id
        assert result.card_id == self.test_card_id
        assert result.title == "测试脚本"
        assert result.status == ScriptStatus.DRAFT.value
        assert len(result.sections) == 5
        
        # 验证段落顺序
        for i, section in enumerate(result.sections):
            assert isinstance(section, ScriptSectionDetail)
            assert section.order_index == i + 1
        
        # 验证元数据
        assert isinstance(result.metadata, ScriptMetadata)
        assert result.metadata.total_sections == 5
        assert result.metadata.creator_id == self.test_user_id
    
    @pytest.mark.asyncio
    async def test_get_script_success(self):
        """测试获取脚本详情成功"""
        with patch.object(self.script_service, '_verify_script_access') as mock_verify:
            with patch.object(self.script_service, '_convert_script_to_detail') as mock_convert:
                # 设置mock返回值
                mock_verify.return_value = self.mock_script
                expected_detail = Mock(spec=ScriptDetail)
                mock_convert.return_value = expected_detail
                
                # 调用方法
                result = await self.script_service.get_script(self.test_script_id, self.test_user_id)
                
                # 验证结果
                assert result == expected_detail
                mock_verify.assert_called_once()
                mock_convert.assert_called_once_with(self.mock_script)
    
    @pytest.mark.asyncio
    async def test_delete_script_success(self):
        """测试删除脚本成功"""
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            with patch.object(self.script_service, '_verify_script_access') as mock_verify:
                mock_verify.return_value = self.mock_script
                
                # 调用方法
                result = await self.script_service.delete_script(self.test_script_id, self.test_user_id)
                
                # 验证结果
                assert result is True
                mock_verify.assert_called_once()
                mock_session.add.assert_called_once()  # 添加删除历史记录
                mock_session.execute.assert_called_once()  # 执行删除语句
                mock_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_script_success(self):
        """测试生成脚本成功"""
        # 创建模拟的脚本生成器
        mock_generator = AsyncMock()
        mock_framework = Mock(spec=ScriptFramework)
        mock_framework.title = "AI生成的脚本标题"
        mock_framework.hook = Mock()
        mock_framework.hook.content = "钩子内容"
        mock_framework.hook.tips = "钩子要点"
        mock_framework.problem = Mock()
        mock_framework.problem.content = "问题内容"
        mock_framework.problem.tips = "问题要点"
        mock_framework.solution = Mock()
        mock_framework.solution.content = "解决方案内容"
        mock_framework.solution.tips = "解决方案要点"
        mock_framework.proof = Mock()
        mock_framework.proof.content = "证明内容"
        mock_framework.proof.tips = "证明要点"
        mock_framework.cta = Mock()
        mock_framework.cta.content = "行动召唤内容"
        mock_framework.cta.tips = "行动召唤要点"
        
        mock_generator.generate_script_framework.return_value = mock_framework
        
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            # 模拟数据库操作
            mock_result_card = Mock()
            mock_result_card.scalar_one_or_none.return_value = self.mock_analysis_card
            mock_result_source = Mock()
            mock_result_source.scalar_one_or_none.return_value = self.mock_analysis_source
            mock_result_script = Mock()
            mock_result_script.scalar_one.return_value = self.mock_script
            
            mock_session.execute.side_effect = [
                mock_result_card,    # 查询分析卡片
                mock_result_source,  # 查询分析源
                mock_result_script   # 重新查询完整脚本
            ]
            
            with patch.object(self.script_service, '_get_script_generator') as mock_get_generator:
                with patch.object(self.script_service, '_convert_script_to_detail') as mock_convert:
                    mock_get_generator.return_value = mock_generator
                    expected_detail = Mock(spec=ScriptDetail)
                    mock_convert.return_value = expected_detail
                    
                    # 调用方法
                    style_config = ScriptStyleConfig(tone="professional")
                    result = await self.script_service.generate_script(
                        self.test_card_id, self.test_user_id, style_config
                    )
                    
                    # 验证结果
                    assert result == expected_detail
                    mock_generator.generate_script_framework.assert_called_once()
                    mock_session.add.assert_called()  # 添加脚本和段落
                    mock_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """测试服务健康检查成功"""
        mock_generator = AsyncMock()
        mock_generator.health_check.return_value = True
        
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            with patch.object(self.script_service, '_get_script_generator') as mock_get_generator:
                mock_get_generator.return_value = mock_generator
                
                # 调用方法
                result = await self.script_service.health_check()
                
                # 验证结果
                assert result is True
                mock_session.execute.assert_called_once()  # 检查数据库连接
                mock_generator.health_check.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_health_check_generator_fail(self):
        """测试脚本生成器健康检查失败"""
        mock_generator = AsyncMock()
        mock_generator.health_check.return_value = False
        
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            with patch.object(self.script_service, '_get_script_generator') as mock_get_generator:
                mock_get_generator.return_value = mock_generator
                
                # 调用方法
                result = await self.script_service.health_check()
                
                # 验证结果
                assert result is False
    
    @pytest.mark.asyncio
    async def test_health_check_database_fail(self):
        """测试数据库健康检查失败"""
        with patch('app.services.script.script_service.get_db_session') as mock_session_context:
            mock_session = AsyncMock()
            mock_session.execute.side_effect = Exception("数据库连接失败")
            mock_session_context.return_value.__aenter__.return_value = mock_session
            
            # 调用方法
            result = await self.script_service.health_check()
            
            # 验证结果
            assert result is False


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v", "--tb=short"])