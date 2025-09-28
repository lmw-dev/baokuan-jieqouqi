/**
 * TOM-218: 脚本生成API代理
 * 转发请求到FastAPI后端的TOM-217脚本生成端点
 * 使用可信代理认证模式
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params
    const body = await request.json()

    console.log('代理脚本生成请求:', { cardId, body })

    // 获取用户认证信息
    const cookies = request.headers.get('cookie') || ''
    console.log('🍪 代理请求 - 原始Cookie:', cookies)

    // 从Cookie中提取用户信息（Logto格式）
    let userInfo = null
    const userInfoMatch = cookies.match(/user_info=([^;]+)/)
    if (userInfoMatch) {
      try {
        userInfo = JSON.parse(decodeURIComponent(userInfoMatch[1]))
        console.log('✅ 解析用户信息成功:', userInfo)
      } catch (e) {
        console.error('❌ 解析用户信息失败:', e)
      }
    }

    if (!userInfo || !userInfo.id) {
      console.error('❌ 无法获取有效的用户信息')
      return NextResponse.json(
        { 
          code: 1, 
          message: '用户认证失败，请重新登录',
          data: null 
        },
        { status: 401 }
      )
    }

    // 转发请求到FastAPI后端
    const fastApiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'
    const targetUrl = `${fastApiUrl}/api/v1/cards/${cardId}/generate-script`
    console.log('🎯 代理请求 - 目标URL:', targetUrl)
    
    // 使用可信代理认证模式
    const proxySecret = process.env.TRUSTED_PROXY_SECRET || 'dev-proxy-secret-2024'
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': proxySecret,
        'X-User-ID': userInfo.id,
        'X-User-Info': JSON.stringify(userInfo),
      },
      body: JSON.stringify(body)
    })

    console.log('📨 FastAPI响应状态:', response.status, response.statusText)

    if (!response.ok) {
      console.error('FastAPI请求失败:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('错误详情:', errorText)
      
      return NextResponse.json(
        { 
          code: 1, 
          message: `脚本生成失败: ${response.status} ${response.statusText}`,
          data: null 
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('✅ FastAPI响应成功:', result)

    // 确保返回格式符合前端期望
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('脚本生成代理错误:', error)
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