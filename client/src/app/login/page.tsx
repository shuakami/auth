'use client';

import { memo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLogin } from '@/hooks/useLogin';
import { useOAuth } from '@/hooks/useOAuth';
import useAutoRedirectIfAuthenticated from '@/hooks/useAutoRedirectIfAuthenticated';
import LoginForm from '@/components/Auth/LoginForm';
import OAuthButtons from '@/components/Auth/OAuthButtons';
import TwoFactorModal from '@/components/Auth/TwoFactorModal';
import Footer from '../dashboard/components/Footer';
import { AUTH_CONSTANTS } from '@/constants/auth';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

// Logo 组件
const LogoSection = memo(function LogoSection({ 
  isLargeScreen = false 
}: { 
  isLargeScreen?: boolean 
}) {
  const logoWidth = isLargeScreen ? 150 : 120;
  const logoHeight = isLargeScreen ? 40 : 32;

  return (
    <>
            <Image
                src="/assets/images/logo/logo-text-white.png"
                alt="Logo"
        width={logoWidth}
        height={logoHeight}
                className="mx-auto lg:mx-0 mb-6 block dark:hidden"
        priority
            />
            <Image
                src="/assets/images/logo/logo-text-black.png"
                alt="Logo"
        width={logoWidth}
        height={logoHeight}
                className="mx-auto lg:mx-0 mb-6 hidden dark:block"
        priority
      />
    </>
  );
});

// 页面标题组件
const PageTitle = memo(function PageTitle({ 
  show2fa, 
  isLargeScreen = false 
}: { 
  show2fa: boolean; 
  isLargeScreen?: boolean 
}) {
  if (isLargeScreen) {
    return (
              <div className="hidden lg:block mb-6">
                 <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                   {show2fa ? '输入验证码' : '登录'}
                 </h2>
                 {!show2fa && (
                    <p className="mt-1 text-sm text-neutral-500">
                     还没有账户？{' '}
            <Link 
              href={AUTH_CONSTANTS.ROUTES.REGISTER} 
              className="font-medium text-[#0582FF] hover:text-[#006ADF] dark:text-[#3898FF] dark:hover:text-[#5CAEFF]"
            >
                       立即注册
                     </Link>
                   </p>
                 )}
              </div>
    );
  }

  return (
    <h2 className="mt-6 text-center text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
      {show2fa ? '两步验证' : '登录您的账户'}
    </h2>
  );
});

// 左侧欢迎区域组件
const WelcomeSection = memo(function WelcomeSection() {
  return (
    <div className="hidden lg:block text-center lg:text-left lg:pl-8">
      <LogoSection isLargeScreen />
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">
        欢迎回来。
      </h1>
      <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
        使用您的账户凭据或第三方服务继续。
      </p>
                    </div>
  );
});

// 小屏幕注册链接组件
const RegisterLink = memo(function RegisterLink() {
  return (
                 <p className="text-center text-sm text-neutral-500 lg:hidden">
                   还没有账户？{' '}
      <Link 
        href={AUTH_CONSTANTS.ROUTES.REGISTER} 
        className="font-medium text-[#0582FF] hover:text-[#006ADF] dark:text-[#3898FF] dark:hover:text-[#5CAEFF]"
      >
                     立即注册
                   </Link>
                 </p>
  );
});

// 将登录页面的核心逻辑和UI移入此组件
function LoginContent() {
  // 自动重定向已认证用户
  useAutoRedirectIfAuthenticated();

  // 使用登录 hook
  const {
    email,
    password,
    error,
    loading,
    show2fa,
    twoFAMode,
    twoFACode,
    twoFAMessage,
    twoFAMessageType,
    twoFALoading,
    setEmail,
    setPassword,
    set2FACode,
    toggle2FAMode,
    close2FA,
    handleLoginSubmit,
    handle2FASubmit,
    setError,
  } = useLogin();

  // 使用 OAuth hook
  const { loginWithGitHub, loginWithGoogle } = useOAuth({
    onError: setError,
  });

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
      {/* 主内容区域 */}
      <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
          
          {/* 左侧欢迎区域 */}
          <WelcomeSection />

          {/* 右侧登录表单区域 */}
          <div className="mt-10 lg:mt-0 w-full max-w-md mx-auto">
            
            {/* 小屏幕 Logo 和标题 */}
            <div className="text-center lg:hidden mb-8">
              <LogoSection />
              <PageTitle show2fa={show2fa} />
            </div>

            {/* 登录表单容器 */}
            <div className="space-y-6">
              
              {/* 大屏幕标题 */}
              <PageTitle show2fa={show2fa} isLargeScreen />

              {/* 登录表单 */}
              <LoginForm
                email={email}
                password={password}
                error={error}
                loading={loading}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={handleLoginSubmit}
              />

              {/* OAuth 按钮 */}
              <OAuthButtons
                onGitHubLogin={loginWithGitHub}
                onGoogleLogin={loginWithGoogle}
                disabled={loading}
              />

              {/* 小屏幕注册链接 */}
              <RegisterLink />
            </div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <Footer />

      {/* 2FA 模态框 */}
      <TwoFactorModal
        isOpen={show2fa}
        mode={twoFAMode}
        code={twoFACode}
        message={twoFAMessage}
        messageType={twoFAMessageType}
        loading={twoFALoading}
        onClose={close2FA}
        onConfirm={handle2FASubmit}
        onCodeChange={set2FACode}
        onModeToggle={toggle2FAMode}
      />
    </div>
  );
}

// 主登录页面组件现在负责提供 Suspense 边界
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#09090b]">
        <LoadingIndicator />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}