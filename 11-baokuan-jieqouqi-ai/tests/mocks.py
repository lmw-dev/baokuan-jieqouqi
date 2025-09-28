"""
测试用的Mock AI服务
"""

from app.services.ai.base import AIServiceBase


class MockAIService(AIServiceBase):
    """Mock AI服务，用于测试"""
    
    def __init__(self, responses: dict = None):
        super().__init__("mock_key", "mock_url", "mock_model")
        self.responses = responses or {}
        self.call_count = 0
    
    async def call_llm(self, prompt: str, **kwargs) -> str:
        """模拟LLM调用"""
        self.call_count += 1
        
        # 根据prompt内容返回不同的mock响应
        if "信任之钩" in prompt or "trust_hook" in prompt:
            return self.responses.get("trust_hook", self._default_trust_hook_response())
        elif "共情之锚" in prompt or "empathy_anchor" in prompt:
            return self.responses.get("empathy_anchor", self._default_empathy_anchor_response())
        elif "价值图谱" in prompt or "value_map" in prompt:
            return self.responses.get("value_map", self._default_value_map_response())
        else:
            return '{"test": "response"}'
    
    async def health_check(self) -> bool:
        """模拟健康检查"""
        return True
    
    def _default_trust_hook_response(self) -> str:
        """默认信任之钩响应"""
        return '''
        ```json
        {
            "hook_copy": "从582款蓝牙耳机中评测选出的性价比之王！",
            "credibility_testimony": "所有产品均为自费购买，无任何广告植入",
            "authority_signals": ["10年评测经验", "582款评测", "性价比之王"]
        }
        ```
        '''
    
    def _default_empathy_anchor_response(self) -> str:
        """默认共情之锚响应"""
        return '''
        ```json
        {
            "pain_point": "在海量618信息中，害怕买错耳机而浪费钱",
            "target_audience": "追求性价比的学生党和职场新人",
            "emotional_triggers": ["损失厌恶", "选择困难", "FOMO恐慌"]
        }
        ```
        '''
    
    def _default_value_map_response(self) -> str:
        """默认价值图谱响应"""
        return '''
        ```json
        {
            "core_value": "帮助用户用最少的钱买到最适合的蓝牙耳机",
            "value_delivery": ["专业测试报告", "8维度评测数据", "购买建议清单"],
            "competitive_advantage": "582款海量评测 + 中立立场 + 自费测试保证客观性"
        }
        ```
        '''