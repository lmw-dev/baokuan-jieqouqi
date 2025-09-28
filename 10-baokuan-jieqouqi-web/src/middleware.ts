// 路由保护中间件 - 实现认证检查和重定向逻辑
import { NextRequest, NextResponse } from 'next/server';

// 需要认证的路径模式
const PROTECTED_PATHS = [
  '/dashboard',
  '/workspace',
  '/analysis/create',
  '/profile',
  '/settings'
];

// 认证相关的路径（不需要保护）
const AUTH_PATHS = [
  '/api/auth',
  '/auth'
];

// 公开路径（不需要认证）
const PUBLIC_PATHS = [
  '/',
  '/about',
  '/contact',
  '/analysis', // 公开的分析页面
  '/script'    // 公开的脚本页面
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🛡️ Middleware checking path:', pathname);

  // 跳过静态文件和 Next.js 内部路径
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 跳过认证相关路径
  if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
    console.log('✅ Auth path, allowing access');
    return NextResponse.next();
  }

  // 检查是否是受保护的路径
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  
  if (!isProtectedPath) {
    console.log('✅ Public path, allowing access');
    return NextResponse.next();
  }

  console.log('🔒 Protected path detected, checking authentication');

  // 检查认证状态
  const authToken = request.cookies.get('auth_token')?.value;
  const userInfo = request.cookies.get('user_info')?.value;

  if (!authToken || !userInfo) {
    console.log('❌ No auth token or user info, redirecting to login');
    
    // 构建登录URL，包含原始路径作为回调
    const loginUrl = new URL('/api/auth/sign-in', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    
    return NextResponse.redirect(loginUrl);
  }

  // 验证用户信息的有效性
  try {
    const parsedUserInfo = JSON.parse(userInfo);
    if (!parsedUserInfo.id) {
      console.log('❌ Invalid user info, redirecting to login');
      
      const loginUrl = new URL('/api/auth/sign-in', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    console.log('❌ Malformed user info cookie, redirecting to login');
    
    const loginUrl = new URL('/api/auth/sign-in', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    
    return NextResponse.redirect(loginUrl);
  }

  console.log('✅ Authentication verified, allowing access');
  
  // 添加用户信息到请求头（供组件使用）
  const response = NextResponse.next();
  response.headers.set('X-User-Authenticated', 'true');
  
  // 对用户信息进行Base64编码以避免中文字符问题
  try {
    const encodedUserInfo = Buffer.from(userInfo).toString('base64');
    response.headers.set('X-User-Info', encodedUserInfo);
  } catch (error) {
    console.warn('⚠️ Failed to encode user info for header:', error);
    // 如果编码失败，只设置认证状态
    response.headers.set('X-User-Info', 'encoded-failed');
  }
  
  return response;
}

// 配置中间件匹配的路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 