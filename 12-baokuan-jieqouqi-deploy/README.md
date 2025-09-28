# 爆款解构器 - 部署工具

> 极简化的部署工具，支持本地开发和云端部署

## 📁 项目结构

```
12-baokuan-jieqouqi-deploy/
├── local/                          # 本地开发环境
│   ├── start.sh                    # 🚀 本地开发一键启动
│   └── docker-compose.local.yml    # 本地环境配置
├── cloud/                          # 云端部署
│   ├── deploy.sh                   # 🚀 云端部署脚本
│   └── docker-compose.cloud.yml    # 云端环境配置
├── README.md                       # 使用说明 (本文件)
└── package.json                    # 项目配置
```

## 🚀 快速开始

### 本地开发环境

启动基础设施服务（PostgreSQL、Redis、Logto）：

```bash
cd local
./start.sh
```

启动后会自动运行：
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`  
- **Logto**: `localhost:3001`

然后手动启动应用服务：
```bash
# 启动Web前端
cd ../../10-baokuan-jieqouqi-web
npm run dev

# 启动AI后端
cd ../../11-baokuan-jieqouqi-ai
python main.py
```

### 云端部署

构建并推送镜像到腾讯云TCR：

```bash
cd cloud
./deploy.sh build   # 仅构建并推送
./deploy.sh deploy  # 仅部署
./deploy.sh all     # 构建+部署（默认）
```

## 🗄️ 数据库管理

### 数据库架构说明

本项目使用单个PostgreSQL数据库实例，包含两个schema：
- **`baokuan_app`**: 主应用数据（用户、分析源、分析卡片等）
- **`baokuan_logto`**: Logto认证服务数据

### 初始化数据库

首次运行项目时，需要初始化数据库schema：

```bash
# 1. 确保基础设施服务已启动
cd local && ./start.sh

# 2. 在新的终端中，运行数据库迁移
cd ../../10-baokuan-jieqouqi-web
npm run prisma:migrate
```

### 数据库迁移命令

```bash
# 进入Web项目目录
cd 10-baokuan-jieqouqi-web

# 运行数据库迁移（开发环境）
npm run prisma:migrate

# 检查迁移状态
npx dotenv -e ../.env -- prisma migrate status

# 重置数据库（⚠️ 危险操作，会删除所有数据）
npx dotenv -e ../.env -- prisma migrate reset

# 生成Prisma客户端
npx dotenv -e ../.env -- prisma generate

# 查看数据库内容（可选）
npx dotenv -e ../.env -- prisma studio
```

### 生产环境迁移

```bash
# 仅部署迁移（不生成示例数据）
npx dotenv -e ../.env -- prisma migrate deploy
```

### 数据库连接字符串说明

在 `.env` 文件中配置：
```env
# 主应用数据库连接
DATABASE_URL="postgresql://postgres:password@localhost:5432/deconstructor_db?schema=baokuan_app"

# Logto服务数据库连接（在Docker容器中使用）
LOGTO_DB_URL="postgresql://postgres:password@db:5432/deconstructor_db?schema=baokuan_logto"
```

## 🛠️ 服务说明

### 本地开发流程
1. 执行 `local/start.sh` 启动基础设施
2. 运行数据库迁移（首次启动时）
3. 在IDE中启动Web前端和AI后端
4. 访问 `http://localhost:3000` 使用应用
5. 访问 `http://localhost:3001/console` 管理Logto

### 云端部署流程
1. 执行 `cloud/deploy.sh build` 构建和推送镜像
2. 执行 `cloud/deploy.sh deploy` 部署到云端
3. 检查服务状态和日志

## 🔧 环境配置

### 环境变量文件
确保项目根目录有 `.env` 文件：

```
09-baokuan-jieqouqi/
├── .env                    # ← 环境变量文件位置
├── 10-baokuan-jieqouqi-web/
├── 11-baokuan-jieqouqi-ai/
└── 12-baokuan-jieqouqi-deploy/
```

### 环境变量配置

完整的 `.env` 文件配置示例：
```env
# === PostgreSQL Database ===
POSTGRES_DB=deconstructor_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
APP_DB_SCHEMA=baokuan_app
LOGTO_DB_SCHEMA=baokuan_logto

# === Database Connection Strings ===
DATABASE_URL="postgresql://postgres:password@localhost:5432/deconstructor_db?schema=baokuan_app"
LOGTO_DB_URL="postgresql://postgres:password@db:5432/deconstructor_db?schema=baokuan_logto"

# === Logto Authentication (Public) ===
NEXT_PUBLIC_LOGTO_ENDPOINT="http://localhost:3001"
NEXT_PUBLIC_LOGTO_APP_ID="your-logto-app-id"
NEXT_PUBLIC_LOGTO_RESOURCE=""

# === Logto Authentication (Private) ===
LOGTO_APP_SECRET="your-logto-app-secret"
LOGTO_COOKIE_SECRET="your-cookie-secret-at-least-32-characters"

# === Application URLs ===
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:8000"

# === Next.js Configuration ===
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

### 云端部署配置
修改 `cloud/deploy.sh` 中的配置：

```bash
# 腾讯云TCR配置
NAMESPACE="baokuan-jieqouqi"
REGISTRY_URL="ccr.ccs.tencentyun.com"
```

## 📋 常用命令

### 停止本地服务
```bash
cd local
docker-compose --env-file ../../.env -f docker-compose.local.yml down
```

### 停止云端服务
```bash
cd cloud
docker-compose --env-file ../../.env -f docker-compose.cloud.yml down
```

### 查看服务状态
```bash
# 本地
cd local
docker-compose --env-file ../../.env -f docker-compose.local.yml ps

# 云端
cd cloud
docker-compose --env-file ../../.env -f docker-compose.cloud.yml ps
```

### 查看服务日志
```bash
# 本地
cd local
docker-compose --env-file ../../.env -f docker-compose.local.yml logs -f

# 云端
cd cloud
docker-compose --env-file ../../.env -f docker-compose.cloud.yml logs -f
```

## 🚨 故障排除

### 数据库连接问题

**问题**: `Environment variable not found: DATABASE_URL`
**解决方案**:
```bash
# 确保在正确的目录下运行命令，并使用dotenv加载环境变量
cd 10-baokuan-jieqouqi-web
npx dotenv -e ../.env -- prisma migrate status
```

**问题**: `Invalid database credentials`
**解决方案**:
1. 检查PostgreSQL服务是否正常运行
2. 验证`.env`文件中的数据库连接字符串
3. 确保数据库schema已创建

**问题**: Schema不存在
**解决方案**:
```bash
# 运行数据库迁移重新创建schema
cd 10-baokuan-jieqouqi-web
npm run prisma:migrate
```

### 服务启动问题

**问题**: 端口被占用
**解决方案**:
```bash
# 检查端口占用情况
lsof -i :3000  # Web前端
lsof -i :3001  # Logto
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# 停止占用端口的进程
kill -9 <PID>
```

**问题**: Docker容器无法启动
**解决方案**:
```bash
# 检查Docker状态
docker ps -a
docker logs <container-name>

# 清理无用的容器和镜像
docker system prune
```

### 认证问题

**问题**: Logto认证失败
**解决方案**:
1. 检查Logto配置是否正确
2. 验证应用ID和密钥是否匹配
3. 确保回调URL配置正确

## 🎯 设计理念

这个部署工具遵循**极简化原则**：

1. **目标明确**: 本地开发 vs 云端部署完全分离
2. **操作简单**: 每个环境只需一个启动命令
3. **结构清晰**: 按功能分类，易于维护
4. **无临时脚本**: 不保留调试用的临时脚本
5. **环境隔离**: 自动检测和使用正确的环境变量文件
6. **数据安全**: 使用持久化存储，防止数据丢失

## 🔗 相关链接

- [前端项目](../10-baokuan-jieqouqi-web)
- [后端项目](../11-baokuan-jieqouqi-ai)
- [Logto文档](https://docs.logto.io/)
- [Docker Compose文档](https://docs.docker.com/compose/)
- [Prisma文档](https://www.prisma.io/docs)

## 📞 支持

如果遇到问题，请检查：
1. Docker是否正常运行
2. `.env`文件是否在项目根目录
3. 环境变量是否配置正确
4. 端口是否被占用
5. 网络连接是否正常
6. 数据库schema是否已正确迁移

---

*最后更新: 2024-07-03*