#!/bin/bash

# ==============================================================================
# AI服务快速命令别名
# ==============================================================================
# 功能：为AI服务开发提供便捷的命令别名
# 用法：source ./aliases.sh
# ==============================================================================

# 获取脚本目录
AI_SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 基础命令别名
alias ai-dev="cd '$AI_SERVICE_DIR' && ./dev.sh"
alias ai-setup="cd '$AI_SERVICE_DIR' && ./dev.sh setup"
alias ai-test="cd '$AI_SERVICE_DIR' && ./dev.sh test"
alias ai-check="cd '$AI_SERVICE_DIR' && ./dev.sh check"
alias ai-health="cd '$AI_SERVICE_DIR' && ./dev.sh health"
alias ai-clean="cd '$AI_SERVICE_DIR' && ./dev.sh clean"

# Make命令别名
alias ai-make-dev="cd '$AI_SERVICE_DIR' && make dev"
alias ai-make-test="cd '$AI_SERVICE_DIR' && make test"
alias ai-make-check="cd '$AI_SERVICE_DIR' && make check"

# 目录导航
alias ai-cd="cd '$AI_SERVICE_DIR'"

# 日志查看
alias ai-logs="cd '$AI_SERVICE_DIR' && tail -f logs/app.log 2>/dev/null || echo '日志文件不存在'"

# 快速重启
alias ai-restart="pkill -f 'uvicorn app.main:app' && sleep 2 && cd '$AI_SERVICE_DIR' && ./dev.sh"

# 环境管理
alias ai-venv="cd '$AI_SERVICE_DIR' && source venv/bin/activate"
alias ai-pip="cd '$AI_SERVICE_DIR' && source venv/bin/activate && pip"

# 显示帮助
alias ai-help='echo "
🤖 AI服务快速命令:

📋 开发命令:
  ai-dev        启动开发服务器
  ai-setup      初始化开发环境
  ai-test       运行测试
  ai-check      代码检查
  ai-health     健康检查
  ai-clean      清理缓存

🛠️ Make命令:
  ai-make-dev   make dev
  ai-make-test  make test
  ai-make-check make check

🔧 环境管理:
  ai-cd         切换到AI服务目录
  ai-venv       激活虚拟环境
  ai-restart    重启服务
  ai-logs       查看日志

💡 快速开始:
  ai-setup && ai-venv && ai-dev
"'

# 显示加载信息
echo "✅ AI服务命令别名已加载"
echo "💡 输入 'ai-help' 查看可用命令"

# 设置环境变量
export AI_SERVICE_DIR="$AI_SERVICE_DIR"