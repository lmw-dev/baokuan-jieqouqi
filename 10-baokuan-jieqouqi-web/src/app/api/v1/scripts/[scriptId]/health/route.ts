/**
 * TOM-218: 脚本健康检查API代理
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
      // 健康检查时认证失败，返回不可访问状态
      return NextResponse.json({
        code: 0,
        message: '健康检查完成',
        data: {
          scriptId,
          accessible: false
        }
      })
    }

    // 使用可信代理认证模式
    const proxySecret = process.env.TRUSTED_PROXY_SECRET || 'dev-proxy-secret-2024'

    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/scripts/${scriptId}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': proxySecret,
        'X-User-ID': userInfo.id,
        'X-User-Info': JSON.stringify(userInfo),
      }
    })

    if (!response.ok) {
      // 健康检查失败时返回不可访问状态，而不是错误
      return NextResponse.json({
        code: 0,
        message: '健康检查完成',
        data: {
          scriptId,
          accessible: false
        }
      })
    }

    const result = await response.json()
    return NextResponse.json(result)
    
  } catch (error) {
    // 健康检查失败时返回不可访问状态
    const { scriptId } = await params
    return NextResponse.json({
      code: 0,
      message: '健康检查完成',
      data: {
        scriptId,
        accessible: false
      }
    })
  }
}