# 爆款解构器 - 数据库迁移管理SOP

## 概述

本文档定义了爆款解构器项目的数据库迁移管理标准作业程序，确保数据库schema变更的一致性、可追溯性和安全性。

## 核心原则

### 1. 统一管理原则
- **单一真相源**：所有数据库schema变更必须通过Prisma管理
- **版本一致性**：Web服务和AI服务共享同一套数据库schema定义
- **依赖透明**：表之间的外键关系在schema中明确定义

### 2. 安全优先原则
- **向后兼容**：迁移必须保证现有数据不丢失
- **可回滚性**：每个迁移都有对应的回滚方案
- **备份先行**：生产环境迁移前必须完整备份

## 迁移管理架构

```
项目根目录/
├── 10-baokuan-jieqouqi-web/
│   └── prisma/
│       ├── schema.prisma          # ✅ 统一的schema定义文件
│       └── migrations/            # ✅ 所有迁移文件（Web + AI）
│           ├── 20250630_init/
│           ├── 20250702_init/
│           ├── 20250704_upload_session/
│           └── 20250725_script_tables/  # ✅ 已完成：脚本相关表
└── 11-baokuan-jieqouqi-ai/
    └── database/
        └── migrations/            # ⚠️ [已废弃] 已迁移到Prisma
            └── 001_add_script_tables.sql  # 仅作参考保留
```

**✅ 统一迁移管理状态**：
- Script相关模型已添加到Prisma schema
- 对应的Prisma迁移文件已生成
- 迁移一致性已验证通过 (参见: `migration-consistency-report.md`)
- 可以开始使用Prisma作为唯一迁移管理工具

## 操作流程

### 开发环境迁移流程

#### 1. Schema变更
```bash
cd 10-baokuan-jieqouqi-web

# 1. 修改 prisma/schema.prisma
# 2. 生成迁移文件
npx prisma migrate dev --name descriptive_migration_name

# 3. 验证迁移
npx prisma db push
```

#### 2. 迁移验证清单
- [ ] 迁移SQL语法正确
- [ ] 外键约束正确设置
- [ ] 索引已正确创建
- [ ] 数据类型符合业务需求
- [ ] 无数据丢失风险

#### 3. 代码同步
```bash
# 更新Prisma Client
npx prisma generate

# 提交变更
git add .
git commit -m "feat(db): add script management tables"
git push
```

### 生产环境迁移流程

#### 阶段1：准备阶段
```bash
# 1. 数据库备份
ssh root@43.142.178.200 "docker exec postgres_db pg_dump -U postgres -d deconstructor_db > /backup/$(date +%Y%m%d_%H%M%S)_pre_migration.sql"

# 2. 检查迁移状态
cd /opt/baokuan-jiegouqi/app/10-baokuan-jieqouqi-web
npx prisma migrate status
```

#### 阶段2：执行迁移
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 执行迁移
npx prisma migrate deploy

# 3. 验证迁移结果
npx prisma db pull
```

#### 阶段3：验证阶段
```bash
# 1. 检查表结构
docker exec postgres_db psql -U postgres -d deconstructor_db -c "\dt baokuan_app.*"

# 2. 验证约束
docker exec postgres_db psql -U postgres -d deconstructor_db -c "\d+ baokuan_app.scripts"

# 3. 应用健康检查
curl -f http://localhost:3000/api/health
curl -f http://localhost:8000/ping
```

## 迁移类型和命名规范

### 命名规范
```
YYYYMMDD_HHMMSS_descriptive_name
```

**示例**：
- `20250725_143000_add_script_tables`
- `20250726_100000_update_user_index`
- `20250727_150000_remove_deprecated_fields`

### 迁移类型

#### 1. 新增表 (CREATE TABLE)
```sql
-- ✅ 安全操作
CREATE TABLE IF NOT EXISTS new_table (...);
```

#### 2. 添加列 (ADD COLUMN)
```sql
-- ✅ 安全操作（向后兼容）
ALTER TABLE existing_table ADD COLUMN new_column TYPE DEFAULT value;
```

#### 3. 删除列 (DROP COLUMN)
```sql
-- ⚠️ 危险操作，需要分阶段执行
-- 阶段1：标记列为废弃（代码不再使用）
-- 阶段2：等待一个发布周期
-- 阶段3：删除列
ALTER TABLE existing_table DROP COLUMN deprecated_column;
```

#### 4. 修改列类型 (ALTER COLUMN)
```sql
-- ⚠️ 高风险操作，需要详细测试
-- 确保数据转换不会丢失信息
ALTER TABLE existing_table ALTER COLUMN column_name TYPE new_type USING conversion_expression;
```

## 应急处理程序

### 迁移失败处理

#### 1. 立即停止
```bash
# 停止所有服务
docker-compose down
```

#### 2. 评估影响
```bash
# 检查数据库状态
docker exec postgres_db psql -U postgres -d deconstructor_db -c "\dt"

# 检查迁移状态
npx prisma migrate status
```

#### 3. 回滚策略

**选项A：数据库回滚**
```bash
# 从备份恢复
docker exec postgres_db psql -U postgres -d deconstructor_db < /backup/pre_migration.sql
```

**选项B：代码回滚**
```bash
# 回滚到上个稳定版本
git revert <migration_commit>
git push origin main
```

### 生产环境迁移检查清单

#### 迁移前检查
- [ ] 已完成数据库备份
- [ ] 迁移已在开发/测试环境验证
- [ ] 所有服务健康状态正常
- [ ] 维护窗口时间已确认
- [ ] 回滚方案已准备

#### 迁移中监控
- [ ] 数据库连接状态
- [ ] 迁移执行进度
- [ ] 系统资源使用
- [ ] 错误日志监控

#### 迁移后验证
- [ ] 表结构正确性
- [ ] 数据完整性
- [ ] 外键约束生效
- [ ] 应用服务正常
- [ ] 业务功能可用

## 最佳实践

### 1. Schema设计原则
```prisma
// ✅ 良好的模型设计 (已实现的Script模型示例)
model Script {
  id          String   @id @default(uuid())
  title       String   @db.VarChar(255)
  status      ScriptStatus @default(DRAFT)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 灵活的关联关系 - 支持多种创建方式
  card        AnalysisCard? @relation(fields: [cardId], references: [id], onDelete: Cascade)
  cardId      String?
  source      AnalysisSource? @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  sourceId    String?
  
  creator     User @relation(fields: [creatorId], references: [id])
  creatorId   String
  
  sections    ScriptSection[]
  editHistory ScriptEditHistory[]
  
  @@map("scripts")
  @@index([cardId])
  @@index([sourceId])
  @@index([creatorId])
}

// ✅ 使用枚举提供类型安全
enum ScriptStatus {
  DRAFT     // 草稿
  PUBLISHED // 已发布
  ARCHIVED  // 已归档
}
```

### 2. 迁移安全规则
- **渐进式变更**：大的schema变更分解为多个小迁移
- **保持兼容**：新字段设置合理默认值
- **索引优化**：在低峰期添加索引
- **约束检查**：先添加约束（不强制），验证后再强制

### 3. 团队协作规范
- **代码审查**：所有迁移必须经过同行评审
- **文档更新**：重要schema变更必须更新API文档
- **沟通透明**：生产迁移前通知所有相关团队

### 4. 迁移一致性验证
- **自动检查**：使用迁移验证脚本确保一致性
- **详细报告**：参考 `migration-consistency-report.md` 获取迁移对比详情
- **兼容性测试**：确保新迁移与现有数据兼容

## 工具和脚本

### 常用命令脚本
```bash
# 快速迁移状态检查
alias migration-status="npx prisma migrate status"

# 本地重置数据库
alias db-reset="npx prisma migrate reset --force"

# 生产备份
alias prod-backup="ssh root@server 'docker exec postgres_db pg_dump -U postgres -d deconstructor_db > /backup/$(date +%Y%m%d_%H%M%S).sql'"
```

### 自动化脚本
创建 `scripts/migrate.sh`：
```bash
#!/bin/bash
# 安全的生产迁移脚本
set -e

echo "🔍 检查迁移状态..."
npx prisma migrate status

echo "📤 创建备份..."
# 备份逻辑

echo "🚀 执行迁移..."
npx prisma migrate deploy

echo "✅ 验证迁移..."
# 验证逻辑
```

## 联系人和资源

- **数据库负责人**：[开发团队负责人]
- **紧急联系**：[24/7值班电话]
- **文档位置**：`docs/database-migration-sop.md`
- **迁移记录**：`docs/migration-history.md`

---

**版本**：v1.0  
**最后更新**：2025-07-25  
**下次审核**：2025-08-25


