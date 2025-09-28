#!/usr/bin/env python3
"""
调试钩子规则匹配问题
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径到sys.path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.hook_analysis_service import HookAnalysisService


async def debug_hook_rules():
    """调试钩子规则匹配"""
    print("🔍 调试钩子规则匹配")
    print("=" * 60)
    
    service = HookAnalysisService()
    
    # 测试不同的文本
    test_texts = [
        "作为一个专家，我要告诉你99%的人都不知道的秘密",
        "我是数码评测博主，测试过200+款手机",
        "作为专业的内容分析师，我要告诉大家一个重要发现",
        "99%的创作者都忽略了这些细节",
        "你肯定很好奇为什么大多数内容都无法触动观众吧？",
        "机会稀缺，只有前100名用户可以获得这个独家方法"
    ]
    
    print(f"规则数量: {service.get_rule_count()}")
    print(f"置信度阈值: {service.confidence_threshold}")
    print(f"支持的钩子类型: {service.get_supported_hook_types()}")
    print("-" * 60)
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n{i}. 测试文本: {text}")
        print("   " + "-" * 50)
        
        # 分析钩子
        hooks = await service.analyze_text_hooks(text)
        print(f"   识别到 {len(hooks)} 个钩子:")
        
        for j, hook in enumerate(hooks, 1):
            print(f"     {j}. [{hook.hook_type.value}] {hook.content}")
            print(f"        置信度: {hook.confidence:.3f}")
            print(f"        关键词: {hook.matched_keywords}")
        
        if not hooks:
            print("     ❌ 未识别到任何钩子")
            
            # 手动检查规则匹配
            print("     🔍 手动检查规则匹配:")
            for rule in service.rules:
                matched_keywords = []
                for keyword in rule.keywords:
                    if keyword in text:
                        matched_keywords.append(keyword)
                
                if matched_keywords:
                    print(f"       - 规则 [{rule.type}] 匹配关键词: {matched_keywords}")
                    
                    # 计算手动置信度
                    keyword_score = min(len(matched_keywords) / len(rule.keywords) * 0.8, 0.6)
                    keyword_bonus = min(len(matched_keywords) * 0.1, 0.3)
                    total_score = keyword_score + keyword_bonus
                    
                    print(f"         关键词得分: {keyword_score:.3f}")
                    print(f"         奖励得分: {keyword_bonus:.3f}")
                    print(f"         总分: {total_score:.3f}")
                    print(f"         阈值: {service.confidence_threshold}")
                    print(f"         是否通过: {'✅' if total_score >= service.confidence_threshold else '❌'}")


async def main():
    """主函数"""
    print("🚀 调试钩子规则匹配问题")
    print("=" * 70)
    
    await debug_hook_rules()
    
    print("\n" + "=" * 70)
    print("🏁 调试完成")


if __name__ == "__main__":
    asyncio.run(main())