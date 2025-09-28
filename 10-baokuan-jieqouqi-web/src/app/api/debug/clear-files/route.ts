// 清理测试文件API
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // 删除所有 UploadSession
    await prisma.uploadSession.deleteMany({})
    
    // 删除所有 MediaFile
    await prisma.mediaFile.deleteMany({})
    
    return NextResponse.json({ 
      success: true,
      message: 'All files and sessions cleared' 
    })
  } catch (error) {
    console.error('Error clearing files:', error)
    return NextResponse.json(
      { error: 'Failed to clear files' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}