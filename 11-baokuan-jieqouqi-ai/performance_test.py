#!/usr/bin/env python3
"""
爆款解构器统一分析API性能测试脚本
"""

import asyncio
import aiohttp
import time
import json
import statistics
from typing import List, Dict, Any

API_BASE = "http://localhost:8000/api/v1"

# 测试数据
TEST_TEXTS = [
    "作为一个用了10年iPhone的老用户，我要告诉你一个残酷的真相。99%的人都不知道这个技巧，能帮你省下好几千块钱。",
    "作为专业的内容分析师，我测试过200+个爆款视频，发现了一个惊人的规律。掌握这个方法，你的视频播放量能提升300%。",
    "做了5年电商的我，今天要分享一个让99%新手都忽略的致命错误。这个错误让无数人亏光了启动资金，但掌握了正确方法，你就能月入过万。"
]

class PerformanceTest:
    def __init__(self):
        self.results = []
    
    async def test_text_analysis_performance(self, concurrent_requests: int = 1):
        """测试文案分析接口性能"""
        print(f"\n🧪 开始文案分析性能测试 (并发数: {concurrent_requests})")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for i in range(concurrent_requests):
                text = TEST_TEXTS[i % len(TEST_TEXTS)]
                task = self._single_text_analysis(session, text, i)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 分析结果
            successful = [r for r in results if not isinstance(r, Exception)]
            failed = [r for r in results if isinstance(r, Exception)]
            
            if successful:
                response_times = [r['response_time'] for r in successful]
                processing_times = [r['processing_time_ms'] for r in successful]
                
                print(f"✅ 成功请求: {len(successful)}/{concurrent_requests}")
                print(f"❌ 失败请求: {len(failed)}")
                print(f"📊 响应时间统计:")
                print(f"   - 平均: {statistics.mean(response_times):.2f}s")
                print(f"   - 最快: {min(response_times):.2f}s")
                print(f"   - 最慢: {max(response_times):.2f}s")
                print(f"📊 AI处理时间统计:")
                print(f"   - 平均: {statistics.mean(processing_times):.0f}ms")
                print(f"   - 最快: {min(processing_times):.0f}ms")
                print(f"   - 最慢: {max(processing_times):.0f}ms")
                
                if failed:
                    print(f"\n❌ 失败详情:")
                    for i, error in enumerate(failed):
                        print(f"   {i+1}. {str(error)}")
            else:
                print("❌ 所有请求都失败了")
                for i, error in enumerate(failed):
                    print(f"   {i+1}. {str(error)}")
    
    async def _single_text_analysis(self, session: aiohttp.ClientSession, text: str, index: int) -> Dict[str, Any]:
        """单个文案分析请求"""
        start_time = time.time()
        
        try:
            async with session.post(
                f"{API_BASE}/analysis/text",
                json={
                    "content": text,
                    "title": f"测试文案-{index+1}",
                    "user_id": f"perf-test-{index}"
                },
                timeout=aiohttp.ClientTimeout(total=60)
            ) as response:
                end_time = time.time()
                response_time = end_time - start_time
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('success'):
                        processing_time = data['data']['source_info']['processing_time_ms']
                        return {
                            'index': index,
                            'response_time': response_time,
                            'processing_time_ms': processing_time,
                            'success': True
                        }
                    else:
                        raise Exception(f"API返回失败: {data.get('message', 'Unknown error')}")
                else:
                    error_text = await response.text()
                    raise Exception(f"HTTP {response.status}: {error_text}")
                    
        except asyncio.TimeoutError:
            end_time = time.time()
            raise Exception(f"请求超时 (>{end_time - start_time:.1f}s)")
        except Exception as e:
            end_time = time.time()
            raise Exception(f"请求失败 ({end_time - start_time:.1f}s): {str(e)}")
    
    async def test_health_check(self):
        """测试健康检查接口"""
        print("\n❤️ 测试健康检查接口")
        
        async with aiohttp.ClientSession() as session:
            try:
                start_time = time.time()
                async with session.get(f"{API_BASE}/analysis/health") as response:
                    end_time = time.time()
                    
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ 健康检查成功 ({end_time - start_time:.3f}s)")
                        print(f"📊 服务状态: {json.dumps(data, indent=2, ensure_ascii=False)}")
                    else:
                        print(f"❌ 健康检查失败: HTTP {response.status}")
            except Exception as e:
                print(f"❌ 健康检查异常: {str(e)}")
    
    async def test_api_availability(self):
        """测试API可用性"""
        print("\n🔍 测试API可用性")
        
        endpoints = [
            ("GET", "/analysis/health", "健康检查"),
            ("GET", "/analysis/", "分析模块概览"),
            ("GET", "/analysis/status/test-id", "状态查询"),
        ]
        
        async with aiohttp.ClientSession() as session:
            for method, endpoint, name in endpoints:
                try:
                    start_time = time.time()
                    async with session.request(method, f"{API_BASE}{endpoint}") as response:
                        end_time = time.time()
                        
                        if response.status < 400:
                            print(f"✅ {name}: HTTP {response.status} ({end_time - start_time:.3f}s)")
                        else:
                            print(f"⚠️ {name}: HTTP {response.status} ({end_time - start_time:.3f}s)")
                except Exception as e:
                    print(f"❌ {name}: {str(e)}")

async def main():
    """主测试函数"""
    print("🚀 爆款解构器统一分析API性能测试")
    print("=" * 50)
    
    tester = PerformanceTest()
    
    # 1. 测试API可用性
    await tester.test_api_availability()
    
    # 2. 测试健康检查
    await tester.test_health_check()
    
    # 3. 单个请求性能测试
    await tester.test_text_analysis_performance(concurrent_requests=1)
    
    # 4. 并发请求性能测试
    print("\n" + "=" * 50)
    await tester.test_text_analysis_performance(concurrent_requests=3)
    
    print("\n🎉 性能测试完成!")
    print("\n💡 优化建议:")
    print("   1. 如果响应时间 > 15s，考虑优化AI调用")
    print("   2. 如果并发测试失败，检查服务资源限制")
    print("   3. 监控数据库连接池和内存使用")

if __name__ == "__main__":
    asyncio.run(main())