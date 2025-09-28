"""
Prompt模板加载器 - 负责从MD文件加载和解析Prompt模板
"""

import re
import aiofiles
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from loguru import logger

from app.models.three_stage_analysis import PromptTemplate
from app.core.exceptions import PromptManagementError


class PromptLoader:
    """Prompt模板加载器"""
    
    def __init__(self, templates_dir: str):
        self.templates_dir = Path(templates_dir)
    
    async def load_template_from_file(self, file_path: Path) -> PromptTemplate:
        """
        从MD文件加载Prompt模板
        
        Args:
            file_path: MD文件路径
            
        Returns:
            Prompt模板对象
            
        Raises:
            PromptManagementError: 文件不存在或解析失败
        """
        if not file_path.exists():
            raise PromptManagementError(
                f"Prompt模板文件不存在: {file_path}",
                f"文件路径: {file_path}"
            )
        
        try:
            # 读取文件内容
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            
            # 解析模板
            template = self._parse_template(file_path.stem, content, file_path)
            
            logger.debug(f"加载Prompt模板: {template.name} v{template.version}")
            return template
            
        except Exception as e:
            raise PromptManagementError(
                f"加载Prompt模板失败: {str(e)}",
                f"文件: {file_path}"
            )
    
    def _parse_template(self, name: str, content: str, file_path: Path) -> PromptTemplate:
        """
        解析MD文档内容，提取模板信息
        
        Args:
            name: 模板名称
            content: 文档内容
            file_path: 文件路径
            
        Returns:
            Prompt模板对象
        """
        # 获取文件时间信息
        stat = file_path.stat()
        created_at = datetime.fromtimestamp(stat.st_ctime)
        updated_at = datetime.fromtimestamp(stat.st_mtime)
        
        # 解析版本号（从文档头部的版本字段）
        version = self._extract_version(content)
        
        # 解析描述（从文档头部的适用场景字段）
        description = self._extract_description(content)
        
        # 提取实际的Prompt内容（从"## 🔧 Prompt内容"部分）
        prompt_content = self._extract_prompt_content(content)
        
        return PromptTemplate(
            name=name,
            version=version,
            content=prompt_content,
            description=description,
            created_at=created_at,
            updated_at=updated_at
        )
    
    def _extract_version(self, content: str) -> str:
        """
        从文档中提取版本号
        
        Args:
            content: 文档内容
            
        Returns:
            版本号，默认为"v1.0"
        """
        # 匹配版本字段
        version_pattern = r'\*\*版本\*\*:\s*([^\n]+)'
        match = re.search(version_pattern, content)
        
        if match:
            return match.group(1).strip()
        
        # 如果没有找到版本字段，尝试从标题中提取
        title_pattern = r'^#\s+.*?-\s*([vV]?[\d\.]+)'
        match = re.search(title_pattern, content, re.MULTILINE)
        
        if match:
            version = match.group(1).strip()
            if not version.startswith('v'):
                version = f"v{version}"
            return version
        
        return "v1.0"
    
    def _extract_description(self, content: str) -> Optional[str]:
        """
        从文档中提取描述
        
        Args:
            content: 文档内容
            
        Returns:
            描述文本，如果没有则返回None
        """
        # 匹配适用场景字段
        desc_pattern = r'\*\*适用场景\*\*:\s*([^\n]+)'
        match = re.search(desc_pattern, content)
        
        if match:
            return match.group(1).strip()
        
        # 如果没有找到适用场景，尝试匹配其他描述字段
        desc_patterns = [
            r'\*\*描述\*\*:\s*([^\n]+)',
            r'\*\*说明\*\*:\s*([^\n]+)',
            r'## 🎯 分析目标\s*\n([^\n]+)',
        ]
        
        for pattern in desc_patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_prompt_content(self, content: str) -> str:
        """
        从文档中提取实际的Prompt内容
        
        Args:
            content: 文档内容
            
        Returns:
            Prompt内容
        """
        # 匹配"## 🔧 Prompt内容"部分
        prompt_pattern = r'## 🔧 Prompt内容\s*\n(.*?)(?=\n## |$)'
        match = re.search(prompt_pattern, content, re.DOTALL)
        
        if match:
            prompt_content = match.group(1).strip()
            # 移除可能的代码块标记
            prompt_content = re.sub(r'^```[^\n]*\n', '', prompt_content)
            prompt_content = re.sub(r'\n```$', '', prompt_content)
            return prompt_content.strip()
        
        # 如果没有找到专门的Prompt内容部分，尝试其他模式
        # 查找第一个代码块
        code_block_pattern = r'```[^\n]*\n(.*?)\n```'
        match = re.search(code_block_pattern, content, re.DOTALL)
        
        if match:
            return match.group(1).strip()
        
        # 如果都没有找到，返回整个文档内容（去除前几行的元数据）
        lines = content.split('\n')
        # 跳过前面的元数据行
        start_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('##') and '分析目标' in line:
                start_idx = i
                break
        
        if start_idx > 0:
            return '\n'.join(lines[start_idx:]).strip()
        
        return content.strip()
    
    async def load_all_templates(self) -> Dict[str, PromptTemplate]:
        """
        加载目录中的所有模板
        
        Returns:
            模板字典 {模板名称: 模板对象}
        """
        templates = {}
        
        if not self.templates_dir.exists():
            logger.warning(f"Prompt模板目录不存在: {self.templates_dir}")
            return templates
        
        # 遍历所有.md文件
        for file_path in self.templates_dir.glob("*.md"):
            try:
                template = await self.load_template_from_file(file_path)
                templates[template.name] = template
            except Exception as e:
                logger.error(f"加载模板失败: {file_path}, 错误: {str(e)}")
                # 继续加载其他模板
        
        logger.info(f"加载了 {len(templates)} 个Prompt模板")
        return templates