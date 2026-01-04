'use client';

import { useState, type ReactNode, type FormEvent, Suspense, useEffect } from 'react';
import { register, resendVerifyEmail } from '@/services/api';
import Link from 'next/link';
import { motion } from 'framer-motion';
import useAutoRedirectIfAuthenticated from '@/hooks/useAutoRedirectIfAuthenticated';
import Image from 'next/image';
import Footer from '@/components/shared/Footer';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Loader } from '@/components/ui/Loader';

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

const AuthLayout = ({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
    <main className="flex-grow flex items-center justify-center px-4 pt-16 pb-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
        {leftContent}
        {rightContent}
      </div>
    </main>
    <Footer />
  </div>
);

const LeftContent = ({ title, description }: { title: string; description: string }) => (
  <motion.div 
    className="hidden lg:block text-center lg:text-left lg:pl-8"
    variants={leftSectionVariants}
    initial="hidden"
    animate="visible"
  >
    <motion.div variants={leftItemVariants}>
      <Image
        src="/assets/images/logo/logo-text-white.png"
        alt="Logo"
        width={140}
        height={36}
        className="mx-auto lg:mx-0 mb-6 block dark:hidden"
      />
      <Image
        src="/assets/images/logo/logo-text-black.png"
        alt="Logo"
        width={140}
        height={36}
        className="mx-auto lg:mx-0 mb-6 hidden dark:block"
      />
    </motion.div>
    <motion.h1 
      className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl"
      variants={leftItemVariants}
    >
      {title}
    </motion.h1>
    <motion.p 
      className="mt-4 text-base text-neutral-500 dark:text-neutral-400"
      variants={leftItemVariants}
    >
      {description}
    </motion.p>
  </motion.div>
);

// 统一输入框样式
const inputClasses = "mt-1.5 block w-full h-10 px-3 rounded-lg border border-neutral-200 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-500";

function RegisterContent() {
  const { initialLoading } = useAuth();
  const { toast } = useToast();
  
  useAutoRedirectIfAuthenticated();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // 使用 toast 显示错误
  useEffect(() => {
    if (error) {
      toast(error);
      setError('');
    }
  }, [error, toast]);
  
  if (initialLoading) {
    return <LoadingIndicator />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setRegisteredEmail('');
    setLoading(true);

    try {
      const response = await register(email, password, username);
      setSuccessMessage(response.data.message || '注册成功！请检查您的邮箱以完成验证。');
      setRegisteredEmail(email);
      toast('注册成功，请查收验证邮件');
      setEmail('');
      setPassword('');
      setUsername('');
    } catch (err: unknown) {
      let errorMessage = '注册失败，请稍后重试。';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string, error?: string } } }).response;
        errorMessage = response?.data?.message || response?.data?.error || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) {
      toast('无法获取邮箱地址');
      return;
    }
    setResendLoading(true);
    try {
      await resendVerifyEmail(registeredEmail);
      toast('验证邮件已重新发送');
    } catch (err: unknown) {
      let errorMessage = '发送失败，请稍后再试';
       if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error && typeof response.data.error === 'string') {
          errorMessage = response.data.error;
        }
      }
      toast(errorMessage);
    } finally {
      setResendLoading(false);
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
        <motion.div 
          className="mt-10 lg:mt-0 w-full max-w-md mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="text-center lg:hidden mb-8" variants={itemVariants}>
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
          </motion.div>

          <div className="space-y-6">
            <motion.div className="hidden lg:block" variants={itemVariants}>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                   {successMessage ? '请检查邮箱' : '填写注册信息'}
                </h2>
                {!successMessage && (
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    已有账户？{' '}
                    <Link href="/login" className="text-neutral-900 hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 transition-colors">
                      直接登录
                    </Link>
                  </p>
                )}
             </motion.div>

            {successMessage ? (
              <motion.div className="text-center lg:text-left space-y-4" variants={itemVariants}>
                <p className="text-neutral-600 dark:text-neutral-400">{successMessage}</p>
                <div>
                  <button 
                    type="button" 
                    onClick={handleResend} 
                    disabled={resendLoading}
                    className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? '发送中...' : '未收到验证邮件？重新发送'}
                  </button>
                </div>
                <p className="pt-2">
                  <Link href="/login" className="cursor-pointer inline-flex justify-center items-center h-10 px-4 rounded-lg bg-neutral-900 text-sm font-medium text-white transition-all hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200">
                    前往登录
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.form onSubmit={handleSubmit} className="space-y-5" variants={itemVariants}>
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
                    className={inputClasses}
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
                    className={inputClasses}
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
                    className={inputClasses}
                    placeholder="至少10位，包含字母和数字"
                  />
                  {password && password.length < 10 && (
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">密码长度至少需要10位</p>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || (password !== '' && password.length < 10)}
                    className="cursor-pointer flex w-full justify-center items-center gap-2 h-10 rounded-lg bg-neutral-900 text-sm font-medium text-white transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    {loading && <Loader size={16} />}
                    <span>{loading ? '创建中...' : '创建账户'}</span>
                  </button>
                </div>
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 lg:hidden">
                  已有账户？{' '}
                  <Link href="/login" className="text-neutral-900 hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 transition-colors">
                    直接登录
                  </Link>
                </p>
              </motion.form>
            )}
          </div>
        </motion.div>
      }
    />
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#09090b]">
        <LoadingIndicator />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
} 