"""
TOM-217: 脚本导出服务实现
支持多种格式导出脚本内容：TXT、Markdown、JSON
"""

import json
from datetime import datetime

from loguru import logger

from app.schemas.script_management import ExportFormatEnum, ScriptDetail


class ExportService:
    """脚本导出服务"""

    async def export_script(
        self,
        script: ScriptDetail,
        format: ExportFormatEnum,
        include_metadata: bool = True,
        include_tips: bool = True
    ) -> str:
        """
        导出脚本为指定格式
        
        Args:
            script: 脚本详情对象
            format: 导出格式
            include_metadata: 是否包含元数据
            include_tips: 是否包含创作提示
            
        Returns:
            导出的内容字符串
        """
        try:
            logger.info(f"开始导出脚本 {script.id} 为 {format.value} 格式")

            if format == ExportFormatEnum.TXT:
                return await self._export_to_txt(script, include_metadata, include_tips)
            elif format == ExportFormatEnum.MARKDOWN:
                return await self._export_to_markdown(script, include_metadata, include_tips)
            elif format == ExportFormatEnum.JSON:
                return await self._export_to_json(script, include_metadata, include_tips)
            else:
                raise ValueError(f"不支持的导出格式: {format}")

        except Exception as e:
            logger.error(f"脚本导出失败: {str(e)}")
            logger.error(f"错误类型: {type(e).__name__}")
            logger.error(f"脚本ID: {script.id}")
            logger.error(f"导出格式: {format}")
            import traceback
            logger.error(f"错误堆栈: {traceback.format_exc()}")
            raise

    async def _export_to_txt(
        self,
        script: ScriptDetail,
        include_metadata: bool,
        include_tips: bool
    ) -> str:
        """导出为TXT格式"""
        try:
            logger.debug(f"开始TXT格式导出，脚本ID: {script.id}")
            lines = []

            # 标题
            lines.append(f"标题: {script.title}")
            lines.append("=" * 50)
            lines.append("")

            # 元数据
            if include_metadata:
                lines.append("【脚本信息】")
                lines.append(f"状态: {script.status}")
                lines.append(f"创建时间: {script.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
                lines.append(f"更新时间: {script.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
                lines.append("")

            # 脚本内容
            lines.append("【脚本内容】")
            lines.append("")

            # 按段落顺序排序并输出
            logger.debug(f"处理 {len(script.sections)} 个段落")
            sorted_sections = sorted(script.sections, key=lambda x: x.order_index)
            for i, section in enumerate(sorted_sections, 1):
                logger.debug(f"处理段落 {i}: {section.title}")
                lines.append(f"{i}. {section.title}")
                lines.append("-" * 30)
                lines.append(section.content)

                if include_tips and section.tips:
                    lines.append("")
                    lines.append("【创作提示】")
                    for tip in section.tips:
                        lines.append(f"• {tip}")

                lines.append("")

            result = "\n".join(lines)
            logger.debug(f"TXT导出完成，内容长度: {len(result)}")
            return result
        
        except Exception as e:
            logger.error(f"TXT导出失败: {str(e)}")
            import traceback
            logger.error(f"TXT导出错误堆栈: {traceback.format_exc()}")
            raise

    async def _export_to_markdown(
        self,
        script: ScriptDetail,
        include_metadata: bool,
        include_tips: bool
    ) -> str:
        """导出为Markdown格式"""
        lines = []

        # 标题
        lines.append(f"# {script.title}")
        lines.append("")

        # 元数据
        if include_metadata:
            lines.append("## 脚本信息")
            lines.append("")
            lines.append(f"- **状态**: {script.status}")
            lines.append(f"- **创建时间**: {script.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            lines.append(f"- **更新时间**: {script.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
            lines.append("")

        # 脚本内容
        lines.append("## 脚本内容")
        lines.append("")

        # 按段落顺序排序并输出
        sorted_sections = sorted(script.sections, key=lambda x: x.order_index)
        for i, section in enumerate(sorted_sections, 1):
            lines.append(f"### {i}. {section.title}")
            lines.append("")
            lines.append(section.content)
            lines.append("")

            if include_tips and section.tips:
                lines.append("#### 创作提示")
                lines.append("")
                for tip in section.tips:
                    lines.append(f"> • {tip}")
                lines.append("")

        return "\n".join(lines)

    async def _export_to_json(
        self,
        script: ScriptDetail,
        include_metadata: bool,
        include_tips: bool
    ) -> str:
        """导出为JSON格式"""
        export_data = {
            "title": script.title,
            "content": {}
        }

        # 元数据
        if include_metadata:
            export_data["metadata"] = {
                "id": script.id,
                "status": script.status,
                "card_id": script.card_id,
                "created_at": script.created_at.isoformat(),
                "updated_at": script.updated_at.isoformat(),
                "creator_id": script.metadata.creator_id
            }

        # 脚本内容
        sections_data = []
        sorted_sections = sorted(script.sections, key=lambda x: x.order_index)

        for section in sorted_sections:
            section_data = {
                "title": section.title,
                "content": section.content,
                "order": section.order_index
            }

            if include_tips and section.tips:
                section_data["tips"] = section.tips

            sections_data.append(section_data)

        export_data["content"]["sections"] = sections_data

        # 导出时间
        export_data["exported_at"] = datetime.now().isoformat()

        return json.dumps(export_data, ensure_ascii=False, indent=2)

    async def get_export_filename(
        self,
        script: ScriptDetail,
        format: ExportFormatEnum
    ) -> str:
        """
        生成导出文件名
        
        Args:
            script: 脚本详情对象
            format: 导出格式
            
        Returns:
            文件名字符串
        """
        # 清理标题中的特殊字符
        safe_title = "".join(
            c for c in script.title if c.isalnum() or c in (" ", "-", "_")
        ).strip()
        safe_title = safe_title.replace(' ', '_')

        # 限制文件名长度
        if len(safe_title) > 50:
            safe_title = safe_title[:50]

        # 如果标题为空，使用脚本ID
        if not safe_title:
            safe_title = f"script_{script.id[:8]}"

        # 添加时间戳以避免重名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        extension_map = {
            ExportFormatEnum.TXT: "txt",
            ExportFormatEnum.MARKDOWN: "md",
            ExportFormatEnum.JSON: "json"
        }

        extension = extension_map[format]
        return f"{safe_title}_{timestamp}.{extension}"

    async def get_content_type(self, format: ExportFormatEnum) -> str:
        """
        获取导出格式对应的Content-Type
        
        Args:
            format: 导出格式
            
        Returns:
            Content-Type字符串
        """
        content_type_map = {
            ExportFormatEnum.TXT: "text/plain; charset=utf-8",
            ExportFormatEnum.MARKDOWN: "text/markdown; charset=utf-8",
            ExportFormatEnum.JSON: "application/json; charset=utf-8"
        }

        return content_type_map[format]

