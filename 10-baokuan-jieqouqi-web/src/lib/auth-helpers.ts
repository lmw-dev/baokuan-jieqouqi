// API路由中的认证辅助函数
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export interface AuthUser {
  id: string
  name?: string
  email?: string
  image?: string
}

/**
 * 在API路由中获取当前认证用户
 */
export async function getAuthUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth_token')?.value
    const userInfoCookie = cookieStore.get('user_info')?.value
    
    if (!authToken) {
      return null
    }
    
    // 尝试从cookie中获取用户信息
    if (userInfoCookie) {
      try {
        const userInfo = JSON.parse(userInfoCookie)
        return {
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          image: userInfo.image
        }
      } catch (error) {
        console.warn('⚠️ Invalid user info cookie')
      }
    }
    
    // 如果cookie中没有用户信息，返回null，让调用方处理
    return null
  } catch (error) {
    console.error('❌ Get auth user error:', error)
    return null
  }
}

/**
 * 创建未认证响应
 */
export function createUnauthorizedResponse() {
  return Response.json(
    { 
      success: false, 
      message: '未登录或登录已过期',
      code: 'NOT_AUTHENTICATED'
    },
    { status: 401 }
  )
}