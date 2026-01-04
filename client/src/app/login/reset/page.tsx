'use client';
import React, { useState, type ReactNode, type FormEvent, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPassword } from '@/services/api';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/shared/Footer';
import { Loader } from '@/components/ui/Loader';

// Reusable Layout Components
const AuthLayout = ({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
    <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
        {leftContent}
        {rightContent}
      </div>
    </main>
    <Footer />
  </div>
);

const LeftContent = ({ title, description }: { title: string; description: string }) => (
  <div className="hidden lg:block text-center lg:text-left lg:pl-8">
     <Image
        src="/assets/images/logo/logo-text-white.png"
        alt="Logo"
        width={150}
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
      {title}
    </h1>
    <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
      {description}
    </p>
  </div>
);

// Loading Spinner SVG Component
const LoadingSpinner = () => (
  <Loader size={20} className="text-white" />
);

// 新建内部组件，包含所有客户端逻辑
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTokenChecked, setIsTokenChecked] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // Check token validity on mount
  useEffect(() => {
      if (token) {
          setIsTokenValid(true);
      } else {
          setIsTokenValid(false);
      }
      setIsTokenChecked(true);
  }, [token]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      let errorMessage = '重置失败，链接可能已失效或过期，请重新申请。';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error && typeof response.data.error === 'string') {
          errorMessage = response.data.error;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!isTokenChecked) {
        return <p className="text-center text-neutral-500 dark:text-neutral-400">正在检查链接...</p>;
    }

    if (!isTokenValid) {
      return (
        <div className="text-center lg:text-left space-y-4">
          <p className="text-sm text-red-600 dark:text-red-400">重置链接无效或已过期。</p>
          <p className="pt-2">
            <Link href="/login/forgot"
              className="inline-flex justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-[#09090b]"
            >
              重新获取重置链接
            </Link>
          </p>
        </div>
      );
    }

    if (success) {
      return (
        <div className="text-center lg:text-left space-y-4">
          <p className="text-sm text-green-600 dark:text-green-400">密码重置成功！</p>
          <p className="pt-2">
            <Link href="/login"
              className="inline-flex justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-[#09090b]"
            >
              前往登录
            </Link>
          </p>
        </div>
      );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
         <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            设置新密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-[#0582FF] focus:outline-none focus:ring-1 focus:ring-[#0582FF] dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-100 dark:placeholder-neutral-500"
            placeholder="至少10位，包含字母和数字"
          />
           {password && password.length < 10 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">密码长度至少需要10位</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div>
          <button
            type="submit"
            disabled={loading || (password !== '' && password.length < 10)}
            className="flex w-full justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-[#09090b]"
          >
            {loading ? <LoadingSpinner /> : '确认重置密码'}
          </button>
        </div>
       </form>
    );
  };

  return (
      <div className="mt-10 lg:mt-0 w-full max-w-md mx-auto">
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
              {success ? "重置成功" : (isTokenValid ? "设置新密码" : "链接无效")}
           </h2>
         </div>

         {/* 集成式表单/内容区域 */}
         <div className="space-y-6">
            {/* 大屏幕显示标题 */}
            <div className="hidden lg:block">
                 <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {success ? "密码已更新" : (isTokenValid ? "输入新密码" : "无法重置")}
                 </h2>
                 <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {success ? "您现在可以使用新密码登录了。" : (isTokenValid ? "请设置一个安全的、您记得住的新密码。" : "请返回忘记密码页面重新申请。")}
                 </p>
             </div>
             {renderContent()} { /* Render different content based on state */}
         </div>
       </div>
  );
}

// Page Loading Spinner Component
const PageLoadingSpinner = () => (
  <Loader size={32} className="text-[#0582FF]" />
);

// 原始页面组件现在只负责布局和渲染 Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-white dark:bg-[#09090b]">
        <PageLoadingSpinner />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">加载中...</p>
      </div>
    }>
      <AuthLayout
        leftContent={
          <LeftContent
            title="重置您的密码"
            description="安全地更新您的账户密码。"
          />
        }
        rightContent={<ResetPasswordForm />}
      />
    </Suspense>
  );
} 