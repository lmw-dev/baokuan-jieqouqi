#!/bin/bash

# ==============================================================================
# 迁移状态检查脚本
# ==============================================================================
# 功能：检查Prisma迁移状态和数据库连接健康状况
# 用法：
#   ./scripts/migration-status.sh [local|prod]
# 示例：
#   ./scripts/migration-status.sh prod
#   ./scripts/migration-status.sh local
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
DB_NAME="deconstructor_db"
DB_USER="postgres"

# 根据环境设置配置
if [ "$ENV" = "prod" ]; then
    WORK_DIR="/opt/baokuan-jiegouqi/app/10-baokuan-jieqouqi-web"
    DOCKER_COMPOSE_PATH="/opt/baokuan-jiegouqi/app/12-baokuan-jieqouqi-deploy/cloud"
    ENV_FILE="../../.env"
    SSH_HOST="root@43.142.178.200"
    SSH_KEY="/Users/liumingwei/01-project/03-personal/06-vps/06-qcloud-vps/sh_qcloud.pem"
elif [ "$ENV" = "local" ]; then
    WORK_DIR="./10-baokuan-jieqouqi-web"
    DOCKER_COMPOSE_PATH="./12-baokuan-jieqouqi-deploy/local"
    ENV_FILE="../.env"
    SSH_HOST=""
    SSH_KEY=""
else
    log_error "未知环境: $ENV (支持: local, prod)"
    exit 1
fi

# 检查数据库连接
check_db_connection() {
    log_info "检查数据库连接状态..."
    
    local connection_test=""
    if [ "$ENV" = "prod" ]; then
        connection_test=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME -c 'SELECT version();'" 2>/dev/null || echo "FAILED")
    else
        connection_test=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" 2>/dev/null || echo "FAILED")
    fi
    
    if [[ "$connection_test" == *"PostgreSQL"* ]]; then
        log_success "数据库连接正常"
        echo "$connection_test" | head -n 3
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 检查数据库schema
check_database_schema() {
    log_info "检查数据库schema状态..."
    
    local schema_info=""
    if [ "$ENV" = "prod" ]; then
        schema_info=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME -c '\\dn'" 2>/dev/null || echo "FAILED")
    else
        schema_info=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "\\dn" 2>/dev/null || echo "FAILED")
    fi
    
    if [[ "$schema_info" == *"baokuan_app"* ]]; then
        log_success "baokuan_app schema 存在"
    else
        log_error "baokuan_app schema 不存在"
    fi
    
    echo "$schema_info"
}

# 检查表结构
check_tables() {
    log_info "检查表结构..."
    
    local table_info=""
    if [ "$ENV" = "prod" ]; then
        table_info=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME -c '\\dt baokuan_app.*'" 2>/dev/null || echo "FAILED")
    else
        table_info=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "\\dt baokuan_app.*" 2>/dev/null || echo "FAILED")
    fi
    
    echo "$table_info"
    
    # 检查关键表是否存在
    local required_tables=("User" "AnalysisCard" "AnalysisSource" "MediaFile" "scripts" "script_sections")
    for table in "${required_tables[@]}"; do
        if [[ "$table_info" == *"$table"* ]]; then
            log_success "表 $table 存在"
        else
            log_warning "表 $table 不存在"
        fi
    done
}

# 检查Prisma迁移状态（仅对有Prisma的环境）
check_prisma_migration_status() {
    log_info "检查Prisma迁移状态..."
    
    local prisma_status=""
    if [ "$ENV" = "prod" ]; then
        # 生产环境需要在服务器上运行
        prisma_status=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $WORK_DIR && npx prisma migrate status" 2>/dev/null || echo "Prisma不可用或未安装")
    else
        # 本地环境
        if [ -d "$WORK_DIR" ]; then
            prisma_status=$(cd "$WORK_DIR" && npx prisma migrate status 2>/dev/null || echo "Prisma不可用或未安装")
        else
            prisma_status="工作目录不存在: $WORK_DIR"
        fi
    fi
    
    echo "$prisma_status"
    
    if [[ "$prisma_status" == *"Database is up to date"* ]]; then
        log_success "Prisma迁移状态正常"
    elif [[ "$prisma_status" == *"following migration have not yet been applied"* ]]; then
        log_warning "存在未应用的迁移"
    elif [[ "$prisma_status" == *"Prisma不可用"* ]]; then
        log_warning "Prisma CLI不可用，跳过迁移状态检查"
    else
        log_warning "迁移状态需要关注"
    fi
}

# 检查外键约束
check_foreign_keys() {
    log_info "检查外键约束..."
    
    local fk_query="
    SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema='baokuan_app';
    "
    
    local fk_info=""
    if [ "$ENV" = "prod" ]; then
        fk_info=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME -c \"$fk_query\"" 2>/dev/null || echo "FAILED")
    else
        fk_info=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "$fk_query" 2>/dev/null || echo "FAILED")
    fi
    
    if [[ "$fk_info" != "FAILED" ]] && [[ "$fk_info" == *"scripts"* ]]; then
        log_success "外键约束配置正常"
        echo "$fk_info"
    else
        log_warning "外键约束可能存在问题"
        echo "$fk_info"
    fi
}

# 生成状态报告
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="migration-status-${ENV}-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "========================================"
        echo "数据库迁移状态报告"
        echo "========================================"
        echo "时间: $timestamp"
        echo "环境: $ENV"
        echo "数据库: $DB_NAME"
        echo ""
        echo "========================================"
        echo "1. 数据库连接检查"
        echo "========================================"
        check_db_connection
        echo ""
        echo "========================================"
        echo "2. Schema检查"
        echo "========================================"
        check_database_schema
        echo ""
        echo "========================================"
        echo "3. 表结构检查"
        echo "========================================"
        check_tables
        echo ""
        echo "========================================"
        echo "4. Prisma迁移状态"
        echo "========================================"
        check_prisma_migration_status
        echo ""
        echo "========================================"
        echo "5. 外键约束检查"
        echo "========================================"
        check_foreign_keys
        echo ""
        echo "========================================"
        echo "报告生成完成"
        echo "========================================"
    } | tee "$report_file"
    
    log_success "状态报告已保存: $report_file"
}

# 主函数
main() {
    echo "📊 数据库迁移状态检查工具"
    echo "================================================================"
    echo "环境: $ENV"
    echo "数据库: $DB_NAME"
    echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================================"
    echo ""
    
    # 执行所有检查
    check_db_connection
    echo ""
    check_database_schema
    echo ""
    check_tables
    echo ""
    check_prisma_migration_status
    echo ""
    check_foreign_keys
    
    echo ""
    echo "================================================================"
    echo "🎉 状态检查完成！"
    echo ""
    echo "💡 可用操作："
    echo "   生成详细报告: $0 $ENV report"
    echo "   仅检查连接:   $0 $ENV connection"
    echo "   仅检查表:     $0 $ENV tables"
    echo "================================================================"
}

# 处理命令行参数
case "${2:-main}" in
    "report")
        generate_report
        ;;
    "connection")
        check_db_connection
        ;;
    "tables")
        check_tables
        ;;
    "prisma")
        check_prisma_migration_status
        ;;
    *)
        main
        ;;
esac