"""
脚本生成器 - 复用TOM-220架构模式的脚本生成服务
"""

import asyncio
import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from loguru import logger

from app.services.ai.base import AIServiceBase
from app.services.prompts.manager import PromptManager
from app.services.analysis.field_mapper import FieldMapper
from app.models.script_generation import (
    AnalysisCardSchema,
    ScriptFramework,
    ScriptSection,
    ScriptMeta,
    ScriptStyleConfig,
    ScriptGenerationRequest,
    SectionGenerationResult,
    FieldMappingConfig
)
from app.core.exceptions import ScriptGenerationError, PromptManagementError, AIServiceError


class ScriptGenerator:
    """脚本生成器 - 复用TOM-220架构模式"""
    
    def __init__(self, ai_service: AIServiceBase, prompt_manager: PromptManager):
        """
        初始化脚本生成器
        
        Args:
            ai_service: AI服务实例
            prompt_manager: Prompt管理器实例
        """
        self.ai_service = ai_service
        self.prompt_manager = prompt_manager
        self.field_mapper = FieldMapper()
        
        # 段落类型和对应的prompt模板映射
        self.section_prompts = {
            "hook": "hook_generator",
            "problem": "problem_generator", 
            "solution": "solution_generator",
            "proof": "proof_generator",
            "cta": "cta_generator"
        }
        
        logger.debug("脚本生成器初始化完成")
    
    async def generate_script_framework(
        self, 
        card_data: AnalysisCardSchema,
        style_config: Optional[ScriptStyleConfig] = None
    ) -> ScriptFramework:
        """
        生成完整的五段式脚本框架
        
        Args:
            card_data: 分析卡片数据
            style_config: 脚本风格配置
            
        Returns:
            完整的脚本框架
            
        Raises:
            ScriptGenerationError: 脚本生成失败
        """
        generation_id = str(uuid.uuid4())
        start_time = time.time()
        
        logger.info(f"开始脚本生成 [ID: {generation_id}] 卡片: {card_data.id}")
        
        try:
            # 映射分析卡片数据
            mapped_data = self.field_mapper.map_analysis_to_script_data(card_data)
            
            # 并行生成五个段落
            section_tasks = []
            for section_type in ["hook", "problem", "solution", "proof", "cta"]:
                task = self._generate_section_with_error_handling(
                    section_type, 
                    mapped_data[section_type],
                    style_config
                )
                section_tasks.append(task)
            
            # 等待所有段落生成完成
            section_results = await asyncio.gather(*section_tasks, return_exceptions=True)
            
            # 检查生成结果
            sections = {}
            failed_sections = []
            
            for i, result in enumerate(section_results):
                section_type = list(self.section_prompts.keys())[i]
                
                if isinstance(result, Exception):
                    failed_sections.append(f"{section_type}: {str(result)}")
                    logger.error(f"段落生成失败 [{section_type}]: {str(result)}")
                elif isinstance(result, SectionGenerationResult):
                    if result.code == 0 and result.content:  # 0表示成功
                        sections[section_type] = result.content
                        logger.debug(f"段落生成成功 [{section_type}]: {result.processing_time_ms}ms")
                    else:
                        failed_sections.append(f"{section_type}: {result.error_message}")
                        logger.error(f"段落生成失败 [{section_type}]: {result.error_message}")
                else:
                    failed_sections.append(f"{section_type}: 未知错误")
                    logger.error(f"段落生成返回未知结果类型 [{section_type}]")
            
            if failed_sections:
                raise ScriptGenerationError(
                    f"部分段落生成失败",
                    f"失败段落: {', '.join(failed_sections)}"
                )
            
            # 计算处理时间
            processing_time = int((time.time() - start_time) * 1000)
            
            # 生成脚本标题
            script_title = self._generate_script_title(card_data, sections)
            
            # 创建元数据
            meta = ScriptMeta(
                generation_id=generation_id,
                timestamp=datetime.utcnow(),
                processing_time_ms=processing_time,
                ai_model=self.ai_service.model,
                prompt_version="latest",
                status="completed"
            )
            
            # 构建完整脚本框架
            script_framework = ScriptFramework(
                title=script_title,
                hook=sections["hook"],
                problem=sections["problem"],
                solution=sections["solution"],
                proof=sections["proof"],
                cta=sections["cta"],
                meta=meta
            )
            
            logger.info(f"脚本生成完成 [ID: {generation_id}] 耗时: {processing_time}ms")
            return script_framework
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            logger.error(f"脚本生成失败 [ID: {generation_id}] 耗时: {processing_time}ms, 错误: {str(e)}")
            
            if isinstance(e, ScriptGenerationError):
                raise e
            else:
                raise ScriptGenerationError(f"脚本生成失败: {str(e)}")
    
    async def _generate_section_with_error_handling(
        self,
        section_type: str,
        mapped_data: Dict[str, Any],
        style_config: Optional[ScriptStyleConfig] = None
    ) -> SectionGenerationResult:
        """
        带错误处理的段落生成
        
        Args:
            section_type: 段落类型
            mapped_data: 映射后的数据
            style_config: 风格配置
            
        Returns:
            段落生成结果
        """
        start_time = time.time()
        
        try:
            section = await self._generate_section(section_type, mapped_data, style_config)
            processing_time = int((time.time() - start_time) * 1000)
            
            return SectionGenerationResult(
                section_type=section_type,
                code=0,  # 0表示成功
                content=section,
                error_message=None,
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            error_msg = str(e)
            
            logger.error(f"段落生成异常 [{section_type}]: {error_msg}")
            
            return SectionGenerationResult(
                section_type=section_type,
                code=5000,  # 非0表示失败
                content=None,
                error_message=error_msg,
                processing_time_ms=processing_time
            )
    
    async def _generate_section(
        self, 
        section_type: str, 
        mapped_data: Dict[str, Any],
        style_config: Optional[ScriptStyleConfig] = None
    ) -> ScriptSection:
        """
        生成单个脚本段落 - 复用TOM-220的分析器模式
        
        Args:
            section_type: 段落类型 (hook, problem, solution, proof, cta)
            mapped_data: 该段落的映射数据
            style_config: 风格配置
            
        Returns:
            生成的脚本段落
            
        Raises:
            ScriptGenerationError: 生成失败
        """
        if section_type not in self.section_prompts:
            raise ScriptGenerationError(f"无效的段落类型: {section_type}")
        
        try:
            # 获取对应的prompt模板
            prompt_name = self.section_prompts[section_type]
            prompt_template = self.prompt_manager.get_template(prompt_name)
            
            # 替换模板中的变量
            prompt = self._replace_template_variables(prompt_template, mapped_data, style_config)
            
            # 调用AI服务生成内容
            logger.debug(f"开始生成段落 [{section_type}]")
            response = await self.ai_service.call_llm(
                prompt,
                temperature=0.3,
                max_tokens=2000
            )
            
            # 解析AI响应
            section = self._parse_section_response(response, section_type)
            
            logger.debug(f"段落生成完成 [{section_type}]: {len(section.content)}字符")
            return section
            
        except Exception as e:
            logger.error(f"段落生成失败 [{section_type}]: {str(e)}")
            raise ScriptGenerationError(f"{section_type}段落生成失败: {str(e)}")
    
    def _replace_template_variables(
        self, 
        template: str, 
        mapped_data: Dict[str, Any],
        style_config: Optional[ScriptStyleConfig] = None
    ) -> str:
        """
        替换模板中的变量
        
        Args:
            template: prompt模板
            mapped_data: 映射后的数据
            style_config: 风格配置
            
        Returns:
            替换变量后的prompt
        """
        prompt = template
        
        # 替换基础数据变量
        for key, value in mapped_data.items():
            placeholder = f"{{{{{key}}}}}"
            
            if isinstance(value, list):
                # 列表类型转换为字符串
                value_str = "、".join(value) if value else "暂无"
            else:
                # 字符串类型直接使用，空值用默认文本
                value_str = str(value) if value else "暂无"
            
            prompt = prompt.replace(placeholder, value_str)
        
        # 如果有风格配置，可以在这里进行相应的调整
        if style_config:
            # 根据语调调整prompt
            if style_config.tone == "casual":
                prompt += "\n\n请使用轻松、亲切的语调，多用口语化表达。"
            elif style_config.tone == "creative":
                prompt += "\n\n请使用创意、有趣的语调，可以适当使用比喻和想象。"
            
            # 根据目标受众调整
            if style_config.target_audience:
                prompt += f"\n\n目标受众是：{style_config.target_audience}，请针对这个群体调整内容。"
        
        return prompt
    
    def _parse_section_response(self, response: str, section_type: str) -> ScriptSection:
        """
        解析AI响应，提取结构化的段落数据
        
        Args:
            response: AI响应文本
            section_type: 段落类型
            
        Returns:
            解析后的脚本段落
            
        Raises:
            ScriptGenerationError: 解析失败
        """
        try:
            # 尝试从响应中提取JSON
            import json
            json_data = self._extract_json_from_response(response)
            
            # 验证必要字段
            required_fields = ["content", "tips", "duration", "keywords"]
            for field in required_fields:
                if field not in json_data:
                    raise ScriptGenerationError(f"AI响应缺少必要字段: {field}")
            
            # 生成段落标题
            section_titles = {
                "hook": "开场钩子 (0-15秒)",
                "problem": "痛点共鸣 (15-45秒)",
                "solution": "解决方案 (45秒-3分钟)",
                "proof": "价值证明 (3-4分钟)",
                "cta": "行动召唤 (4-5分钟)"
            }
            
            # 创建段落对象
            return ScriptSection(
                title=section_titles.get(section_type, f"{section_type}段落"),
                content=json_data["content"],
                tips=json_data["tips"],
                duration=json_data["duration"],
                keywords=json_data.get("keywords", [])
            )
            
        except json.JSONDecodeError as e:
            raise ScriptGenerationError(f"AI响应JSON解析失败: {str(e)}")
        except Exception as e:
            raise ScriptGenerationError(f"解析AI响应失败: {str(e)}")
    
    def _extract_json_from_response(self, response: str) -> Dict[str, Any]:
        """
        从AI响应中提取JSON数据 - 复用TOM-220的解析逻辑
        
        Args:
            response: AI响应文本
            
        Returns:
            解析后的JSON数据
        """
        import json
        
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
    
    def _generate_script_title(
        self, 
        card_data: AnalysisCardSchema, 
        sections: Dict[str, ScriptSection]
    ) -> str:
        """
        基于分析卡片和生成的段落自动生成脚本标题
        
        Args:
            card_data: 分析卡片数据
            sections: 生成的段落
            
        Returns:
            脚本标题
        """
        # 优先使用版本标题
        if card_data.version_title and card_data.version_title.strip():
            return f"{card_data.version_title.strip()} - 脚本框架"
        
        # 尝试从核心理念生成标题
        if card_data.core_idea and card_data.core_idea.strip():
            return f"{card_data.core_idea.strip()[:30]} - 脚本框架"
        
        # 尝试从钩子内容生成标题
        if "hook" in sections and sections["hook"].content:
            hook_content = sections["hook"].content[:30]
            return f"{hook_content}... - 脚本框架"
        
        # 默认标题
        return "AI生成脚本框架"
    
    async def generate_single_section(
        self,
        section_type: str,
        card_data: AnalysisCardSchema,
        style_config: Optional[ScriptStyleConfig] = None
    ) -> ScriptSection:
        """
        生成单个段落（用于测试或单独生成）
        
        Args:
            section_type: 段落类型
            card_data: 分析卡片数据
            style_config: 风格配置
            
        Returns:
            生成的脚本段落
        """
        logger.info(f"开始生成单个段落: {section_type}")
        
        # 映射数据
        mapped_data = self.field_mapper.extract_section_data(card_data, section_type)
        
        # 生成段落
        section = await self._generate_section(section_type, mapped_data, style_config)
        
        logger.info(f"单个段落生成完成: {section_type}")
        return section
    
    async def health_check(self) -> bool:
        """
        健康检查
        
        Returns:
            是否健康
        """
        try:
            # 检查AI服务
            ai_healthy = await self.ai_service.health_check()
            if not ai_healthy:
                logger.warning("AI服务健康检查失败")
                return False
            
            # 检查Prompt模板
            required_templates = list(self.section_prompts.values())
            for template_name in required_templates:
                if not self.prompt_manager.has_template(template_name):
                    logger.warning(f"缺少必要的Prompt模板: {template_name}")
                    return False
            
            logger.info("脚本生成器健康检查通过")
            return True
            
        except Exception as e:
            logger.error(f"脚本生成器健康检查失败: {str(e)}")
            return False