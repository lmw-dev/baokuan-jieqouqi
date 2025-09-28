import pytest
import json
import tempfile
import os
from unittest.mock import patch, mock_open

from app.services.hook_analysis_service import HookAnalysisService, HookRule
from app.schemas.analyze_schema import TrustHookResult, HookType


class TestHookAnalysisService:
    """信任之钩分析服务测试"""
    
    @pytest.fixture
    def mock_hook_rules(self):
        """模拟钩子规则数据"""
        return {
            "hooks": [
                {
                    "type": "建立权威",
                    "description": "通过展示专业背景建立信任",
                    "keywords": ["年经验", "专家", "博士", "权威"],
                    "patterns": ["作为一个.{0,10}专家", "我有.{0,10}年经验"]
                },
                {
                    "type": "制造冲突",
                    "description": "提出颠覆性观点",
                    "keywords": ["真相", "骗局", "大错特错", "99%的人"],
                    "patterns": ["99%的人都(不知道|搞错了)", "真相其实是"]
                },
                {
                    "type": "引发好奇",
                    "description": "激发用户好奇心",
                    "keywords": ["秘密", "为什么", "你知道吗", "猜猜"],
                    "patterns": ["为什么.+会.+", "你知道.+吗"]
                }
            ]
        }
    
    @pytest.fixture
    def hook_service(self, mock_hook_rules):
        """创建钩子分析服务实例"""
        with patch('builtins.open', mock_open(read_data=json.dumps(mock_hook_rules))):
            with patch('pathlib.Path.exists', return_value=True):
                return HookAnalysisService()
    
    def test_init_with_rules(self, hook_service):
        """测试带规则的初始化"""
        assert len(hook_service.rules) == 3
        assert hook_service.confidence_threshold == 0.3
        
        # 检查规则加载
        rule_types = [rule.type for rule in hook_service.rules]
        assert "建立权威" in rule_types
        assert "制造冲突" in rule_types
        assert "引发好奇" in rule_types
    
    def test_init_no_rules_file(self):
        """测试规则文件不存在"""
        with patch('pathlib.Path.exists', return_value=False):
            service = HookAnalysisService()
            assert len(service.rules) == 0
    
    def test_hook_rule_creation(self):
        """测试钩子规则创建"""
        rule_data = {
            "type": "建立权威",
            "description": "测试描述",
            "keywords": ["专家", "权威"],
            "patterns": ["作为.+专家"]
        }
        
        rule = HookRule(rule_data)
        assert rule.type == "建立权威"
        assert rule.description == "测试描述"
        assert len(rule.keywords) == 2
        assert len(rule.patterns) == 1
    
    @pytest.mark.asyncio
    async def test_analyze_text_hooks_authority(self, hook_service):
        """测试权威钩子分析"""
        text = "作为一个有10年经验的专家，我想告诉大家一个权威的观点"
        
        hooks = await hook_service.analyze_text_hooks(text)
        
        assert len(hooks) > 0
        authority_hooks = [h for h in hooks if h.hook_type == HookType.AUTHORITY]
        assert len(authority_hooks) > 0
        
        hook = authority_hooks[0]
        assert hook.confidence > 0.3
        assert "专家" in hook.matched_keywords or "权威" in hook.matched_keywords
    
    @pytest.mark.asyncio
    async def test_analyze_text_hooks_conflict(self, hook_service):
        """测试冲突钩子分析"""
        text = "99%的人都不知道这个真相，其实大家都被骗了"
        
        hooks = await hook_service.analyze_text_hooks(text)
        
        conflict_hooks = [h for h in hooks if h.hook_type == HookType.CONFLICT]
        assert len(conflict_hooks) > 0
        
        hook = conflict_hooks[0]
        assert hook.confidence > 0.3
        assert any(keyword in hook.matched_keywords for keyword in ["真相", "99%的人"])
    
    @pytest.mark.asyncio
    async def test_analyze_text_hooks_curiosity(self, hook_service):
        """测试好奇钩子分析"""
        text = "你知道为什么这个方法如此有效吗？这个秘密很少人知道"
        
        hooks = await hook_service.analyze_text_hooks(text)
        
        curiosity_hooks = [h for h in hooks if h.hook_type == HookType.CURIOSITY]
        assert len(curiosity_hooks) > 0
        
        hook = curiosity_hooks[0]
        assert hook.confidence > 0.3
        assert any(keyword in hook.matched_keywords for keyword in ["秘密", "为什么", "你知道吗"])
    
    @pytest.mark.asyncio
    async def test_analyze_empty_text(self, hook_service):
        """测试空文本分析"""
        hooks = await hook_service.analyze_text_hooks("")
        assert len(hooks) == 0
        
        hooks = await hook_service.analyze_text_hooks("   ")
        assert len(hooks) == 0
    
    @pytest.mark.asyncio
    async def test_analyze_no_hooks_text(self, hook_service):
        """测试无钩子文本"""
        text = "这是一段普通的文本，没有任何特殊的营销手法或技巧"
        
        hooks = await hook_service.analyze_text_hooks(text)
        assert len(hooks) == 0
    
    def test_calculate_confidence_keywords_only(self, hook_service):
        """测试仅关键词匹配的置信度计算"""
        keywords = ["专家", "权威"]
        pattern_matches = []
        
        confidence = hook_service._calculate_confidence(keywords, pattern_matches, 4, 2)
        
        # 关键词匹配得分 + 关键词奖励
        expected = min(2/4 * 0.8, 0.6) + min(2 * 0.1, 0.3)
        assert abs(confidence - expected) < 0.01
    
    def test_calculate_confidence_patterns_only(self, hook_service):
        """测试仅模式匹配的置信度计算"""
        keywords = []
        pattern_matches = [{"pattern": "test", "match": "test"}]
        
        confidence = hook_service._calculate_confidence(keywords, pattern_matches, 4, 2)
        
        # 模式匹配得分 + 模式奖励
        expected = min(1/2 * 0.6, 0.4) + min(1 * 0.15, 0.3)
        assert abs(confidence - expected) < 0.01
    
    def test_calculate_confidence_both(self, hook_service):
        """测试关键词和模式都匹配的置信度计算"""
        keywords = ["专家"]
        pattern_matches = [{"pattern": "test", "match": "test"}]
        
        confidence = hook_service._calculate_confidence(keywords, pattern_matches, 4, 2)
        
        keyword_score = min(1/4 * 0.8, 0.6)
        pattern_score = min(1/2 * 0.6, 0.4)
        keyword_bonus = min(1 * 0.1, 0.3)
        pattern_bonus = min(1 * 0.15, 0.3)
        expected = min(keyword_score + pattern_score + keyword_bonus + pattern_bonus, 1.0)
        
        assert abs(confidence - expected) < 0.01
    
    def test_extract_hook_content_pattern_match(self, hook_service):
        """测试从模式匹配提取钩子内容"""
        text = "作为一个专家，我想说..."
        keywords = ["专家"]
        pattern_matches = [{"match": "作为一个专家", "start": 0, "end": 6}]
        
        content = hook_service._extract_hook_content(text, keywords, pattern_matches)
        assert content == "作为一个专家"
    
    def test_extract_hook_content_keyword_match(self, hook_service):
        """测试从关键词匹配提取钩子内容"""
        text = "我是一个专家。这很重要。"
        keywords = ["专家"]
        pattern_matches = []
        
        content = hook_service._extract_hook_content(text, keywords, pattern_matches)
        assert "专家" in content
    
    def test_extract_hook_content_fallback(self, hook_service):
        """测试默认内容提取"""
        text = "这是一段很长的文本，应该被截断以避免返回过长的内容给用户看到"
        keywords = []
        pattern_matches = []
        
        content = hook_service._extract_hook_content(text, keywords, pattern_matches)
        assert len(content) <= 53  # 50 + "..."
        assert content.endswith("...")
    
    def test_split_sentences(self, hook_service):
        """测试句子分割"""
        text = "第一句话。第二句话！第三句话？第四句话；"
        
        sentences = hook_service._split_sentences(text)
        
        assert len(sentences) == 4
        assert "第一句话" in sentences
        assert "第二句话" in sentences
        assert "第三句话" in sentences
        assert "第四句话" in sentences
    
    @pytest.mark.asyncio
    async def test_analyze_hook_distribution(self, hook_service):
        """测试钩子类型分布分析"""
        text = "作为一个专家，我要告诉大家99%的人都不知道的真相。你知道这个秘密吗？"
        
        distribution = await hook_service.analyze_hook_distribution(text)
        
        assert "total_hooks" in distribution
        assert "total_confidence" in distribution
        assert "avg_confidence" in distribution
        assert "distribution" in distribution
        
        assert distribution["total_hooks"] > 0
        assert distribution["total_confidence"] > 0
        
        # 应该包含多种钩子类型
        hook_types = list(distribution["distribution"].keys())
        assert len(hook_types) > 1
    
    def test_get_rule_count(self, hook_service):
        """测试获取规则数量"""
        assert hook_service.get_rule_count() == 3
    
    def test_get_supported_hook_types(self, hook_service):
        """测试获取支持的钩子类型"""
        types = hook_service.get_supported_hook_types()
        assert "建立权威" in types
        assert "制造冲突" in types
        assert "引发好奇" in types
    
    def test_reload_rules_success(self, hook_service, mock_hook_rules):
        """测试规则重载成功"""
        with patch('builtins.open', mock_open(read_data=json.dumps(mock_hook_rules))):
            with patch('pathlib.Path.exists', return_value=True):
                result = hook_service.reload_rules()
                assert result == True
                assert len(hook_service.rules) == 3
    
    def test_reload_rules_failure(self, hook_service):
        """测试规则重载失败"""
        with patch('builtins.open', side_effect=FileNotFoundError):
            result = hook_service.reload_rules()
            assert result == False