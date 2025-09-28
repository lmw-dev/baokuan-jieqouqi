#!/bin/bash

# ==============================================================================
# 数据库备份脚本
# ==============================================================================
# 功能：创建PostgreSQL数据库的完整备份
# 用法：
#   ./scripts/db-backup.sh [local|prod] [backup_name]
# 示例：
#   ./scripts/db-backup.sh prod "pre_migration_20250725"
#   ./scripts/db-backup.sh local
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

# 配置
ENV=${1:-"local"}
BACKUP_NAME=${2:-$(date +%Y%m%d_%H%M%S)}
BACKUP_DIR="./backups"
DB_NAME="deconstructor_db"
DB_USER="postgres"

# 根据环境设置配置
if [ "$ENV" = "prod" ]; then
    BACKUP_DIR="/opt/baokuan-jiegouqi/app/backups"
    DOCKER_COMPOSE_PATH="/opt/baokuan-jiegouqi/app/12-baokuan-jieqouqi-deploy/cloud"
    ENV_FILE="../../.env"
    SSH_HOST="root@43.142.178.200"
    SSH_KEY="/Users/liumingwei/01-project/03-personal/06-vps/06-qcloud-vps/sh_qcloud.pem"
elif [ "$ENV" = "local" ]; then
    BACKUP_DIR="./backups"
    DOCKER_COMPOSE_PATH="./12-baokuan-jieqouqi-deploy/local"
    ENV_FILE="../.env"
    SSH_HOST=""
    SSH_KEY=""
else
    log_error "未知环境: $ENV (支持: local, prod)"
    exit 1
fi

# 备份文件名
BACKUP_FILE="${BACKUP_NAME}_${ENV}_backup.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# 创建备份函数
create_backup() {
    local target_path="$1"
    
    log_info "开始创建数据库备份..."
    log_info "环境: $ENV"
    log_info "数据库: $DB_NAME"
    log_info "备份文件: $BACKUP_FILE"
    
    # 创建备份目录
    if [ "$ENV" = "prod" ]; then
        ssh -i "$SSH_KEY" "$SSH_HOST" "mkdir -p $BACKUP_DIR"
    else
        mkdir -p "$BACKUP_DIR"
    fi
    
    # 执行备份
    if [ "$ENV" = "prod" ]; then
        log_info "连接生产服务器执行备份..."
        ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db pg_dump -U $DB_USER -d $DB_NAME" > "$BACKUP_PATH"
    else
        log_info "在本地环境执行备份..."
        cd "$DOCKER_COMPOSE_PATH"
        docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_PATH"
    fi
    
    # 验证备份文件
    if [ -f "$BACKUP_PATH" ] && [ -s "$BACKUP_PATH" ]; then
        local file_size=$(du -h "$BACKUP_PATH" | cut -f1)
        log_success "备份创建成功！"
        log_info "备份文件: $BACKUP_PATH"
        log_info "文件大小: $file_size"
        
        # 显示备份内容摘要
        local table_count=$(grep -c "CREATE TABLE" "$BACKUP_PATH" 2>/dev/null || echo "0")
        local insert_count=$(grep -c "INSERT INTO" "$BACKUP_PATH" 2>/dev/null || echo "0")
        log_info "包含表数量: $table_count"
        log_info "包含数据行数: $insert_count"
    else
        log_error "备份文件创建失败或文件为空"
        exit 1
    fi
}

# 显示备份列表
list_backups() {
    log_info "现有备份文件："
    if [ "$ENV" = "prod" ]; then
        ssh -i "$SSH_KEY" "$SSH_HOST" "ls -la $BACKUP_DIR/*.sql 2>/dev/null" || log_warning "未找到备份文件"
    else
        ls -la "$BACKUP_DIR"/*.sql 2>/dev/null || log_warning "未找到备份文件"
    fi
}

# 清理旧备份
cleanup_old_backups() {
    local keep_days=${1:-7}
    log_info "清理 $keep_days 天前的备份文件..."
    
    if [ "$ENV" = "prod" ]; then
        ssh -i "$SSH_KEY" "$SSH_HOST" "find $BACKUP_DIR -name '*.sql' -mtime +$keep_days -delete"
    else
        find "$BACKUP_DIR" -name "*.sql" -mtime +$keep_days -delete
    fi
    
    log_success "旧备份清理完成"
}

# 主函数
main() {
    echo "🗄️ 数据库备份工具"
    echo "================================================================"
    echo "环境: $ENV"
    echo "备份名称: $BACKUP_NAME"
    echo "备份路径: $BACKUP_PATH"
    echo "================================================================"
    echo ""
    
    # 创建备份
    create_backup
    
    echo ""
    echo "================================================================"
    echo "🎉 备份操作完成！"
    echo ""
    echo "📁 备份文件位置："
    echo "   $BACKUP_PATH"
    echo ""
    echo "💡 恢复命令："
    if [ "$ENV" = "prod" ]; then
        echo "   ssh -i $SSH_KEY $SSH_HOST 'cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME < $BACKUP_PATH'"
    else
        echo "   cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.yml exec -T db psql -U $DB_USER -d $DB_NAME < $BACKUP_PATH"
    fi
    echo ""
    echo "🗂️ 其他操作："
    echo "   查看备份列表: $0 $ENV list"
    echo "   清理旧备份:   $0 $ENV cleanup"
    echo "================================================================"
}

# 处理命令行参数
case "${2:-main}" in
    "list")
        list_backups
        ;;
    "cleanup")
        cleanup_old_backups 7
        ;;
    *)
        main
        ;;
esac