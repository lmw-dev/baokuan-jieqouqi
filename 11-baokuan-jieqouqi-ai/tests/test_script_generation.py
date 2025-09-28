"""
脚本生成模块单元测试
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from typing import Dict, Any

from app.models.script_generation import (
    AnalysisCardSchema,
    ScriptFramework,
    ScriptSection,
    ScriptStyleConfig,
    FieldMappingConfig,
    ScriptGenerationRequest,
    SectionGenerationResult
)
from app.services.analysis.field_mapper import FieldMapper
from app.services.analysis.script_generator import ScriptGenerator
from app.core.exceptions import ScriptGenerationError


class TestFieldMapper:
    """字段映射器测试"""
    
    def setup_method(self):
        """测试前准备"""
        self.field_mapper = FieldMapper()
        self.sample_card = AnalysisCardSchema(
            id="test_card_123",
            version_title="测试视频分析",
            hook_copy="从582款蓝牙耳机中评测选出的性价比之王！",
            hook_types=["数据震撼", "权威背书"],
            core_idea="帮助用户选择性价比最高的蓝牙耳机",
            argument_case="大部分用户购买蓝牙耳机时容易被品牌和价格误导",
            value_delivery=["提供选购标准", "避免踩坑", "节省开支"],
            reusable_elements="三大选购法则",
            credibility_testimony="所有产品均为自费购买，无任何广告植入",
            authority_signals=["10年评测经验", "582款评测", "性价比之王"],
            pain_point="面对众多蓝牙耳机型号不知道如何选择",
            target_audience="想要购买蓝牙耳机的普通消费者",
            emotional_triggers=["选择困难", "害怕买错", "担心性价比"],
            competitive_advantage="基于大量实测数据的客观建议"
        )
    
    def test_map_analysis_to_script_data(self):
        """测试完整的字段映射"""
        mapped_data = self.field_mapper.map_analysis_to_script_data(self.sample_card)
        
        # 验证返回结构
        assert isinstance(mapped_data, dict)
        assert set(mapped_data.keys()) == {"hook", "problem", "solution", "proof", "cta"}
        
        # 验证每个段落都有数据
        for section_name, section_data in mapped_data.items():
            assert isinstance(section_data, dict)
            assert len(section_data) > 0
    
    def test_extract_hook_data(self):
        """测试钩子数据提取"""
        hook_data = self.field_mapper.extract_hook_data(self.sample_card)
        
        assert hook_data["hook_copy"] == "从582款蓝牙耳机中评测选出的性价比之王！"
        assert hook_data["hook_types"] == ["数据震撼", "权威背书"]
        assert hook_data["credibility_testimony"] == "所有产品均为自费购买，无任何广告植入"
        assert hook_data["authority_signals"] == ["10年评测经验", "582款评测", "性价比之王"]
        assert hook_data["core_idea"] == "帮助用户选择性价比最高的蓝牙耳机"
        assert hook_data["version_title"] == "测试视频分析"
    
    def test_extract_problem_data(self):
        """测试痛点数据提取"""
        problem_data = self.field_mapper.extract_problem_data(self.sample_card)
        
        assert problem_data["core_idea"] == "帮助用户选择性价比最高的蓝牙耳机"
        assert problem_data["argument_case"] == "大部分用户购买蓝牙耳机时容易被品牌和价格误导"
        assert problem_data["pain_point"] == "面对众多蓝牙耳机型号不知道如何选择"
        assert problem_data["target_audience"] == "想要购买蓝牙耳机的普通消费者"
        assert problem_data["emotional_triggers"] == ["选择困难", "害怕买错", "担心性价比"]
    
    def test_extract_solution_data(self):
        """测试解决方案数据提取"""
        solution_data = self.field_mapper.extract_solution_data(self.sample_card)
        
        assert solution_data["core_idea"] == "帮助用户选择性价比最高的蓝牙耳机"
        assert solution_data["value_delivery"] == ["提供选购标准", "避免踩坑", "节省开支"]
        assert solution_data["reusable_elements"] == "三大选购法则"
        assert solution_data["argument_case"] == "大部分用户购买蓝牙耳机时容易被品牌和价格误导"
        assert solution_data["competitive_advantage"] == "基于大量实测数据的客观建议"
    
    def test_extract_section_data_valid_types(self):
        """测试按段落类型提取数据"""
        for section_type in ["hook", "problem", "solution", "proof", "cta"]:
            section_data = self.field_mapper.extract_section_data(self.sample_card, section_type)
            assert isinstance(section_data, dict)
            assert len(section_data) > 0
    
    def test_extract_section_data_invalid_type(self):
        """测试无效段落类型"""
        with pytest.raises(ValueError, match="无效的段落类型"):
            self.field_mapper.extract_section_data(self.sample_card, "invalid_type")
    
    def test_safe_get_string_none(self):
        """测试安全字符串获取 - None值"""
        result = self.field_mapper._safe_get_string(None)
        assert result == ""
    
    def test_safe_get_string_empty(self):
        """测试安全字符串获取 - 空字符串"""
        result = self.field_mapper._safe_get_string("   ")
        assert result == ""
    
    def test_safe_get_string_valid(self):
        """测试安全字符串获取 - 有效字符串"""
        result = self.field_mapper._safe_get_string("  test string  ")
        assert result == "test string"
    
    def test_safe_get_list_none(self):
        """测试安全列表获取 - None值"""
        result = self.field_mapper._safe_get_list(None)
        assert result == []
    
    def test_safe_get_list_empty(self):
        """测试安全列表获取 - 空列表"""
        result = self.field_mapper._safe_get_list([])
        assert result == []
    
    def test_safe_get_list_valid(self):
        """测试安全列表获取 - 有效列表"""
        result = self.field_mapper._safe_get_list(["  item1  ", "", "item2", None])
        assert result == ["item1", "item2"]
    
    def test_generate_next_value_hint_purchase_context(self):
        """测试后续价值提示生成 - 购买场景"""
        card = AnalysisCardSchema(
            id="test", 
            version_title="test",
            core_idea="帮助用户选择购买最适合的产品"
        )
        hint = self.field_mapper._generate_next_value_hint(card)
        assert "选购攻略" in hint or "购买" in hint
    
    def test_generate_next_value_hint_empty_data(self):
        """测试后续价值提示生成 - 空数据"""
        card = AnalysisCardSchema(id="test", version_title="test")
        hint = self.field_mapper._generate_next_value_hint(card)
        assert "相关内容" in hint
    
    def test_get_mapping_summary(self):
        """测试映射摘要生成"""
        summary = self.field_mapper.get_mapping_summary(self.sample_card)
        
        assert "card_id" in summary
        assert "version_title" in summary
        assert "available_fields" in summary
        assert "field_utilization" in summary
        
        # 验证字段利用率统计
        for section in ["hook", "problem", "solution", "proof", "cta"]:
            assert section in summary["field_utilization"]
            util = summary["field_utilization"][section]
            assert "total_fields" in util
            assert "non_empty_fields" in util
            assert "utilization_rate" in util
            assert 0 <= util["utilization_rate"] <= 1


class TestScriptGenerator:
    """脚本生成器测试"""
    
    def setup_method(self):
        """测试前准备"""
        # 创建Mock对象
        self.mock_ai_service = Mock()
        self.mock_prompt_manager = Mock()
        
        # 设置AI服务属性
        self.mock_ai_service.model = "deepseek-v3"
        
        # 设置prompt管理器方法
        self.mock_prompt_manager.get_template.return_value = """
        你是专业的脚本创作师。请基于以下数据生成内容：
        - 钩子文案: {{hook_copy}}
        - 核心理念: {{core_idea}}
        
        请按照JSON格式输出：
        ```json
        {
            "content": "生成的内容",
            "tips": "创作要点",
            "duration": "0-15秒",
            "keywords": ["关键词1", "关键词2"]
        }
        ```
        """
        
        # 创建脚本生成器实例
        self.script_generator = ScriptGenerator(
            ai_service=self.mock_ai_service,
            prompt_manager=self.mock_prompt_manager
        )
        
        # 准备测试数据
        self.sample_card = AnalysisCardSchema(
            id="test_card_123",
            version_title="测试视频分析",
            hook_copy="从582款蓝牙耳机中评测选出的性价比之王！",
            hook_types=["数据震撼", "权威背书"],
            core_idea="帮助用户选择性价比最高的蓝牙耳机",
            value_delivery=["提供选购标准", "避免踩坑"]
        )
    
    def test_init(self):
        """测试初始化"""
        assert self.script_generator.ai_service == self.mock_ai_service
        assert self.script_generator.prompt_manager == self.mock_prompt_manager
        assert isinstance(self.script_generator.field_mapper, FieldMapper)
        assert len(self.script_generator.section_prompts) == 5
    
    @pytest.mark.asyncio
    async def test_generate_section_success(self):
        """测试单个段落生成成功"""
        # 模拟AI响应
        mock_response = '''
        ```json
        {
            "content": "作为一个用了10年iPhone的老用户，今天我要告诉你一个残酷的真相",
            "tips": "• 用权威身份建立信任\\n• 制造紧迫感和好奇心",
            "duration": "0-15秒",
            "keywords": ["权威背书", "真相揭秘"]
        }
        ```
        '''
        self.mock_ai_service.call_llm = AsyncMock(return_value=mock_response)
        
        # 准备映射数据
        mapped_data = {
            "hook_copy": "测试钩子",
            "core_idea": "测试理念"
        }
        
        # 生成段落
        section = await self.script_generator._generate_section("hook", mapped_data)
        
        # 验证结果
        assert isinstance(section, ScriptSection)
        assert section.title == "开场钩子 (0-15秒)"
        assert "残酷的真相" in section.content
        assert "权威身份" in section.tips
        assert section.duration == "0-15秒"
        assert section.keywords == ["权威背书", "真相揭秘"]
    
    @pytest.mark.asyncio
    async def test_generate_section_invalid_type(self):
        """测试无效段落类型"""
        with pytest.raises(ScriptGenerationError, match="无效的段落类型"):
            await self.script_generator._generate_section("invalid", {})
    
    @pytest.mark.asyncio
    async def test_generate_section_ai_service_error(self):
        """测试AI服务错误"""
        self.mock_ai_service.call_llm = AsyncMock(side_effect=Exception("AI服务错误"))
        
        with pytest.raises(ScriptGenerationError, match="hook段落生成失败"):
            await self.script_generator._generate_section("hook", {})
    
    @pytest.mark.asyncio
    async def test_generate_section_invalid_json_response(self):
        """测试无效JSON响应"""
        self.mock_ai_service.call_llm = AsyncMock(return_value="这不是有效的JSON")
        
        with pytest.raises(ScriptGenerationError, match="AI响应JSON解析失败"):
            await self.script_generator._generate_section("hook", {})
    
    @pytest.mark.asyncio
    async def test_generate_section_missing_required_fields(self):
        """测试缺少必要字段的响应"""
        mock_response = '''
        ```json
        {
            "content": "内容",
            "tips": "要点"
        }
        ```
        '''
        self.mock_ai_service.call_llm = AsyncMock(return_value=mock_response)
        
        with pytest.raises(ScriptGenerationError, match="AI响应缺少必要字段"):
            await self.script_generator._generate_section("hook", {})
    
    def test_replace_template_variables(self):
        """测试模板变量替换"""
        template = "钩子文案: {{hook_copy}}, 理念: {{core_idea}}, 类型: {{hook_types}}"
        mapped_data = {
            "hook_copy": "测试钩子",
            "core_idea": "测试理念",
            "hook_types": ["类型1", "类型2"]
        }
        
        result = self.script_generator._replace_template_variables(template, mapped_data)
        
        assert "钩子文案: 测试钩子" in result
        assert "理念: 测试理念" in result
        assert "类型: 类型1、类型2" in result
    
    def test_replace_template_variables_with_style_config(self):
        """测试带风格配置的模板变量替换"""
        template = "基础内容: {{core_idea}}"
        mapped_data = {"core_idea": "测试理念"}
        style_config = ScriptStyleConfig(
            tone="casual",
            target_audience="年轻用户"
        )
        
        result = self.script_generator._replace_template_variables(
            template, mapped_data, style_config
        )
        
        assert "基础内容: 测试理念" in result
        assert "轻松、亲切的语调" in result
        assert "目标受众是：年轻用户" in result
    
    def test_replace_template_variables_empty_values(self):
        """测试空值替换"""
        template = "钩子: {{hook_copy}}, 列表: {{empty_list}}"
        mapped_data = {
            "hook_copy": "",
            "empty_list": []
        }
        
        result = self.script_generator._replace_template_variables(template, mapped_data)
        
        assert "钩子: 暂无" in result
        assert "列表: 暂无" in result
    
    def test_extract_json_from_response_with_json_block(self):
        """测试从JSON代码块提取"""
        response = '''
        这是一些前置文本
        ```json
        {"test": "value"}
        ```
        这是一些后置文本
        '''
        
        result = self.script_generator._extract_json_from_response(response)
        assert result == {"test": "value"}
    
    def test_extract_json_from_response_with_code_block(self):
        """测试从普通代码块提取"""
        response = '''
        ```
        {"test": "value"}
        ```
        '''
        
        result = self.script_generator._extract_json_from_response(response)
        assert result == {"test": "value"}
    
    def test_extract_json_from_response_with_braces(self):
        """测试从大括号提取"""
        response = 'some text {"test": "value"} more text'
        
        result = self.script_generator._extract_json_from_response(response)
        assert result == {"test": "value"}
    
    def test_extract_json_from_response_direct_json(self):
        """测试直接JSON"""
        response = '{"test": "value"}'
        
        result = self.script_generator._extract_json_from_response(response)
        assert result == {"test": "value"}
    
    def test_generate_script_title_with_version_title(self):
        """测试使用版本标题生成脚本标题"""
        sections = {}
        title = self.script_generator._generate_script_title(self.sample_card, sections)
        assert title == "测试视频分析 - 脚本框架"
    
    def test_generate_script_title_with_core_idea(self):
        """测试使用核心理念生成脚本标题"""
        card = AnalysisCardSchema(
            id="test",
            version_title="测试",  # 不能为空
            core_idea="这是一个很长的核心理念描述，超过30个字符"
        )
        # 模拟version_title为空的情况
        card.version_title = ""
        sections = {}
        title = self.script_generator._generate_script_title(card, sections)
        assert "这是一个很长的核心理念描述，超过30个字符"[:30] in title
        assert "脚本框架" in title
    
    def test_generate_script_title_with_hook_content(self):
        """测试使用钩子内容生成脚本标题"""
        card = AnalysisCardSchema(id="test", version_title="测试")
        card.version_title = ""  # 模拟空标题
        sections = {
            "hook": ScriptSection(
                title="钩子",
                content="这是一个很长的钩子内容，用于生成标题",
                tips="要点",
                duration="0-15秒",
                keywords=[]
            )
        }
        title = self.script_generator._generate_script_title(card, sections)
        assert "这是一个很长的钩子内容，用于生成标题"[:30] in title
    
    def test_generate_script_title_default(self):
        """测试默认标题生成"""
        card = AnalysisCardSchema(id="test", version_title="测试")
        card.version_title = ""  # 模拟空标题
        sections = {}
        title = self.script_generator._generate_script_title(card, sections)
        assert title == "AI生成脚本框架"
    
    @pytest.mark.asyncio
    async def test_generate_single_section(self):
        """测试单个段落生成接口"""
        mock_response = '''
        ```json
        {
            "content": "测试内容",
            "tips": "测试要点",
            "duration": "0-15秒",
            "keywords": ["测试"]
        }
        ```
        '''
        self.mock_ai_service.call_llm = AsyncMock(return_value=mock_response)
        
        section = await self.script_generator.generate_single_section("hook", self.sample_card)
        
        assert isinstance(section, ScriptSection)
        assert section.content == "测试内容"
        assert section.tips == "测试要点"
    
    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """测试健康检查成功"""
        self.mock_ai_service.health_check = AsyncMock(return_value=True)
        self.mock_prompt_manager.has_template.return_value = True
        
        result = await self.script_generator.health_check()
        assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_ai_service_fail(self):
        """测试AI服务健康检查失败"""
        self.mock_ai_service.health_check = AsyncMock(return_value=False)
        
        result = await self.script_generator.health_check()
        assert result is False
    
    @pytest.mark.asyncio
    async def test_health_check_missing_template(self):
        """测试缺少必要模板"""
        self.mock_ai_service.health_check = AsyncMock(return_value=True)
        self.mock_prompt_manager.has_template.return_value = False
        
        result = await self.script_generator.health_check()
        assert result is False
    
    @pytest.mark.asyncio
    async def test_health_check_exception(self):
        """测试健康检查异常"""
        self.mock_ai_service.health_check = AsyncMock(side_effect=Exception("测试异常"))
        
        result = await self.script_generator.health_check()
        assert result is False


class TestScriptGenerationModels:
    """脚本生成数据模型测试"""
    
    def test_script_section_validation_success(self):
        """测试脚本段落验证成功"""
        section = ScriptSection(
            title="测试标题",
            content="测试内容",
            tips="测试要点",
            duration="0-15秒",
            keywords=["关键词1", "关键词2"]
        )
        
        assert section.title == "测试标题"
        assert section.content == "测试内容"
        assert section.tips == "测试要点"
        assert section.duration == "0-15秒"
        assert section.keywords == ["关键词1", "关键词2"]
    
    def test_script_section_content_empty_validation(self):
        """测试脚本段落内容为空的验证"""
        with pytest.raises(ValueError, match="段落内容不能为空"):
            ScriptSection(
                title="测试",
                content="",
                tips="测试要点",
                duration="0-15秒"
            )
    
    def test_script_section_tips_empty_validation(self):
        """测试脚本段落要点为空的验证"""
        with pytest.raises(ValueError, match="创作要点不能为空"):
            ScriptSection(
                title="测试",
                content="测试内容",
                tips="   ",
                duration="0-15秒"
            )
    
    def test_analysis_card_schema_validation_success(self):
        """测试分析卡片模型验证成功"""
        card = AnalysisCardSchema(
            id="test_123",
            version_title="测试标题",
            hook_copy="测试钩子",
            hook_types=["类型1", "类型2"],
            core_idea="测试理念",
            value_delivery=["价值1", "价值2"]
        )
        
        assert card.id == "test_123"
        assert card.version_title == "测试标题"
        assert card.hook_copy == "测试钩子"
        assert card.hook_types == ["类型1", "类型2"]
        assert card.value_delivery == ["价值1", "价值2"]
    
    def test_analysis_card_schema_version_title_empty(self):
        """测试分析卡片版本标题为空的验证"""
        with pytest.raises(ValueError, match="版本标题不能为空"):
            AnalysisCardSchema(
                id="test",
                version_title="   "
            )
    
    def test_section_generation_result_success_validation(self):
        """测试段落生成结果成功时的验证"""
        mock_section = Mock(spec=ScriptSection)
        
        result = SectionGenerationResult(
            section_type="hook",
            code=0,  # 0表示成功
            content=mock_section,
            error_message=None,
            processing_time_ms=1500
        )
        
        assert result.section_type == "hook"
        assert result.code == 0
        assert result.content == mock_section
        assert result.error_message is None
        assert result.processing_time_ms == 1500
    
    def test_section_generation_result_failure_validation(self):
        """测试段落生成结果失败时的验证"""
        result = SectionGenerationResult(
            section_type="problem",
            code=5000,  # 非0表示失败
            content=None,
            error_message="生成失败",
            processing_time_ms=800
        )
        
        assert result.section_type == "problem"
        assert result.code == 5000
        assert result.content is None
        assert result.error_message == "生成失败"
        assert result.processing_time_ms == 800


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v", "--tb=short"])