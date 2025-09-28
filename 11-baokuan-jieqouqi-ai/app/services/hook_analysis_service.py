import json
import re
from typing import List, Optional, Dict, Any
from pathlib import Path
from loguru import logger

from app.core.config import settings
from app.schemas.analyze_schema import TrustHookResult, HookType
from app.services.ai.factory import get_ai_service
from app.core.exceptions import AIServiceError


class HookRule:
    """钩子规则类"""
    
    def __init__(self, rule_data: dict):
        self.type = rule_data["type"]
        self.description = rule_data["description"]
        self.keywords = rule_data["keywords"]
        self.patterns = rule_data.get("patterns", [])


class HookAnalysisService:
    """信任之钩分析服务"""
    
    def __init__(self):
        self.rules: List[HookRule] = []
        self.confidence_threshold = settings.hook_confidence_threshold
        self._load_rules()
        
        logger.info(f"信任之钩分析服务初始化完成，规则数量: {len(self.rules)}，已启用AI分析")
    
    def _load_rules(self) -> None:
        """加载钩子规则"""
        try:
            rules_file = Path(settings.hook_rules_file)
            
            if not rules_file.exists():
                logger.warning(f"规则文件不存在: {rules_file}")
                return
            
            with open(rules_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.rules = [HookRule(rule) for rule in data.get('hooks', [])]
            logger.info(f"成功加载 {len(self.rules)} 个钩子规则")
            
        except Exception as e:
            logger.error(f"加载钩子规则失败: {str(e)}")
            self.rules = []
    
    async def analyze_text_hooks(
        self, 
        text: str, 
        sample_length: int = 1000
    ) -> List[TrustHookResult]:
        """
        使用AI分析文本中的信任之钩
        
        Args:
            text: 待分析的文本
            sample_length: 取样长度（字符数）
            
        Returns:
            List[TrustHookResult]: 识别到的信任之钩列表
        """
        if not text or not text.strip():
            logger.warning("输入文本为空")
            return []
        
        # 取前N个字符进行分析，如果文本较短则全部分析
        if len(text) <= sample_length:
            sample_text = text.strip()
        else:
            # 对于长文本，同时分析开头和结尾
            start_text = text[:sample_length//2]
            end_text = text[-(sample_length//2):]
            sample_text = (start_text + ' ' + end_text).strip()
        logger.info(f"开始AI分析信任之钩，文本长度: {len(sample_text)}")
        
        try:
            # 使用AI进行信任之钩分析
            ai_hooks = await self._analyze_with_ai(sample_text)
            logger.info(f"AI信任之钩分析完成，识别到 {len(ai_hooks)} 个钩子")
            
            # 如果AI分析失败，回退到规则方法
            if not ai_hooks:
                logger.warning("AI分析未找到钩子，回退到规则方法")
                return await self._analyze_with_rules(sample_text)
                
            return ai_hooks
            
        except Exception as e:
            logger.error(f"AI分析失败: {str(e)}，回退到规则方法")
            return await self._analyze_with_rules(sample_text)
    
    async def _analyze_with_ai(self, text: str) -> List[TrustHookResult]:
        """
        使用AI进行信任之钩分析
        
        Args:
            text: 待分析的文本
            
        Returns:
            List[TrustHookResult]: AI识别的信任之钩列表
        """
        try:
            ai_service = await get_ai_service()
            
            # 构建AI分析提示词
            prompt = self._build_ai_prompt(text)
            
            # 调用AI服务
            response = await ai_service.call_llm(
                prompt=prompt,
                temperature=0.3,
                max_tokens=2000
            )
            
            # 解析AI响应
            return self._parse_ai_response(response, text)
            
        except Exception as e:
            logger.error(f"AI分析异常: {str(e)}")
            raise AIServiceError(f"信任之钩AI分析失败: {str(e)}")
    
    def _build_ai_prompt(self, text: str) -> str:
        """
        构建AI分析提示词
        
        Args:
            text: 待分析的文本
            
        Returns:
            str: AI提示词
        """
        prompt = f"""请分析以下文本中的"信任之钩"元素。信任之钩是指能够快速建立观众信任和兴趣的表达技巧。

请从以下角度识别信任之钩：
1. **权威建立** - 展示专业性、经验、身份的表述
2. **数据展示** - 具体数字、统计、测试结果
3. **对比制造** - 与常见做法的对比、反差
4. **痛点共鸣** - 引起目标用户共鸣的问题或困扰
5. **稀缺暗示** - 机会稀缺、时间限制、数量限制
6. **好奇激发** - 引发好奇心的悬念或疑问

待分析文本：
{text}

请以JSON格式返回分析结果，格式如下：
```json
{{
  "hooks": [
    {{
      "type": "权威建立",
      "content": "具体的钩子文本",
      "confidence": 0.85,
      "keywords": ["关键词1", "关键词2"]
    }}
  ]
}}
```

只返回JSON，不要其他解释。"""
        return prompt
    
    def _parse_ai_response(self, response: str, original_text: str) -> List[TrustHookResult]:
        """
        解析AI响应为TrustHookResult列表
        
        Args:
            response: AI响应文本
            original_text: 原始文本
            
        Returns:
            List[TrustHookResult]: 解析的钩子列表
        """
        try:
            # 提取JSON部分
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            
            if json_start == -1 or json_end == 0:
                logger.warning("AI响应中未找到JSON格式")
                return []
            
            json_str = response[json_start:json_end]
            data = json.loads(json_str)
            
            hooks = []
            for hook_data in data.get('hooks', []):
                # 映射钩子类型
                hook_type = self._map_hook_type(hook_data.get('type', ''))
                if hook_type:
                    hook = TrustHookResult(
                        hook_type=hook_type,
                        content=hook_data.get('content', '')[:200],  # 限制长度
                        confidence=float(hook_data.get('confidence', 0.7)),
                        matched_keywords=hook_data.get('keywords', [])
                    )
                    hooks.append(hook)
            
            return hooks
            
        except json.JSONDecodeError as e:
            logger.error(f"AI响应JSON解析失败: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"AI响应解析异常: {str(e)}")
            return []
    
    def _map_hook_type(self, ai_type: str) -> Optional[HookType]:
        """
        将AI返回的钩子类型映射到HookType枚举
        
        Args:
            ai_type: AI返回的类型字符串
            
        Returns:
            Optional[HookType]: 映射的钩子类型
        """
        type_mapping = {
            "权威建立": HookType.AUTHORITY,
            "数据展示": HookType.DATA,
            "对比制造": HookType.CONTRAST,
            "痛点共鸣": HookType.PAIN_POINT,
            "稀缺暗示": HookType.SCARCITY,
            "好奇激发": HookType.CURIOSITY
        }
        
        return type_mapping.get(ai_type)
    
    async def _analyze_with_rules(self, text: str) -> List[TrustHookResult]:
        """
        使用规则方法分析（回退方案）
        
        Args:
            text: 待分析的文本
            
        Returns:
            List[TrustHookResult]: 规则识别的钩子列表
        """
        hooks = []
        
        for rule in self.rules:
            hook = await self._match_rule(text, rule)
            if hook:
                hooks.append(hook)
        
        # 按置信度排序
        hooks.sort(key=lambda x: x.confidence, reverse=True)
        return hooks
    
    async def _match_rule(
        self, 
        text: str, 
        rule: HookRule
    ) -> Optional[TrustHookResult]:
        """
        匹配单个规则
        
        Args:
            text: 待分析的文本
            rule: 钩子规则
            
        Returns:
            Optional[TrustHookResult]: 匹配结果，None表示未匹配
        """
        matched_keywords = []
        pattern_matches = []
        
        # 1. 关键词匹配
        for keyword in rule.keywords:
            if keyword in text:
                matched_keywords.append(keyword)
        
        # 2. 模式匹配
        for pattern in rule.patterns:
            try:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    pattern_matches.append({
                        "pattern": pattern,
                        "match": match.group(),
                        "start": match.start(),
                        "end": match.end()
                    })
            except re.error as e:
                logger.warning(f"正则表达式错误: {pattern}, 错误: {str(e)}")
                continue
        
        # 3. 计算置信度
        confidence = self._calculate_confidence(
            matched_keywords, 
            pattern_matches,
            len(rule.keywords),
            len(rule.patterns)
        )
        
        # 4. 判断是否达到阈值
        if confidence >= self.confidence_threshold:
            # 提取匹配的文本片段
            hook_content = self._extract_hook_content(
                text, matched_keywords, pattern_matches
            )
            
            return TrustHookResult(
                hook_type=HookType(rule.type),
                content=hook_content,
                confidence=confidence,
                matched_keywords=matched_keywords
            )
        
        return None
    
    def _calculate_confidence(
        self, 
        keywords: List[str], 
        pattern_matches: List[Dict[str, Any]],
        total_keywords: int,
        total_patterns: int
    ) -> float:
        """
        计算置信度分数
        
        Args:
            keywords: 匹配的关键词
            pattern_matches: 模式匹配结果
            total_keywords: 规则中总关键词数
            total_patterns: 规则中总模式数
            
        Returns:
            float: 置信度分数 (0.0 - 1.0)
        """
        # 关键词匹配得分 (权重: 0.6)
        keyword_score = 0.0
        if total_keywords > 0:
            keyword_ratio = len(keywords) / total_keywords
            keyword_score = min(keyword_ratio * 0.8, 0.6)  # 最高0.6分
        
        # 模式匹配得分 (权重: 0.4)
        pattern_score = 0.0
        if total_patterns > 0:
            pattern_ratio = len(pattern_matches) / total_patterns
            pattern_score = min(pattern_ratio * 0.6, 0.4)  # 最高0.4分
        elif len(pattern_matches) > 0:
            # 如果没有定义模式但有匹配，给予额外分数
            pattern_score = 0.2
        
        # 关键词数量奖励
        keyword_bonus = min(len(keywords) * 0.1, 0.3)
        
        # 模式匹配奖励
        pattern_bonus = min(len(pattern_matches) * 0.15, 0.3)
        
        total_score = keyword_score + pattern_score + keyword_bonus + pattern_bonus
        
        return min(total_score, 1.0)
    
    def _extract_hook_content(
        self, 
        text: str, 
        keywords: List[str], 
        pattern_matches: List[Dict[str, Any]]
    ) -> str:
        """
        提取钩子内容文本
        
        Args:
            text: 原始文本
            keywords: 匹配的关键词
            pattern_matches: 模式匹配结果
            
        Returns:
            str: 提取的钩子内容
        """
        if pattern_matches:
            # 如果有模式匹配，返回第一个匹配的内容
            return pattern_matches[0]["match"]
        
        if keywords:
            # 如果只有关键词匹配，尝试提取包含关键词的句子
            for keyword in keywords:
                sentences = self._split_sentences(text)
                for sentence in sentences:
                    if keyword in sentence:
                        return sentence.strip()
        
        # 如果都没有，返回文本开头
        return text[:50] + "..." if len(text) > 50 else text
    
    def _split_sentences(self, text: str) -> List[str]:
        """
        简单的句子分割
        
        Args:
            text: 输入文本
            
        Returns:
            List[str]: 句子列表
        """
        # 使用常见的中文句子分隔符
        sentences = re.split(r'[。！？；\n]', text)
        return [s.strip() for s in sentences if s.strip()]
    
    async def analyze_hook_distribution(
        self, 
        text: str
    ) -> Dict[str, Any]:
        """
        分析钩子类型分布
        
        Args:
            text: 待分析的文本
            
        Returns:
            Dict[str, Any]: 钩子分布统计
        """
        hooks = await self.analyze_text_hooks(text)
        
        distribution = {}
        total_confidence = 0.0
        
        for hook in hooks:
            hook_type = hook.hook_type.value
            if hook_type not in distribution:
                distribution[hook_type] = {
                    "count": 0,
                    "total_confidence": 0.0,
                    "avg_confidence": 0.0,
                    "examples": []
                }
            
            distribution[hook_type]["count"] += 1
            distribution[hook_type]["total_confidence"] += hook.confidence
            distribution[hook_type]["examples"].append({
                "content": hook.content,
                "confidence": hook.confidence,
                "keywords": hook.matched_keywords
            })
            
            total_confidence += hook.confidence
        
        # 计算平均置信度
        for hook_type in distribution:
            count = distribution[hook_type]["count"]
            total_conf = distribution[hook_type]["total_confidence"]
            distribution[hook_type]["avg_confidence"] = total_conf / count if count > 0 else 0.0
        
        return {
            "total_hooks": len(hooks),
            "total_confidence": total_confidence,
            "avg_confidence": total_confidence / len(hooks) if hooks else 0.0,
            "distribution": distribution
        }
    
    def reload_rules(self) -> bool:
        """
        重新加载规则文件
        
        Returns:
            bool: 是否重载成功
        """
        try:
            self._load_rules()
            logger.info("规则文件重载成功")
            return True
        except Exception as e:
            logger.error(f"规则文件重载失败: {str(e)}")
            return False
    
    def get_rule_count(self) -> int:
        """获取规则数量"""
        return len(self.rules)
    
    def get_supported_hook_types(self) -> List[str]:
        """获取支持的钩子类型"""
        return [rule.type for rule in self.rules]