"use client";
import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { verify2FA } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import Image from 'next/image';

// Reusable Layout Components
const AuthLayout = ({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
    <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
        {leftContent}
        {rightContent}
      </div>
    </main>
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
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function TwoFARequiredPage() {
  const [totp, setTotp] = useState("");
  const [totpMsg, setTotpMsg] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const router = useRouter();
  const { checkAuth } = useAuth();

  const handle2fa = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTotpLoading(true);
    setTotpMsg("");
    try {
      await verify2FA(totp);
      setTotpMsg("验证成功，正在跳转...");
      setTimeout(async () => {
        await checkAuth();
        if (window.opener && window.opener !== window) {
          window.opener.postMessage('github-2fa-success', '*');
          window.opener.postMessage('google-2fa-success', '*');
          window.close();
        } else {
          router.push("/dashboard");
        }
      }, 1200);
    } catch (err: unknown) {
      let errorMessage = "验证码错误或已失效";
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

  return (
    <AuthLayout
      leftContent={
        <LeftContent
          title="安全验证"
          description="为了保护您的账户安全，请输入您的两步验证代码。"
        />
      }
      rightContent={
        <div className="lg:mt-0 w-full max-w-md mx-auto">
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
                    需要二步验证
                </h2>
            </div>

            {/* 集成式表单区域 */}
            <div className="space-y-6">
                {/* 大屏幕显示标题 */}
                <div className="hidden lg:block">
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                        输入验证码
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        请输入您身份验证器应用中的 6 位代码。
                    </p>
                </div>

                <form onSubmit={handle2fa} className="space-y-5">
                    <div>
                        <label htmlFor="totp-code" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            动态验证码 (6位数字)
                        </label>
                        <input
                            id="totp-code"
                            name="totp-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                            value={totp}
                            onChange={e => setTotp(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-[#0582FF] focus:outline-none focus:ring-1 focus:ring-[#0582FF] dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-100 dark:placeholder-neutral-500"
                            maxLength={6}
                            pattern="\d{6}"
                            autoFocus
                        />
                    </div>

                    {totpMsg && (
                         <p className={`text-sm ${totpMsg.includes('成功') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{totpMsg}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={totpLoading}
                             className="flex w-full justify-center rounded-md border border-transparent bg-[#0582FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#006ADF] focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-[#09090b]"
                        >
                            {totpLoading ? <LoadingSpinner /> : '验证'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      }
    />
  );
}