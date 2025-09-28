#!/bin/bash

# ==============================================================================
# 安全迁移执行脚本
# ==============================================================================
# 功能：安全地执行数据库迁移，包含备份、验证和回滚机制
# 用法：
#   ./scripts/safe-migrate.sh [local|prod] [migration_name]
# 示例：
#   ./scripts/safe-migrate.sh prod "add_script_tables"
#   ./scripts/safe-migrate.sh local
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
MIGRATION_NAME=${2:-$(date +%Y%m%d_%H%M%S)}
DB_NAME="deconstructor_db"
DB_USER="postgres"
BACKUP_DIR="./backups"

# 根据环境设置配置
if [ "$ENV" = "prod" ]; then
    WORK_DIR="/opt/baokuan-jiegouqi/app/10-baokuan-jieqouqi-web"
    DOCKER_COMPOSE_PATH="/opt/baokuan-jiegouqi/app/12-baokuan-jieqouqi-deploy/cloud"
    ENV_FILE="../../.env"
    SSH_HOST="root@43.142.178.200"
    SSH_KEY="/Users/liumingwei/01-project/03-personal/06-vps/06-qcloud-vps/sh_qcloud.pem"
    BACKUP_DIR="/opt/baokuan-jiegouqi/app/backups"
elif [ "$ENV" = "local" ]; then
    WORK_DIR="./10-baokuan-jieqouqi-web"
    DOCKER_COMPOSE_PATH="./12-baokuan-jieqouqi-deploy/local"
    ENV_FILE="../.env"
    SSH_HOST=""
    SSH_KEY=""
    BACKUP_DIR="./backups"
else
    log_error "未知环境: $ENV (支持: local, prod)"
    exit 1
fi

# 备份文件名
BACKUP_FILE="pre_migration_${MIGRATION_NAME}_${ENV}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# 错误处理函数
handle_error() {
    local exit_code=$1
    log_error "迁移执行失败！退出码: $exit_code"
    log_warning "开始回滚程序..."
    
    # 执行回滚
    rollback_migration
    
    log_info "回滚完成，请检查系统状态"
    exit $exit_code
}

# 设置错误处理
trap 'handle_error $?' ERR

# 预检查函数
pre_migration_checks() {
    log_info "执行迁移前检查..."
    
    # 1. 检查数据库连接
    log_info "1. 检查数据库连接..."
    local connection_test=""
    if [ "$ENV" = "prod" ]; then
        connection_test=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME -c 'SELECT 1;'" 2>/dev/null || echo "FAILED")
    else
        connection_test=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>/dev/null || echo "FAILED")
    fi
    
    if [[ "$connection_test" != *"1"* ]]; then
        log_error "数据库连接失败，终止迁移"
        exit 1
    fi
    log_success "数据库连接正常"
    
    # 2. 检查磁盘空间
    log_info "2. 检查磁盘空间..."
    local disk_usage=""
    if [ "$ENV" = "prod" ]; then
        disk_usage=$(ssh -i "$SSH_KEY" "$SSH_HOST" "df -h /" | tail -n 1 | awk '{print $5}' | sed 's/%//')
    else
        disk_usage=$(df -h / | tail -n 1 | awk '{print $5}' | sed 's/%//')
    fi
    
    if [ "$disk_usage" -gt 85 ]; then
        log_error "磁盘空间不足 (使用率: ${disk_usage}%)，建议清理后再执行迁移"
        exit 1
    fi
    log_success "磁盘空间充足 (使用率: ${disk_usage}%)"
    
    # 3. 检查应用服务状态
    log_info "3. 检查应用服务状态..."
    local service_status=""
    if [ "$ENV" = "prod" ]; then
        service_status=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml ps --services --filter status=running | wc -l")
    else
        service_status=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml ps --services --filter status=running | wc -l 2>/dev/null || echo "0")
    fi
    
    if [ "$service_status" -lt 3 ]; then
        log_warning "部分服务未运行，请检查服务状态"
    else
        log_success "应用服务运行正常"
    fi
    
    # 4. 检查Prisma迁移状态
    log_info "4. 检查当前迁移状态..."
    local migration_status=""
    if [ "$ENV" = "prod" ]; then
        migration_status=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $WORK_DIR && npx prisma migrate status" 2>/dev/null || echo "无法检查Prisma状态")
    else
        if [ -d "$WORK_DIR" ]; then
            migration_status=$(cd "$WORK_DIR" && npx prisma migrate status 2>/dev/null || echo "无法检查Prisma状态")
        else
            migration_status="工作目录不存在"
        fi
    fi
    
    echo "$migration_status"
    log_success "迁移前检查完成"
}

# 创建备份
create_pre_migration_backup() {
    log_info "创建迁移前备份..."
    
    # 创建备份目录
    if [ "$ENV" = "prod" ]; then
        ssh -i "$SSH_KEY" "$SSH_HOST" "mkdir -p $BACKUP_DIR"
    else
        mkdir -p "$BACKUP_DIR"
    fi
    
    # 执行备份
    if [ "$ENV" = "prod" ]; then
        ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db pg_dump -U $DB_USER -d $DB_NAME" > "$BACKUP_PATH"
    else
        cd "$DOCKER_COMPOSE_PATH"
        docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_PATH"
    fi
    
    # 验证备份
    if [ -f "$BACKUP_PATH" ] && [ -s "$BACKUP_PATH" ]; then
        local file_size=$(du -h "$BACKUP_PATH" | cut -f1)
        log_success "迁移前备份创建成功 (大小: $file_size)"
        log_info "备份文件: $BACKUP_PATH"
    else
        log_error "备份创建失败"
        exit 1
    fi
}

# 执行迁移
execute_migration() {
    log_info "开始执行数据库迁移..."
    
    if [ "$ENV" = "prod" ]; then
        log_info "在生产环境执行迁移..."
        ssh -i "$SSH_KEY" "$SSH_HOST" "cd $WORK_DIR && npx prisma migrate deploy"
    else
        log_info "在本地环境执行迁移..."
        if [ -d "$WORK_DIR" ]; then
            cd "$WORK_DIR"
            npx prisma migrate deploy
        else
            log_error "工作目录不存在: $WORK_DIR"
            exit 1
        fi
    fi
    
    log_success "迁移执行完成"
}

# 迁移后验证
post_migration_verification() {
    log_info "执行迁移后验证..."
    
    # 1. 检查数据库连接
    log_info "1. 验证数据库连接..."
    local connection_test=""
    if [ "$ENV" = "prod" ]; then
        connection_test=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME -c 'SELECT version();'" 2>/dev/null || echo "FAILED")
    else
        connection_test=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" 2>/dev/null || echo "FAILED")
    fi
    
    if [[ "$connection_test" == *"PostgreSQL"* ]]; then
        log_success "数据库连接验证通过"
    else
        log_error "数据库连接验证失败"
        return 1
    fi
    
    # 2. 检查关键表
    log_info "2. 验证表结构..."
    local table_check=""
    if [ "$ENV" = "prod" ]; then
        table_check=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME -c '\\dt baokuan_app.*'" 2>/dev/null || echo "FAILED")
    else
        table_check=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "\\dt baokuan_app.*" 2>/dev/null || echo "FAILED")
    fi
    
    if [[ "$table_check" == *"scripts"* ]] && [[ "$table_check" == *"AnalysisCard"* ]]; then
        log_success "表结构验证通过"
    else
        log_warning "表结构可能存在问题"
        echo "$table_check"
    fi
    
    # 3. 应用健康检查
    log_info "3. 验证应用服务..."
    sleep 5  # 等待服务重启
    
    local health_check=""
    if [ "$ENV" = "prod" ]; then
        health_check=$(ssh -i "$SSH_KEY" "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'FAILED'")
    else
        health_check=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo "FAILED")
    fi
    
    if [[ "$health_check" =~ ^[23][0-9][0-9]$ ]]; then
        log_success "应用服务验证通过 (HTTP: $health_check)"
    else
        log_warning "应用服务可能存在问题 (HTTP: $health_check)"
    fi
    
    log_success "迁移后验证完成"
}

# 回滚迁移
rollback_migration() {
    log_warning "执行迁移回滚..."
    
    if [ -f "$BACKUP_PATH" ]; then
        log_info "从备份恢复数据库..."
        
        if [ "$ENV" = "prod" ]; then
            ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME" < "$BACKUP_PATH"
        else
            cd "$DOCKER_COMPOSE_PATH"
            docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_PATH"
        fi
        
        log_success "数据库回滚完成"
    else
        log_error "备份文件不存在，无法自动回滚: $BACKUP_PATH"
        log_warning "请手动检查和恢复数据库状态"
    fi
}

# 清理函数
cleanup() {
    log_info "执行清理操作..."
    
    # 可以在这里添加清理逻辑，比如删除临时文件等
    log_success "清理完成"
}

# 主函数
main() {
    echo "🔐 安全数据库迁移工具"
    echo "================================================================"
    echo "环境: $ENV"
    echo "迁移名称: $MIGRATION_NAME"
    echo "数据库: $DB_NAME"
    echo "备份文件: $BACKUP_FILE"
    echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================================"
    echo ""
    
    # 确认执行
    if [ "$ENV" = "prod" ]; then
        log_warning "您即将在生产环境执行迁移！"
        read -p "请输入 'YES' 确认继续: " confirm
        if [ "$confirm" != "YES" ]; then
            log_info "迁移已取消"
            exit 0
        fi
    fi
    
    # 执行迁移流程
    log_info "开始安全迁移流程..."
    
    # 阶段1：预检查
    pre_migration_checks
    echo ""
    
    # 阶段2：创建备份
    create_pre_migration_backup
    echo ""
    
    # 阶段3：执行迁移
    execute_migration
    echo ""
    
    # 阶段4：验证
    if post_migration_verification; then
        log_success "迁移验证通过"
    else
        log_error "迁移验证失败，开始回滚..."
        rollback_migration
        exit 1
    fi
    
    # 阶段5：清理
    cleanup
    
    echo ""
    echo "================================================================"
    echo "🎉 安全迁移执行完成！"
    echo ""
    echo "✅ 迁移状态: 成功"
    echo "📁 备份文件: $BACKUP_PATH"
    echo "⏰ 完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "💡 后续操作："
    echo "   检查状态: ./scripts/migration-status.sh $ENV"
    echo "   手动回滚: ./scripts/safe-migrate.sh $ENV rollback"
    echo "================================================================"
}

# 处理命令行参数
case "${2:-main}" in
    "rollback")
        log_warning "执行手动回滚..."
        BACKUP_FILE="pre_migration_${MIGRATION_NAME}_${ENV}.sql"
        BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
        rollback_migration
        ;;
    "verify")
        post_migration_verification
        ;;
    *)
        main
        ;;
esac