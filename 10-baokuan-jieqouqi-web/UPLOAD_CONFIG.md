# 文件上传系统配置指南

## 📋 概述

本文档说明如何配置腾讯云COS文件上传系统的相关环境变量和依赖。

## 🔧 环境变量配置

在 `.env.local` 文件中添加以下环境变量：

```bash
# 腾讯云COS配置
COS_SECRET_ID=your-cos-secret-id
COS_SECRET_KEY=your-cos-secret-key
COS_BUCKET=your-bucket-name
COS_REGION=ap-guangzhou
COS_BASE_URL=https://your-bucket-name.cos.ap-guangzhou.myqcloud.com
```

## 🏗️ 系统架构

### 数据流程
```
1. 前端选择文件 → useFileUpload Hook
2. 调用 /api/uploads/init → 创建上传会话
3. 调用 /api/uploads/credentials → 获取临时密钥
4. 直传到腾讯云COS → 文件上传
5. 调用 /api/uploads/complete → 完成上传
```

### 核心组件

#### 1. 数据模型
- **UploadSession**: 上传会话管理
- **MediaFile**: 媒体文件记录
- **User**: 用户关联

#### 2. API端点
- `POST /api/uploads/init` - 初始化上传会话
- `POST /api/uploads/credentials` - 获取上传凭证
- `POST /api/uploads/complete` - 完成上传
- `GET /api/uploads/status/:id` - 查询上传状态
- `DELETE /api/uploads/cancel/:id` - 取消上传

#### 3. 前端组件
- `fileUploadService` - 核心服务类
- `useFileUpload` - React Hook封装
- `UploadDemoPage` - 演示页面

## 🎯 功能特性

### ✅ 已实现功能
- 文件验证（大小、类型）
- 进度监控和状态追踪
- 错误处理和重试机制
- 上传取消功能
- 批量上传支持
- 文件去重检测
- 数据库会话管理
- TypeScript类型安全

### 🔄 待实现功能
- 真实的腾讯云STS临时密钥生成
- 真实的COS预签名URL生成
- 缩略图自动生成
- 视频/音频转文字分析
- 断点续传功能
- 上传速度限制

## 🚀 快速开始

### 1. 数据库迁移
```bash
cd 10-baokuan-jieqouqi-web
npx prisma migrate dev
npx prisma generate
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问Demo页面
```
http://localhost:3000/upload-demo
```

### 4. 测试文件上传
- 选择支持的文件格式（MP4, MOV, MP3, WAV, M4A）
- 点击"单文件上传"或"批量上传"
- 观察上传进度和状态

## 📖 使用指南

### 在代码中使用

#### 1. 导入Hook
```typescript
import { useFileUpload } from '@/hooks/use-file-upload'
```

#### 2. 基本使用
```typescript
const { 
  isUploading, 
  progress, 
  error, 
  result, 
  uploadFile 
} = useFileUpload({
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: ['video/mp4', 'audio/mp3'],
  onProgress: (progress) => console.log(progress),
  onSuccess: (result) => console.log(result),
  onError: (error) => console.error(error)
})

// 上传文件
const handleUpload = async (file: File) => {
  try {
    const result = await uploadFile(file)
    console.log('Upload success:', result)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
```

#### 3. 直接使用服务
```typescript
import { fileUploadService } from '@/lib/upload-service'

const result = await fileUploadService.uploadFile(file, {
  maxSize: 50 * 1024 * 1024,
  onProgress: (progress) => {
    console.log(`${progress.percentage}% completed`)
  }
})
```

## 🔒 安全考虑

### 1. 临时密钥
- 使用腾讯云STS服务生成临时密钥
- 密钥有效期建议设置为1小时
- 限制密钥权限仅允许上传操作

### 2. 文件验证
- 前端和后端双重验证文件大小和类型
- 生成唯一的文件路径避免冲突
- 实现文件哈希去重

### 3. 会话管理
- 上传会话设置过期时间
- 定期清理过期会话
- 跟踪上传状态防止重复处理

## 🛠️ 故障排除

### 常见问题

#### 1. "uploadSession not found" 错误
- 检查数据库连接是否正常
- 确认Prisma迁移已执行
- 验证环境变量配置

#### 2. 文件上传失败
- 检查腾讯云COS配置
- 确认密钥权限设置
- 查看网络连接状态

#### 3. TypeScript错误
- 重新生成Prisma client: `npx prisma generate`
- 重启TypeScript服务器
- 检查类型导入路径

### 调试模式
```typescript
// 启用详细日志
const { uploadFile } = useFileUpload({
  onProgress: (progress) => {
    console.log('Progress:', progress)
  },
  onError: (error) => {
    console.error('Error:', error)
  }
})
```

## 📚 技术文档

### API接口文档

详见各API文件中的TypeScript类型定义：
- `src/types/upload.ts` - 核心类型定义
- `src/app/api/uploads/*/route.ts` - API实现

### 数据库模型

详见Prisma schema：
- `prisma/schema.prisma` - 数据模型定义

## 🔮 未来规划

### Phase 1 - 生产就绪
- [ ] 集成真实的腾讯云SDK
- [ ] 实现STS临时密钥服务
- [ ] 添加文件上传日志记录
- [ ] 完善错误处理和监控

### Phase 2 - 功能增强
- [ ] 断点续传支持
- [ ] 多格式文件支持
- [ ] 自动缩略图生成
- [ ] 上传统计和分析

### Phase 3 - 性能优化
- [ ] CDN加速配置
- [ ] 并发上传优化
- [ ] 内存使用优化
- [ ] 网络重试策略

---

如有问题，请参考相关代码文件或联系开发团队。 