'use client'; // 声明为客户端组件

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/services/api'; // 移除了 verify2FA，因为新的 login 函数可以处理
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import useAutoRedirectIfAuthenticated from '@/hooks/useAutoRedirectIfAuthenticated';
import Image from 'next/image'; // 用于显示 Logo 或其他图像
import Footer from '../dashboard/components/Footer'; // 导入 Footer 组件
import ConfirmModal from '@/components/ui/confirm-modal'; // 导入 ConfirmModal 组件

// 图标组件 (示例，根据需要替换为实际的 SVG 或库)
const GithubIcon = () => <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 012.9-.39c.99.01 1.99.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.7.42.36.79 1.09.79 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z"/></svg>;
const GoogleIcon = () => <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C36.3 2.7 30.57 0 24 0 14.82 0 6.73 5.82 2.69 14.09l7.98 6.2C12.13 13.16 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.64 7.01l7.19 5.6C43.27 37.27 46.1 31.39 46.1 24.5z"/><path fill="#FBBC05" d="M9.67 28.29A14.5 14.5 0 019.5 24c0-1.49.26-2.93.72-4.29l-7.98-6.2A23.93 23.93 0 000 24c0 3.77.9 7.34 2.5 10.49l8.17-6.2z"/><path fill="#EA4335" d="M24 48c6.57 0 12.1-2.17 16.13-5.91l-7.19-5.6c-2.01 1.35-4.59 2.16-8.94 2.16-6.38 0-11.87-3.66-14.33-8.79l-8.17 6.2C6.73 42.18 14.82 48 24 48z"/></g></svg>;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [totpMsg, setTotpMsg] = useState(''); // 2FA specific message
  const [totpLoading, setTotpLoading] = useState(false); // 2FA specific loading
  const router = useRouter();
  const { checkAuth } = useAuth();

  useAutoRedirectIfAuthenticated(); // 自动重定向逻辑保持不变

  // OAuth 消息处理逻辑保持不变
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        event.data === 'github-login-success' ||
        event.data === 'github-2fa-success' ||
        event.data === 'google-login-success'
      ) {
        // 重新检查认证状态并跳转
        checkAuth().then(user => {
          if (user) {
            router.push('/dashboard'); // 恢复跳转
            console.log('[LoginPage OAuth Callback] OAuth success, user found. Initiating navigation towards /dashboard.');
          } else {
             setError('第三方登录成功，但无法获取用户信息。');
          }
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkAuth, router]);

  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTotpMsg(''); // 清除旧的 2FA 消息

    try {
      const resp = await login(email, password);
      // 后端返回 206 或特定错误码表示需要 2FA
      if (resp.status === 206 || resp.data?.error === 'TOTP_REQUIRED') {
        setShow2fa(true); // 显示 2FA 输入
        setCode('');     // 清空之前的输入
        setMode('totp'); // 默认用 TOTP
      } else if (resp.status >= 400 || resp.data?.error) {
        // 处理其他登录错误
        const errMsg = resp.data?.message || resp.data?.error || '登录失败，请检查您的邮箱和密码。';
        if (resp.data?.error === 'email_not_verified') {
          setError('邮箱尚未验证，请检查您的邮箱并点击验证链接。');
        } else {
          setError(errMsg);
        }
      } else {
        // 登录成功 (status 200)
        const loggedInUser = await checkAuth();
        if (loggedInUser) {
           router.push('/dashboard'); // 恢复跳转
           console.log('[LoginPage handleLoginSubmit] Login success, user found. Initiating navigation towards /dashboard.');
        } else {
          setError('登录成功，但无法获取用户信息，请稍后再试。');
        }
      }
    } catch (err: unknown) {
      console.error('[LoginPage] 登录过程出错:', err);
      let errorMessage = '发生未知错误，请稍后重试。';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string; error?: string }; status?: number } }).response;
        if (response?.data?.error === 'email_not_verified') {
          errorMessage = '邮箱尚未验证，请检查您的邮箱并点击验证链接。';
        } else if (response?.status === 401 && response?.data?.error === 'Invalid credentials') {
          errorMessage = '邮箱或密码错误，请重新输入。';
        } else if (response?.data?.message || response?.data?.error) {
          errorMessage = response.data.message || response.data.error || errorMessage;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async () => {
    setTotpLoading(true);
    setTotpMsg('');

    try {
      const credentials = mode === 'totp' ? { token: code } : { backupCode: code };
      // 再次调用 login，这次附带 2FA 凭证
      const resp = await login(email, password, credentials);

      if (resp.status === 200) {
        // 2FA 验证通过，登录成功
        setTotpMsg('验证成功，正在登录...');
        setShow2fa(false); // 可以隐藏 2FA 表单了
        const loggedInUser = await checkAuth();
        if (loggedInUser) {
            router.push('/dashboard'); // 恢复跳转
           console.log('[LoginPage handle2faSubmit] 2FA success, user found. Initiating navigation towards /dashboard.');
        } else {
          setError('2FA验证成功，但无法获取用户信息。'); // 在主区域显示错误
        }
      } else {
        // 2FA 验证失败
        setTotpMsg(resp.data?.error || (mode === 'totp' ? '动态验证码错误或已失效' : '备份码错误或已被使用'));
      }
    } catch (err: unknown) {
      console.error('[LoginPage] 2FA 验证出错:', err);
      let errorMessage = '验证过程中发生错误，请稍后重试';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error && typeof response.data.error === 'string') {
          errorMessage = response.data.error;
        }
      }
      setTotpMsg(errorMessage);
    } finally {
      setTotpLoading(false);
    }
  };

  const openOAuthPopup = (url: string) => {
    window.open(url, `${url.includes('github') ? 'github' : 'google'}_oauth`, 'width=1000,height=700');
  };

  return (
    // 整体容器，使用 flex 列布局，确保 Footer 在底部
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
      {/* 主内容区域，占据剩余空间并居中 */}
      <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        {/* 分栏布局容器 (大屏幕) */}
        <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">

          {/* 左侧栏 (大屏幕显示) - Logo 和标语 */}
          <div className="hidden lg:block text-center lg:text-left lg:pl-8"> { /* 大屏增加左内边距 */}
            <Image
                src="/assets/images/logo/logo-text-white.png"
                alt="Logo"
                width={150} // 左侧 Logo 可以稍大些
                height={40}
                className="mx-auto lg:mx-0 mb-6 block dark:hidden"
            />
            <Image
                src="/assets/images/logo/logo-text-black.png"
                alt="Logo"
                width={150}
                height={40}
                className="mx-auto lg:mx-0 mb-6 hidden dark:block"
            />
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">
              欢迎回来。
            </h1>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
              使用您的账户凭据或第三方服务继续。
            </p>
          </div>

          {/* 右侧栏 (或小屏幕的全部内容) - 登录表单卡片 */}
          <div className="mt-10 lg:mt-0 w-full max-w-md mx-auto"> { /* 卡片宽度限制和居中 */}
             {/* Logo 和标题 (小屏幕显示) */}
            <div className="text-center lg:hidden mb-8">
               <Image
                  src="/assets/images/logo/logo-text-white.png"
                  alt="Logo"
                  width={120}
                  height={32}
                  className="mx-auto block dark:hidden"
               />
               <Image
                  src="/assets/images/logo/logo-text-black.png"
                  alt="Logo"
                  width={120}
                  height={32}
                  className="mx-auto hidden dark:block"
               />
              <h2 className="mt-6 text-center text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {show2fa ? '两步验证' : '登录您的账户'}
              </h2>
            </div>

            {/* 登录卡片 - 移除卡片容器，元素直接放置 */}
            <div className="space-y-6"> { /* 使用 space-y 控制元素间距 */}
              {/* 卡片内标题 (大屏幕) */}
              <div className="hidden lg:block mb-6">
                 <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                   {show2fa ? '输入验证码' : '登录'}
                 </h2>
                 {!show2fa && (
                    <p className="mt-1 text-sm text-neutral-500">
                     还没有账户？{' '}
                     <Link href="/register" className="font-medium text-[#0582FF] hover:text-[#006ADF] dark:text-[#3898FF] dark:hover:text-[#5CAEFF]">
                       立即注册
                     </Link>
                   </p>
                 )}
              </div>

              {/* 不再需要根据 show2fa 条件渲染不同表单，始终渲染登录表单 */}
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {/* 邮箱输入 */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                    邮箱地址
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-[#0582FF] focus:outline-none focus:ring-1 focus:ring-[#0582FF] dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-100 dark:placeholder-neutral-500"
                    placeholder="you@example.com"
                  />
                </div>

                {/* 密码输入 */}
                <div>
                   <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                      密码
                    </label>
                    <div className="text-sm">
                      <Link href="/login/forgot" className="font-medium text-[#0582FF] hover:text-[#006ADF] dark:text-[#3898FF] dark:hover:text-[#5CAEFF]">
                        忘记密码？
                      </Link>
                    </div>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-[#0582FF] focus:outline-none focus:ring-1 focus:ring-[#0582FF] dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-100 dark:placeholder-neutral-500"
                    placeholder="请输入密码"
                  />
                </div>

                {/* 主错误信息显示区域 */}
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}

                {/* 登录按钮 */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-[#09090b]"
                  >
                    {loading ? (
                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                    ) : '登录'}
                  </button>
                </div>

                {/* OAuth 分隔线 */}
                <div className="relative pt-1">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-sm text-neutral-500 dark:bg-[#09090b] dark:text-neutral-400">或使用</span>
                  </div>
                </div>

                {/* OAuth 按钮 */}
                <div className="grid grid-cols-2 gap-3">
                   <button
                      type="button"
                      onClick={() => openOAuthPopup('/auth/github')}
                      className="inline-flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-300 dark:hover:bg-[#262626] dark:focus:ring-offset-[#09090b]"
                    >
                      <GithubIcon />
                      <span>GitHub</span>
                   </button>
                    <button
                      type="button"
                      onClick={() => openOAuthPopup('/auth/google')}
                      className="inline-flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-300 dark:hover:bg-[#262626] dark:focus:ring-offset-[#09090b]"
                    >
                      <GoogleIcon />
                      <span>Google</span>
                   </button>
                </div>
                {/* 小屏幕显示注册链接 */}
                 <p className="text-center text-sm text-neutral-500 lg:hidden">
                   还没有账户？{' '}
                   <Link href="/register" className="font-medium text-[#0582FF] hover:text-[#006ADF] dark:text-[#3898FF] dark:hover:text-[#5CAEFF]">
                     立即注册
                   </Link>
                 </p>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* 添加 Footer */}
      <Footer />

      {/* 2FA ConfirmModal */}
      <ConfirmModal
        isOpen={show2fa}
        onClose={() => { setShow2fa(false); setError(''); }}
        onConfirm={handle2faSubmit} // 直接传递处理函数
        title="两步验证"
        confirmText="验证"
        cancelText="取消"
        isLoading={totpLoading}
        message={
          // 将 2FA 表单元素作为 message 内容传递
          <div className="space-y-4 pt-2"> { /* 添加一些垂直间距 */}
            <p className="text-sm text-neutral-600 dark:text-neutral-500">
              您的账户已启用两步验证。请输入{mode === 'totp' ? '您的动态验证码' : '一个未使用的备份码'}。
            </p>
            <div>
               <label htmlFor="2fa-code" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                 {mode === 'totp' ? '动态验证码 (6位数字)' : '备份码'}
               </label>
               <input
                 id="2fa-code" // 确保 ID 唯一
                 name="2fa-code"
                 type={mode === 'totp' ? 'text' : 'password'}
                 inputMode={mode === 'totp' ? 'numeric' : 'text'}
                 autoComplete="one-time-code"
                 required
                 value={code}
                 onChange={e => setCode(e.target.value)}
                 className="mt-1 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-[#0582FF] focus:outline-none focus:ring-1 focus:ring-[#0582FF] dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-100 dark:placeholder-neutral-500"
                 maxLength={mode === 'totp' ? 6 : undefined}
                 pattern={mode === 'totp' ? "\\d{6}" : undefined}
                 autoFocus
               />
            </div>

            {/* 2FA 错误信息 */}
            {totpMsg && (
              <p className="text-sm text-red-600 dark:text-red-400">{totpMsg}</p>
            )}

            {/* 模式切换按钮 */}
            <div className="text-left"> { /* 确保按钮靠左 */}
               <button
                type="button"
                onClick={() => {
                  setMode(mode === 'totp' ? 'backup' : 'totp');
                  setCode('');
                  setTotpMsg('');
                }}
                className="text-sm font-medium text-[#0582FF] hover:underline dark:text-[#3898FF] dark:hover:underline focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-white"
              >
                {mode === 'totp' ? '使用备份码' : '使用动态验证码'}
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}