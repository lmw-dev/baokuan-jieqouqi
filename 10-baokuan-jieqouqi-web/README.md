# 🚀 Web应用 (主应用) - 爆款解构器

本项目是"爆款解构器"的全栈主应用，基于 **Next.js App Router** 构建。

> **[⬅️ 返回Monorepo根目录README](../README.md)**

## 职责
- 负责所有用户界面 (UI)。
- 处理用户认证和会话管理。
- **作为数据库的唯一所有者**，通过Prisma管理数据库结构和迁移。
- 处理所有常规业务逻辑（如卡片CRUD）。
- 在需要时，通过API调用`ai`协处理器服务。

---

## 💻 目录结构说明

``` bash
/10-baokuan-jieqouqi-web
|--src
	|-- /app                     # Next.js App Router 核心目录
	|   |-- /api                 # BFF API路由 (e.g., /api/ai-proxy)
	|   |-- /auth                # 认证相关的页面 (login, callback)
	|   |-- /cards               # 卡片相关页面
	|   |   |-- /new             # 新建卡片页
	|   |   |-- /[cardId]/edit   # 编辑卡片页
	|   |-- /dashboard           # 用户工作台页面
	|   |-- layout.tsx           # 根布局
	|   |-- page.tsx             # 首页
	|   |-- ...                  # 其他页面路由
	|
	|-- /components              # 可复用React组件
	|   |-- /ui                  # 基础UI组件 (Button, Input, Card...) (原子)
	|   |-- /features            # 特定功能的复合组件 (e.g., AnalysisCardForm)
	|
	|-- /lib                     # 通用工具库
	|   |-- api-client.ts        # 统一的API客户端
	|   |-- prisma.ts            # Prisma客户端实例
	|   |-- utils.ts             # 通用辅助函数
	|   |-- hooks.ts             # 自定义React Hooks
	|
	|-- /stores                  # 全局状态管理 (e.g., Zustand)
	|
	|-- /types                   # 全局TypeScript类型定义
|
|-- /public                      # 静态资源 (图片, favicon等)
|
|-- next.config.mjs              <-- 配置文件
|-- package.json                 <-- 配置文件
|-- tsconfig.json                <-- 配置文件
...
```

- **/src/app**: Next.js App Router核心。
  - `**/page.tsx` & `layout.tsx`: 定义页面UI。服务器组件可直接在此处进行数据库查询。
  - `**/api/**/route.ts`: 用于创建BFF（服务于前端的后端）API端点，例如代理对`ai`服务的调用。
- **/src/components**: 可复用的React组件。
  - `/ui`: 原子级别的UI组件 (Button, Input等)。
  - `/features`: 特定功能的复合组件 (CardForm, CardList等)。
- **/src/lib**: 通用工具库，如Prisma客户端实例、API客户端、辅助函数。
- **/prisma**: Prisma的核心目录。
  - `schema.prisma`: **数据库模型的唯一真实来源**。

---

## 🗄️ 数据库管理

### 数据库架构概述

本项目作为数据库的**唯一所有者**，使用 Prisma 管理数据库结构和迁移：

- **数据库**: PostgreSQL
- **Schema**: `baokuan_app` (在 `deconstructor_db` 数据库中)
- **ORM**: Prisma
- **迁移文件**: `prisma/migrations/`

### 环境变量配置

确保项目根目录的 `.env` 文件中包含：
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/deconstructor_db?schema=baokuan_app"
```

### 基础数据库操作

#### 初始化数据库
```bash
# 首次设置时，运行迁移创建数据库结构
npm run prisma:migrate

# 或者使用完整命令
npx dotenv -e ../.env -- prisma migrate dev
```

#### 检查数据库状态
```bash
# 查看迁移状态
npx dotenv -e ../.env -- prisma migrate status

# 查看数据库结构
npx dotenv -e ../.env -- prisma studio
```

### Schema.prisma 更新工作流程

当你需要修改数据库结构时，请按以下步骤操作：

#### 1. 修改 Schema 文件
编辑 `prisma/schema.prisma` 文件，添加、修改或删除模型：

```prisma
// 例如：添加新字段
model User {
  id        String   @id @default(uuid())
  email     String?  @unique
  name      String?
  // 新增字段
  avatar    String?  // 用户头像URL
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### 2. 创建和应用迁移
```bash
# 创建新的迁移文件（开发环境）
npm run prisma:migrate

# 系统会提示输入迁移名称，例如：
# Enter a name for the new migration: › add_user_avatar_field
```

这个命令会：
- 生成新的迁移文件 `prisma/migrations/YYYYMMDD_add_user_avatar_field/migration.sql`
- 自动应用迁移到数据库
- 重新生成 Prisma 客户端

#### 3. 验证迁移结果
```bash
# 检查迁移是否成功应用
npx dotenv -e ../.env -- prisma migrate status

# 查看生成的迁移文件
cat prisma/migrations/*/migration.sql
```

#### 4. 更新应用代码
在应用代码中使用新的字段：

```typescript
// 例如：在组件中使用新字段
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    avatar: true, // 新字段
  }
});
```

### 生产环境部署

#### 仅部署迁移（不生成示例数据）
```bash
npx dotenv -e ../.env -- prisma migrate deploy
```

#### 重新生成 Prisma 客户端
```bash
npx dotenv -e ../.env -- prisma generate
```

### 危险操作

#### 重置数据库（⚠️ 会删除所有数据）
```bash
# 开发环境重置
npx dotenv -e ../.env -- prisma migrate reset

# 这会：
# 1. 删除数据库中的所有数据
# 2. 重新运行所有迁移
# 3. 运行 seed 脚本（如果有）
```

#### 修复迁移问题
```bash
# 如果迁移出现问题，可以标记为已解决
npx dotenv -e ../.env -- prisma migrate resolve --applied "MIGRATION_NAME"

# 或者回滚到特定迁移
npx dotenv -e ../.env -- prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

### 常见问题排除

#### 问题：环境变量未找到
```
Error: Environment variable not found: DATABASE_URL
```

**解决方案**：
```bash
# 确保使用 dotenv 加载环境变量
npx dotenv -e ../.env -- prisma migrate status
```

#### 问题：数据库连接失败
```
Error: P1001 Can't reach database server
```

**解决方案**：
1. 确保 PostgreSQL 服务正在运行
2. 检查 `DATABASE_URL` 配置是否正确
3. 验证数据库服务器地址和端口

#### 问题：Schema 不同步
```
Error: The database schema is not in sync with the current migrations
```

**解决方案**：
```bash
# 运行迁移同步数据库
npm run prisma:migrate
```

### 最佳实践

1. **先修改 Schema，再写代码**：始终先更新 `schema.prisma`，运行迁移，然后再编写使用新结构的代码。

2. **迁移命名要清晰**：使用描述性的迁移名称，如 `add_user_avatar_field`、`create_analysis_cards_table`。

3. **谨慎处理生产数据**：在生产环境中，使用 `prisma migrate deploy` 而不是 `prisma migrate dev`。

4. **备份重要数据**：在重大架构变更前，务必备份生产数据库。

5. **团队协作**：确保团队成员在拉取代码后运行 `npm run prisma:migrate` 来同步数据库。

---

## 🛠️ 本地开发

### 模式一：专注前端开发 (推荐用于UI开发)

此模式直接在你的Mac上运行Next.js开发服务器，提供最快的响应和热更新。

```bash
# 进入web项目目录
cd 10-baokuan-jieqouqi-web

# 安装依赖 (如果尚未安装)
pnpm install

# 启动开发服务器
pnpm dev
````

**注意**: 此模式下，你需要确保后端依赖的服务（PostgreSQL, AI服务等）正在独立运行（例如，通过Docker Compose单独启动它们）。

### 模式二：全栈集成开发

此模式通过Docker Compose启动包含所有服务（web, ai, db等）的完整环境。

```bash
# 进入deploy项目目录
cd ../12-baokuan-jieqouqi-deploy

# 运行开发脚本
./start-dev.sh
```

应用将运行在 `http://localhost:3000`。



---
