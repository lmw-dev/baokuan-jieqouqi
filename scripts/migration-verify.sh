#!/bin/bash

# ==============================================================================
# 迁移验证脚本
# ==============================================================================
# 功能：验证数据库迁移的完整性和正确性
# 用法：
#   ./scripts/migration-verify.sh [local|prod] [test_type]
# 示例：
#   ./scripts/migration-verify.sh prod all
#   ./scripts/migration-verify.sh local schema
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
TEST_TYPE=${2:-"all"}
DB_NAME="deconstructor_db"
DB_USER="postgres"

# 根据环境设置配置
if [ "$ENV" = "prod" ]; then
    DOCKER_COMPOSE_PATH="/opt/baokuan-jiegouqi/app/12-baokuan-jieqouqi-deploy/cloud"
    ENV_FILE="../../.env"
    SSH_HOST="root@43.142.178.200"
    SSH_KEY="/Users/liumingwei/01-project/03-personal/06-vps/06-qcloud-vps/sh_qcloud.pem"
elif [ "$ENV" = "local" ]; then
    DOCKER_COMPOSE_PATH="./12-baokuan-jieqouqi-deploy/local"
    ENV_FILE="../.env"
    SSH_HOST=""
    SSH_KEY=""
else
    log_error "未知环境: $ENV (支持: local, prod)"
    exit 1
fi

# 验证计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试结果记录
declare -a TEST_RESULTS=()

# 执行SQL查询的通用函数
execute_sql() {
    local query="$1"
    local result=""
    
    if [ "$ENV" = "prod" ]; then
        result=$(ssh -i "$SSH_KEY" "$SSH_HOST" "cd $DOCKER_COMPOSE_PATH && docker-compose --env-file $ENV_FILE -f docker-compose.cloud.yml exec -T db psql -U $DB_USER -d $DB_NAME -c \"$query\"" 2>/dev/null || echo "QUERY_FAILED")
    else
        result=$(cd "$DOCKER_COMPOSE_PATH" && docker-compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "$query" 2>/dev/null || echo "QUERY_FAILED")
    fi
    
    echo "$result"
}

# 测试记录函数
record_test() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    local status="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "$test_name"
        TEST_RESULTS+=("✅ $test_name")
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "$test_name"
        log_error "  预期: $expected"
        log_error "  实际: $actual"
        TEST_RESULTS+=("❌ $test_name - 预期: $expected, 实际: $actual")
    fi
}

# 验证Schema存在性
verify_schema_exists() {
    log_info "验证Schema存在性..."
    
    local query="SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'baokuan_app';"
    local result=$(execute_sql "$query")
    
    if [[ "$result" == *"baokuan_app"* ]]; then
        record_test "Schema baokuan_app 存在" "baokuan_app" "baokuan_app" "PASS"
    else
        record_test "Schema baokuan_app 存在" "baokuan_app" "不存在" "FAIL"
    fi
}

# 验证表结构
verify_table_structure() {
    log_info "验证表结构..."
    
    # 定义需要验证的表
    local required_tables=("User" "AnalysisCard" "AnalysisSource" "MediaFile" "scripts" "script_sections" "script_edit_history" "upload_sessions")
    
    local query="SELECT table_name FROM information_schema.tables WHERE table_schema = 'baokuan_app';"
    local result=$(execute_sql "$query")
    
    for table in "${required_tables[@]}"; do
        if [[ "$result" == *"$table"* ]]; then
            record_test "表 $table 存在" "存在" "存在" "PASS"
        else
            record_test "表 $table 存在" "存在" "不存在" "FAIL"
        fi
    done
}

# 验证外键约束
verify_foreign_keys() {
    log_info "验证外键约束..."
    
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
        AND tc.table_schema = 'baokuan_app';
    "
    
    local result=$(execute_sql "$fk_query")
    
    # 验证关键外键关系
    local expected_fks=(
        "scripts:card_id->AnalysisCard:id"
        "scripts:created_by->User:id"
        "script_sections:script_id->scripts:id"
        "script_edit_history:script_id->scripts:id"
        "script_edit_history:created_by->User:id"
    )
    
    for fk_relation in "${expected_fks[@]}"; do
        local table_col=$(echo "$fk_relation" | cut -d'-' -f1)
        local table=$(echo "$table_col" | cut -d':' -f1)
        local column=$(echo "$table_col" | cut -d':' -f2)
        
        if [[ "$result" == *"$table"* ]] && [[ "$result" == *"$column"* ]]; then
            record_test "外键约束 $fk_relation" "存在" "存在" "PASS"
        else
            record_test "外键约束 $fk_relation" "存在" "不存在或异常" "FAIL"
        fi
    done
}

# 验证索引
verify_indexes() {
    log_info "验证索引..."
    
    local index_query="
    SELECT 
        indexname,
        tablename,
        indexdef
    FROM 
        pg_indexes 
    WHERE 
        schemaname = 'baokuan_app';
    "
    
    local result=$(execute_sql "$index_query")
    
    # 验证关键索引
    local expected_indexes=(
        "idx_scripts_card_id"
        "idx_scripts_created_by"
        "idx_scripts_status"
        "idx_script_sections_script_id"
        "idx_script_sections_section_type"
    )
    
    for index in "${expected_indexes[@]}"; do
        if [[ "$result" == *"$index"* ]]; then
            record_test "索引 $index" "存在" "存在" "PASS"
        else
            record_test "索引 $index" "存在" "不存在" "FAIL"
        fi
    done
}

# 验证触发器
verify_triggers() {
    log_info "验证触发器..."
    
    local trigger_query="
    SELECT 
        trigger_name,
        event_object_table,
        action_statement
    FROM 
        information_schema.triggers 
    WHERE 
        trigger_schema = 'baokuan_app';
    "
    
    local result=$(execute_sql "$trigger_query")
    
    # 验证自动更新时间的触发器
    local expected_triggers=(
        "update_scripts_updated_at"
        "update_script_sections_updated_at"
    )
    
    for trigger in "${expected_triggers[@]}"; do
        if [[ "$result" == *"$trigger"* ]]; then
            record_test "触发器 $trigger" "存在" "存在" "PASS"
        else
            record_test "触发器 $trigger" "存在" "不存在" "FAIL"
        fi
    done
}

# 验证数据完整性
verify_data_integrity() {
    log_info "验证数据完整性..."
    
    # 1. 检查是否有孤立记录
    local orphan_scripts_query="
    SELECT COUNT(*) as orphan_count 
    FROM baokuan_app.scripts s 
    LEFT JOIN baokuan_app.\"AnalysisCard\" ac ON s.card_id = ac.id 
    WHERE ac.id IS NULL;
    "
    
    local orphan_result=$(execute_sql "$orphan_scripts_query")
    local orphan_count=$(echo "$orphan_result" | grep -o '[0-9]\+' | head -n 1)
    
    if [ "$orphan_count" = "0" ]; then
        record_test "Scripts表无孤立记录" "0" "$orphan_count" "PASS"
    else
        record_test "Scripts表无孤立记录" "0" "$orphan_count" "FAIL"
    fi
    
    # 2. 检查约束违反
    local constraint_query="
    SELECT COUNT(*) as violation_count 
    FROM baokuan_app.scripts 
    WHERE title IS NULL OR title = '' OR LENGTH(title) = 0;
    "
    
    local constraint_result=$(execute_sql "$constraint_query")
    local violation_count=$(echo "$constraint_result" | grep -o '[0-9]\+' | head -n 1)
    
    if [ "$violation_count" = "0" ]; then
        record_test "Scripts表标题约束正常" "0" "$violation_count" "PASS"
    else
        record_test "Scripts表标题约束正常" "0" "$violation_count" "FAIL"
    fi
}

# 验证应用连接性
verify_application_connectivity() {
    log_info "验证应用连接性..."
    
    # 检查Web应用健康状态
    local web_health=""
    if [ "$ENV" = "prod" ]; then
        web_health=$(ssh -i "$SSH_KEY" "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'FAILED'")
    else
        web_health=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || echo "FAILED")
    fi
    
    if [[ "$web_health" =~ ^[23][0-9][0-9]$ ]]; then
        record_test "Web应用连接性" "2xx/3xx" "$web_health" "PASS"
    else
        record_test "Web应用连接性" "2xx/3xx" "$web_health" "FAIL"
    fi
    
    # 检查AI服务健康状态
    local ai_health=""
    if [ "$ENV" = "prod" ]; then
        ai_health=$(ssh -i "$SSH_KEY" "$SSH_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/ping || echo 'FAILED'")
    else
        ai_health=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/ping 2>/dev/null || echo "FAILED")
    fi
    
    if [[ "$ai_health" =~ ^[23][0-9][0-9]$ ]]; then
        record_test "AI服务连接性" "2xx/3xx" "$ai_health" "PASS"
    else
        record_test "AI服务连接性" "2xx/3xx" "$ai_health" "FAIL"
    fi
}

# 性能基准测试
verify_performance() {
    log_info "验证基本性能..."
    
    # 测试简单查询响应时间
    local perf_query="SELECT COUNT(*) FROM baokuan_app.\"User\";"
    local start_time=$(date +%s%N)
    local result=$(execute_sql "$perf_query")
    local end_time=$(date +%s%N)
    
    local duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$duration_ms" -lt 1000 ]; then  # 小于1秒
        record_test "数据库查询性能" "<1000ms" "${duration_ms}ms" "PASS"
    else
        record_test "数据库查询性能" "<1000ms" "${duration_ms}ms" "FAIL"
    fi
}

# 生成验证报告
generate_verification_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="migration-verification-${ENV}-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "========================================"
        echo "数据库迁移验证报告"
        echo "========================================"
        echo "时间: $timestamp"
        echo "环境: $ENV"
        echo "数据库: $DB_NAME"
        echo "测试类型: $TEST_TYPE"
        echo ""
        echo "========================================"
        echo "测试结果统计"
        echo "========================================"
        echo "总测试数: $TOTAL_TESTS"
        echo "通过数: $PASSED_TESTS"
        echo "失败数: $FAILED_TESTS"
        echo "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
        echo ""
        echo "========================================"
        echo "详细测试结果"
        echo "========================================"
        
        for result in "${TEST_RESULTS[@]}"; do
            echo "$result"
        done
        
        echo ""
        echo "========================================"
        echo "建议和后续行动"
        echo "========================================"
        
        if [ "$FAILED_TESTS" -eq 0 ]; then
            echo "🎉 所有验证测试通过！迁移成功。"
            echo ""
            echo "建议："
            echo "- 可以将系统投入正常使用"
            echo "- 建议监控系统运行状况24小时"
            echo "- 保留迁移备份至少一周"
        else
            echo "⚠️ 发现 $FAILED_TESTS 个验证失败项目。"
            echo ""
            echo "紧急行动："
            echo "- 立即检查失败的验证项目"
            echo "- 考虑回滚到迁移前状态"
            echo "- 联系技术团队进行问题排查"
            echo ""
            echo "回滚命令："
            echo "  ./scripts/safe-migrate.sh $ENV rollback"
        fi
        
        echo ""
        echo "========================================"
        echo "报告生成完成"
        echo "========================================"
    } | tee "$report_file"
    
    log_success "验证报告已保存: $report_file"
}

# 主函数
main() {
    echo "🔍 数据库迁移验证工具"
    echo "================================================================"
    echo "环境: $ENV"
    echo "数据库: $DB_NAME"
    echo "测试类型: $TEST_TYPE"
    echo "验证时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================================"
    echo ""
    
    # 根据测试类型执行不同的验证
    case "$TEST_TYPE" in
        "schema")
            verify_schema_exists
            verify_table_structure
            ;;
        "constraints")
            verify_foreign_keys
            verify_indexes
            verify_triggers
            ;;
        "data")
            verify_data_integrity
            ;;
        "performance")
            verify_performance
            ;;
        "connectivity")
            verify_application_connectivity
            ;;
        "all"|*)
            verify_schema_exists
            verify_table_structure
            verify_foreign_keys
            verify_indexes
            verify_triggers
            verify_data_integrity
            verify_application_connectivity
            verify_performance
            ;;
    esac
    
    echo ""
    echo "================================================================"
    echo "🎯 验证结果摘要"
    echo "================================================================"
    echo "总测试数: $TOTAL_TESTS"
    echo "通过数: $PASSED_TESTS"
    echo "失败数: $FAILED_TESTS"
    
    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}验证状态: ✅ 全部通过${NC}"
        echo "成功率: 100%"
    else
        echo -e "${RED}验证状态: ❌ 存在失败项目${NC}"
        echo "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    fi
    
    echo ""
    echo "💡 可用操作："
    echo "   生成详细报告: $0 $ENV report"
    echo "   验证Schema:   $0 $ENV schema"
    echo "   验证约束:     $0 $ENV constraints"
    echo "   验证数据:     $0 $ENV data"
    echo "   验证连接:     $0 $ENV connectivity"
    echo "================================================================"
}

# 处理命令行参数
case "${2:-all}" in
    "report")
        # 先执行所有验证，然后生成报告
        TEST_TYPE="all"
        verify_schema_exists
        verify_table_structure
        verify_foreign_keys
        verify_indexes
        verify_triggers
        verify_data_integrity
        verify_application_connectivity
        verify_performance
        generate_verification_report
        ;;
    *)
        main
        ;;
esac