import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser, createUnauthorizedResponse } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // 获取认证用户信息
    const user = await getAuthUser(request)
    
    if (!user) {
      return createUnauthorizedResponse()
    }
    
    const body = await request.json()
    const { mediaFileId, analysisData } = body
    
    console.log('=== Saving analysis for mediaFileId:', mediaFileId)
    
    if (!mediaFileId || !analysisData) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaFileId, analysisData' },
        { status: 400 }
      )
    }
    
    // 1. 查找或创建AnalysisSource
    let analysisSource = await prisma.analysisSource.findFirst({
      where: { mediaFileId: mediaFileId }
    })
    
    if (!analysisSource) {
      // 获取媒体文件信息
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      })
      
      if (!mediaFile) {
        return NextResponse.json(
          { error: 'Media file not found' },
          { status: 404 }
        )
      }
      
      // 创建AnalysisSource
      analysisSource = await prisma.analysisSource.create({
        data: {
          title: `视频分析 - ${mediaFile.originalFilename}`,
          sourceType: 'FILE',
          sourceContent: `cos://${mediaFile.storagePath}`,
          ownerId: user.id, // 使用认证用户的真实ID
          mediaFileId: mediaFileId
        }
      })
    }
    
    // 2. 查找现有的AnalysisCard或创建新的
    let analysisCard = await prisma.analysisCard.findFirst({
      where: { sourceId: analysisSource.id }
    })
    
    // 3. 将前端数据结构映射到数据库字段
    const { trustHook, empathyAnchor, valueMap } = analysisData
    
    const cardData = {
      versionTitle: `用户编辑版本 - ${new Date().toLocaleString()}`,
      // 将trustHook映射到钩子相关字段
      hookCopy: trustHook.openingHook || '',
      hookNotes: `可信度证明: ${trustHook.credibilityProof || ''}\n权威信号: ${trustHook.authoritySignal || ''}`,
      // 将valueMap映射到价值相关字段  
      coreIdea: valueMap.coreValue || '',
      argumentCase: empathyAnchor.painPoint || '',
      valueDelivery: valueMap.benefitPoints || [],
      reusableElements: `目标受众: ${empathyAnchor.targetAudience || ''}\n情感触发器: ${empathyAnchor.emotionalTrigger || ''}`,
      valueNotes: valueMap.actionGuide || ''
    }
    
    console.log('=== Saving card data:', cardData)
    
    if (analysisCard) {
      // 更新现有卡片
      analysisCard = await prisma.analysisCard.update({
        where: { id: analysisCard.id },
        data: cardData
      })
    } else {
      // 创建新卡片
      analysisCard = await prisma.analysisCard.create({
        data: {
          ...cardData,
          sourceId: analysisSource.id
        }
      })
    }
    
    console.log('=== Analysis card saved:', analysisCard.id)
    
    return NextResponse.json({
      success: true,
      message: '分析数据已保存',
      data: {
        analysisSourceId: analysisSource.id,
        analysisCardId: analysisCard.id,
        updatedAt: analysisCard.updatedAt
      }
    })
    
  } catch (error) {
    console.error('Save analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to save analysis', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}