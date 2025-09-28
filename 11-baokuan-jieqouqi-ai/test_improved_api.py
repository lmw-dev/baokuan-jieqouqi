#!/usr/bin/env python3
"""
测试改进后的分析API和错误处理机制
"""

import asyncio
import httpx
import json
from typing import Dict, Any

# 配置
API_BASE_URL = "http://localhost:8001"

async def test_analysis_overview():
    """测试分析模块概览接口"""
    print("🧪 测试 1: 分析模块概览")
    print("-" * 50)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(f"{API_BASE_URL}/api/v1/analysis/")
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ 分析模块概览接口正常")
                print(f"可用分析: {len(data.get('data', {}).get('available_analyses', []))}")
                return True
            else:
                print(f"❌ 概览接口失败: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 概览接口异常: {str(e)}")
            return False

async def test_snake_case_response():
    """测试响应格式是否使用snake_case"""
    print("\n🧪 测试 2: 响应格式snake_case规范")
    print("-" * 50)
    
    test_content = "测试内容，验证响应格式"
    request_data = {
        "content": test_content,
        "content_type": "text"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{API_BASE_URL}/api/v1/analysis/three-stage",
                json=request_data
            )
            
            if response.status_code == 200:
                data = response.json()
                analysis_data = data.get('data', {})
                meta = analysis_data.get('meta', {})
                
                # 检查关键字段是否使用snake_case
                snake_case_fields = [
                    'analysis_id',
                    'processing_time_ms', 
                    'ai_model',
                    'prompt_version'
                ]
                
                all_snake_case = True
                for field in snake_case_fields:
                    if field not in meta:
                        print(f"❌ 缺少字段: {field}")
                        all_snake_case = False
                    else:
                        print(f"✅ 找到字段: {field}")
                
                if all_snake_case:
                    print("✅ 响应格式符合snake_case规范")
                    return True
                else:
                    print("❌ 响应格式不符合snake_case规范")
                    return False
            else:
                print(f"❌ API调用失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ 测试异常: {str(e)}")
            return False

async def test_error_handling():
    """测试增强的错误处理机制"""
    print("\n🧪 测试 3: 增强的错误处理机制")
    print("-" * 50)
    
    # 测试不同类型的错误
    test_cases = [
        {
            "name": "空内容错误",
            "data": {"content": "", "content_type": "text"},
            "expected_status": 400
        },
        {
            "name": "同时提供content和source_id",
            "data": {
                "content": "test",
                "source_id": "test-id",
                "content_type": "text"
            },
            "expected_status": 400
        },
        {
            "name": "无效source_id",
            "data": {
                "source_id": "nonexistent-id-12345",
                "content_type": "video_transcript"
            },
            "expected_status": 400
        }
    ]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        all_passed = True
        
        for test_case in test_cases:
            try:
                print(f"  测试: {test_case['name']}")
                response = await client.post(
                    f"{API_BASE_URL}/api/v1/analysis/three-stage",
                    json=test_case['data']
                )
                
                if response.status_code == test_case['expected_status']:
                    data = response.json()
                    print(f"    ✅ 正确返回{test_case['expected_status']}错误")
                    print(f"    ✅ 错误码: {data.get('code')}")
                    print(f"    ✅ 错误消息: {data.get('message')}")
                else:
                    print(f"    ❌ 期望{test_case['expected_status']}，实际{response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                print(f"    ❌ 测试异常: {str(e)}")
                all_passed = False
        
        return all_passed

async def main():
    """主测试函数"""
    print("🚀 开始测试改进后的API和错误处理机制")
    print("请确保服务已启动在 http://localhost:8001")
    print("=" * 70)
    
    # 执行测试
    test1_result = await test_analysis_overview()
    test2_result = await test_snake_case_response()
    test3_result = await test_error_handling()
    
    # 测试总结
    print("\n" + "=" * 70)
    print("📋 测试总结:")
    print(f"1. 分析模块概览: {'✅ 通过' if test1_result else '❌ 失败'}")
    print(f"2. snake_case响应格式: {'✅ 通过' if test2_result else '❌ 失败'}")
    print(f"3. 增强错误处理: {'✅ 通过' if test3_result else '❌ 失败'}")
    
    if all([test1_result, test2_result, test3_result]):
        print("\n🎉 所有改进验证通过！")
        print("✅ API设计规范遵循正确")
        print("✅ 错误处理机制增强有效")
        print("✅ 统一入口功能正常")
    else:
        print("\n⚠️  部分测试失败，需要进一步检查。")

if __name__ == "__main__":
    asyncio.run(main())