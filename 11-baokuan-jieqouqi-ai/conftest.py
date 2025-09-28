"""pytest配置文件"""
import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 设置环境变量
os.environ.setdefault("HOOK_RULES_FILE", "app/services/rules/hook_rules.json")
os.environ.setdefault("TENCENT_SECRET_ID", "test_secret_id")
os.environ.setdefault("TENCENT_SECRET_KEY", "test_secret_key")
os.environ.setdefault("COS_BUCKET_NAME", "test_bucket")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")