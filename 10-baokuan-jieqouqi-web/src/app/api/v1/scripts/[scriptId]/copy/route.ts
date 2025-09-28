/**
 * TOM-218: 脚本复制API代理
 * 使用可信代理认证模式
 */

import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const { scriptId } = await params
    const { searchParams } = new URL(request.url)
    
    // 获取查询参数
    const format = searchParams.get('format') || 'txt'
    const queryString = new URLSearchParams({ format }).toString()

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

    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/scripts/${scriptId}/copy?${queryString}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': proxySecret,
        'X-User-ID': userInfo.id,
        'X-User-Info': JSON.stringify(userInfo),
      },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('复制脚本失败:', response.status, errorText)
      
      return NextResponse.json(
        { 
          code: 1, 
          message: `复制脚本失败: ${response.status}`,
          data: null 
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('复制脚本代理错误:', error)
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