import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSafeRedirectUri } from '@/lib/url-utils'; 

// 新的非 HttpOnly Cookie 名称
const CLIENT_REDIRECT_COOKIE_NAME = 'client_redirect_target';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  console.log(`[Middleware] Request received for path: ${pathname}`);

  // 跳过OAuth授权页面，让后端OAuth服务器处理redirect_uri验证
  if (pathname === '/oauth/authorize') {
    console.log('[Middleware] Skipping OAuth authorize page - letting backend handle redirect_uri validation');
    return NextResponse.next();
  }

  const redirectUriFromQuery = searchParams.get('redirect_uri');

  console.log('[Middleware] Initial state:', { pathname, redirectUriFromQuery });

  if (isSafeRedirectUri(redirectUriFromQuery)) {
    console.log('[Middleware] Step 1: Found valid redirect_uri in query:', redirectUriFromQuery);
    // 初始化响应，以便设置 Cookie
    const response = NextResponse.next(); 
    
    // 设置非 HttpOnly 的 Cookie，存储安全的重定向目标
    response.cookies.set(CLIENT_REDIRECT_COOKIE_NAME, redirectUriFromQuery, {
      path: '/',
      httpOnly: false, // 必须为 false，以便客户端 JS 读取
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 分钟有效期
      sameSite: 'lax',
    });
    console.log(`[Middleware] Step 1: Set non-HttpOnly cookie: ${CLIENT_REDIRECT_COOKIE_NAME}`);

    // 清理 URL 中的参数，并继续请求（重定向到自身以应用 Cookie）
    const nextUrl = request.nextUrl.clone();
    nextUrl.searchParams.delete('redirect_uri');
    const redirectResponseStep1 = NextResponse.redirect(nextUrl, { status: 302 });
    // 合并必要的头信息（主要是 Set-Cookie）
    response.headers.forEach((value, key) => {
      if (!redirectResponseStep1.headers.has(key)) { redirectResponseStep1.headers.set(key, value); }
    });
     const cookiesToSet = response.headers.getSetCookie();
     cookiesToSet.forEach(cookie => redirectResponseStep1.headers.append('Set-Cookie', cookie));
    console.log('[Middleware] Step 1: Redirecting to clean URL:', nextUrl.toString());
    return redirectResponseStep1;

  } else if (redirectUriFromQuery) {
    // 如果提供了 redirect_uri 但不安全，也清理掉它
    console.warn('[Middleware] Step 1: Ignored invalid/unsafe redirect_uri query parameter:', redirectUriFromQuery);
    const nextUrl = request.nextUrl.clone();
    nextUrl.searchParams.delete('redirect_uri');
    console.log('[Middleware] Step 1: Redirecting to clean URL after removing invalid param:', nextUrl.toString());
    return NextResponse.redirect(nextUrl, { status: 302 });
  }

  // 如果没有找到 redirect_uri 参数，则正常继续请求
  console.log('[Middleware] No redirect_uri found or processed, proceeding.');
  return NextResponse.next(); 
}

// --- Configuration: Matcher --- 
// 主要匹配可能带有 redirect_uri 的入口页面
export const config = {
  matcher: [
    '/login',
    '/register',
    // 通用匹配器，排除静态资源和auth相关路由，防止OAuth死循环
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
}
