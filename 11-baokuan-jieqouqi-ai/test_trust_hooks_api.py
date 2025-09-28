#!/usr/bin/env python3
"""
测试文本分析API，然后测试web集成API
"""

import asyncio
import aiohttp
import json


async def test_text_analysis_with_hooks():
    """测试包含多个信任之钩的文本分析"""
    print("🧪 测试信任之钩识别")
    print("=" * 50)
    
    url = "http://localhost:8000/api/v1/analyze"
    
    # 包含多个信任之钩的测试文本
    test_text = "作为一个专家，我要告诉你99%的人都不知道的秘密。我花了10年时间研究这个问题，现在机会稀缺，只有前100名用户可以获得这个独家方法。你肯定很好奇为什么大多数人都失败了吧？"
    
    form_data = aiohttp.FormData()
    form_data.add_field('content_type', 'text')
    form_data.add_field('text_content', test_text)
    form_data.add_field('analysis_options', json.dumps({
        'include_trust_hooks': True,
        'include_empathy_anchors': True,
        'include_value_mapping': True,
        'output_format': 'structured'
    }))
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=form_data) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ 文本分析成功")
                    print(f"📋 完整分析结果:")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
                    return result
                else:
                    error_text = await response.text()
                    print(f"❌ 文本分析失败: {response.status}")
                    print(f"错误内容: {error_text}")
                    return None
    except Exception as e:
        print(f"❌ 请求异常: {str(e)}")
        return None


async def test_web_integration_with_mock_data():
    """测试Web集成API，使用模拟数据"""
    print("\n🌐 测试Web集成API")
    print("=" * 50)
    
    url = "http://localhost:8000/api/v1/web/analyze"
    
    test_data = {
        "media_file_id": "mock-test-123",
        "user_id": "test-user-001", 
        "file_info": {
            "filename": "trust-hooks-demo.mp4",
            "storage_path": "uploads/test/trust-hooks-demo.mp4",
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
                    print("✅ Web API调用成功")
                    print(f"📋 响应数据:")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
                    return result
                else:
                    error_text = await response.text()
                    print(f"❌ Web API错误: {response.status}")
                    print(f"错误内容: {error_text}")
                    return None
    except Exception as e:
        print(f"❌ Web API请求失败: {str(e)}")
        return None


async def main():
    """主函数"""
    print("🚀 信任之钩检测测试")
    print("=" * 60)
    
    # 1. 测试文本分析
    text_result = await test_text_analysis_with_hooks()
    
    # 2. 测试Web集成
    web_result = await test_web_integration_with_mock_data()
    
    print("\n" + "=" * 60)
    print("📊 测试总结")
    
    if text_result and text_result.get('success'):
        data = text_result.get('data', {})
        hooks = data.get('trust_hooks', [])
        print(f"✅ 文本分析: 识别到 {len(hooks)} 个信任之钩")
        for i, hook in enumerate(hooks, 1):
            print(f"   {i}. [{hook.get('hook_type')}] {hook.get('content')} (置信度: {hook.get('confidence', 0):.2f})")
    else:
        print("❌ 文本分析失败")
    
    if web_result and web_result.get('success'):
        data = web_result.get('data', {})
        print(f"✅ Web集成API: 成功")
        print(f"   📝 转录长度: {len(data.get('transcript', ''))}")
        print(f"   🎯 钩子数量: {data.get('trust_hooks_count', 0)}")
        print(f"   📋 钩子类型: {data.get('hook_types', [])}")
    else:
        print("❌ Web集成API失败")
    
    print("\n🏁 测试完成")


if __name__ == "__main__":
    asyncio.run(main())