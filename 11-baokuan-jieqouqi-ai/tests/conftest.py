"""
测试配置文件
"""

import pytest
import asyncio
from pathlib import Path
import sys

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 设置异步测试配置
@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

# 设置测试环境变量
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """设置测试环境"""
    import os
    
    # 设置测试环境变量
    os.environ["ENVIRONMENT"] = "test"
    os.environ["AI_PROVIDER"] = "deepseek"
    os.environ["AI_MODEL"] = "deepseek-v3"
    os.environ["AI_API_KEY"] = "test_api_key"
    os.environ["AI_BASE_URL"] = "https://api.test.com"
    os.environ["PROMPT_TEMPLATES_DIR"] = "test_templates"
    
    yield
    
    # 清理环境变量
    test_vars = [
        "ENVIRONMENT", "AI_PROVIDER", "AI_MODEL", 
        "AI_API_KEY", "AI_BASE_URL", "PROMPT_TEMPLATES_DIR"
    ]
    for var in test_vars:
        if var in os.environ:
            del os.environ[var]

# 禁用真实的网络请求
@pytest.fixture(autouse=True)
def mock_network_requests():
    """模拟网络请求"""
    import httpx
    from unittest.mock import patch
    
    with patch.object(httpx.AsyncClient, 'post') as mock_post:
        # 默认返回成功的模拟响应
        mock_response = type('MockResponse', (), {
            'status_code': 200,
            'json': lambda: {"choices": [{"message": {"content": "test response"}}]}
        })()
        mock_post.return_value = mock_response
        yield mock_post