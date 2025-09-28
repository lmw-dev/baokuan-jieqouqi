# 爆款解构器 AI 服务

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green.svg)](https://fastapi.tiangolo.com/)
[![Status](https://img.shields.io/badge/status-active-success.svg)](https://shields.io/)

基于 FastAPI 的AI协处理器服务，专门处理视频分析、语音识别、内容解构等计算密集型任务。

## 🎯 服务概述

**核心功能**：
- 📹 视频/音频文件处理 (FFmpeg + 腾讯云COS)
- 🗣️ 语音转文字 (腾讯云ASR)
- 🧠 信任之钩分析 (规则引擎)
- 📊 内容结构化解析

**技术栈**: FastAPI + SQLAlchemy + 腾讯云服务

## 🚀 快速启动

### 1. 环境准备

```bash
# 1. 进入AI项目目录
cd 11-baokuan-jieqouqi-ai

# 2. 创建并激活Python虚拟环境
python -m venv venv

# macOS/Linux 激活:
source venv/bin/activate

# Windows 激活:
# venv\Scripts\activate

# 3. 安装依赖包
pip install -r requirements.txt
```

### 2. 配置环境变量

复制项目根目录的 `.env` 文件，确保包含：

```env
# 数据库 (与web项目共享)
DATABASE_URL=postgresql://user:password@localhost:5432/baokuan_db

# 腾讯云配置
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
COS_BUCKET_NAME=your_bucket_name

# 开发配置
DEBUG=true
LOG_LEVEL=INFO
```

### 3. 启动开发服务

**🚀 推荐方式 (最简洁)**：

```bash
# 方式1: 使用开发脚本 (推荐)
./dev.sh

# 方式2: 使用Make命令
make dev

# 方式3: 传统方式
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**🛠️ 开发工具命令**：

```bash
# 环境初始化 (首次使用)
./dev.sh setup
# 或
make setup

# 启动开发服务
./dev.sh
# 或  
make dev

# 运行测试
./dev.sh test
# 或
make test

# 代码检查和格式化
./dev.sh check
# 或
make check
```

**📍 服务地址**：
- API文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/ping
- 管理界面: http://localhost:8000/redoc

### 4. 验证服务

```bash
# 快速功能测试
python simple_test.py

# 完整测试验证
python validate_implementation.py
```

## 📂 项目结构

```
app/
├── main.py                 # 🚪 应用入口
├── api/v1/endpoints/       # 🌐 API路由
├── services/               # 🔧 核心服务
│   ├── analysis_service.py     # 分析协调器
│   ├── media_converter_service.py  # 媒体转换
│   ├── tencent_asr_service.py      # 语音识别
│   ├── hook_analysis_service.py    # 内容分析
│   └── cos_service.py              # 文件存储
├── schemas/                # 📋 数据模型
├── models/                 # 🗃️ 数据库模型
└── core/                   # ⚙️ 配置管理

tests/                      # 🧪 测试文件
requirements.txt            # 📦 依赖列表
```

## 🛠 开发工具

```bash
# 代码格式化检查
ruff check
ruff format

# 运行测试
pytest tests/ -v

# 提交代码规范
git commit -m "feat(api): 描述"
git commit -m "fix(service): 描述"
```

## 🔍 常见问题

**环境问题**:
```bash
# 检查虚拟环境是否激活
which python  # 应显示venv路径

# 重新创建虚拟环境
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**服务问题**:
```bash
# 检查服务状态
curl http://localhost:8001/api/v1/health

# 查看实时日志
uvicorn app.main:app --reload --log-level debug
```

**FFmpeg依赖**:
```bash
# macOS安装
brew install ffmpeg

# Ubuntu安装
sudo apt update && sudo apt install ffmpeg
```

## 📋 API接口

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/analyze` | POST | 提交分析任务 |
| `/api/v1/analyze/{task_id}/status` | GET | 查询任务状态 |
| `/api/v1/health` | GET | 服务健康检查 |

启动服务后访问 http://localhost:8001/docs 查看完整API文档。

---

> 💡 **提示**: 此服务需要与主Web应用 (`10-baokuan-jieqouqi-web`) 配合使用。完整系统启动请参考项目根目录的部署文档。