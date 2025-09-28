import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaFileId = searchParams.get('mediaFileId')
    const cardId = searchParams.get('cardId')
    
    if (!mediaFileId && !cardId) {
      return NextResponse.json(
        { error: 'Missing mediaFileId or cardId parameter' },
        { status: 400 }
      )
    }
    
    console.log('=== Loading analysis for:', { mediaFileId, cardId })
    
    let analysisCard
    
    if (cardId) {
      // 直接通过卡片ID查找
      console.log('=== Loading by cardId:', cardId)
      analysisCard = await prisma.analysisCard.findUnique({
        where: { id: cardId }
      })
      
      if (!analysisCard) {
        return NextResponse.json(
          { error: 'No analysis card found with this ID' },
          { status: 404 }
        )
      }
    } else {
      // 通过mediaFileId查找最新的卡片
      console.log('=== Loading by mediaFileId:', mediaFileId)
      const analysisSource = await prisma.analysisSource.findFirst({
        where: { mediaFileId: mediaFileId },
        include: {
          analysisCards: {
            orderBy: { updatedAt: 'desc' },
            take: 1
          }
        }
      })
      
      if (!analysisSource || !analysisSource.analysisCards[0]) {
        return NextResponse.json(
          { error: 'No saved analysis found for this media file' },
          { status: 404 }
        )
      }
      
      analysisCard = analysisSource.analysisCards[0]
    }
    
    console.log('=== Found analysis card:', {
      id: analysisCard.id,
      hookCopy: analysisCard.hookCopy,
      hookNotes: analysisCard.hookNotes,
      coreIdea: analysisCard.coreIdea,
      argumentCase: analysisCard.argumentCase,
      valueDelivery: analysisCard.valueDelivery,
      reusableElements: analysisCard.reusableElements,
      valueNotes: analysisCard.valueNotes
    })
    
    // 将数据库字段映射回前端数据结构
    const analysisData = {
      trustHook: {
        openingHook: analysisCard.hookCopy || '',
        credibilityProof: '', // 从hookNotes中提取，但现在简化为空
        authoritySignal: analysisCard.hookNotes || ''
      },
      empathyAnchor: {
        painPoint: analysisCard.coreIdea || '', // 核心观点映射到痛点
        targetAudience: analysisCard.argumentCase || '', // 论证案例映射到目标受众
        emotionalTrigger: ''
      },
      valueMap: {
        coreValue: analysisCard.reusableElements || '', // 可复用要素映射到核心价值
        benefitPoints: analysisCard.valueDelivery || [],
        actionGuide: analysisCard.valueNotes || ''
      }
    }
    
    console.log('=== Mapped analysis data:', analysisData)
    
    return NextResponse.json({
      success: true,
      data: analysisData,
      cardId: analysisCard.id, // 添加cardId
      meta: {
        analysisCardId: analysisCard.id,
        versionTitle: analysisCard.versionTitle,
        updatedAt: analysisCard.updatedAt
      }
    })
    
  } catch (error) {
    console.error('Load analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load analysis', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// 辅助函数：从笔记中提取特定字段
function extractFromNotes(notes: string, prefix: string): string {
  const lines = notes.split('\n')
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      return line.substring(prefix.length).trim()
    }
  }
  return ''
}