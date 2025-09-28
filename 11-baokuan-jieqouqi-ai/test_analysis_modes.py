#!/usr/bin/env python3
"""
三段式分析新模式测试脚本
测试直接分析模式和转录文本分析模式
"""

import asyncio
import httpx
import json
from typing import Dict, Any

# 配置
API_BASE_URL = "http://localhost:8001"
API_ENDPOINT = f"{API_BASE_URL}/api/v1/analysis/three-stage"

# 测试数据
TEST_CONTENT = """
大家好，今天我要为大家评测582款蓝牙耳机中的性价比之王。
作为数码评测达人，我花了3个月时间，测试了从99元到3999元的各款蓝牙耳机，
发现了这个让人震惊的真相：699元的索尼WF-1000XM4竟然在音质上媲美2000元的苹果AirPods Pro！
"""

async def test_direct_analysis():
    """测试直接分析模式"""
    print("🧪 测试 1: 直接分析模式")
    print("-" * 50)
    
    request_data = {
        "content": TEST_CONTENT,
        "content_type": "text"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(API_ENDPOINT, json=request_data)
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ 直接分析模式测试成功")
                print(f"响应格式验证:")
                print(f"  - code: {data.get('code')}")
                print(f"  - message: {data.get('message')}")
                
                if data.get('data'):
                    analysis_data = data['data']
                    print(f"  - 分析ID: {analysis_data.get('meta', {}).get('analysis_id')}")
                    print(f"  - 信任之钩: {analysis_data.get('trust_hook', {}).get('hook_copy', '')[:50]}...")
                    print(f"  - 共情之锚: {analysis_data.get('empathy_anchor', {}).get('pain_point', '')[:50]}...")
                    print(f"  - 价值图谱: {analysis_data.get('value_map', {}).get('core_value', '')[:50]}...")
                return True
            else:
                error_data = response.json()
                print(f"❌ 直接分析模式测试失败: {error_data}")
                return False
                
        except Exception as e:
            print(f"❌ 直接分析模式测试异常: {str(e)}")
            return False

async def test_source_id_analysis():
    """测试转录文本分析模式（使用假设的source_id）"""
    print("\n🧪 测试 2: 转录文本分析模式")
    print("-" * 50)
    
    # 使用一个假设的source_id来测试错误处理
    request_data = {
        "source_id": "test-source-id-12345",
        "content_type": "video_transcript"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(API_ENDPOINT, json=request_data)
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 400:
                # 期望的行为：资源不存在应该返回400错误
                data = response.json()
                print("✅ 转录文本分析模式错误处理正确")
                print(f"错误响应格式:")
                print(f"  - code: {data.get('code')}")
                print(f"  - message: {data.get('message')}")
                return True
            else:
                print(f"❌ 期望400状态码，实际: {response.status_code}")
                data = response.json()
                print(f"响应: {data}")
                return False
                
        except Exception as e:
            print(f"❌ 转录文本分析模式测试异常: {str(e)}")
            return False

async def test_parameter_validation():
    """测试参数验证"""
    print("\n🧪 测试 3: 参数验证")
    print("-" * 50)
    
    test_cases = [
        {
            "name": "缺少content和source_id",
            "data": {"content_type": "text"},
            "expected_status": 400
        },
        {
            "name": "同时提供content和source_id",
            "data": {
                "content": TEST_CONTENT,
                "source_id": "test-id",
                "content_type": "text"
            },
            "expected_status": 400
        },
        {
            "name": "空内容",
            "data": {
                "content": "",
                "content_type": "text"
            },
            "expected_status": 400
        }
    ]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        all_passed = True
        for test_case in test_cases:
            try:
                print(f"  测试: {test_case['name']}")
                response = await client.post(API_ENDPOINT, json=test_case['data'])
                
                if response.status_code == test_case['expected_status']:
                    data = response.json()
                    print(f"    ✅ 正确返回{test_case['expected_status']}错误: {data.get('message')}")
                else:
                    print(f"    ❌ 期望{test_case['expected_status']}，实际{response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                print(f"    ❌ 测试异常: {str(e)}")
                all_passed = False
        
        return all_passed

async def main():
    """主测试函数"""
    print("🚀 开始三段式分析新模式测试...")
    print("请确保服务已启动在 http://localhost:8001")
    print("=" * 60)
    
    # 执行测试
    test1_result = await test_direct_analysis()
    test2_result = await test_source_id_analysis()
    test3_result = await test_parameter_validation()
    
    # 测试总结
    print("\n" + "=" * 60)
    print("📋 测试总结:")
    print(f"1. 直接分析模式: {'✅ 通过' if test1_result else '❌ 失败'}")
    print(f"2. 转录文本分析模式: {'✅ 通过' if test2_result else '❌ 失败'}")
    print(f"3. 参数验证: {'✅ 通过' if test3_result else '❌ 失败'}")
    
    if all([test1_result, test2_result, test3_result]):
        print("\n🎉 所有测试通过！新的分析模式工作正常。")
    else:
        print("\n⚠️  部分测试失败，需要进一步检查。")

if __name__ == "__main__":
    asyncio.run(main())