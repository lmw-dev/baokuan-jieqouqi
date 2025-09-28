/**
 * TOM-218: 脚本列表API代理
 * 转发请求到FastAPI后端的脚本管理端点
 * 使用可信代理认证模式
 */

import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    
    // 获取用户认证信息
    const cookies = request.headers.get('cookie') || ''
    console.log('🍪 脚本列表获取 - 原始Cookie:', cookies)

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

    // 使用可信代理认证模式
    const proxySecret = process.env.TRUSTED_PROXY_SECRET || 'dev-proxy-secret-2024'

    // 构建查询字符串
    const queryString = searchParams.toString()
    const url = `${FASTAPI_BASE_URL}/api/v1/scripts${queryString ? `?${queryString}` : ''}`
    
    console.log('🔄 转发脚本列表请求到:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': proxySecret,
        'X-User-ID': userInfo.id,
        'X-User-Info': JSON.stringify(userInfo),
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('获取脚本列表失败:', response.status, errorText)
      
      return NextResponse.json(
        { 
          code: 1, 
          message: `获取脚本列表失败: ${response.status}`,
          data: null 
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // 转换后端snake_case到前端camelCase
    if (result.data && Array.isArray(result.data)) {
      result.data = result.data.map((script: any) => ({
        ...script,
        cardId: script.card_id,
        createdAt: script.created_at,
        updatedAt: script.updated_at,
        sections: script.sections?.map((section: any) => ({
          ...section,
          sectionType: section.section_type,
          orderIndex: section.order_index,
          timeRange: section.time_range,
          scriptId: section.script_id,
          updatedAt: section.updated_at,
          // 清理原始snake_case字段
          section_type: undefined,
          order_index: undefined,
          time_range: undefined,
          script_id: undefined,
          updated_at: undefined
        })) || [],
        metadata: script.metadata ? {
          ...script.metadata,
          generationId: script.metadata.generation_id,
          totalSections: script.metadata.total_sections,
          lastUpdated: script.metadata.last_updated,
          creatorId: script.metadata.creator_id,
          // 清理原始snake_case字段
          generation_id: undefined,
          total_sections: undefined,
          last_updated: undefined,
          creator_id: undefined
        } : script.metadata,
        // 清理脚本级别的snake_case字段
        card_id: undefined,
        created_at: undefined,
        updated_at: undefined
      }))
    }
    
    console.log('✅ 脚本列表获取成功:', result)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('获取脚本列表代理错误:', error)
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