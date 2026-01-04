'use client';

import { memo, Suspense, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLogin } from '@/hooks/useLogin';
import { useOAuth } from '@/hooks/useOAuth';
import useAutoRedirectIfAuthenticated from '@/hooks/useAutoRedirectIfAuthenticated';
import LoginForm from '@/components/Auth/LoginForm';
import AlternativeLoginButtons from '@/components/Auth/AlternativeLoginButtons';
import TwoFactorModal from '@/components/Auth/TwoFactorModal';
import Footer from '../dashboard/components/Footer';
import { AUTH_CONSTANTS } from '@/constants/auth';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

// 高端动画配置
const premiumEasing = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: premiumEasing,
    }
  }
};

const leftSectionVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: premiumEasing,
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const leftItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: premiumEasing,
    }
  }
};

// Logo 组件
const LogoSection = memo(function LogoSection({ 
  isLargeScreen = false 
}: { 
  isLargeScreen?: boolean 
}) {
  const logoWidth = isLargeScreen ? 140 : 120;
  const logoHeight = isLargeScreen ? 36 : 32;

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
      <motion.div className="hidden lg:block mb-6" variants={itemVariants}>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {show2fa ? '输入验证码' : '登录'}
        </h2>
        {!show2fa && (
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            还没有账户？{' '}
            <Link 
              href={AUTH_CONSTANTS.ROUTES.REGISTER} 
              className="text-neutral-900 hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 transition-colors"
            >
              立即注册
            </Link>
          </p>
        )}
      </motion.div>
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
    <motion.div 
      className="hidden lg:block text-center lg:text-left lg:pl-8"
      variants={leftSectionVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={leftItemVariants}>
        <LogoSection isLargeScreen />
      </motion.div>
      <motion.h1 
        className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl"
        variants={leftItemVariants}
      >
        欢迎回来。
      </motion.h1>
      <motion.p 
        className="mt-4 text-base text-neutral-500 dark:text-neutral-400"
        variants={leftItemVariants}
      >
        使用您的账户凭据或第三方服务继续。
      </motion.p>
    </motion.div>
  );
});

// 小屏幕注册链接组件
const RegisterLink = memo(function RegisterLink() {
  return (
    <motion.p 
      className="text-center text-sm text-neutral-500 dark:text-neutral-400 lg:hidden"
      variants={itemVariants}
    >
      还没有账户？{' '}
      <Link 
        href={AUTH_CONSTANTS.ROUTES.REGISTER} 
        className="text-neutral-900 hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 transition-colors"
      >
        立即注册
      </Link>
    </motion.p>
  );
});

// 将登录页面的核心逻辑和UI移入此组件
function LoginContent() {
  const { initialLoading } = useAuth();
  const { toast } = useToast();
  
  // 自动重定向已认证用户
  useAutoRedirectIfAuthenticated();

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
    clearError,
  } = useLogin();

  // 使用 toast 显示错误
  useEffect(() => {
    if (error) {
      toast(error);
      clearError();
    }
  }, [error, toast, clearError]);

  // 使用 OAuth hook
  const { loginWithGitHub, loginWithGoogle } = useOAuth({
    onError: (err) => toast(err),
  });

  // 如果还在初始加载中，显示加载指示器
  if (initialLoading) {
    return <LoadingIndicator />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
      {/* 主内容区域 */}
      <main className="flex-grow flex items-center justify-center px-4 pt-20 pb-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
          
          {/* 左侧欢迎区域 */}
          <WelcomeSection />

          {/* 右侧登录表单区域 */}
          <motion.div 
            className="mt-10 lg:mt-0 w-full max-w-md mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            
            {/* 小屏幕 Logo 和标题 */}
            <motion.div className="text-center lg:hidden mb-8" variants={itemVariants}>
              <LogoSection />
              <PageTitle show2fa={show2fa} />
            </motion.div>

            {/* 登录表单容器 */}
            <div className="space-y-6">
              
              {/* 大屏幕标题 */}
              <PageTitle show2fa={show2fa} isLargeScreen />

              {/* 登录表单 */}
              <motion.div variants={itemVariants}>
                <LoginForm
                  email={email}
                  password={password}
                  loading={loading}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onSubmit={handleLoginSubmit}
                />
              </motion.div>

              {/* 替代登录方式 */}
              <motion.div variants={itemVariants}>
                <AlternativeLoginButtons
                  onGitHubLogin={loginWithGitHub}
                  onGoogleLogin={loginWithGoogle}
                  onBiometricSuccess={(result) => {
                    console.log('生物验证登录成功:', result);
                  }}
                  onError={(err) => toast(err)}
                  disabled={loading || show2fa}
                />
              </motion.div>

              {/* 小屏幕注册链接 */}
              <RegisterLink />
            </div>
          </motion.div>
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