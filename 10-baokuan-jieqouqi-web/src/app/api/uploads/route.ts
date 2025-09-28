// 统一文件上传API - 简化的putObject模式
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import COS from 'cos-nodejs-sdk-v5'
import { getAuthUser, createUnauthorizedResponse } from '@/lib/auth-helpers'
import { createSuccessResponse, createErrorResponse, ErrorCode, type ErrorCodeType } from '@/errors/codes'

const prisma = new PrismaClient()

// COS延迟初始化函数
function createCOSInstance() {
  if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY) {
    throw new Error('COS credentials not configured')
  }
  
  return new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Upload API started ===')
    
    // 检查环境变量
    if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY || !process.env.COS_BUCKET || !process.env.COS_REGION) {
      console.error('=== Missing COS environment variables ===')
      return NextResponse.json(
        createErrorResponse(ErrorCode.UPLOAD_FAILED, '服务配置错误'),
        { status: 500 }
      )
    }
    
    // 获取认证用户信息
    const user = await getAuthUser(request)
    if (!user) {
      console.log('=== User not authenticated ===')
      return createUnauthorizedResponse()
    }
    
    console.log('=== User authenticated:', user.id)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileHash = formData.get('fileHash') as string | null
    
    if (!file) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.MISSING_PARAMETER, '未选择文件'),
        { status: 400 }
      )
    }

    console.log('=== Upload request - file:', file.name, 'hash:', fileHash ? 'provided' : 'none')

    // 如果提供了哈希值，先检查是否已存在相同文件
    if (fileHash) {
      const existingFile = await prisma.mediaFile.findUnique({
        where: { fileHash }
      })

      if (existingFile) {
        console.log('=== File already exists, instant upload success:', existingFile.originalFilename)
        
        // 构建COS URL
        const bucket = process.env.COS_BUCKET!
        const region = process.env.COS_REGION!
        const cosUrl = `https://${bucket}.cos.${region}.myqcloud.com/${existingFile.storagePath}`

        return NextResponse.json(
          createSuccessResponse({
            mediaFileId: existingFile.id,
            originalFilename: existingFile.originalFilename,
            cosUrl: cosUrl,
            fileSize: existingFile.fileSize,
            status: existingFile.status,
            isInstantUpload: true, // 标记为秒传
            message: '文件已存在，秒传成功'
          }, '秒传成功'),
          { status: 200 }
        )
      }
    }

    // 文件验证
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.FILE_TOO_LARGE),
        { status: 400 }
      )
    }

    const allowedTypes = ['video/mp4', 'video/mov', 'audio/mp3', 'audio/wav', 'audio/m4a']
    if (!allowedTypes.some(type => file.type.startsWith(type.replace('/*', '')))) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.FILE_TYPE_NOT_SUPPORTED),
        { status: 400 }
      )
    }

    // 生成文件路径和key
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split('.').pop()
    const key = `uploads/${user.id}/${timestamp}-${randomSuffix}.${fileExtension}`
    
    // 直接上传到腾讯云COS
    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = process.env.COS_BUCKET!
    const region = process.env.COS_REGION!

    console.log('=== Direct COS upload - file:', file.name, 'size:', file.size)
    console.log('=== COS config - bucket:', bucket, 'region:', region, 'key:', key)

    // 创建COS实例
    const cos = createCOSInstance()
    
    const cosResult = await cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: buffer.length
    })

    console.log('=== COS upload result:', cosResult)

    // 构建文件访问URL
    const cosUrl = `https://${bucket}.cos.${region}.myqcloud.com/${key}`

    // 保存文件记录到数据库
    const mediaFile = await prisma.mediaFile.create({
      data: {
        originalFilename: file.name,
        storagePath: key,
        fileSize: file.size,
        mimeType: file.type,
        status: 'ready', // 直接设置为ready状态
        fileHash: fileHash, // 保存哈希值（如果提供）
      }
    })

    console.log('=== Media file created:', mediaFile.id, 'with hash:', fileHash ? 'yes' : 'no')

    return NextResponse.json(
      createSuccessResponse({
        mediaFileId: mediaFile.id,
        originalFilename: mediaFile.originalFilename,
        cosUrl: cosUrl,
        fileSize: mediaFile.fileSize,
        status: mediaFile.status,
        isInstantUpload: false, // 标记为正常上传
      }, '文件上传成功'),
      { status: 200 }
    )

  } catch (error) {
    console.error('=== Upload error details ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    let errorCode: ErrorCodeType = ErrorCode.UPLOAD_FAILED
    let errorMessage = '文件上传失败'
    
    if (error instanceof Error) {
      if (error.message.includes('RequestTimeTooSkewed')) {
        errorMessage = '服务器时间同步错误，请稍后重试'
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        errorMessage = '服务配置错误，请联系管理员'
      } else if (error.message.includes('NoSuchBucket')) {
        errorMessage = '存储服务配置错误'
      } else {
        errorMessage = `上传失败: ${error.message}`
      }
    }

    return NextResponse.json(
      createErrorResponse(errorCode, errorMessage),
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}