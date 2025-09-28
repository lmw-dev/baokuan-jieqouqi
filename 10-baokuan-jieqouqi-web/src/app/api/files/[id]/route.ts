// 获取媒体文件信息API

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('Fetching media file info for ID:', id)
    
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id },
      select: {
        id: true,
        originalFilename: true,
        fileSize: true,
        mimeType: true,
        status: true,
        storagePath: true,
        fileHash: true,
        thumbnailUrl: true,
        createdAt: true
      }
    })
    
    if (!mediaFile) {
      console.log('Media file not found:', id)
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      )
    }
    
    console.log('Media file found:', mediaFile.originalFilename)
    
    return NextResponse.json({
      success: true,
      data: mediaFile
    })
    
  } catch (error) {
    console.error('Get media file error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get media file', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log('Updating media file:', id, 'with data:', body)
    
    const updatedFile = await prisma.mediaFile.update({
      where: { id },
      data: body
    })
    
    console.log('Media file updated successfully:', updatedFile.originalFilename)
    
    return NextResponse.json({
      success: true,
      data: updatedFile
    })
    
  } catch (error) {
    console.error('Update media file error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update media file', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}