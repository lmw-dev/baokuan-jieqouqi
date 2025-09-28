// 文本分析API - 调用AI服务进行文本内容分析

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createUnauthorizedResponse } from '@/lib/auth-helpers'
import { ErrorCode, createSuccessResponse, createErrorResponse, type ErrorCodeType } from '@/errors/codes'

export async function POST(request: NextRequest) {
  try {
    // 获取认证用户信息
    const user = await getAuthUser(request)
    
    if (!user) {
      return createUnauthorizedResponse()
    }
    
    const body = await request.json()
    const { content, title = '' } = body
    
    console.log('=== 开始文本分析，内容长度:', content?.length)
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.MISSING_PARAMETER, '请提供要分析的文本内容'),
        { status: 400 }
      )
    }
    
    // 检查文本长度限制（避免过长文本）
    if (content.length > 10000) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_PARAMETER, '文本内容过长，请控制在10000字符以内'),
        { status: 400 }
      )
    }
    
    // 调用AI服务进行文本分析
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      if (isDevelopment) {
        console.log('=== 调用AI文本分析服务:', `${aiServiceUrl}/api/v1/analysis/text`)
      }
      
      const analysisResponse = await fetch(`${aiServiceUrl}/api/v1/analysis/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          title: title.trim() || undefined,
          user_id: user.id
        }),
        // 添加超时设置
        signal: AbortSignal.timeout(30000) // 30秒超时
      })
      
      if (isDevelopment) {
        console.log('=== AI服务响应状态:', analysisResponse.status)
      }
      
      if (!analysisResponse.ok) {
        // 处理AI服务错误
        let errorMessage = '文本分析服务暂时不可用，请稍后重试'
        let errorCode: ErrorCodeType = ErrorCode.ANALYSIS_INTERNAL_ERROR
        
        try {
          const errorData = await analysisResponse.json()
          if (errorData.detail) {
            errorMessage = errorData.detail
          }
          
          if (isDevelopment) {
            console.error('AI服务错误响应:', errorData)
          }
        } catch (parseError) {
          if (isDevelopment) {
            console.error('解析AI服务错误响应失败:', parseError)
          }
        }
        
        return NextResponse.json(
          createErrorResponse(errorCode, errorMessage),
          { status: 500 }
        )
      }
      
      const analysisResult = await analysisResponse.json()
      
      if (isDevelopment) {
        console.log('=== AI文本分析结果:', analysisResult)
      }
      
      // 检查AI服务返回的success字段
      if (!analysisResult.success) {
        const errorMessage = analysisResult.message || '文本分析失败'
        
        if (isDevelopment) {
          console.error('AI文本分析失败:', errorMessage)
        }
        
        return NextResponse.json(
          createErrorResponse(ErrorCode.ANALYSIS_INTERNAL_ERROR, errorMessage),
          { status: 500 }
        )
      }
      
      // 将AI返回的数据转换为前端期望的格式
      const aiData = analysisResult.data
      const trustHook = aiData.trust_hook || {}
      const empathyAnchor = aiData.empathy_anchor || {}
      const valueMap = aiData.value_map || {}
      
      const formattedResult = {
        trustHook: {
          openingHook: trustHook.hook_copy || '',
          credibilityProof: trustHook.credibility_testimony || '',
          authoritySignal: Array.isArray(trustHook.authority_signals) 
            ? trustHook.authority_signals.join(', ') 
            : ''
        },
        empathyAnchor: {
          painPoint: empathyAnchor.pain_point || '',
          targetAudience: empathyAnchor.target_audience || '',
          emotionalTrigger: Array.isArray(empathyAnchor.emotional_triggers)
            ? empathyAnchor.emotional_triggers.join(', ')
            : ''
        },
        valueMap: {
          coreValue: valueMap.core_value || '',
          benefitPoints: Array.isArray(valueMap.value_delivery) 
            ? valueMap.value_delivery 
            : [],
          actionGuide: valueMap.competitive_advantage || ''
        },
        meta: aiData.meta || {}
      }
      
      return NextResponse.json(
        createSuccessResponse(formattedResult, "文本分析完成"),
        { status: 200 }
      )
      
    } catch (aiError) {
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      // 根据错误类型返回不同的错误码
      let errorCode: ErrorCodeType = ErrorCode.ANALYSIS_INTERNAL_ERROR
      let logMessage = 'AI文本分析服务错误'
      
      if (aiError instanceof Error) {
        if (aiError.name === 'AbortError') {
          errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
          logMessage = 'AI文本分析服务超时 (30s)'
        } else if (aiError.message.includes('ECONNREFUSED')) {
          errorCode = ErrorCode.ANALYSIS_SERVICE_UNAVAILABLE
          logMessage = 'AI文本分析服务不可用 (连接被拒绝)'
        } else if (aiError.message.includes('timeout')) {
          errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
          logMessage = 'AI文本分析服务超时'
        }
      }
      
      // 生产环境只记录简要信息，开发环境记录详细错误
      if (isDevelopment) {
        console.error('AI文本分析服务错误:', aiError)
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
      console.error('文本分析请求处理错误:', error)
    } else {
      console.warn('文本分析请求失败')
    }
    
    return NextResponse.json(
      createErrorResponse(ErrorCode.UNKNOWN_ERROR),
      { status: 500 }
    )
  }
}