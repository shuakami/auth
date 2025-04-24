'use client';

import { useState, type ReactNode, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { register, resendVerifyEmail } from '@/services/api';
import Link from 'next/link';
import useAutoRedirectIfAuthenticated from '@/hooks/useAutoRedirectIfAuthenticated';
import Image from 'next/image';
import Footer from '../dashboard/components/Footer';

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

export default function RegisterPage() {
  useAutoRedirectIfAuthenticated();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await register(email, password, username);
      setSuccessMessage(response.data.message || '注册成功！请检查您的邮箱以完成验证。');
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || '注册失败，请稍后重试。';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email && successMessage) {
      setError('请输入您注册时使用的邮箱地址以重发验证邮件。');
      return;
    }
    setResendMsg('发送中...');
    setError('');
    try {
      await resendVerifyEmail(email);
      setResendMsg('验证邮件已重新发送，请查收。');
    } catch (err: any) {
      setResendMsg(err?.response?.data?.error || '发送失败，请稍后再试或检查邮箱地址是否正确。');
    }
  };

  return (
    <AuthLayout
      leftContent={
        <LeftContent
          title="嗨。"
          description="快速创建您的账户，开启全新体验。"
        />
      }
      rightContent={
        <div className="mt-10 lg:mt-0 w-full max-w-md mx-auto">
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
              {successMessage ? '注册成功' : '创建新账户'}
            </h2>
          </div>

          <div className="space-y-6">
            <div className="hidden lg:block">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                   {successMessage ? '请检查邮箱' : '填写注册信息'}
                </h2>
                {!successMessage && (
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    已有账户？{' '}
                    <Link href="/login" className="font-medium text-[#0582FF] hover:text-[#006ADF] dark:text-[#3898FF] dark:hover:text-[#5CAEFF]">
                      直接登录
                    </Link>
                  </p>
                )}
             </div>

            {successMessage ? (
              <div className="text-center lg:text-left space-y-4">
                <p className="text-green-600 dark:text-green-400">{successMessage}</p>
                <div>
                  <button type="button" onClick={handleResend} className="text-sm font-medium text-[#0582FF] hover:text-[#006ADF] dark:text-[#3898FF] dark:hover:text-[#5CAEFF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-[#09090b]">
                    未收到验证邮件？重新发送
                  </button>
                  {resendMsg && <p className={`mt-2 text-sm ${resendMsg.includes('失败') || resendMsg.includes('错误') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{resendMsg}</p>}
                </div>
                <p className="pt-2">
                  <Link href="/login" className="inline-flex justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 dark:focus:ring-offset-[#09090b]">
                    前往登录
                  </Link>
                </p>
              </div>
            ) : (
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

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    用户名 <span className="text-neutral-400 dark:text-neutral-500">(可选)</span>
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                     className="mt-1 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-[#0582FF] focus:outline-none focus:ring-1 focus:ring-[#0582FF] dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-100 dark:placeholder-neutral-500"
                    placeholder="设置一个独特的用户名"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    密码
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
                    {loading ? (
                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                    ) : '创建账户'}
                  </button>
                </div>
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 lg:hidden">
                  已有账户？{' '}
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