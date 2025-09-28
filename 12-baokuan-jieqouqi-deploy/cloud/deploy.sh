#!/bin/bash

# ==============================================================================
# 云端部署脚本 (优化版)
# ==============================================================================
# 功能：支持构建模式和部署模式，增强错误处理和状态检查
# 用法：
#   cd cloud && ./deploy.sh build   # 从代码构建镜像并推送到TCR
#   cd cloud && ./deploy.sh deploy  # 从TCR拉取镜像并部署 安全的常规部署（保留数据）
#   cd cloud && ./deploy.sh all     # 构建+部署（默认）
#   cd cloud && ./deploy.sh clean   # 清理所有服务和数据
#   cd cloud && ./deploy.sh status  # 检查服务状态
# ==============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- 配置区 ---
NAMESPACE="baokuan-jieqouqi"
REGISTRY_URL="ccr.ccs.tencentyun.com"
ENV_FILE="../../.env"
COMPOSE_FILE="docker-compose.cloud.yml"

# 服务列表
SERVICES=("db" "redis_logto" "ai" "web" "logto")
MAIN_SERVICES=("ai" "web")

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

# 错误处理函数
handle_error() {
    log_error "脚本执行失败，退出码: $1"
    log_info "您可以使用以下命令查看详细日志："
    echo "   docker-compose --env-file $ENV_FILE -f $COMPOSE_FILE logs"
    exit $1
}

# 设置错误处理
set -e
trap 'handle_error $?' ERR

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在 PATH 中"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装或不在 PATH 中"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "环境变量文件未找到: $ENV_FILE"
        log_info "请确保 .env 文件存在于项目根目录"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose 文件未找到: $COMPOSE_FILE"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 清理现有容器
cleanup_existing_containers() {
    log_info "检查并清理现有容器..."
    
    # 停止并删除可能冲突的容器
    local containers_to_remove=()
    
    # 检查每个可能的容器名
    for container in "postgres_db" "redis_for_logto" "logto_auth_service" "fast_api_service" "next_web_app"; do
        if docker ps -a --format "table {{.Names}}" | grep -q "^${container}$"; then
            containers_to_remove+=("$container")
        fi
    done
    
    # 检查旧的 docker-compose 容器
    local old_containers=$(docker ps -a --filter "name=12-baokuan-jieqouqi-deploy" --format "{{.Names}}" 2>/dev/null || true)
    if [ ! -z "$old_containers" ]; then
        containers_to_remove+=($old_containers)
    fi
    
    if [ ${#containers_to_remove[@]} -gt 0 ]; then
        log_warning "发现现有容器，正在清理: ${containers_to_remove[*]}"
        
        # 停止容器
        docker stop ${containers_to_remove[@]} 2>/dev/null || true
        
        # 删除容器
        docker rm ${containers_to_remove[@]} 2>/dev/null || true
        
        log_success "现有容器清理完成"
    else
        log_info "未发现需要清理的现有容器"
    fi
    
    # 尝试停止当前的 docker-compose 服务
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down 2>/dev/null || true
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    # 检查容器状态
    while [ $attempt -le $max_attempts ]; do
        log_info "健康检查第 $attempt/$max_attempts 次..."
        
        local all_healthy=true
        
        # 检查主要服务容器是否运行
        for service in "${MAIN_SERVICES[@]}"; do
            local status=$(docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q "$service" | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null || echo "not_found")
            
            if [ "$status" != "running" ]; then
                log_warning "服务 $service 状态: $status"
                all_healthy=false
                break
            fi
        done
        
        if [ "$all_healthy" = true ]; then
            # 检查端口是否可访问
            if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404\|302"; then
                log_success "Web 服务健康检查通过"
            elif curl -s -o /dev/null http://localhost:8000/docs; then
                log_success "AI 服务健康检查通过"
            else
                log_warning "服务端口检查失败，继续等待..."
                all_healthy=false
            fi
        fi
        
        if [ "$all_healthy" = true ]; then
            log_success "所有服务健康检查通过"
            return 0
        fi
        
        sleep 5
        ((attempt++))
    done
    
    log_error "健康检查失败，服务可能启动异常"
    log_info "请使用以下命令查看日志："
    echo "   docker-compose --env-file $ENV_FILE -f $COMPOSE_FILE logs"
    return 1
}

# 显示服务状态
show_status() {
    echo ""
    echo "📊 服务状态："
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    echo ""
    
    # 显示资源使用情况
    echo "💾 资源使用情况："
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q) 2>/dev/null || true
}

# 主函数
main() {
    local action=${1:-"all"}
    
    echo "🚀 启动云端部署脚本..."
    echo "================================================================"
    echo "操作: $action"
    echo "注册表: ${REGISTRY_URL}/${NAMESPACE}"
    echo "环境文件: $ENV_FILE"
    echo "================================================================"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    case "$action" in
        "build")
            log_info "🏗️ 开始构建镜像..."
            
            # 从代码构建镜像
            docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build ${MAIN_SERVICES[@]}
            
            # 推送到TCR
            log_info "📤 推送镜像到 TCR..."
            for service in "${MAIN_SERVICES[@]}"; do
                docker push ${REGISTRY_URL}/${NAMESPACE}/${service}:latest
            done
            
            log_success "镜像构建和推送完成"
            ;;
            
        "deploy")
            log_info "🚀 开始部署到云端..."
            
            # 清理现有容器
            cleanup_existing_containers
            
            # 从TCR拉取最新镜像
            log_info "📥 拉取最新镜像..."
            docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull ${MAIN_SERVICES[@]} || log_warning "部分镜像拉取失败，将使用本地镜像"
            
            # 启动所有服务
            log_info "🎬 启动所有服务..."
            docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
            
            # 健康检查
            if health_check; then
                log_success "部署完成并通过健康检查"
            else
                log_warning "部署完成但健康检查失败，请检查服务状态"
            fi
            
            # 显示状态
            show_status
            ;;
            
        "all")
            log_info "🔄 执行完整的构建和部署流程..."
            main "build"
            echo ""
            main "deploy"
            ;;
            
        "clean")
            log_warning "🧹 清理所有服务和数据..."
            read -p "这将删除所有容器和数据，确定继续吗？(yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                cleanup_existing_containers
                docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down -v --rmi all 2>/dev/null || true
                log_success "清理完成"
            else
                log_info "清理操作已取消"
            fi
            ;;
            
        "status")
            log_info "📊 检查服务状态..."
            show_status
            ;;
            
        *)
            log_error "未知操作: $action"
            echo "可用操作: build, deploy, all, clean, status"
            exit 1
            ;;
    esac
    
    echo ""
    echo "================================================================"
    echo "🎉 云端部署操作完成！"
    echo ""
    echo "📍 服务地址："
    echo "   • Web 前端:     http://43.142.178.200:3000"
    echo "   • AI 后端:      http://43.142.178.200:8000"
    echo "   • Logto 控制台: http://43.142.178.200:3001"
    echo ""
    echo "📋 常用命令："
    echo "   • 检查状态:    ./deploy.sh status"
    echo "   • 查看日志:    docker-compose --env-file $ENV_FILE -f $COMPOSE_FILE logs -f"
    echo "   • 停止服务:    docker-compose --env-file $ENV_FILE -f $COMPOSE_FILE down"
    echo "   • 完全清理:    ./deploy.sh clean"
    echo "================================================================"
}

# 执行主函数
main "$@"