#!/bin/bash

# ==============================================================================
# AI服务开发启动脚本
# ==============================================================================
# 功能：简化AI服务的本地开发启动流程
# 用法：
#   ./dev.sh                # 启动开发服务器
#   ./dev.sh setup          # 初始化环境
#   ./dev.sh test           # 运行测试
#   ./dev.sh check          # 代码检查
# ==============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 检查虚拟环境
check_venv() {
    if [[ "$VIRTUAL_ENV" != "" ]]; then
        log_success "虚拟环境已激活: $VIRTUAL_ENV"
        return 0
    else
        log_warning "虚拟环境未激活"
        if [ -d "venv" ]; then
            log_info "发现本地虚拟环境，请先激活："
            echo "  source venv/bin/activate"
        else
            log_info "请先创建虚拟环境："
            echo "  ./dev.sh setup"
        fi
        return 1
    fi
}

# 环境初始化
setup_env() {
    log_info "🔧 初始化AI服务开发环境..."
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        log_info "创建Python虚拟环境..."
        python -m venv venv
    else
        log_info "虚拟环境已存在"
    fi
    
    # 安装依赖
    log_info "安装依赖包..."
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
    
    log_success "环境初始化完成！"
    echo ""
    log_info "💡 使用方法："
    echo "  1. 激活虚拟环境: source venv/bin/activate"
    echo "  2. 启动开发服务: ./dev.sh"
    echo "  3. 或使用Make命令: make dev"
}

# 启动开发服务器
start_dev_server() {
    log_info "🚀 启动AI服务开发服务器..."
    
    # 检查虚拟环境
    if ! check_venv; then
        exit 1
    fi
    
    # 检查端口占用
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口8000已被占用"
        log_info "正在查找占用进程..."
        lsof -Pi :8000 -sTCP:LISTEN
        read -p "是否终止占用进程并继续？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            lsof -ti :8000 | xargs kill -9
            log_success "已终止占用进程"
        else
            log_info "启动已取消"
            exit 0
        fi
    fi
    
    # 显示服务信息
    echo ""
    echo "🎯 AI服务即将启动："
    echo "  📍 服务地址: http://localhost:8000"
    echo "  📖 API文档: http://localhost:8000/docs"
    echo "  🔍 健康检查: http://localhost:8000/ping"
    echo "  📊 管理界面: http://localhost:8000/redoc"
    echo ""
    echo "⏹️  按 Ctrl+C 停止服务"
    echo "==============================================="
    echo ""
    
    # 启动服务
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

# 运行测试
run_tests() {
    log_info "🧪 运行测试套件..."
    
    if ! check_venv; then
        exit 1
    fi
    
    if [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
        pytest tests/ -v
    else
        python -m pytest tests/ -v
    fi
    
    log_success "测试完成"
}

# 代码质量检查
code_check() {
    log_info "🔍 执行代码质量检查..."
    
    if ! check_venv; then
        exit 1
    fi
    
    # 格式化代码
    log_info "格式化代码..."
    ruff format .
    
    # 检查代码风格
    log_info "检查代码风格..."
    ruff check . --fix
    
    log_success "代码检查完成"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}🤖 AI服务开发工具${NC}"
    echo ""
    echo "用法: ./dev.sh [命令]"
    echo ""
    echo "可用命令:"
    echo "  (无参数)    启动开发服务器"
    echo "  setup       初始化开发环境"
    echo "  test        运行测试套件"
    echo "  check       代码质量检查"
    echo "  clean       清理缓存文件"
    echo "  health      检查服务健康状态"
    echo "  help        显示此帮助信息"
    echo ""
    echo "🚀 快速开始:"
    echo "  ./dev.sh setup    # 首次使用"
    echo "  source venv/bin/activate"
    echo "  ./dev.sh          # 启动服务"
    echo ""
    echo "💡 也可以使用Make命令:"
    echo "  make setup && source venv/bin/activate && make dev"
}

# 清理缓存
clean_cache() {
    log_info "🧹 清理缓存和临时文件..."
    
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
    find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
    
    log_success "清理完成"
}

# 健康检查
health_check() {
    log_info "🔍 检查服务健康状态..."
    
    if curl -s http://localhost:8000/ping >/dev/null 2>&1; then
        log_success "服务运行正常"
        echo ""
        curl -s http://localhost:8000/ping | python -m json.tool 2>/dev/null || curl -s http://localhost:8000/ping
    else
        log_error "服务未运行或无法访问"
        log_info "请先启动服务: ./dev.sh"
    fi
}

# 主函数
main() {
    case "${1:-start}" in
        "start"|"")
            start_dev_server
            ;;
        "setup")
            setup_env
            ;;
        "test")
            run_tests
            ;;
        "check")
            code_check
            ;;
        "clean")
            clean_cache
            ;;
        "health")
            health_check
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"