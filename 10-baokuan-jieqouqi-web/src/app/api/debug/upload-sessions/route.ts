// 调试API - 查看上传会话
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const sessions = await prisma.uploadSession.findMany({
      include: {
        mediaFile: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching upload sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upload sessions' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}