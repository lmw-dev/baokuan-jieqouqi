# ---- Base Stage: 基础镜像 ----
# 定义一个包含Node.js和pnpm的基础环境
FROM node:18-alpine AS base
WORKDIR /app

# 接收构建参数
ARG NPM_REGISTRY=https://registry.npmjs.org

# 配置npm和pnpm镜像源
RUN npm config set registry $NPM_REGISTRY
# 全局安装pnpm
RUN npm install -g pnpm
RUN pnpm config set registry $NPM_REGISTRY

# ---- Builder Stage: 构建阶段 ----
# 在这个阶段，我们安装所有依赖，并构建项目
FROM base AS builder

# 重新声明构建参数（多阶段构建需要）
ARG NPM_REGISTRY=https://registry.npmjs.org
RUN pnpm config set registry $NPM_REGISTRY

COPY package.json pnpm-lock.yaml ./
# 安装所有依赖（包括devDependencies）
RUN pnpm install --frozen-lockfile
# 复制 Prisma schema 文件
COPY prisma ./prisma
# 生成 Prisma 客户端
RUN pnpm prisma generate
COPY . .
# 执行构建
RUN pnpm run build
# "修剪"掉devDependencies，只保留生产依赖
RUN pnpm prune --prod

# ---- Runner Stage: 运行阶段 ----
# 这是最终的生产镜像，只包含运行所需的最少文件
FROM base AS runner
WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建一个低权限用户以增强安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 从builder阶段拷贝必要的文件
# 注意：我们从已经"修剪"过的builder阶段拷贝，所以node_modules是纯净的
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 切换到低权限用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用的命令
CMD ["pnpm", "start"]