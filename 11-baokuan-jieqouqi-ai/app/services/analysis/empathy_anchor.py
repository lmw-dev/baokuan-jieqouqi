"""
共情之锚分析模块
"""

import json
from typing import Dict, Any
from loguru import logger

from app.services.ai.base import AIServiceBase
from app.services.prompts.manager import PromptManager
from app.models.three_stage_analysis import EmpathyAnchorResult
from app.core.exceptions import ThreeStageAnalysisError


class EmpathyAnchorAnalyzer:
    """共情之锚分析器"""
    
    def __init__(self, ai_service: AIServiceBase, prompt_manager: PromptManager):
        self.ai_service = ai_service
        self.prompt_manager = prompt_manager
    
    async def analyze(self, content: str) -> EmpathyAnchorResult:
        """
        分析共情之锚元素
        
        Args:
            content: 待分析的内容
            
        Returns:
            共情之锚分析结果
            
        Raises:
            ThreeStageAnalysisError: 分析失败
        """
        try:
            # 获取Prompt模板
            prompt_template = self.prompt_manager.get_template("empathy_anchor")
            
            # 替换模板中的变量
            prompt = prompt_template.replace("{{content}}", content)
            
            # 调用AI服务
            logger.debug("开始共情之锚分析")
            response = await self.ai_service.call_llm(
                prompt,
                temperature=0.3,
                max_tokens=2000
            )
            
            # 解析AI响应
            result = self._parse_response(response)
            
            logger.debug(f"共情之锚分析完成: {result}")
            return result
            
        except Exception as e:
            logger.error(f"共情之锚分析失败: {str(e)}")
            raise ThreeStageAnalysisError(f"共情之锚分析失败: {str(e)}")
    
    def _parse_response(self, response: str) -> EmpathyAnchorResult:
        """
        解析AI响应，提取结构化数据
        
        Args:
            response: AI响应文本
            
        Returns:
            共情之锚分析结果
            
        Raises:
            ThreeStageAnalysisError: 解析失败
        """
        try:
            # 尝试从响应中提取JSON
            json_data = self._extract_json_from_response(response)
            
            # 验证必要字段
            required_fields = ["pain_point", "target_audience", "emotional_triggers"]
            for field in required_fields:
                if field not in json_data:
                    raise ThreeStageAnalysisError(f"AI响应缺少必要字段: {field}")
            
            # 创建结果对象
            return EmpathyAnchorResult(
                pain_point=json_data["pain_point"],
                target_audience=json_data["target_audience"],
                emotional_triggers=json_data["emotional_triggers"]
            )
            
        except json.JSONDecodeError as e:
            raise ThreeStageAnalysisError(f"AI响应JSON解析失败: {str(e)}")
        except Exception as e:
            raise ThreeStageAnalysisError(f"解析AI响应失败: {str(e)}")
    
    def _extract_json_from_response(self, response: str) -> Dict[str, Any]:
        """
        从AI响应中提取JSON数据
        
        Args:
            response: AI响应文本
            
        Returns:
            解析后的JSON数据
        """
        # 移除可能的前后缀文本，只保留JSON部分
        response = response.strip()
        
        # 尝试找到JSON代码块
        if "```json" in response:
            start = response.find("```json") + 7
            end = response.find("```", start)
            if end != -1:
                json_str = response[start:end].strip()
            else:
                json_str = response[start:].strip()
        elif "```" in response:
            start = response.find("```") + 3
            end = response.find("```", start)
            if end != -1:
                json_str = response[start:end].strip()
            else:
                json_str = response[start:].strip()
        else:
            # 尝试找到第一个{和最后一个}
            start = response.find("{")
            end = response.rfind("}")
            if start != -1 and end != -1 and end > start:
                json_str = response[start:end+1]
            else:
                json_str = response
        
        # 解析JSON
        return json.loads(json_str)
    
    def _validate_result(self, result: EmpathyAnchorResult) -> bool:
        """
        验证分析结果的有效性
        
        Args:
            result: 分析结果
            
        Returns:
            是否有效
        """
        # 检查是否有实际内容
        if not result.pain_point and not result.target_audience and not result.emotional_triggers:
            return False
        
        # 检查情感触发器是否为空列表
        if isinstance(result.emotional_triggers, list) and len(result.emotional_triggers) == 0:
            logger.warning("情感触发器为空")
        
        return True