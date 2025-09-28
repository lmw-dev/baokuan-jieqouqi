#!/usr/bin/env python3
"""
调试Web集成API的信任之钩分析问题
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径到sys.path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.web_integration_service import WebIntegrationService
from app.services.hook_analysis_service import HookAnalysisService


async def debug_hook_analysis():
    """调试钩子分析"""
    print("🔍 调试信任之钩分析")
    print("=" * 50)
    
    # 测试文本
    test_text = """作为专业的内容分析师，我要告诉大家一个重要发现。通过深度分析，我们识别出了关键的价值点和情感触发器。99%的创作者都忽略了这些细节，但是掌握这些技巧，你就能制作出真正有影响力的内容。这些发现对内容创作者来说非常珍贵，你肯定很好奇为什么大多数内容都无法触动观众吧？"""
    
    print(f"测试文本: {test_text}")
    print("-" * 50)
    
    # 1. 直接测试钩子分析服务
    print("1. 测试 HookAnalysisService")
    hook_analyzer = HookAnalysisService()
    hook_results = await hook_analyzer.analyze_text_hooks(test_text)
    
    print(f"识别到 {len(hook_results)} 个钩子:")
    for i, hook in enumerate(hook_results, 1):
        print(f"  {i}. [{hook.hook_type.value}] {hook.content} (置信度: {hook.confidence:.3f})")
    
    print("\n" + "-" * 50)
    
    # 2. 测试Web集成服务
    print("2. 测试 WebIntegrationService")
    web_service = WebIntegrationService()
    result = await web_service.analyze_uploaded_file("debug-test-123")
    
    print(f"Web集成结果:")
    print(f"  转录文本长度: {len(result.get('transcript', ''))}")
    print(f"  钩子数量: {result.get('trust_hooks_count', 0)}")
    print(f"  钩子类型: {result.get('hook_types', [])}")
    print(f"  钩子文案: {result.get('hook_copy', '')}")
    
    return hook_results, result


async def main():
    """主函数"""
    print("🚀 调试信任之钩分析问题")
    print("=" * 60)
    
    try:
        hook_results, web_result = await debug_hook_analysis()
        
        print("\n" + "=" * 60)
        print("📊 调试总结")
        print(f"直接钩子分析: {len(hook_results)} 个")
        print(f"Web集成分析: {web_result.get('trust_hooks_count', 0)} 个")
        
        if len(hook_results) > 0 and web_result.get('trust_hooks_count', 0) == 0:
            print("❌ 发现问题: 直接分析有结果，Web集成没有结果")
            print("   需要检查Web集成服务的钩子分析逻辑")
        elif len(hook_results) > 0 and web_result.get('trust_hooks_count', 0) > 0:
            print("✅ 两种方式都有结果")
        else:
            print("🤔 两种方式都没有结果，需要检查测试文本")
            
    except Exception as e:
        print(f"❌ 调试过程中出错: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())