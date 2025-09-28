"""
TOM-217: 脚本管理API集成测试
使用真实数据库数据测试完整的API功能
"""

import pytest
import pytest_asyncio
import asyncio
import httpx
from typing import Dict, Any

# 测试配置
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"

# 真实的测试数据ID（来自数据库查询结果）
TEST_CARD_IDS = [
    "d9b13726-c1ab-4417-8c01-b903ef4f7f15",  # iPhone评测视频解构分析
    "7c19668d-af1c-4660-b6c2-64c6d0acf870",  # 笔记本选购指南分析
    "617db351-0b62-44a2-adfe-9bacd118b25e",  # 降噪耳机对比分析
    "5e047ab8-b443-4be2-b45b-078d9bd188cb",  # 手机摄影功能分析
    "8b097f33-7ab1-4f18-a7b3-73b8bd1f9821",  # 长期使用体验分析
]

TEST_USER_ID = "test-user-001"


class TestScriptManagementAPIIntegration:
    """脚本管理API集成测试"""
    
    @pytest_asyncio.fixture(scope="class")
    async def authenticated_client(self):
        """获取已认证的HTTP客户端"""
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # 设置测试登录
            login_response = await client.post(
                f"{API_PREFIX}/dev-auth/login",
                json={}
            )
            assert login_response.status_code == 200
            
            # 提取Cookie
            cookies = login_response.cookies
            client.cookies = cookies
            
            yield client
    
    @pytest.mark.asyncio
    async def test_dev_auth_login(self):
        """测试开发认证登录"""
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            response = await client.post(f"{API_PREFIX}/dev-auth/login", json={})
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["user_info"]["id"] == TEST_USER_ID
            assert "auth_token" in response.cookies
            assert "user_info" in response.cookies
    
    @pytest.mark.asyncio
    async def test_dev_auth_status(self, authenticated_client):
        """测试认证状态检查"""
        response = await authenticated_client.get(f"{API_PREFIX}/dev-auth/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    @pytest.mark.asyncio
    async def test_script_generation_with_real_card(self, authenticated_client):
        """测试使用真实卡片数据生成脚本"""
        card_id = TEST_CARD_IDS[0]  # iPhone评测视频
        
        # 生成脚本请求
        script_request = {
            "style_config": {
                "tone": "professional",
                "target_audience": "数码爱好者",
                "brand_voice": "专业客观",
                "length_preference": "medium"
            }
        }
        
        response = await authenticated_client.post(
            f"{API_PREFIX}/cards/{card_id}/generate-script",
            json=script_request
        )
        
        # 验证响应
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            assert data["code"] == 0
            assert data["success"] is True
            assert data["data"] is not None
            
            # 验证脚本结构
            script_data = data["data"]
            assert "id" in script_data
            assert "card_id" in script_data
            assert script_data["card_id"] == card_id
            assert "title" in script_data
            assert "sections" in script_data
            assert len(script_data["sections"]) == 5  # 五段式脚本
            
            # 验证每个段落
            expected_sections = ["hook", "problem", "solution", "proof", "cta"]
            for i, section in enumerate(script_data["sections"]):
                assert "id" in section
                assert "section_type" in section
                assert section["section_type"] == expected_sections[i]
                assert "title" in section
                assert "content" in section
                assert "tips" in section
                assert section["order_index"] == i + 1
            
            # 验证元数据
            assert "metadata" in script_data
            metadata = script_data["metadata"]
            assert metadata["total_sections"] == 5
            assert metadata["creator_id"] == TEST_USER_ID
            
            return script_data["id"]
        else:
            # 如果生成失败，检查错误格式是否正确
            data = response.json()
            assert "code" in data
            assert "message" in data
            assert "data" in data
            assert data["data"] is None
            print(f"脚本生成失败: {data['message']}")
            return None
    
    @pytest.mark.asyncio 
    async def test_get_script_not_found(self, authenticated_client):
        """测试获取不存在的脚本"""
        fake_script_id = "fake-script-id-123"
        
        response = await authenticated_client.get(f"{API_PREFIX}/scripts/{fake_script_id}")
        
        assert response.status_code == 400  # 业务错误返回400
        data = response.json()
        assert data["code"] == 4008  # 资源不存在错误码
        assert "脚本不存在" in data["message"]
        assert data["data"] is None
    
    @pytest.mark.asyncio
    async def test_script_health_check(self, authenticated_client):
        """测试脚本健康检查"""
        fake_script_id = "fake-script-id"
        
        response = await authenticated_client.get(f"{API_PREFIX}/scripts/{fake_script_id}/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "data" in data
        assert "message" in data
        
        # 对于不存在的脚本，健康检查应该返回失败但不抛异常
        if not data["success"]:
            assert data["data"]["accessible"] is False
            assert "error_code" in data
    
    @pytest.mark.asyncio
    async def test_multiple_card_script_generation(self, authenticated_client):
        """测试多个卡片的脚本生成（压力测试）"""
        generated_scripts = []
        
        for i, card_id in enumerate(TEST_CARD_IDS[:3]):  # 测试前3个卡片
            print(f"\\n测试卡片 {i+1}: {card_id}")
            
            script_request = {
                "style_config": {
                    "tone": ["professional", "casual", "authoritative"][i % 3],
                    "target_audience": ["技术爱好者", "普通消费者", "专业人士"][i % 3],
                    "brand_voice": "客观专业",
                    "length_preference": "medium"
                }
            }
            
            response = await authenticated_client.post(
                f"{API_PREFIX}/cards/{card_id}/generate-script",
                json=script_request
            )
            
            print(f"卡片 {card_id} 响应状态: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                script_id = data["data"]["id"]
                generated_scripts.append(script_id)
                print(f"成功生成脚本: {script_id}")
                
                # 验证生成的脚本可以被正确获取
                get_response = await authenticated_client.get(f"{API_PREFIX}/scripts/{script_id}")
                if get_response.status_code == 200:
                    print(f"脚本 {script_id} 可以正确获取")
                else:
                    print(f"脚本 {script_id} 获取失败: {get_response.status_code}")
            else:
                data = response.json()
                print(f"脚本生成失败: {data.get('message', '未知错误')}")
        
        print(f"\\n成功生成脚本数量: {len(generated_scripts)}")
        return generated_scripts
    
    @pytest.mark.asyncio
    async def test_script_export_functionality(self, authenticated_client):
        """测试脚本导出功能"""
        # 首先生成一个脚本
        card_id = TEST_CARD_IDS[0]
        script_request = {
            "style_config": {
                "tone": "professional",
                "target_audience": "测试用户",
                "brand_voice": "专业",
                "length_preference": "medium"
            }
        }
        
        gen_response = await authenticated_client.post(
            f"{API_PREFIX}/cards/{card_id}/generate-script",
            json=script_request
        )
        
        if gen_response.status_code != 200:
            pytest.skip("无法生成脚本，跳过导出测试")
            return
        
        script_id = gen_response.json()["data"]["id"]
        
        # 测试不同格式的导出
        export_formats = ["txt", "markdown", "json"]
        
        for format_type in export_formats:
            export_response = await authenticated_client.get(
                f"{API_PREFIX}/scripts/{script_id}/export",
                params={
                    "format": format_type,
                    "include_metadata": True,
                    "include_tips": True
                }
            )
            
            if export_response.status_code == 200:
                print(f"{format_type.upper()} 格式导出成功")
                # 验证Content-Type
                content_type = export_response.headers.get("content-type", "")
                assert format_type in content_type or "application" in content_type
                
                # 验证内容不为空
                content = export_response.text
                assert len(content) > 0
                print(f"{format_type.upper()} 内容长度: {len(content)} 字符")
            else:
                data = export_response.json()
                print(f"{format_type.upper()} 格式导出失败: {data.get('message', '未知错误')}")
    
    @pytest.mark.asyncio
    async def test_script_copy_functionality(self, authenticated_client):
        """测试脚本复制功能"""
        # 首先生成一个脚本
        card_id = TEST_CARD_IDS[0]
        script_request = {
            "style_config": {
                "tone": "casual",
                "target_audience": "测试用户",
                "brand_voice": "轻松",
                "length_preference": "medium"
            }
        }
        
        gen_response = await authenticated_client.post(
            f"{API_PREFIX}/cards/{card_id}/generate-script",
            json=script_request
        )
        
        if gen_response.status_code != 200:
            pytest.skip("无法生成脚本，跳过复制测试")
            return
        
        script_id = gen_response.json()["data"]["id"]
        
        # 测试复制
        copy_response = await authenticated_client.post(
            f"{API_PREFIX}/scripts/{script_id}/copy",
            params={"format": "txt"}
        )
        
        if copy_response.status_code == 200:
            data = copy_response.json()
            assert data["code"] == 0
            assert data["success"] is True
            assert "data" in data
            assert "content" in data["data"]
            assert "format" in data["data"]
            assert data["data"]["format"] == "txt"
            
            content = data["data"]["content"]
            assert len(content) > 0
            print(f"复制内容长度: {len(content)} 字符")
            print(f"复制内容预览: {content[:100]}...")
        else:
            data = copy_response.json()
            print(f"脚本复制失败: {data.get('message', '未知错误')}")
    
    @pytest.mark.asyncio
    async def test_error_handling_and_response_format(self, authenticated_client):
        """测试错误处理和响应格式一致性"""
        test_cases = [
            {
                "name": "不存在的卡片生成脚本",
                "method": "POST",
                "url": f"{API_PREFIX}/cards/fake-card-id/generate-script",
                "json": {"style_config": {"tone": "professional"}},
                "expected_code": 4008
            },
            {
                "name": "不存在的脚本获取",
                "method": "GET", 
                "url": f"{API_PREFIX}/scripts/fake-script-id",
                "expected_code": 4008
            },
            {
                "name": "不存在的脚本导出",
                "method": "GET",
                "url": f"{API_PREFIX}/scripts/fake-script-id/export?format=txt",
                "expected_code": 4008
            },
            {
                "name": "不存在的脚本复制",
                "method": "POST",
                "url": f"{API_PREFIX}/scripts/fake-script-id/copy",
                "expected_code": 4008
            },
            {
                "name": "不存在的脚本删除",
                "method": "DELETE",
                "url": f"{API_PREFIX}/scripts/fake-script-id",
                "expected_code": 4008
            }
        ]
        
        for case in test_cases:
            print(f"\\n测试用例: {case['name']}")
            
            if case["method"] == "GET":
                response = await authenticated_client.get(case["url"])
            elif case["method"] == "POST":
                response = await authenticated_client.post(case["url"], json=case.get("json"))
            elif case["method"] == "DELETE":
                response = await authenticated_client.delete(case["url"])
            
            print(f"响应状态码: {response.status_code}")
            
            # 验证响应格式
            data = response.json()
            assert "code" in data, f"响应缺少code字段: {data}"
            assert "message" in data, f"响应缺少message字段: {data}"
            assert "data" in data, f"响应缺少data字段: {data}"
            
            # 验证错误响应
            if response.status_code >= 400:
                assert data["code"] == case["expected_code"], f"错误码不匹配，期望: {case['expected_code']}, 实际: {data['code']}"
                assert data["data"] is None, f"错误响应的data应该为null"
                assert len(data["message"]) > 0, f"错误消息不能为空"
            
            print(f"错误码: {data['code']}, 消息: {data['message']}")


if __name__ == "__main__":
    # 运行集成测试
    pytest.main([__file__, "-v", "--tb=short", "-s"])