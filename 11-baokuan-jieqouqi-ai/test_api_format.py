#!/usr/bin/env python3
"""
API验收测试脚本
用于验证三段式分析API是否符合规范要求
"""

import asyncio
import json
import httpx
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:8001"

async def test_api_format():
    """测试API响应格式是否符合规范"""
    
    test_data = {
        "content": "大家好，今天我要为大家评测582款蓝牙耳机中的性价比之王。作为一个评测10年的博主，我自费购买了所有产品，绝无广告植入。让我用8个维度的专业数据告诉你，如何在618期间不花冤枉钱买到最适合的耳机。",
        "content_type": "text"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("🧪 测试 1: 健康检查接口")
        try:
            response = await client.get(f"{BASE_URL}/api/v1/analysis/health")
            print(f"状态码: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"响应格式: {json.dumps(data, ensure_ascii=False, indent=2)}")
                
                # 验证响应格式
                if "code" in data and "message" in data and "data" in data:
                    print("✅ 健康检查接口格式符合规范")
                else:
                    print("❌ 健康检查接口格式不符合规范")
            else:
                print(f"❌ 健康检查失败: {response.text}")
        except Exception as e:
            print(f"❌ 健康检查请求异常: {e}")
        
        print("\n🧪 测试 2: 三段式分析接口")
        try:
            response = await client.post(
                f"{BASE_URL}/api/v1/analysis/three-stage",
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"响应格式验证:")
                
                # 验证顶级响应格式
                if "code" in data and "message" in data and "data" in data:
                    print("✅ 顶级响应格式符合规范")
                    print(f"  - code: {data.get('code')}")
                    print(f"  - message: {data.get('message')}")
                    
                    # 验证数据部分
                    analysis_data = data.get("data")
                    if analysis_data:
                        required_fields = ["trust_hook", "empathy_anchor", "value_map", "meta"]
                        missing_fields = [field for field in required_fields if field not in analysis_data]
                        
                        if not missing_fields:
                            print("✅ 三段式分析数据结构完整")
                            
                            # 验证各部分数据
                            trust_hook = analysis_data.get("trust_hook")
                            if trust_hook and "hook_copy" in trust_hook:
                                print(f"✅ 信任之钩: {trust_hook.get('hook_copy')[:50]}...")
                            
                            empathy_anchor = analysis_data.get("empathy_anchor")
                            if empathy_anchor and "pain_point" in empathy_anchor:
                                print(f"✅ 共情之锚: {empathy_anchor.get('pain_point')[:50]}...")
                            
                            value_map = analysis_data.get("value_map")
                            if value_map and "core_value" in value_map:
                                print(f"✅ 价值图谱: {value_map.get('core_value')[:50]}...")
                                
                            meta = analysis_data.get("meta")
                            if meta and "analysis_id" in meta:
                                print(f"✅ 元数据: 分析ID {meta.get('analysis_id')}")
                                
                        else:
                            print(f"❌ 缺少必要字段: {missing_fields}")
                    else:
                        print("❌ 缺少data字段")
                        
                else:
                    print("❌ 顶级响应格式不符合规范")
                    print(f"实际响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
                    
            else:
                print(f"❌ 分析请求失败: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"错误响应: {json.dumps(error_data, ensure_ascii=False, indent=2)}")
                    
                    # 验证错误格式是否符合规范
                    if "code" in error_data and "message" in error_data and "data" in error_data:
                        print("✅ 错误响应格式符合规范")
                    else:
                        print("❌ 错误响应格式不符合规范")
                except:
                    print(f"错误响应内容: {response.text}")
                    
        except Exception as e:
            print(f"❌ 分析请求异常: {e}")
        
        print("\n🧪 测试 3: 参数验证")
        try:
            # 测试空内容
            invalid_data = {"content": "", "content_type": "text"}
            response = await client.post(
                f"{BASE_URL}/api/v1/analysis/three-stage",
                json=invalid_data,
                headers={"Content-Type": "application/json"}
            )
            print(f"空内容测试状态码: {response.status_code}")
            
            if response.status_code == 400:
                data = response.json()
                if "code" in data and "message" in data:
                    print(f"✅ 参数验证错误格式正确: {data.get('message')}")
                else:
                    print("❌ 参数验证错误格式不正确")
            else:
                print(f"❌ 应该返回400错误，实际返回: {response.status_code}")
                
        except Exception as e:
            print(f"❌ 参数验证测试异常: {e}")

if __name__ == "__main__":
    print("🚀 开始API验收测试...")
    print("请确保服务已启动在 http://localhost:8001")
    print("-" * 50)
    
    try:
        asyncio.run(test_api_format())
        print("\n" + "=" * 50)
        print("📋 验收总结:")
        print("1. 检查上述测试结果中的 ✅ 和 ❌ 标记")
        print("2. 如果所有测试都显示 ✅，则API符合规范要求")
        print("3. 如果有 ❌ 标记，需要进一步修复")
    except KeyboardInterrupt:
        print("\n测试被用户中断")
    except Exception as e:
        print(f"\n测试执行异常: {e}")