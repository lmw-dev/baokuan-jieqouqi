#!/usr/bin/env python3
"""
TOM-216补充验收测试 - 验证不同风格配置和TOM-220架构兼容性
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.models.script_generation import AnalysisCardSchema, ScriptStyleConfig
from app.services.analysis.script_generator import ScriptGenerator
from app.services.ai.deepseek import DeepSeekService
from app.services.prompts.manager import PromptManager
from app.core.config import settings
from loguru import logger


async def test_different_styles():
    """测试不同风格和长度配置的生成效果"""
    logger.info("🎨 开始测试不同风格配置的生成效果")
    
    # 初始化服务
    ai_service = DeepSeekService(
        api_key=settings.ai_api_key,
        base_url=settings.ai_base_url,
        model=settings.ai_model,
        timeout=settings.ai_timeout
    )
    prompt_manager = PromptManager()
    await prompt_manager.initialize()
    script_generator = ScriptGenerator(ai_service, prompt_manager)
    
    # 测试用的AnalysisCard数据
    test_card = AnalysisCardSchema(
        id="test_style",
        version_title="风格测试卡片",
        hook_copy="惊！这个方法让我30天内掌握了编程技能",
        hook_types=["技能提升", "时间管理"],
        core_idea="通过系统化学习方法快速掌握编程技能",
        value_delivery=["节省学习时间", "提高学习效率", "获得实用技能"]
    )
    
    # 测试不同风格配置
    style_configs = [
        ("专业风格", ScriptStyleConfig(
            tone="professional",
            target_audience="职场人士",
            length_preference="medium"
        )),
        ("轻松风格", ScriptStyleConfig(
            tone="casual", 
            target_audience="年轻用户",
            length_preference="short"
        )),
        ("创意风格", ScriptStyleConfig(
            tone="creative",
            target_audience="内容创作者", 
            length_preference="long"
        ))
    ]
    
    style_test_results = []
    
    for style_name, style_config in style_configs:
        logger.info(f"📝 测试风格: {style_name}")
        try:
            # 生成单个段落进行快速测试
            hook_section = await script_generator.generate_single_section(
                "hook", 
                test_card,
                style_config
            )
            
            style_test_results.append({
                "style": style_name,
                "success": True,
                "content_length": len(hook_section.content),
                "keywords_count": len(hook_section.keywords),
                "content_preview": hook_section.content[:100] + "..."
            })
            
            logger.info(f"  ✅ {style_name}生成成功 - 内容长度: {len(hook_section.content)}字符")
            
        except Exception as e:
            style_test_results.append({
                "style": style_name,
                "success": False,
                "error": str(e)
            })
            logger.error(f"  ❌ {style_name}生成失败: {e}")
    
    return style_test_results


async def test_tom220_compatibility():
    """验证与TOM-220架构的集成兼容性"""
    logger.info("🔄 开始验证与TOM-220架构的集成兼容性")
    
    compatibility_results = []
    
    try:
        # 1. 测试Prompt管理器兼容性
        logger.info("  🧪 测试Prompt管理器兼容性")
        prompt_manager = PromptManager()
        await prompt_manager.initialize()
        
        # 验证TOM-220原有模板仍可正常加载
        tom220_templates = ["trust_hook", "empathy_anchor", "value_map"]
        for template_name in tom220_templates:
            has_template = prompt_manager.has_template(template_name)
            compatibility_results.append({
                "test": f"TOM-220模板[{template_name}]加载",
                "success": has_template
            })
        
        # 验证TOM-216新增模板正常加载
        tom216_templates = ["hook_generator", "problem_generator", "solution_generator", 
                           "proof_generator", "cta_generator"]
        for template_name in tom216_templates:
            has_template = prompt_manager.has_template(template_name)
            compatibility_results.append({
                "test": f"TOM-216模板[{template_name}]加载",
                "success": has_template
            })
        
        # 2. 测试AI服务兼容性
        logger.info("  🤖 测试AI服务兼容性")
        ai_service = DeepSeekService(
            api_key=settings.ai_api_key,
            base_url=settings.ai_base_url,
            model=settings.ai_model,
            timeout=settings.ai_timeout
        )
        
        # 验证AI健康检查
        ai_healthy = await ai_service.health_check()
        compatibility_results.append({
            "test": "AI服务健康检查",
            "success": ai_healthy
        })
        
        # 3. 测试脚本生成器与TOM-220架构兼容性
        logger.info("  ⚙️ 测试脚本生成器架构兼容性")
        script_generator = ScriptGenerator(ai_service, prompt_manager)
        
        # 验证脚本生成器健康检查
        generator_healthy = await script_generator.health_check()
        compatibility_results.append({
            "test": "脚本生成器健康检查",
            "success": generator_healthy
        })
        
        logger.info("✅ TOM-220架构兼容性验证完成")
        
    except Exception as e:
        logger.error(f"❌ TOM-220架构兼容性验证失败: {e}")
        compatibility_results.append({
            "test": "整体兼容性验证",
            "success": False,
            "error": str(e)
        })
    
    return compatibility_results


async def main():
    """主函数 - 执行补充验收测试"""
    logger.info("🚀 TOM-216补充验收测试开始")
    logger.info("=" * 60)
    
    # 测试1: 不同风格配置
    style_results = await test_different_styles()
    
    # 测试2: TOM-220架构兼容性 
    compatibility_results = await test_tom220_compatibility()
    
    # 输出测试结果摘要
    logger.info("📊 测试结果摘要:")
    logger.info("=" * 60)
    
    logger.info("🎨 风格配置测试结果:")
    for result in style_results:
        status = "✅" if result["success"] else "❌"
        logger.info(f"  {status} {result['style']}: {result.get('content_length', 'N/A')}字符")
    
    logger.info("\n🔄 TOM-220兼容性测试结果:")
    for result in compatibility_results:
        status = "✅" if result["success"] else "❌"
        logger.info(f"  {status} {result['test']}")
    
    # 计算成功率
    style_success_rate = len([r for r in style_results if r["success"]]) / len(style_results)
    compatibility_success_rate = len([r for r in compatibility_results if r["success"]]) / len(compatibility_results)
    
    logger.info(f"\n📈 验收结果:")
    logger.info(f"  风格配置测试成功率: {style_success_rate:.1%}")
    logger.info(f"  架构兼容性测试成功率: {compatibility_success_rate:.1%}")
    
    overall_success = style_success_rate >= 0.8 and compatibility_success_rate >= 0.9
    if overall_success:
        logger.info("🎉 补充验收测试 PASSED - 所有验收确认项目通过!")
        return 0
    else:
        logger.error("❌ 补充验收测试 FAILED - 部分验收项目未通过!")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)