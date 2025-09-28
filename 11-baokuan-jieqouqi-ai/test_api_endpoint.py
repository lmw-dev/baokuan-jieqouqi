#!/usr/bin/env python3
"""
测试AI服务的Web API端点
"""

import asyncio
import aiohttp
import json


async def test_web_analyze_endpoint():
    """测试Web分析端点"""
    print("🧪 测试 AI 服务 Web 分析端点")
    print("=" * 50)
    
    # API端点
    url = "http://localhost:8000/api/v1/web/analyze"
    
    # 测试数据
    test_data = {
        "media_file_id": "test-123",
        "user_id": "test-user-001",
        "file_info": {
            "filename": "demo-video.mp4",
            "storage_path": "uploads/test/demo-video.mp4",
            "mime_type": "video/mp4",
            "file_size": 49358244
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
                        print("\n🎉 分析完成！")
                        data = result.get("data", {})
                        if "transcript" in data:
                            print(f"📝 转录文本: {data['transcript'][:100]}...")
                        if "hook_types" in data:
                            print(f"🎯 识别钩子类型: {data['hook_types']}")
                        if "trust_hooks_count" in data:
                            print(f"📊 钩子数量: {data['trust_hooks_count']}")
                    else:
                        print(f"❌ 分析失败: {result.get('error', '未知错误')}")
                else:
                    error_text = await response.text()
                    print(f"❌ HTTP错误: {response.status}")
                    print(f"错误内容: {error_text}")
                
    except Exception as e:
        print(f"❌ 请求失败: {str(e)}")


async def test_health_endpoint():
    """测试健康检查端点"""
    print("\n🔍 测试健康检查端点")
    print("-" * 30)
    
    url = "http://localhost:8000/api/v1/health"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ 健康检查通过")
                    print(f"📋 服务状态: {json.dumps(result, indent=2, ensure_ascii=False)}")
                else:
                    print(f"❌ 健康检查失败: {response.status}")
    except Exception as e:
        print(f"❌ 健康检查异常: {str(e)}")


async def test_text_analysis_endpoint():
    """测试文本分析端点"""
    print("\n📝 测试文本分析端点")
    print("-" * 30)
    
    url = "http://localhost:8000/api/v1/analyze"
    
    # 使用FormData模拟前端请求
    form_data = aiohttp.FormData()
    form_data.add_field('content_type', 'text')
    form_data.add_field('text_content', '作为一个专家，我要告诉你99%的人都不知道的秘密')
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
                    print(f"📋 分析结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
                else:
                    error_text = await response.text()
                    print(f"❌ 文本分析失败: {response.status}")
                    print(f"错误内容: {error_text}")
    except Exception as e:
        print(f"❌ 文本分析异常: {str(e)}")


async def main():
    """主函数"""
    print("🚀 AI服务API端点测试")
    print("=" * 50)
    
    # 1. 健康检查
    await test_health_endpoint()
    
    # 2. 文本分析端点
    await test_text_analysis_endpoint()
    
    # 3. Web分析端点
    await test_web_analyze_endpoint()
    
    print("\n🏁 所有API测试完成")


if __name__ == "__main__":
    asyncio.run(main())