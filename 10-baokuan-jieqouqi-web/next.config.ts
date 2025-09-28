import type { NextConfig } from 'next'
import dotenv from 'dotenv'
import path from 'path'

// 加载主目录的 .env 文件
dotenv.config({
  path: path.resolve(__dirname, '../.env')
})

const nextConfig: NextConfig = {
  // 允许大文件上传 - 移动到新的配置位置
  serverExternalPackages: ['cos-nodejs-sdk-v5'],
  // 配置API路由
  async rewrites() {
    return []
  },
  // 增加body parser限制
  async headers() {
    return [
      {
        source: '/api/uploads/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}

export default nextConfig
