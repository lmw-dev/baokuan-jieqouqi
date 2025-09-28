"""
Prompt模板管理器 - 负责模板缓存、热更新和版本管理
"""

from typing import Dict, List, Optional
from pathlib import Path
from loguru import logger

from app.services.prompts.loader import PromptLoader
from app.models.three_stage_analysis import PromptTemplate, PromptTemplateInfo
from app.core.exceptions import PromptManagementError
from app.core.config import settings


class PromptManager:
    """Prompt模板管理器"""
    
    def __init__(self, templates_dir: Optional[str] = None):
        self.templates_dir = Path(templates_dir or settings.prompt_templates_dir)
        self.loader = PromptLoader(str(self.templates_dir))
        self.templates: Dict[str, PromptTemplate] = {}
        self._initialized = False
    
    async def initialize(self):
        """初始化管理器，加载所有模板"""
        if self._initialized:
            return
        
        try:
            await self.reload_all_templates()
            self._initialized = True
            logger.info(f"Prompt管理器初始化完成，加载了 {len(self.templates)} 个模板")
        except Exception as e:
            logger.error(f"Prompt管理器初始化失败: {str(e)}")
            raise PromptManagementError(f"Prompt管理器初始化失败: {str(e)}")
    
    async def reload_all_templates(self):
        """重新加载所有模板"""
        try:
            new_templates = await self.loader.load_all_templates()
            self.templates = new_templates
            logger.info(f"重新加载了 {len(self.templates)} 个Prompt模板")
        except Exception as e:
            logger.error(f"重新加载模板失败: {str(e)}")
            raise PromptManagementError(f"重新加载模板失败: {str(e)}")
    
    async def reload_template(self, name: str):
        """
        重新加载指定模板
        
        Args:
            name: 模板名称
            
        Raises:
            PromptManagementError: 模板不存在或加载失败
        """
        file_path = self.templates_dir / f"{name}.md"
        
        try:
            template = await self.loader.load_template_from_file(file_path)
            self.templates[name] = template
            logger.info(f"重新加载模板: {name} v{template.version}")
        except Exception as e:
            logger.error(f"重新加载模板失败: {name}, 错误: {str(e)}")
            raise PromptManagementError(f"重新加载模板失败: {name}, {str(e)}")
    
    async def reload_templates(self, names: Optional[List[str]] = None):
        """
        重新加载指定的模板列表
        
        Args:
            names: 模板名称列表，如果为None则重新加载所有模板
        """
        if names is None:
            await self.reload_all_templates()
            return
        
        success_count = 0
        failed_templates = []
        
        for name in names:
            try:
                await self.reload_template(name)
                success_count += 1
            except Exception as e:
                failed_templates.append({"name": name, "error": str(e)})
        
        logger.info(f"重新加载完成: 成功 {success_count}/{len(names)} 个模板")
        
        if failed_templates:
            failed_names = [t["name"] for t in failed_templates]
            raise PromptManagementError(
                f"部分模板重新加载失败: {failed_names}",
                f"详情: {failed_templates}"
            )
    
    def get_template(self, name: str, version: str = "latest") -> str:
        """
        获取Prompt模板内容
        
        Args:
            name: 模板名称
            version: 模板版本（暂时只支持"latest"）
            
        Returns:
            模板内容
            
        Raises:
            PromptManagementError: 模板不存在
        """
        if not self._initialized:
            raise PromptManagementError("Prompt管理器未初始化", "请先调用initialize()方法")
        
        if name not in self.templates:
            available_templates = list(self.templates.keys())
            raise PromptManagementError(
                f"Prompt模板不存在: {name}",
                f"可用模板: {available_templates}"
            )
        
        # 目前只支持latest版本，后续可扩展版本管理
        if version != "latest":
            logger.warning(f"暂不支持指定版本 {version}，将使用latest版本")
        
        template = self.templates[name]
        return template.content
    
    def has_template(self, name: str) -> bool:
        """
        检查是否存在指定名称的模板
        
        Args:
            name: 模板名称
            
        Returns:
            是否存在模板
        """
        return name in self.templates
    
    def get_template_info(self, name: str) -> Optional[PromptTemplateInfo]:
        """
        获取模板信息
        
        Args:
            name: 模板名称
            
        Returns:
            模板信息，如果不存在则返回None
        """
        if name not in self.templates:
            return None
        
        template = self.templates[name]
        return PromptTemplateInfo(
            name=template.name,
            version=template.version,
            description=template.description,
            updated_at=template.updated_at
        )
    
    def list_templates(self) -> List[PromptTemplateInfo]:
        """
        列出所有模板信息
        
        Returns:
            模板信息列表
        """
        if not self._initialized:
            return []
        
        return [
            PromptTemplateInfo(
                name=template.name,
                version=template.version,
                description=template.description,
                updated_at=template.updated_at
            )
            for template in self.templates.values()
        ]
    
    def has_template(self, name: str) -> bool:
        """
        检查是否存在指定模板
        
        Args:
            name: 模板名称
            
        Returns:
            是否存在
        """
        return name in self.templates
    
    def get_template_count(self) -> int:
        """
        获取模板数量
        
        Returns:
            模板数量
        """
        return len(self.templates)


# 全局Prompt管理器实例（单例模式）
_prompt_manager: Optional[PromptManager] = None


async def get_prompt_manager() -> PromptManager:
    """
    获取Prompt管理器实例（依赖注入使用）
    
    Returns:
        Prompt管理器实例
    """
    global _prompt_manager
    
    if _prompt_manager is None:
        _prompt_manager = PromptManager()
        await _prompt_manager.initialize()
    
    return _prompt_manager


def reset_prompt_manager():
    """重置Prompt管理器实例（主要用于测试）"""
    global _prompt_manager
    _prompt_manager = None