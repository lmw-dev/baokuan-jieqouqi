"""
Prompt管理器单元测试
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, patch, mock_open, AsyncMock
import os
from pathlib import Path

from app.services.prompts.manager import PromptManager
from app.core.exceptions import PromptManagementError


class TestPromptManager:
    """Prompt管理器测试"""
    
    @pytest_asyncio.fixture
    async def prompt_manager(self, tmp_path):
        """创建Prompt管理器实例"""
        # 创建临时模板目录
        templates_dir = tmp_path / "templates"
        templates_dir.mkdir()
        
        # 创建测试模板文件
        trust_hook_content = """# 信任之钩分析模板

## 元数据
- 模板类型: trust_hook
- 版本: v1.0
- 用途: 分析视频中的信任建立元素

## 分析目标
分析视频内容中的信任建立策略和可信度信号。

## 输出格式
```json
{
    "hook_copy": "string",
    "credibility_testimony": "string", 
    "authority_signals": ["string"]
}
```

## 示例
参考蓝牙耳机评测视频...
"""
        
        (templates_dir / "trust_hook.md").write_text(trust_hook_content)
        
        manager = PromptManager(str(templates_dir))
        await manager.initialize()
        return manager
    
    @pytest.mark.asyncio
    async def test_initialize_success(self, tmp_path):
        """测试初始化成功"""
        templates_dir = tmp_path / "templates"
        templates_dir.mkdir()
        
        manager = PromptManager(str(templates_dir))
        await manager.initialize()
        
        assert manager._initialized is True
        assert str(manager.templates_dir) == str(templates_dir)
    
    @pytest.mark.asyncio
    async def test_initialize_directory_not_exists(self, tmp_path):
        """测试初始化目录不存在"""
        non_existent_dir = tmp_path / "non_existent"
        
        manager = PromptManager(str(non_existent_dir))
        
        # 根据实际实现，不存在的目录只会产生警告，不会抛出异常
        await manager.initialize()
        assert manager._initialized is True
        assert manager.get_template_count() == 0
    
    def test_has_template(self, prompt_manager):
        """测试检查模板是否存在"""
        assert prompt_manager.has_template("trust_hook") is True
        assert prompt_manager.has_template("non_existent") is False
    
    def test_get_template_success(self, prompt_manager):
        """测试获取模板成功"""
        template = prompt_manager.get_template("trust_hook")
        # 根据实际实现，返回的是解析后的JSON模板部分
        assert "hook_copy" in template
        assert "credibility_testimony" in template
    
    def test_get_template_not_found(self, prompt_manager):
        """测试获取不存在的模板"""
        with pytest.raises(PromptManagementError) as exc_info:
            prompt_manager.get_template("non_existent")
        assert "Prompt模板不存在" in str(exc_info.value)
    
    def test_list_templates(self, prompt_manager):
        """测试列出所有模板"""
        templates = prompt_manager.list_templates()
        assert len(templates) == 1
        assert templates[0].name == "trust_hook"
        assert templates[0].version == "v1.0"
    
    def test_get_template_info(self, prompt_manager):
        """测试获取模板信息"""
        info = prompt_manager.get_template_info("trust_hook")
        
        assert info is not None
        assert info.name == "trust_hook"
        assert info.version == "v1.0"
        assert info.updated_at is not None
        # 根据实际实现，description可能为None
        assert info.description is None or isinstance(info.description, str)
    
    def test_get_template_info_not_found(self, prompt_manager):
        """测试获取不存在模板的信息"""
        info = prompt_manager.get_template_info("non_existent")
        assert info is None
    
    def test_get_template_count(self, prompt_manager):
        """测试获取模板数量"""
        count = prompt_manager.get_template_count()
        assert count == 1
    
    @pytest.mark.asyncio
    async def test_reload_templates_all(self, prompt_manager, tmp_path):
        """测试重新加载所有模板"""
        # 添加新的模板文件
        templates_dir = Path(prompt_manager.templates_dir)
        new_template = templates_dir / "empathy_anchor.md"
        new_template.write_text("""# 共情之锚模板

## 元数据
- 模板类型: empathy_anchor
- 版本: v1.0
- 用途: 测试内容

测试内容
""")
        
        # 重新加载
        await prompt_manager.reload_templates()
        
        # 验证新模板已加载
        assert prompt_manager.has_template("empathy_anchor") is True
        assert prompt_manager.get_template_count() == 2
    
    @pytest.mark.asyncio
    async def test_reload_templates_specific(self, prompt_manager):
        """测试重新加载指定模板"""
        # 重新加载指定模板
        await prompt_manager.reload_templates(["trust_hook"])
        
        # 验证模板仍然存在
        assert prompt_manager.has_template("trust_hook") is True
    
    @pytest.mark.asyncio
    async def test_reload_templates_invalid_template(self, prompt_manager):
        """测试重新加载不存在的模板"""
        with pytest.raises(PromptManagementError) as exc_info:
            await prompt_manager.reload_templates(["non_existent"])
        assert "部分模板重新加载失败" in str(exc_info.value)
    
    def test_get_template_with_version(self, prompt_manager):
        """测试获取指定版本的模板"""
        # 目前只支持latest版本
        template = prompt_manager.get_template("trust_hook", "latest")
        assert "hook_copy" in template
        
        # 测试不支持的版本会使用latest
        template = prompt_manager.get_template("trust_hook", "v2.0")
        assert "hook_copy" in template
    
    def test_get_template_manager_not_initialized(self):
        """测试未初始化时获取模板"""
        manager = PromptManager("/tmp/test")
        
        with pytest.raises(PromptManagementError) as exc_info:
            manager.get_template("trust_hook")
        assert "Prompt管理器未初始化" in str(exc_info.value)
    
    def test_list_templates_not_initialized(self):
        """测试未初始化时列出模板"""
        manager = PromptManager("/tmp/test")
        
        templates = manager.list_templates()
        assert templates == []


class TestPromptManagerDependency:
    """Prompt管理器依赖注入测试"""
    
    @pytest.mark.asyncio
    async def test_get_prompt_manager_singleton(self):
        """测试依赖注入返回单例"""
        from app.services.prompts.manager import get_prompt_manager
        
        # 重置全局实例
        import app.services.prompts.manager as manager_module
        manager_module._prompt_manager = None
        
        # 模拟配置
        with patch('app.services.prompts.manager.settings') as mock_settings:
            mock_settings.prompt_templates_dir = "test_dir"
            
            # 模拟PromptManager
            with patch('app.services.prompts.manager.PromptManager') as MockPromptManager:
                mock_instance = Mock()
                mock_instance.initialize = AsyncMock()  # 异步方法需要AsyncMock
                MockPromptManager.return_value = mock_instance
                
                # 第一次调用
                manager1 = await get_prompt_manager()
                # 第二次调用应该返回同一个实例
                manager2 = await get_prompt_manager()
                
                assert manager1 is manager2
                MockPromptManager.assert_called_once()
                mock_instance.initialize.assert_called_once()