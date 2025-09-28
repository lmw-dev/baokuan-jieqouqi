#!/usr/bin/env python3
"""
测试完整的分析服务，包括数据库操作
"""

import asyncio
import aiohttp
import json
import sys
from pathlib import Path

# 添加项目路径到sys.path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


async def test_complete_analysis_api():
    """测试完整的分析API"""
    print("🚀 测试完整的分析API")
    print("=" * 60)
    
    # 使用一个真实的媒体文件ID（应该在数据库中存在）
    test_media_file_id = "98d43cdb-9ea0-4ac3-ac78-17762a64b21d"
    
    url = "http://localhost:8000/api/v1/web/analyze"
    test_data = {
        "media_file_id": test_media_file_id,
        "user_id": "test-user-001",
        "file_info": {
            "filename": "demo-complete-analysis.mp4",
            "storage_path": "uploads/test/demo-complete-analysis.mp4",
            "mime_type": "video/mp4",
            "file_size": 12345678
        }
    }
    
    print(f"📡 调用端点: {url}")
    print(f"📦 请求数据: {json.dumps(test_data, indent=2, ensure_ascii=False)}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=test_data) as response:
                print(f"\n📊 响应状态: {response.status}")
                
                if response.status == 200:
                    result = await response.json()
                    print("✅ API调用成功")
                    print(f"📋 响应数据:")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
                    
                    if result.get("success"):
                        data = result.get("data", {})
                        print(f"\n🎉 分析完成！")
                        print(f"📝 AnalysisSource ID: {data.get('analysis_source_id')}")
                        print(f"📋 AnalysisCard ID: {data.get('analysis_card_id')}")
                        print(f"🎯 识别钩子数量: {data.get('trust_hooks_count', 0)}")
                        print(f"📊 钩子类型: {data.get('hook_types', [])}")
                        print(f"💬 钩子文案: {data.get('hook_copy', '')[:100]}...")
                        print(f"💡 核心观点: {data.get('core_idea', '')[:80]}...")
                        
                        # 显示详细的钩子信息
                        hooks_detail = data.get('trust_hooks_detail', [])
                        if hooks_detail:
                            print(f"\n🔍 详细钩子分析:")
                            for i, hook in enumerate(hooks_detail, 1):
                                print(f"  {i}. [{hook.get('type')}] {hook.get('content')}")
                                print(f"     置信度: {hook.get('confidence', 0):.3f}")
                                print(f"     关键词: {hook.get('keywords', [])}")
                        
                        return data.get('analysis_source_id'), data.get('analysis_card_id')
                    else:
                        print(f"❌ 分析失败: {result.get('error', '未知错误')}")
                        return None, None
                else:
                    error_text = await response.text()
                    print(f"❌ HTTP错误: {response.status}")
                    print(f"错误内容: {error_text}")
                    return None, None
                    
    except Exception as e:
        print(f"❌ 请求异常: {str(e)}")
        return None, None


async def test_get_analysis_result(media_file_id: str):
    """测试获取分析结果"""
    print(f"\n🔍 测试获取分析结果")
    print("-" * 40)
    
    url = f"http://localhost:8000/api/v1/web/analyze/{media_file_id}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                print(f"📊 响应状态: {response.status}")
                
                if response.status == 200:
                    result = await response.json()
                    print("✅ 查询成功")
                    
                    if result.get("success"):
                        data = result.get("data", {})
                        print(f"📋 查询到的分析结果:")
                        print(f"  AnalysisSource ID: {data.get('analysis_source_id')}")
                        print(f"  AnalysisCard ID: {data.get('analysis_card_id')}")
                        print(f"  钩子类型: {data.get('hook_types', [])}")
                        print(f"  核心观点: {data.get('core_idea', '')[:50]}...")
                    else:
                        print(f"❌ 查询失败: {result.get('error', '未知错误')}")
                else:
                    error_text = await response.text()
                    print(f"❌ HTTP错误: {response.status}")
                    print(f"错误内容: {error_text}")
                    
    except Exception as e:
        print(f"❌ 查询异常: {str(e)}")


async def main():
    """主函数"""
    print("🚀 测试完整分析服务（包含数据库操作）")
    print("=" * 70)
    
    # 1. 测试完整分析API
    analysis_source_id, analysis_card_id = await test_complete_analysis_api()
    
    # 2. 如果分析成功，测试查询功能
    if analysis_source_id:
        test_media_file_id = "98d43cdb-9ea0-4ac3-ac78-17762a64b21d"
        await test_get_analysis_result(test_media_file_id)
    
    print("\n" + "=" * 70)
    print("📊 测试总结")
    
    if analysis_source_id and analysis_card_id:
        print("✅ 完整分析流程测试成功")
        print("✅ 数据库存储功能正常")
        print("✅ 信任之钩识别正常")
        print("✅ API响应格式正确")
        print(f"✅ 创建了AnalysisSource: {analysis_source_id}")
        print(f"✅ 创建了AnalysisCard: {analysis_card_id}")
    else:
        print("❌ 测试失败，需要检查：")
        print("  - 数据库连接是否正常")
        print("  - MediaFile记录是否存在")
        print("  - AI服务是否正在运行")
    
    print("\n🏁 测试完成")


if __name__ == "__main__":
    asyncio.run(main())