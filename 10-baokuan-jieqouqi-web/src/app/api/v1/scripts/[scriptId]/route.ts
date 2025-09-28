/**
 * TOM-218: 脚本管理API代理
 * 转发请求到FastAPI后端的TOM-217脚本管理端点
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
    console.log('🍪 脚本获取 - 原始Cookie:', cookies)

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

    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/scripts/${scriptId}`, {
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
      console.error('获取脚本详情失败:', response.status, errorText)
      
      return NextResponse.json(
        { 
          code: 1, 
          message: `获取脚本详情失败: ${response.status}`,
          data: null 
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // 转换后端snake_case到前端camelCase (GET方法)
    if (result.data && result.data.sections) {
      result.data.sections = result.data.sections.map((section: any) => ({
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
      }))
      
      // 转换脚本级别的字段
      result.data = {
        ...result.data,
        cardId: result.data.card_id,
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at,
        metadata: result.data.metadata ? {
          ...result.data.metadata,
          generationId: result.data.metadata.generation_id,
          totalSections: result.data.metadata.total_sections,
          lastUpdated: result.data.metadata.last_updated,
          creatorId: result.data.metadata.creator_id,
          // 清理原始snake_case字段
          generation_id: undefined,
          total_sections: undefined,
          last_updated: undefined,
          creator_id: undefined
        } : result.data.metadata,
        // 清理脚本级别的snake_case字段
        card_id: undefined,
        created_at: undefined,
        updated_at: undefined
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('获取脚本详情代理错误:', error)
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const { scriptId } = await params
    const body = await request.json()

    // 获取用户认证信息
    const cookies = request.headers.get('cookie') || ''
    console.log('🍪 脚本更新 - 原始Cookie:', cookies)

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

    // 转换前端camelCase到后端snake_case
    const transformedBody = {
      ...body,
      sections: body.sections?.map((section: any) => {
        const transformed = { ...section }
        
        // 处理字段转换，确保必需字段存在
        if (section.sectionType !== undefined) {
          transformed.section_type = section.sectionType
          delete transformed.sectionType
        }
        if (section.orderIndex !== undefined) {
          transformed.order_index = section.orderIndex
          delete transformed.orderIndex
        }
        if (section.timeRange !== undefined) {
          transformed.time_range = section.timeRange
          delete transformed.timeRange
        }
        
        return transformed
      })
    }

    console.log('🔄 原始请求体:', JSON.stringify(body, null, 2))
    console.log('🔄 字段转换后的请求体:', JSON.stringify(transformedBody, null, 2))

    // 使用可信代理认证模式
    const proxySecret = process.env.TRUSTED_PROXY_SECRET || 'dev-proxy-secret-2024'

    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/scripts/${scriptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': proxySecret,
        'X-User-ID': userInfo.id,
        'X-User-Info': JSON.stringify(userInfo),
      },
      body: JSON.stringify(transformedBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('更新脚本失败:', response.status, errorText)
      
      return NextResponse.json(
        { 
          code: 1, 
          message: `更新脚本失败: ${response.status}`,
          data: null 
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // 转换后端snake_case到前端camelCase (PUT方法)
    if (result.data && result.data.sections) {
      result.data.sections = result.data.sections.map((section: any) => ({
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
      }))
      
      // 转换脚本级别的字段
      result.data = {
        ...result.data,
        cardId: result.data.card_id,
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at,
        metadata: result.data.metadata ? {
          ...result.data.metadata,
          generationId: result.data.metadata.generation_id,
          totalSections: result.data.metadata.total_sections,
          lastUpdated: result.data.metadata.last_updated,
          creatorId: result.data.metadata.creator_id,
          // 清理原始snake_case字段
          generation_id: undefined,
          total_sections: undefined,
          last_updated: undefined,
          creator_id: undefined
        } : result.data.metadata,
        // 清理脚本级别的snake_case字段
        card_id: undefined,
        created_at: undefined,
        updated_at: undefined
      }
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('更新脚本代理错误:', error)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const { scriptId } = await params

    // 获取用户认证信息
    const cookies = request.headers.get('cookie') || ''
    console.log('🍪 脚本删除 - 原始Cookie:', cookies)

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

    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/scripts/${scriptId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Proxy-Secret': proxySecret,
        'X-User-ID': userInfo.id,
        'X-User-Info': JSON.stringify(userInfo),
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('删除脚本失败:', response.status, errorText)
      
      return NextResponse.json(
        { 
          code: 1, 
          message: `删除脚本失败: ${response.status}`,
          data: null 
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('删除脚本代理错误:', error)
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