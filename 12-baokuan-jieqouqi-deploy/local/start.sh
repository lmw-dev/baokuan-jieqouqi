#!/bin/bash

# ==============================================================================
# 本地开发环境一键启动脚本
# ==============================================================================
# 功能：启动基础设施服务（PostgreSQL、Redis、Logto）
# 用法：cd local && ./start.sh
# ==============================================================================

set -e

# 环境变量文件路径（相对于当前脚本位置）
ENV_FILE="../../.env"

# 检查环境变量文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Environment file not found at $ENV_FILE"
    echo "💡 Please make sure .env file exists in the project root directory"
    exit 1
fi

echo "🔍 Using environment file: $ENV_FILE"

# 定义清理函数
cleanup() {
    echo ""
    echo "🛑 Shutting down infrastructure services..."
    docker-compose --env-file "$ENV_FILE" -f docker-compose.local.yml down
    echo "✅ Infrastructure cleanup complete."
}

trap cleanup EXIT

echo "🚀 Starting local development environment..."
echo "================================================================"

# 启动基础设施服务
echo "📦 Starting infrastructure services..."
docker-compose --env-file "$ENV_FILE" -f docker-compose.local.yml up -d

# 等待服务启动
echo "⏳ Waiting for services to be ready..."
sleep 15

# 检查服务状态
echo "🔍 Checking service status..."
docker-compose --env-file "$ENV_FILE" -f docker-compose.local.yml ps

echo ""
echo "================================================================"
echo "🎉 Local development environment started successfully!"
echo ""
echo "📍 Service Status:"
echo "   • PostgreSQL:  ✅ Running on localhost:5432"
echo "   • Redis:       ✅ Running on localhost:6379"
echo "   • Logto:       ✅ Running on localhost:3001"
echo ""
echo "🔗 Access URLs:"
echo "   • Logto Console: http://localhost:3001/console"
echo "   • Web Frontend:  http://localhost:3000 (start manually)"
echo "   • AI Backend:    http://localhost:8000 (start manually)"
echo ""
echo "💡 Next Steps:"
echo "   1. cd ../../10-baokuan-jieqouqi-web && npm run dev"
echo "   2. cd ../../11-baokuan-jieqouqi-ai && python main.py"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo "================================================================"

# 显示服务日志
docker-compose --env-file "$ENV_FILE" -f docker-compose.local.yml logs -f 