#!/bin/bash

# ==============================================================================
# 数据库迁移快速命令别名
# ==============================================================================
# 功能：提供数据库迁移相关操作的快速命令别名
# 用法：
#   source ./scripts/migration-aliases.sh  # 加载别名
#   或在 ~/.bashrc 或 ~/.zshrc 中添加此文件
# ==============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 基础命令别名
alias migration-help='echo -e "
${BLUE}📋 数据库迁移快速命令列表${NC}

${GREEN}== 状态检查 ==${NC}
  ${YELLOW}migration-status-local${NC}     检查本地迁移状态
  ${YELLOW}migration-status-prod${NC}      检查生产环境迁移状态
  ${YELLOW}migration-status-report${NC}    生成详细状态报告

${GREEN}== 备份操作 ==${NC}
  ${YELLOW}db-backup-local${NC}            创建本地数据库备份
  ${YELLOW}db-backup-prod${NC}             创建生产数据库备份
  ${YELLOW}db-backup-list${NC}             列出现有备份文件
  ${YELLOW}db-backup-cleanup${NC}          清理旧备份文件

${GREEN}== 迁移执行 ==${NC}
  ${YELLOW}migrate-local${NC}              在本地环境安全执行迁移
  ${YELLOW}migrate-prod${NC}               在生产环境安全执行迁移
  ${YELLOW}migrate-rollback-local${NC}     回滚本地迁移
  ${YELLOW}migrate-rollback-prod${NC}      回滚生产迁移

${GREEN}== 验证测试 ==${NC}
  ${YELLOW}verify-local${NC}               验证本地迁移结果
  ${YELLOW}verify-prod${NC}                验证生产迁移结果
  ${YELLOW}verify-report${NC}              生成验证报告
  ${YELLOW}verify-schema${NC}              仅验证Schema结构
  ${YELLOW}verify-data${NC}                仅验证数据完整性

${GREEN}== Prisma操作 ==${NC}
  ${YELLOW}prisma-status${NC}              检查Prisma迁移状态
  ${YELLOW}prisma-generate${NC}            生成Prisma Client
  ${YELLOW}prisma-deploy${NC}              部署Prisma迁移
  ${YELLOW}prisma-reset${NC}               重置本地数据库

${GREEN}== 开发工具 ==${NC}
  ${YELLOW}db-connect-local${NC}           连接本地数据库
  ${YELLOW}db-connect-prod${NC}            连接生产数据库
  ${YELLOW}db-logs${NC}                    查看数据库容器日志
  ${YELLOW}migration-cd${NC}               切换到迁移脚本目录

${GREEN}== 帮助文档 ==${NC}
  ${YELLOW}migration-help${NC}             显示此帮助信息
  ${YELLOW}migration-sop${NC}              查看迁移SOP文档
"'

# 状态检查命令
alias migration-status-local="cd '$PROJECT_ROOT' && ./scripts/migration-status.sh local"
alias migration-status-prod="cd '$PROJECT_ROOT' && ./scripts/migration-status.sh prod"
alias migration-status-report="cd '$PROJECT_ROOT' && ./scripts/migration-status.sh prod report"

# 备份操作命令
alias db-backup-local="cd '$PROJECT_ROOT' && ./scripts/db-backup.sh local"
alias db-backup-prod="cd '$PROJECT_ROOT' && ./scripts/db-backup.sh prod"
alias db-backup-list="cd '$PROJECT_ROOT' && ./scripts/db-backup.sh prod list"
alias db-backup-cleanup="cd '$PROJECT_ROOT' && ./scripts/db-backup.sh prod cleanup"

# 迁移执行命令
alias migrate-local="cd '$PROJECT_ROOT' && ./scripts/safe-migrate.sh local"
alias migrate-prod="cd '$PROJECT_ROOT' && ./scripts/safe-migrate.sh prod"
alias migrate-rollback-local="cd '$PROJECT_ROOT' && ./scripts/safe-migrate.sh local rollback"
alias migrate-rollback-prod="cd '$PROJECT_ROOT' && ./scripts/safe-migrate.sh prod rollback"

# 验证测试命令
alias verify-local="cd '$PROJECT_ROOT' && ./scripts/migration-verify.sh local"
alias verify-prod="cd '$PROJECT_ROOT' && ./scripts/migration-verify.sh prod"
alias verify-report="cd '$PROJECT_ROOT' && ./scripts/migration-verify.sh prod report"
alias verify-schema="cd '$PROJECT_ROOT' && ./scripts/migration-verify.sh prod schema"
alias verify-data="cd '$PROJECT_ROOT' && ./scripts/migration-verify.sh prod data"

# Prisma操作命令
alias prisma-status="cd '$PROJECT_ROOT/10-baokuan-jieqouqi-web' && npx prisma migrate status"
alias prisma-generate="cd '$PROJECT_ROOT/10-baokuan-jieqouqi-web' && npx prisma generate"
alias prisma-deploy="cd '$PROJECT_ROOT/10-baokuan-jieqouqi-web' && npx prisma migrate deploy"
alias prisma-reset="cd '$PROJECT_ROOT/10-baokuan-jieqouqi-web' && npx prisma migrate reset --force"

# 数据库连接命令
alias db-connect-local="cd '$PROJECT_ROOT/12-baokuan-jieqouqi-deploy/local' && docker-compose --env-file ../../../.env -f docker-compose.yml exec db psql -U postgres -d deconstructor_db"
alias db-connect-prod="echo '请使用SSH连接到生产服务器，然后执行：'; echo 'cd /opt/baokuan-jiegouqi/app/12-baokuan-jieqouqi-deploy/cloud && docker-compose --env-file ../../.env -f docker-compose.cloud.yml exec db psql -U postgres -d deconstructor_db'"

# 日志查看命令
alias db-logs="cd '$PROJECT_ROOT/12-baokuan-jieqouqi-deploy/local' && docker-compose --env-file ../../../.env -f docker-compose.yml logs -f db"

# 目录导航命令
alias migration-cd="cd '$PROJECT_ROOT/scripts'"

# SOP文档查看
alias migration-sop="cat '$PROJECT_ROOT/docs/database-migration-sop.md' | head -50"

# 高级组合命令
alias migration-full-check="echo -e '${BLUE}🔍 执行完整迁移检查...${NC}' && migration-status-prod && echo '' && verify-prod"

alias migration-safe-prod="echo -e '${YELLOW}⚠️  生产环境迁移流程${NC}' && echo -e '${BLUE}1. 创建备份...${NC}' && db-backup-prod && echo -e '${BLUE}2. 执行迁移...${NC}' && migrate-prod && echo -e '${BLUE}3. 验证结果...${NC}' && verify-prod"

# 快速部署检查
alias deploy-check="echo -e '${BLUE}🚀 部署前检查清单${NC}' && echo -e '${GREEN}1. 检查本地迁移状态${NC}' && prisma-status && echo -e '${GREEN}2. 检查生产环境状态${NC}' && migration-status-prod && echo -e '${GREEN}3. 验证本地数据库${NC}' && verify-local"

# 快速故障排除
alias migration-troubleshoot="echo -e '${RED}🔧 迁移故障排除${NC}' && echo -e '${YELLOW}检查生产环境状态...${NC}' && migration-status-prod && echo -e '${YELLOW}验证数据完整性...${NC}' && verify-data && echo -e '${YELLOW}检查应用连接...${NC}' && verify-prod connectivity"

# 开发环境重置
alias dev-reset="echo -e '${YELLOW}⚠️  重置开发环境数据库${NC}' && echo '此操作将清空所有本地数据，请确认后继续...' && read -p '输入 YES 确认: ' confirm && [ \"\$confirm\" = \"YES\" ] && prisma-reset && echo -e '${GREEN}✅ 开发环境重置完成${NC}'"

# 设置环境变量（如果需要）
export MIGRATION_SCRIPTS_DIR="$SCRIPT_DIR"
export PROJECT_ROOT="$PROJECT_ROOT"

# 显示加载信息
echo -e "${GREEN}✅ 数据库迁移命令别名已加载${NC}"
echo -e "${BLUE}💡 输入 'migration-help' 查看可用命令${NC}"

# 检查必要的工具
check_tools() {
    local missing_tools=()
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi
    
    if ! command -v npx &> /dev/null; then
        missing_tools+=("npx/node")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo -e "${RED}⚠️  缺少必要工具: ${missing_tools[*]}${NC}"
        echo -e "${YELLOW}请安装这些工具后重新加载别名${NC}"
    fi
}

# 静默检查工具（避免每次都显示警告）
check_tools 2>/dev/null

# 添加自动补全（如果支持）
if [[ -n "$BASH_VERSION" ]]; then
    # Bash补全
    complete -W "local prod report connection tables prisma" migration-status-prod
    complete -W "local prod list cleanup" db-backup-prod
    complete -W "local prod rollback verify" migrate-prod
    complete -W "local prod report schema data connectivity" verify-prod
elif [[ -n "$ZSH_VERSION" ]]; then
    # Zsh补全支持可以在这里添加
    :
fi