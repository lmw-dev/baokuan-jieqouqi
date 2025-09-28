# 爆款解构器 AI 服务 Makefile
# 提供便捷的开发命令

.PHONY: help dev prod test clean install setup check format lint

# 默认目标
help:
	@echo "🤖 爆款解构器 AI 服务开发工具"
	@echo ""
	@echo "📋 可用命令:"
	@echo "  make setup     - 初始化开发环境 (创建venv + 安装依赖)"
	@echo "  make dev       - 启动开发服务器 (热重载)"
	@echo "  make prod      - 启动生产服务器"
	@echo "  make test      - 运行测试套件"
	@echo "  make check     - 代码质量检查 (格式化 + lint)"
	@echo "  make format    - 代码格式化"
	@echo "  make lint      - 代码风格检查"
	@echo "  make clean     - 清理缓存和临时文件"
	@echo "  make install   - 仅安装依赖"
	@echo ""
	@echo "🚀 快速开始: make setup && make dev"

# 开发环境初始化
setup:
	@echo "🔧 初始化开发环境..."
	@python -m venv venv
	@echo "📦 安装依赖包..."
	@./venv/bin/pip install --upgrade pip
	@./venv/bin/pip install -r requirements.txt
	@echo "✅ 环境初始化完成"
	@echo ""
	@echo "💡 请激活虚拟环境: source venv/bin/activate"
	@echo "🚀 然后运行: make dev"

# 仅安装依赖
install:
	@echo "📦 安装依赖包..."
	@pip install --upgrade pip
	@pip install -r requirements.txt
	@echo "✅ 依赖安装完成"

# 启动开发服务器
dev:
	@echo "🚀 启动开发服务器..."
	@echo "📍 服务地址: http://localhost:8000"
	@echo "📖 API文档: http://localhost:8000/docs"
	@echo "🔍 健康检查: http://localhost:8000/ping"
	@echo ""
	@uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 启动生产服务器
prod:
	@echo "🏭 启动生产服务器..."
	@uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# 运行测试
test:
	@echo "🧪 运行测试套件..."
	@pytest tests/ -v --tb=short

# 代码质量检查
check: format lint
	@echo "✅ 代码质量检查完成"

# 代码格式化
format:
	@echo "🎨 格式化代码..."
	@ruff format .
	@echo "✅ 代码格式化完成"

# 代码风格检查
lint:
	@echo "🔍 检查代码风格..."
	@ruff check . --fix
	@echo "✅ 代码风格检查完成"

# 清理缓存文件
clean:
	@echo "🧹 清理缓存和临时文件..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ 清理完成"

# 健康检查
health:
	@echo "🔍 检查服务健康状态..."
	@curl -s http://localhost:8000/ping | jq . || curl -s http://localhost:8000/ping

# 显示服务状态
status:
	@echo "📊 服务状态:"
	@ps aux | grep "uvicorn app.main:app" | grep -v grep || echo "服务未运行"

# 查看实时日志 (需要在另一个终端运行)
logs:
	@echo "📝 实时日志 (Ctrl+C 退出):"
	@tail -f logs/app.log 2>/dev/null || echo "日志文件不存在"

# 开发环境完整重置
reset:
	@echo "⚠️  重置开发环境..."
	@make clean
	@rm -rf venv
	@make setup
	@echo "✅ 环境重置完成"