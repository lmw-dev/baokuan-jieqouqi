# 数据库迁移脚本使用说明

本目录包含爆款解构器项目的数据库迁移管理脚本，提供安全、可靠的数据库操作工具。

## 📁 脚本概览

| 脚本名称 | 功能描述 | 主要用途 |
|---------|---------|---------|
| `db-backup.sh` | 数据库备份工具 | 创建、列出、清理数据库备份 |
| `migration-status.sh` | 迁移状态检查 | 检查数据库连接、schema、表结构 |
| `safe-migrate.sh` | 安全迁移执行 | 带备份和回滚的迁移执行 |
| `migration-verify.sh` | 迁移验证工具 | 验证迁移完整性和正确性 |
| `migration-aliases.sh` | 快速命令别名 | 提供便捷的命令别名 |

## 🚀 快速开始

### 1. 加载命令别名（推荐）

```bash
# 加载别名到当前会话
source ./scripts/migration-aliases.sh

# 查看可用命令
migration-help

# 或者将别名添加到shell配置文件
echo "source $(pwd)/scripts/migration-aliases.sh" >> ~/.bashrc  # 或 ~/.zshrc
```

### 2. 基本操作示例

```bash
# 检查生产环境状态
migration-status-prod

# 创建生产环境备份
db-backup-prod

# 验证迁移结果
verify-prod

# 执行完整检查
migration-full-check
```

## 📋 常用场景

### 场景1：生产环境迁移

```bash
# 1. 检查当前状态
migration-status-prod

# 2. 创建备份
db-backup-prod "pre_migration_$(date +%Y%m%d)"

# 3. 执行安全迁移
migrate-prod

# 4. 验证结果
verify-prod
```

### 场景2：开发环境测试

```bash
# 1. 重置本地数据库
dev-reset

# 2. 执行本地迁移
migrate-local

# 3. 验证本地结果
verify-local
```

### 场景3：故障排除

```bash
# 快速故障排除检查
migration-troubleshoot

# 如果需要回滚
migrate-rollback-prod
```

## 🔧 脚本详细说明

### db-backup.sh - 数据库备份工具

**功能**：创建PostgreSQL数据库的完整备份

**用法**：
```bash
./scripts/db-backup.sh [local|prod] [backup_name]

# 示例
./scripts/db-backup.sh prod "pre_migration_20250725"
./scripts/db-backup.sh local
./scripts/db-backup.sh prod list      # 列出备份
./scripts/db-backup.sh prod cleanup   # 清理旧备份
```

**特性**：
- 支持本地和生产环境
- 自动创建带时间戳的备份文件
- 验证备份文件完整性
- 提供备份列表和清理功能

### migration-status.sh - 迁移状态检查

**功能**：检查Prisma迁移状态和数据库连接健康状况

**用法**：
```bash
./scripts/migration-status.sh [local|prod] [check_type]

# 示例
./scripts/migration-status.sh prod
./scripts/migration-status.sh local report
./scripts/migration-status.sh prod connection
```

**检查项目**：
- 数据库连接状态
- Schema存在性
- 表结构完整性
- Prisma迁移状态
- 外键约束

### safe-migrate.sh - 安全迁移执行

**功能**：安全地执行数据库迁移，包含备份、验证和回滚机制

**用法**：
```bash
./scripts/safe-migrate.sh [local|prod] [migration_name]

# 示例
./scripts/safe-migrate.sh prod "add_script_tables"
./scripts/safe-migrate.sh local
./scripts/safe-migrate.sh prod rollback  # 手动回滚
```

**安全特性**：
- 迁移前自动备份
- 预检查（连接、磁盘空间、服务状态）
- 迁移后验证
- 失败自动回滚
- 生产环境需要确认

### migration-verify.sh - 迁移验证工具

**功能**：验证数据库迁移的完整性和正确性

**用法**：
```bash
./scripts/migration-verify.sh [local|prod] [test_type]

# 示例
./scripts/migration-verify.sh prod all
./scripts/migration-verify.sh local schema
./scripts/migration-verify.sh prod report
```

**验证类型**：
- `schema` - Schema和表结构
- `constraints` - 外键、索引、触发器
- `data` - 数据完整性
- `connectivity` - 应用连接性
- `performance` - 基本性能
- `all` - 全部验证

### migration-aliases.sh - 快速命令别名

**功能**：提供数据库迁移相关操作的快速命令别名

**加载方式**：
```bash
# 临时加载
source ./scripts/migration-aliases.sh

# 永久加载（添加到shell配置）
echo "source $(pwd)/scripts/migration-aliases.sh" >> ~/.bashrc
```

**主要别名**：
- `migration-status-prod` - 检查生产状态
- `db-backup-prod` - 生产备份
- `migrate-prod` - 生产迁移
- `verify-prod` - 验证生产
- `migration-help` - 查看帮助

## ⚠️ 安全注意事项

### 生产环境操作

1. **必须备份**：生产迁移前必须创建备份
2. **确认操作**：生产环境脚本会要求输入 'YES' 确认
3. **维护窗口**：建议在低峰期执行迁移
4. **回滚准备**：确保有回滚方案

### 权限要求

- 数据库：需要 PostgreSQL 的读写权限
- Docker：需要执行 docker-compose 命令的权限
- SSH：生产环境操作需要SSH密钥访问权限

### 环境变量

脚本依赖以下环境变量（通过 .env 文件配置）：
- `DATABASE_URL` - 数据库连接字符串
- `POSTGRES_DB` - 数据库名称
- `POSTGRES_USER` - 数据库用户名
- `POSTGRES_PASSWORD` - 数据库密码

## 🛠️ 故障排除

### 常见问题

**1. 数据库连接失败**
```bash
# 检查容器状态
docker-compose ps

# 检查数据库日志
db-logs
```

**2. 迁移卡住或失败**
```bash
# 检查迁移状态
prisma-status

# 手动回滚
migrate-rollback-prod
```

**3. 权限问题**
```bash
# 确保脚本可执行
chmod +x scripts/*.sh

# 检查SSH密钥权限
chmod 600 /path/to/ssh/key
```

### 获取帮助

1. **查看脚本帮助**：每个脚本都支持 `--help` 参数
2. **查看SOP文档**：`migration-sop` 或查看 `docs/database-migration-sop.md`
3. **检查日志**：使用 `db-logs` 查看详细日志

## 📚 相关文档

- [数据库迁移管理SOP](../docs/database-migration-sop.md)
- [项目架构文档](../README.md)
- [Prisma官方文档](https://www.prisma.io/docs/)

## 🔄 版本历史

- **v1.0** (2025-07-25) - 初始版本，包含基础迁移管理功能
- 支持本地和生产环境
- 集成备份、迁移、验证工具
- 提供快速命令别名

---

**维护者**：爆款解构器开发团队  
**最后更新**：2025-07-25