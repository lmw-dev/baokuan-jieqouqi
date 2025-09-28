"""
字段映射器 - 将AnalysisCard字段映射到脚本生成所需数据
"""

from typing import Dict, Any, List, Optional
from loguru import logger

from app.models.script_generation import AnalysisCardSchema, FieldMappingConfig


class FieldMapper:
    """AnalysisCard字段到脚本段落的映射器"""
    
    def __init__(self, mapping_config: Optional[FieldMappingConfig] = None):
        """
        初始化字段映射器
        
        Args:
            mapping_config: 字段映射配置，如果为None则使用默认配置
        """
        self.mapping_config = mapping_config or FieldMappingConfig()
        logger.debug("字段映射器初始化完成")
    
    def map_analysis_to_script_data(
        self, 
        card_data: AnalysisCardSchema
    ) -> Dict[str, Dict[str, Any]]:
        """
        将AnalysisCard字段映射到脚本生成所需数据
        
        Args:
            card_data: 分析卡片数据
            
        Returns:
            映射后的脚本段落数据，格式：
            {
                "hook": {"hook_copy": "...", "hook_types": [...], ...},
                "problem": {"core_idea": "...", "argument_case": "...", ...},
                "solution": {...},
                "proof": {...},
                "cta": {...}
            }
        """
        logger.debug(f"开始映射分析卡片数据: {card_data.id}")
        
        mapped_data = {
            "hook": self.extract_hook_data(card_data),
            "problem": self.extract_problem_data(card_data),
            "solution": self.extract_solution_data(card_data),
            "proof": self.extract_proof_data(card_data),
            "cta": self.extract_cta_data(card_data)
        }
        
        # 验证映射结果
        self._validate_mapped_data(mapped_data)
        
        logger.debug(f"字段映射完成，共映射5个段落的数据")
        return mapped_data
    
    def extract_hook_data(self, card_data: AnalysisCardSchema) -> Dict[str, Any]:
        """
        提取钩子段落所需数据
        
        映射策略：
        - hookCopy: 原始钩子文案
        - hookTypes: 钩子类型列表
        - credibility_testimony: 可信度证言
        - authority_signals: 权威信号
        - core_idea: 核心理念（作为背景）
        """
        hook_data = {
            "hook_copy": self._safe_get_string(card_data.hook_copy),
            "hook_types": self._safe_get_list(card_data.hook_types),
            "credibility_testimony": self._safe_get_string(card_data.credibility_testimony),
            "authority_signals": self._safe_get_list(card_data.authority_signals),
            "core_idea": self._safe_get_string(card_data.core_idea),
            "version_title": card_data.version_title
        }
        
        logger.debug(f"提取钩子数据: hook_copy={bool(hook_data['hook_copy'])}, "
                    f"hook_types={len(hook_data['hook_types'])}")
        return hook_data
    
    def extract_problem_data(self, card_data: AnalysisCardSchema) -> Dict[str, Any]:
        """
        提取痛点共鸣段落所需数据
        
        映射策略：
        - core_idea: 核心理念
        - argument_case: 论证案例
        - pain_point: 痛点描述
        - target_audience: 目标受众
        - emotional_triggers: 情感触发点
        """
        problem_data = {
            "core_idea": self._safe_get_string(card_data.core_idea),
            "argument_case": self._safe_get_string(card_data.argument_case),
            "pain_point": self._safe_get_string(card_data.pain_point),
            "target_audience": self._safe_get_string(card_data.target_audience),
            "emotional_triggers": self._safe_get_list(card_data.emotional_triggers)
        }
        
        logger.debug(f"提取痛点数据: core_idea={bool(problem_data['core_idea'])}, "
                    f"pain_point={bool(problem_data['pain_point'])}")
        return problem_data
    
    def extract_solution_data(self, card_data: AnalysisCardSchema) -> Dict[str, Any]:
        """
        提取解决方案段落所需数据
        
        映射策略：
        - core_idea: 核心理念
        - value_delivery: 价值交付列表
        - reusable_elements: 可复用元素
        - argument_case: 论证案例
        - competitive_advantage: 竞争优势
        """
        solution_data = {
            "core_idea": self._safe_get_string(card_data.core_idea),
            "value_delivery": self._safe_get_list(card_data.value_delivery),
            "reusable_elements": self._safe_get_string(card_data.reusable_elements),
            "argument_case": self._safe_get_string(card_data.argument_case),
            "competitive_advantage": self._safe_get_string(card_data.competitive_advantage)
        }
        
        logger.debug(f"提取解决方案数据: value_delivery={len(solution_data['value_delivery'])}, "
                    f"reusable_elements={bool(solution_data['reusable_elements'])}")
        return solution_data
    
    def extract_proof_data(self, card_data: AnalysisCardSchema) -> Dict[str, Any]:
        """
        提取价值证明段落所需数据
        
        映射策略：
        - core_idea: 核心理念
        - value_delivery: 价值交付
        - competitive_advantage: 竞争优势
        - argument_case: 论证案例
        - reusable_elements: 可复用元素
        """
        proof_data = {
            "core_idea": self._safe_get_string(card_data.core_idea),
            "value_delivery": self._safe_get_list(card_data.value_delivery),
            "competitive_advantage": self._safe_get_string(card_data.competitive_advantage),
            "argument_case": self._safe_get_string(card_data.argument_case),
            "reusable_elements": self._safe_get_string(card_data.reusable_elements)
        }
        
        logger.debug(f"提取价值证明数据: argument_case={bool(proof_data['argument_case'])}, "
                    f"competitive_advantage={bool(proof_data['competitive_advantage'])}")
        return proof_data
    
    def extract_cta_data(self, card_data: AnalysisCardSchema) -> Dict[str, Any]:
        """
        提取行动召唤段落所需数据
        
        映射策略：
        - core_idea: 核心理念
        - value_delivery: 价值交付
        - reusable_elements: 可复用元素
        - target_audience: 目标受众
        - hook_types: 钩子类型（用于决定互动方式）
        """
        cta_data = {
            "core_idea": self._safe_get_string(card_data.core_idea),
            "value_delivery": self._safe_get_list(card_data.value_delivery),
            "reusable_elements": self._safe_get_string(card_data.reusable_elements),
            "target_audience": self._safe_get_string(card_data.target_audience),
            "hook_types": self._safe_get_list(card_data.hook_types),
            "next_value": self._generate_next_value_hint(card_data)
        }
        
        logger.debug(f"提取行动召唤数据: target_audience={bool(cta_data['target_audience'])}, "
                    f"next_value={bool(cta_data['next_value'])}")
        return cta_data
    
    def extract_section_data(
        self, 
        card_data: AnalysisCardSchema, 
        section_type: str
    ) -> Dict[str, Any]:
        """
        提取特定段落所需的数据字段
        
        Args:
            card_data: 分析卡片数据
            section_type: 段落类型 (hook, problem, solution, proof, cta)
            
        Returns:
            该段落所需的数据字典
            
        Raises:
            ValueError: 无效的段落类型
        """
        section_extractors = {
            "hook": self.extract_hook_data,
            "problem": self.extract_problem_data,
            "solution": self.extract_solution_data,
            "proof": self.extract_proof_data,
            "cta": self.extract_cta_data
        }
        
        if section_type not in section_extractors:
            raise ValueError(f"无效的段落类型: {section_type}")
        
        return section_extractors[section_type](card_data)
    
    def _safe_get_string(self, value: Optional[str]) -> str:
        """安全获取字符串值，处理None和空值"""
        if value is None:
            return ""
        return str(value).strip()
    
    def _safe_get_list(self, value: Optional[List[str]]) -> List[str]:
        """安全获取列表值，处理None和空值"""
        if value is None:
            return []
        return [str(item).strip() for item in value if item and str(item).strip()]
    
    def _generate_next_value_hint(self, card_data: AnalysisCardSchema) -> str:
        """
        根据分析卡片数据生成后续价值提示
        
        Args:
            card_data: 分析卡片数据
            
        Returns:
            后续价值的提示文本
        """
        # 基于核心理念和价值交付生成相关的后续内容提示
        core_idea = self._safe_get_string(card_data.core_idea)
        value_delivery = self._safe_get_list(card_data.value_delivery)
        
        if not core_idea and not value_delivery:
            return "更多相关内容和实用攻略"
        
        # 根据核心理念推测可能的后续内容
        if "选购" in core_idea or "购买" in core_idea:
            return "更多产品选购攻略和使用技巧"
        elif "分析" in core_idea or "解构" in core_idea:
            return "更多内容分析方法和创作技巧"
        elif "投资" in core_idea or "理财" in core_idea:
            return "更多投资理财策略和风险管理"
        else:
            # 基于价值交付生成通用提示
            if value_delivery:
                first_value = value_delivery[0]
                return f"更多关于{first_value}的深度内容"
            return "更多相关专业内容和实用建议"
    
    def _validate_mapped_data(self, mapped_data: Dict[str, Dict[str, Any]]) -> None:
        """
        验证映射后的数据完整性
        
        Args:
            mapped_data: 映射后的数据
            
        Raises:
            ValueError: 数据不完整或格式错误
        """
        required_sections = ["hook", "problem", "solution", "proof", "cta"]
        
        for section in required_sections:
            if section not in mapped_data:
                raise ValueError(f"缺少必需的段落数据: {section}")
            
            if not isinstance(mapped_data[section], dict):
                raise ValueError(f"段落数据格式错误: {section}")
        
        # 检查关键字段是否有数据
        critical_fields = [
            ("hook", ["hook_copy", "core_idea"]),
            ("problem", ["core_idea", "pain_point"]),
            ("solution", ["value_delivery", "core_idea"]),
            ("proof", ["argument_case", "value_delivery"]),
            ("cta", ["core_idea", "value_delivery"])
        ]
        
        missing_data = []
        for section, fields in critical_fields:
            section_data = mapped_data[section]
            has_data = any(
                section_data.get(field) and 
                (isinstance(section_data[field], list) and len(section_data[field]) > 0 or
                 isinstance(section_data[field], str) and section_data[field].strip())
                for field in fields
            )
            
            if not has_data:
                missing_data.append(f"{section}({', '.join(fields)})")
        
        if missing_data:
            logger.warning(f"以下段落缺少关键数据: {', '.join(missing_data)}")
            # 不抛出异常，允许生成，但记录警告
    
    def get_mapping_summary(self, card_data: AnalysisCardSchema) -> Dict[str, Any]:
        """
        获取映射摘要信息，用于调试和分析
        
        Args:
            card_data: 分析卡片数据
            
        Returns:
            映射摘要信息
        """
        summary = {
            "card_id": card_data.id,
            "version_title": card_data.version_title,
            "available_fields": {},
            "field_utilization": {}
        }
        
        # 统计可用字段
        fields_to_check = [
            "hook_copy", "hook_types", "core_idea", "argument_case",
            "value_delivery", "reusable_elements", "credibility_testimony",
            "authority_signals", "pain_point", "target_audience",
            "emotional_triggers", "competitive_advantage"
        ]
        
        for field in fields_to_check:
            value = getattr(card_data, field, None)
            if value:
                if isinstance(value, list):
                    summary["available_fields"][field] = len(value)
                else:
                    summary["available_fields"][field] = len(str(value).strip())
        
        # 统计字段利用率
        mapped_data = self.map_analysis_to_script_data(card_data)
        for section, data in mapped_data.items():
            non_empty_fields = sum(1 for v in data.values() if v and 
                                 (isinstance(v, list) and len(v) > 0 or
                                  isinstance(v, str) and v.strip()))
            summary["field_utilization"][section] = {
                "total_fields": len(data),
                "non_empty_fields": non_empty_fields,
                "utilization_rate": non_empty_fields / len(data) if len(data) > 0 else 0
            }
        
        return summary