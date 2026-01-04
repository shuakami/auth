'use client';

import { useEffect, useState, Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/services/api';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/shared/Footer';
import { Loader } from '@/components/ui/Loader';

// Reusable Layout Components (Assuming defined elsewhere or copy from previous)
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
  <Loader size={32} className="text-[#0582FF]" />
);


function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('正在验证您的邮箱，请稍候...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('无效的验证链接。链接中缺少必要的令牌。');
      return;
    }

    const verify = async () => {
      setStatus('verifying'); // Ensure verifying state while request is in flight
      setMessage('正在验证您的邮箱，请稍候...');
      try {
        const response = await verifyEmail(token);
        setStatus('success');
        setMessage(response.data.message || '邮箱验证成功！感谢您的注册。');
      } catch (err: unknown) { // Specify type for err
        setStatus('error');
        let errorMessage = '邮箱验证失败。链接可能已过期或已被使用。';
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const response = (err as { response?: { data?: { message?: string, error?: string } } }).response;
          errorMessage = response?.data?.message || response?.data?.error || errorMessage;
        }
        setMessage(errorMessage);
      }
    };

    verify();
  }, [token]);

  const getTitle = () => {
    if (status === 'verifying') return '正在验证';
    if (status === 'success') return '验证成功';
    return '验证失败';
  };

  const getDescription = () => {
     if (status === 'verifying') return '我们正在处理您的邮箱验证请求。';
     if (status === 'success') return '您的邮箱已成功验证，现在可以登录您的账户了。';
     return '无法完成邮箱验证，请检查链接或联系支持。';
  }

  const renderRightContent = () => (
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
               {getTitle()}
            </h2>
        </div>

        {/* 集成式内容区域 */}
        <div className="space-y-6">
             {/* 大屏幕显示标题 */}
             <div className="hidden lg:block">
                 <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                     {getTitle()}
                 </h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {getDescription()}
                  </p>
              </div>

            {/* 状态显示 */}
            <div className="text-center lg:text-left space-y-4">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center lg:items-start space-y-3 pt-4">
                        <LoadingSpinner />
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
                    </div>
                )}
                {status === 'success' && (
                  <div className="space-y-3">
                    <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
                    <p className="pt-1">
                        <Link href="/login"
                         className="inline-flex justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-[#09090b]"
                         >
                        前往登录
                        </Link>
                    </p>
                  </div>
                )}
                {status === 'error' && (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
                    <p className="pt-1">
                        <Link href="/login"
                        className="inline-flex justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-[#09090b]"
                        >
                        尝试登录
                        </Link>
                    </p>
                     <p className="text-xs text-neutral-500 dark:text-neutral-400">（如果问题持续存在，请联系支持）</p>
                  </div>
                )}
            </div>
        </div>
      </div>
  );

  return (
    <AuthLayout
      leftContent={
        <LeftContent
          title={getTitle()}
          description={getDescription()}
        />
      }
      rightContent={renderRightContent()}
    />
  );
}

// 使用 Suspense 包裹以处理 useSearchParams
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
        // Provide a styled fallback that matches the layout
         <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-white dark:bg-[#09090b]">
            <LoadingSpinner />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">加载中...</p>
        </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
