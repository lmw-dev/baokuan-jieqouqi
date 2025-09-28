/**
 * TOM-218: 脚本导出API代理
 * 使用可信代理认证模式
 */

import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const { scriptId } = await params
    const { searchParams } = new URL(request.url)
    
    // 获取查询参数
    const format = searchParams.get('format') || 'txt'
    const includeMetadata = searchParams.get('include_metadata') || 'true'
    const includeTips = searchParams.get('include_tips') || 'true'
    
    const queryString = new URLSearchParams({
      format,
      include_metadata: includeMetadata,
      include_tips: includeTips
    }).toString()

    // 获取用户认证信息
    const cookies = request.headers.get('cookie') || ''

    // 从Cookie中提取用户信息（Logto格式）
    let userInfo = null
    const userInfoMatch = cookies.match(/user_info=([^;]+)/)
    if (userInfoMatch) {
      try {
        userInfo = JSON.parse(decodeURIComponent(userInfoMatch[1]))
      } catch (e) {
        console.error('❌ 解析用户信息失败:', e)
      }
    }

    if (!userInfo || !userInfo.id) {
      return NextResponse.json(
        { 
          code: 1, 
          message: '用户认证失败，请重新登录',
          data: null 
        },
        { status: 401 }
      )
    }

    // 使用可信代理认证模式
    const proxySecret = process.env.TRUSTED_PROXY_SECRET || 'dev-proxy-secret-2024'

    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/scripts/${scriptId}/export?${queryString}`, {
      method: 'GET',
      headers: {
        'X-Proxy-Secret': proxySecret,
        'X-User-ID': userInfo.id,
        'X-User-Info': JSON.stringify(userInfo),
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('导出脚本失败:', response.status, errorText)
      
      // 尝试解析AI服务的错误响应
      let errorMessage = `导出脚本失败: ${response.status}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (e) {
        // 无法解析JSON，使用默认错误信息
        errorMessage = `导出脚本失败: ${response.status} - ${errorText}`
      }
      
      return NextResponse.json(
        { 
          code: 1, 
          message: errorMessage,
          data: null 
        },
        { status: response.status }
      )
    }

    // 直接返回文件流
    const blob = await response.blob()
    const headers = new Headers()
    
    // 复制Content-Type和Content-Disposition头
    const contentType = response.headers.get('content-type')
    const contentDisposition = response.headers.get('content-disposition')
    
    if (contentType) headers.set('Content-Type', contentType)
    if (contentDisposition) headers.set('Content-Disposition', contentDisposition)
    
    return new NextResponse(blob, { headers })
    
  } catch (error) {
    console.error('导出脚本代理错误:', error)
    return NextResponse.json(
      { 
        code: 1, 
        message: '服务器内部错误', 
        data: null 
      },
      { status: 500 }
    )
  }
}