'use client';
import { useState, type ReactNode, type FormEvent } from 'react';
import { forgotPassword } from '@/services/api';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '../../dashboard/components/Footer';

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (!res.exists) {
        setError('该邮箱未注册，请检查您输入的地址是否正确。');
        setSent(true); // 切换到显示结果的界面，但显示错误信息
      } else {
        setError(''); // 清除之前的错误
        setSent(true); // 邮箱存在，切换到显示成功发送的界面
      }
    } catch (err) {
      setError('请求处理时发生错误，请稍后重试。');
      setSent(true); // Still show the "sent" state UI
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      leftContent={
        <LeftContent
          title="忘记密码了？"
          description="别担心，输入您的注册邮箱，我们会向您发送重置密码的说明。"
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
               {sent ? '检查您的邮箱' : '找回密码'}
            </h2>
          </div>

          {/* 集成式表单区域 */}
          <div className="space-y-6">
             {/* 大屏幕显示标题 */}
             <div className="hidden lg:block">
                 <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                     {sent ? (error ? '发送失败' : '邮件已发送') : '输入邮箱地址'}
                 </h2>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {sent ? (error ? '无法发送邮件，请检查邮箱地址或稍后重试。' : '如果邮箱正确，您将很快收到重置链接。') : '我们将向您的邮箱发送重置密码的链接。'}
                  </p>
              </div>

            {sent ? (
              // 发送后提示
              <div className="text-center lg:text-left space-y-4">
                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : (
                  <p className="text-sm text-green-600 dark:text-green-400">重置密码邮件已发送至 <strong>{email}</strong>，请检查您的收件箱（包括垃圾邮件）。</p>
                )}
                <p className="pt-2">
                  <Link href="/login"
                    className="inline-flex justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-[#09090b]"
                  >
                    返回登录
                  </Link>
                </p>
              </div>
            ) : (
              // 输入邮箱表单
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
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

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}

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
                    ) : '发送重置链接'}
                  </button>
                </div>
                {/* 小屏幕显示登录链接 */}
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 lg:hidden">
                  记起密码了？{' '}
                  <Link href="/login" className="font-medium text-[#0582FF] hover:text-[#006ADF] dark:text-[#3898FF] dark:hover:text-[#5CAEFF]">
                    直接登录
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      }
    />
  );
} 