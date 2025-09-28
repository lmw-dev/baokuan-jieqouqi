"""
信任之钩分析模块
"""

import json
from typing import Dict, Any
from loguru import logger

from app.services.ai.base import AIServiceBase
from app.services.prompts.manager import PromptManager
from app.models.three_stage_analysis import TrustHookResult
from app.core.exceptions import ThreeStageAnalysisError


class TrustHookAnalyzer:
    """信任之钩分析器"""
    
    def __init__(self, ai_service: AIServiceBase, prompt_manager: PromptManager):
        self.ai_service = ai_service
        self.prompt_manager = prompt_manager
    
    async def analyze(self, content: str) -> TrustHookResult:
        """
        分析信任之钩元素
        
        Args:
            content: 待分析的内容
            
        Returns:
            信任之钩分析结果
            
        Raises:
            ThreeStageAnalysisError: 分析失败
        """
        try:
            # 获取Prompt模板
            prompt_template = self.prompt_manager.get_template("trust_hook")
            
            # 替换模板中的变量
            prompt = prompt_template.replace("{{content}}", content)
            
            # 调用AI服务（使用重试机制）
            logger.debug("开始信任之钩分析")
            response = await self.ai_service.call_with_retry(
                prompt,
                temperature=0.3,
                max_tokens=2000,
                max_retries=3,
                retry_delay=2.0
            )
            
            # 添加调试日志
            logger.debug(f"信任之钩AI原始响应: {response}")
            
            # 解析AI响应
            result = self._parse_response(response)
            
            logger.debug(f"信任之钩分析完成: {result}")
            return result
            
        except Exception as e:
            logger.error(f"信任之钩分析失败: {str(e)}")
            raise ThreeStageAnalysisError(f"信任之钩分析失败: {str(e)}")
    
    def _parse_response(self, response: str) -> TrustHookResult:
        """
        解析AI响应，提取结构化数据
        
        Args:
            response: AI响应文本
            
        Returns:
            信任之钩分析结果
            
        Raises:
            ThreeStageAnalysisError: 解析失败
        """
        try:
            # 尝试从响应中提取JSON
            json_data = self._extract_json_from_response(response)
            
            # 验证必要字段
            required_fields = ["hook_copy", "credibility_testimony", "authority_signals"]
            for field in required_fields:
                if field not in json_data:
                    raise ThreeStageAnalysisError(f"AI响应缺少必要字段: {field}")
            
            # 处理数据格式兼容性
            hook_copy = json_data["hook_copy"]
            authority_signals = json_data["authority_signals"]
            
            # 处理credibility_testimony可能为数组的情况
            credibility_testimony = json_data["credibility_testimony"]
            if isinstance(credibility_testimony, list):
                # 如果是数组，合并为字符串
                credibility_testimony = "; ".join(credibility_testimony)
            elif not isinstance(credibility_testimony, str):
                # 如果既不是字符串也不是数组，转换为字符串
                credibility_testimony = str(credibility_testimony)
            
            # 创建结果对象
            return TrustHookResult(
                hook_copy=hook_copy,
                credibility_testimony=credibility_testimony,
                authority_signals=authority_signals
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
    
    def _validate_result(self, result: TrustHookResult) -> bool:
        """
        验证分析结果的有效性
        
        Args:
            result: 分析结果
            
        Returns:
            是否有效
        """
        # 检查是否有实际内容
        if not result.hook_copy and not result.credibility_testimony and not result.authority_signals:
            return False
        
        # 检查权威信号是否为空列表
        if isinstance(result.authority_signals, list) and len(result.authority_signals) == 0:
            logger.warning("权威信号为空")
        
        return True