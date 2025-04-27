"use client";

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Footer from '@/app/dashboard/components/Footer';

// 复用 AuthLayout 组件
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

// 左侧内容组件
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

export default function ForceLogoutPage() {
  const router = useRouter();

  return (
    <AuthLayout
      leftContent={
        <LeftContent
          title="账号异常"
          description="检测到您的账号存在异常登录行为，为了保护您的账户安全，已强制下线。"
        />
      }
      rightContent={
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
              账号异常，请重新登录
            </h2>
          </div>

          {/* 内容区域 */}
          <div className="space-y-6">
            {/* 大屏幕显示标题 */}
            <div className="hidden lg:block">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                账号已被强制下线
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                系统检测到您的账号存在异常登录行为，为了保护您的账户安全，已暂时限制访问。
              </p>
            </div>

            {/* 状态显示和按钮 */}
            <div className="text-center lg:text-left space-y-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                如果这不是您本人的操作，建议您登录后立即修改密码并开启两步验证。
              </p>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-[#09090b]"
              >
                重新登录
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
} 