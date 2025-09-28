// 开始分析API - 将文件发送到AI服务

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser, createUnauthorizedResponse } from '@/lib/auth-helpers'
import { ErrorCode, createSuccessResponse, createErrorResponse, type ErrorCodeType } from '@/errors/codes'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // 获取认证用户信息
    const user = await getAuthUser(request)
    
    if (!user) {
      return createUnauthorizedResponse()
    }
    
    const body = await request.json()
    const { mediaFileId, analysisType = 'full', forceNewCard = false } = body
    
    console.log('=== Starting analysis for mediaFileId:', mediaFileId)
    console.log('=== AI_SERVICE_URL:', process.env.AI_SERVICE_URL)
    
    if (!mediaFileId) {
      return NextResponse.json(
        { error: 'Missing mediaFileId parameter' },
        { status: 400 }
      )
    }
    
    // 1. 获取文件信息
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
      select: {
        id: true,
        originalFilename: true,
        storagePath: true,
        fileSize: true,
        mimeType: true,
        status: true
      }
    })
    
    if (!mediaFile) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      )
    }
    
    if (mediaFile.status !== 'ready') {
      return NextResponse.json(
        { error: 'Media file is not ready for analysis' },
        { status: 400 }
      )
    }
    
    console.log('Media file ready for analysis:', mediaFile.originalFilename)
    
    // 2. 调用AI服务进行分析
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      if (isDevelopment) {
        console.log('=== Calling AI Web service at:', `${aiServiceUrl}/api/v1/web/analyze`)
      }
      
      // 调用AI服务的Web集成端点
      const analysisResponse = await fetch(`${aiServiceUrl}/api/v1/web/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          media_file_id: mediaFileId,
          user_id: user.id, // 使用认证用户的真实ID
          force_new_card: forceNewCard, // 传递新参数
          file_info: {
            filename: mediaFile.originalFilename,
            storage_path: mediaFile.storagePath,
            mime_type: mediaFile.mimeType,
            file_size: mediaFile.fileSize
          }
        }),
        // 添加超时设置
        signal: AbortSignal.timeout(30000) // 30秒超时
      })
      
      if (isDevelopment) {
        console.log('=== AI service response status:', analysisResponse.status)
      }
      
      if (!analysisResponse.ok) {
        // 先尝试解析JSON响应（优化后的AI服务会返回结构化错误）
        let errorMessage = '分析服务暂时不可用，请稍后重试'
        let errorCode: ErrorCodeType = ErrorCode.ANALYSIS_INTERNAL_ERROR
        
        try {
          const errorData = await analysisResponse.json()
          if (errorData.message) {
            errorMessage = errorData.message
          }
          
          // 根据AI服务的错误代码映射到前端错误代码
          if (errorData.error_code) {
            switch (errorData.error_code) {
              case 'FILE_NOT_FOUND':
                errorCode = ErrorCode.FILE_PROCESSING_FAILED
                break
              case 'TIMEOUT_ERROR':
                errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
                break
              case 'ASR_FAILED':
              case 'VIDEO_PROCESSING_FAILED':
                errorCode = ErrorCode.FILE_PROCESSING_FAILED
                break
              default:
                errorCode = ErrorCode.ANALYSIS_INTERNAL_ERROR
            }
          }
          
          if (isDevelopment) {
            console.error('AI service structured error:', errorData)
          }
        } catch (parseError) {
          // 如果解析JSON失败，尝试获取文本错误信息
          try {
            const errorText = await analysisResponse.text()
            if (isDevelopment) {
              console.error('AI service text error:', analysisResponse.status, errorText)
            }
            
            // 根据HTTP状态码判断错误类型
            if (analysisResponse.status === 408 || analysisResponse.status === 504) {
              errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
              errorMessage = '分析处理超时，请稍后重试'
            } else if (analysisResponse.status === 502 || analysisResponse.status === 503) {
              errorCode = ErrorCode.ANALYSIS_SERVICE_UNAVAILABLE
              errorMessage = '分析服务暂时不可用，请稍后重试'
            }
          } catch (textError) {
            if (isDevelopment) {
              console.error('Failed to parse error response:', textError)
            }
          }
        }
        
        return NextResponse.json(
          createErrorResponse(errorCode, errorMessage),
          { status: 500 }
        )
      }
      
      const analysisResult = await analysisResponse.json()
      
      if (isDevelopment) {
        console.log('=== AI analysis result:', analysisResult)
      }
      
      // 检查AI服务返回的success字段
      if (!analysisResult.success) {
        const errorMessage = analysisResult.message || '分析处理失败'
        const errorDetails = analysisResult.error || '未知错误'
        
        if (isDevelopment) {
          console.error('AI analysis failed:', errorDetails)
        }
        
        return NextResponse.json(
          createErrorResponse(ErrorCode.FILE_PROCESSING_FAILED, errorMessage),
          { status: 500 }
        )
      }
      
      // 3. 处理AI服务返回的分析结果
      const aiData = analysisResult.data
      
      // 处理新的AI服务返回的数据格式
      const hookTypes = aiData.hook_types || []
      const hookCopy = aiData.hook_copy || ''
      const totalHooksCount = aiData.trust_hooks_count || 0
      const transcript = aiData.transcript || ''
      const coreIdea = aiData.core_idea || ''
      const valueDelivery = aiData.value_delivery || []
      const trustHooksDetail = aiData.trust_hooks_detail || []
      
      const structuredResult = {
        trust_hook: {
          opening_hook: hookCopy 
            ? `检测到关键钩子：${hookCopy}${totalHooksCount > 1 ? ` 等${totalHooksCount}个钩子` : ''}` 
            : `基于分析 "${mediaFile.originalFilename}"，未检测到明显的信任之钩`,
          credibility_proof: transcript 
            ? `转录内容分析：${transcript.substring(0, 80)}${transcript.length > 80 ? '...' : ''}` 
            : "文件分析完成，正在提取可信度证明",
          authority_signal: `AI分析完成，识别到 ${totalHooksCount} 个信任之钩${hookTypes.length > 0 ? `，类型：${hookTypes.join('、')}` : ''}`
        },
        empathy_anchor: {
          pain_point: hookTypes.includes('制造冲突') ? "检测到冲突制造，可能针对用户焦虑感" : 
                     hookTypes.includes('引发好奇') ? "检测到好奇心触发，针对用户知识渴望" : 
                     "基于AI分析的目标痛点识别",
          target_audience: hookTypes.length > 0 
            ? `对${hookTypes.join('、')}敏感的目标受众` 
            : "AI分析中的目标受众群体",
          emotional_trigger: hookTypes.length > 0 
            ? `${hookTypes.join('、')}等情感触发机制` 
            : "正在识别情感触发点"
        },
        value_map: {
          core_value: coreIdea || 
                     (hookCopy ? `核心价值传递：${hookCopy}` : '') ||
                     "AI正在提取核心价值主张",
          benefit_points: valueDelivery.length > 0 
            ? valueDelivery 
            : hookTypes.length > 0 
              ? [`${hookTypes[0]}技巧`, "内容分析洞察", "实用方法指导"]
              : ["智能分析结果", "内容解构洞察", "创作启发建议"],
          action_guide: `基于${totalHooksCount}个信任之钩的分析，建议采用${hookTypes.length > 0 ? hookTypes[0] : '综合'}策略进行内容创作`
        }
      }
      
      return NextResponse.json(
        createSuccessResponse(structuredResult, "分析完成"),
        { status: 200 }
      )
      
    } catch (aiError) {
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      // 根据错误类型返回不同的错误码
      let errorCode: ErrorCodeType = ErrorCode.ANALYSIS_INTERNAL_ERROR
      let logMessage = 'AI service error'
      
      if (aiError instanceof Error) {
        if (aiError.name === 'AbortError') {
          errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
          logMessage = 'AI service timeout (30s)'
        } else if (aiError.message.includes('ECONNREFUSED')) {
          errorCode = ErrorCode.ANALYSIS_SERVICE_UNAVAILABLE
          logMessage = 'AI service unavailable (connection refused)'
        } else if (aiError.message.includes('timeout')) {
          errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
          logMessage = 'AI service timeout'
        }
      }
      
      // 生产环境只记录简要信息，开发环境记录详细错误
      if (isDevelopment) {
        console.error('AI service error:', aiError)
      } else {
        console.warn(logMessage)
      }
      
      return NextResponse.json(
        createErrorResponse(errorCode),
        { status: 500 }
      )
    }
    
  } catch (error) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      console.error('Analysis start error:', error)
    } else {
      console.warn('Analysis request failed')
    }
    
    return NextResponse.json(
      createErrorResponse(ErrorCode.UNKNOWN_ERROR),
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}