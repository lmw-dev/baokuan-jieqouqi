// 视频分析API - 调用AI服务进行视频分析

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
    const { mediaFileId, forceReprocess = false } = body
    
    console.log('=== 开始视频分析，mediaFileId:', mediaFileId)
    
    if (!mediaFileId) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.MISSING_PARAMETER, '请提供媒体文件ID'),
        { status: 400 }
      )
    }
    
    // 调用AI服务进行视频分析
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      if (isDevelopment) {
        console.log('=== 调用AI视频分析服务:', `${aiServiceUrl}/api/v1/analysis/video`)
        console.log('=== 请求参数:', { media_file_id: mediaFileId, user_id: user.id, force_reprocess: forceReprocess })
      }
      
      // 创建带有超时控制的AbortController
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        console.warn('=== AI服务调用超时，正在终止请求...')
        abortController.abort()
      }, 120000) // 增加到120秒超时
      
      const startTime = Date.now()
      
      const analysisResponse = await fetch(`${aiServiceUrl}/api/v1/analysis/video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          media_file_id: mediaFileId,
          user_id: user.id,
          force_reprocess: forceReprocess
        }),
        signal: abortController.signal
      })
      
      // 清除超时定时器
      clearTimeout(timeoutId)
      
      const responseTime = Date.now() - startTime
      
      if (isDevelopment) {
        console.log('=== AI服务响应状态:', analysisResponse.status)
        console.log('=== AI服务响应时间:', `${responseTime}ms`)
        console.log('=== AI服务响应头:', Object.fromEntries(analysisResponse.headers.entries()))
      }
      
      if (!analysisResponse.ok) {
        // 处理AI服务错误
        let errorMessage = '视频分析服务暂时不可用，请稍后重试'
        let errorCode: ErrorCodeType = ErrorCode.ANALYSIS_INTERNAL_ERROR
        
        try {
          const responseText = await analysisResponse.text()
          console.error('=== AI服务错误响应原文:', responseText)
          
          // 尝试解析JSON错误响应
          let errorData
          try {
            errorData = JSON.parse(responseText)
          } catch (parseError) {
            console.error('=== AI服务响应不是有效JSON:', parseError)
            errorMessage = `服务响应格式错误 (HTTP ${analysisResponse.status})`
          }
          
          if (errorData?.detail) {
            errorMessage = errorData.detail
          }
          
          // 根据HTTP状态码映射错误类型
          if (analysisResponse.status === 404) {
            errorCode = ErrorCode.FILE_NOT_FOUND
            errorMessage = '视频文件不存在或已被删除'
          } else if (analysisResponse.status === 408 || analysisResponse.status === 504) {
            errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
            errorMessage = '视频分析超时，请稍后重试'
          } else if (analysisResponse.status === 500) {
            errorMessage = errorData?.detail || '视频分析服务内部错误'
          }
          
        } catch (parseError) {
          console.error('=== 解析AI服务错误响应失败:', parseError)
        }
        
        return NextResponse.json(
          createErrorResponse(errorCode, errorMessage),
          { status: 500 }
        )
      }
      
      // 记录成功响应的详细信息
      const responseText = await analysisResponse.text()
      
      if (isDevelopment) {
        console.log('=== AI服务响应内容长度:', responseText.length)
        console.log('=== AI服务响应前200字符:', responseText.substring(0, 200))
      }
      
      let analysisResult
      try {
        analysisResult = JSON.parse(responseText)
      } catch (parseError) {
        console.error('=== 解析AI服务响应JSON失败:', parseError)
        console.error('=== 响应内容:', responseText)
        return NextResponse.json(
          createErrorResponse(ErrorCode.ANALYSIS_INTERNAL_ERROR, '视频分析结果格式错误'),
          { status: 500 }
        )
      }
      
      if (isDevelopment) {
        console.log('=== AI视频分析结果结构:', {
          success: analysisResult.success,
          message: analysisResult.message,
          dataKeys: analysisResult.data ? Object.keys(analysisResult.data) : 'no data'
        })
      }
      
      // 检查AI服务返回的success字段
      if (!analysisResult.success) {
        const errorMessage = analysisResult.message || '视频分析失败'
        
        console.error('=== AI视频分析失败:', errorMessage)
        
        return NextResponse.json(
          createErrorResponse(ErrorCode.ANALYSIS_INTERNAL_ERROR, errorMessage),
          { status: 500 }
        )
      }
      
      // 后端已经使用format_for_frontend函数处理了数据，直接使用返回的data
      console.log('=== 首次视频分析 - 后端返回的完整数据 ===')
      console.log('analysisResult.data:', JSON.stringify(analysisResult.data, null, 2))
      
      const formattedResult = analysisResult.data
      
      if (isDevelopment) {
        console.log('=== 视频分析成功完成，处理时间:', `${responseTime}ms`)
      }
      
      return NextResponse.json(
        createSuccessResponse(formattedResult, "视频分析完成"),
        { status: 200 }
      )
      
    } catch (aiError) {
      // 根据错误类型返回不同的错误码
      let errorCode: ErrorCodeType = ErrorCode.ANALYSIS_INTERNAL_ERROR
      let userMessage = '视频分析服务出现错误，请稍后重试'
      
      if (aiError instanceof Error) {
        if (aiError.name === 'AbortError' || aiError.name === 'TimeoutError') {
          errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
          userMessage = '视频分析超时，请稍后重试'
        } else if (aiError.message.includes('ECONNREFUSED')) {
          errorCode = ErrorCode.ANALYSIS_SERVICE_UNAVAILABLE
          userMessage = '视频分析服务暂时不可用'
        } else if (aiError.message.includes('timeout')) {
          errorCode = ErrorCode.ANALYSIS_SERVICE_TIMEOUT
          userMessage = '视频分析超时，请稍后重试'
        } else if (aiError.message.includes('fetch')) {
          userMessage = '网络连接异常，请检查网络后重试'
        }
      }
      
      // 详细记录错误信息用于调试
      console.error('=== AI视频分析服务详细错误信息 ===')
      console.error('错误类型:', (aiError as any)?.constructor?.name || 'Unknown')
      console.error('错误名称:', (aiError as any)?.name || 'Unknown')
      console.error('错误消息:', (aiError as any)?.message || 'Unknown')
      console.error('错误堆栈:', (aiError as any)?.stack || 'No stack trace')
      console.error('========================================')
      
      return NextResponse.json(
        createErrorResponse(errorCode, userMessage),
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('=== 视频分析请求处理错误 ===')
    console.error('错误类型:', (error as any)?.constructor?.name || 'Unknown')
    console.error('错误消息:', (error as any)?.message || 'Unknown')
    console.error('错误堆栈:', (error as any)?.stack || 'No stack trace')
    console.error('===============================')
    
    return NextResponse.json(
      createErrorResponse(ErrorCode.UNKNOWN_ERROR, '视频分析请求处理失败'),
      { status: 500 }
    )
  }
}