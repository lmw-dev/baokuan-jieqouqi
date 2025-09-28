# 🚀 爆款解构器 (Viral Hit Deconstructor)

[![Status](https://img.shields.io/badge/status-in_development-orange.svg)](https://shields.io/)

“爆款解构器”是一个旨在帮助内容创作者（特别是评测类博主）系统性地分析、解构爆款内容，并快速生成高质量创作脚本的AI辅助工具。


> [!IMPORTANT]
> **[➡️ 点击这里，进入Obsidian战略指挥室](obsidian://open?vault=Documents&file=1_Projects%2FP-2025-%E7%88%86%E6%AC%BE%E8%A7%A3%E6%9E%84%E5%99%A8%2F00%20-%20%E9%A1%B9%E7%9B%AE%E9%A9%BE%E9%A9%B6%E8%88%B1)** > *（这里是项目的“唯一真实之源”，包含了所有PRD、设计和决策文档）*

---

## 🏛️ 系统架构：主应用 + AI协处理器

本项目采用“主应用+AI协处理器”的Monorepo架构，职责分明，便于独立开发与扩展。

- **主应用 (`web`)**: Next.js全栈应用，负责UI、用户认证、常规业务CRUD及数据库管理。
- **AI协处理器 (`ai`)**: FastAPI专项服务，负责处理计算密集型的AI任务，被主应用按需调用。
- **部署 (`deploy`)**: 存放Docker Compose编排文件及部署脚本。

```mermaid
graph TD
    subgraph "用户端"
        User[👤 用户] --> Browser[🌐 浏览器]
    end

    subgraph "主应用 (Next.js)"
        Browser -- "HTTPS" --> A[Next.js App<br>/pages, /components]
        A -- "Prisma Client" --> DB[(🐘 PostgreSQL)]
        A -- "API Call" --> B[AI协处理器<br>FastAPI]
    end
    
    subgraph "专项服务"
        B -- "SQLModel/SQLAlchemy" --> DB
    end

    subgraph "云服务"
        Auth[🔒 Logto 认证服务<br>Docker]
        Store[📦 腾讯云COS]
    end

    A <--> Auth
    A --> Store

````

## 🛠️ 本地开发环境启动

### 前提条件

1.  已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。
2.  已安装 `pnpm` (`npm install -g pnpm`)。
3.  已克隆本Monorepo仓库 [爆款解构器v1](https://gitee.com/liumw/baokuan-jieqouqi.git)。


### 启动步骤

1.  **配置环境变量**:

      - 从`deploy`目录下的`.env.example`复制一份，创建`.env`文件。
      - 填写所有必要的环境变量（如数据库密码等）。

2.  **启动开发环境**:

      - 进入`deploy`子目录 (`cd 12-baokuan-jieqouqi-deploy`)。
      - 授予脚本执行权限（仅需一次）：`chmod +x *.sh`
      - 执行启动脚本：

    <!-- end list -->

    ```bash
    ./start-dev.sh
    ```

    该脚本会自动构建所有服务的镜像，并以支持代码热更新的模式启动整个应用。

3.  **访问应用**:

      - 前端应用: `http://localhost:3000`
      - 后端API: `http://localhost:8000`

## 💻 技术栈核心

| 组件 | 技术栈 | 版本 |
| :--- | :--- | :--- |
| Web应用端 | `Next.js`, `TypeScript`, `React` | `15.4.x`, `5.8.x`, `18.x` |
| AI服务端 | `Python`, `FastAPI` | `3.13+`, `Latest` |
| 主数据库 | PostgreSQL + pgvector | `17` |
| ORM | Prisma (在Next.js中) | `5.x` |
| 容器化 | Docker, Docker Compose | `Latest` |
| 认证服务 | Logto (开源自托管) | `Latest` |

## 📜 核心规范

本项目的开发严格遵循我们共同制定的“Vibe Coding体系”规范。

  - **代码规范**: `.editorconfig`, `.prettierrc.json`, `.eslintrc.json`, `pyproject.toml`
  - **Git规范**: [指南 - Git工作流与提交规范](obsidian://open?vault=Documents&file=2_Areas%2F2_11-%E4%BA%A7%E5%93%81%E7%A0%94%E5%8F%91%2F%E6%8C%87%E5%8D%97%20-%20Git%E5%B7%A5%E4%BD%9C%E6%B5%81%E4%B8%8E%E6%8F%90%E4%BA%A4%E8%A7%84%E8%8C%83)
  - **AI协同规范**: 参见`.cursor/rules/`目录下的所有AI规则。



````