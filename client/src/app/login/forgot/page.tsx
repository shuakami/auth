'use client';

import { useState, type FormEvent, Suspense, useEffect } from 'react';
import { forgotPassword } from '@/services/api';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Footer from '@/components/shared/Footer';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
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

// 统一输入框样式
const inputClasses = "mt-1.5 block w-full h-10 px-3 rounded-lg border border-neutral-200 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-500";

function ForgotPasswordContent() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  // 使用 toast 显示错误
  useEffect(() => {
    if (error) {
      toast(error);
      setError('');
    }
  }, [error, toast]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (!res.exists) {
        setError('该邮箱未注册，请检查输入是否正确');
      } else {
        setSentEmail(email);
        setSent(true);
        toast('重置邮件已发送');
      }
    } catch {
      setError('请求处理时发生错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
      <main className="flex-grow flex items-center justify-center px-4 pt-20 pb-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
          
          {/* 左侧区域 */}
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
              {sent ? '检查邮箱。' : '忘记密码？'}
            </motion.h1>
            <motion.p 
              className="mt-4 text-base text-neutral-500 dark:text-neutral-400"
              variants={leftItemVariants}
            >
              {sent 
                ? '我们已向您发送重置链接，请查收。' 
                : '输入您的注册邮箱，我们将发送重置链接。'}
            </motion.p>
          </motion.div>

          {/* 右侧表单区域 */}
          <motion.div 
            className="mt-10 lg:mt-0 w-full max-w-md mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* 小屏幕 Logo 和标题 */}
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
                {sent ? '邮件已发送' : '找回密码'}
              </h2>
            </motion.div>

            <div className="space-y-6">
              {/* 大屏幕标题 */}
              <motion.div className="hidden lg:block" variants={itemVariants}>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {sent ? '请检查收件箱' : '输入邮箱地址'}
                </h2>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {sent 
                    ? '包括垃圾邮件文件夹' 
                    : (
                      <>
                        记起密码了？{' '}
                        <Link href="/login" className="text-neutral-900 hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 transition-colors">
                          直接登录
                        </Link>
                      </>
                    )}
                </p>
              </motion.div>

              {sent ? (
                // 发送成功状态
                <motion.div className="space-y-5" variants={itemVariants}>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    重置密码邮件已发送至 <span className="font-medium text-neutral-900 dark:text-neutral-100">{sentEmail}</span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/login"
                      className="cursor-pointer inline-flex justify-center items-center h-10 px-4 rounded-lg bg-neutral-900 text-sm font-medium text-white transition-all hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                      返回登录
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSent(false);
                        setEmail('');
                        setSentEmail('');
                      }}
                      className="cursor-pointer inline-flex justify-center items-center h-10 px-4 rounded-lg border border-neutral-200 bg-transparent text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 hover:scale-[1.02] active:scale-[0.98] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      使用其他邮箱
                    </button>
                  </div>
                </motion.div>
              ) : (
                // 输入邮箱表单
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
                    <button
                      type="submit"
                      disabled={loading}
                      className="cursor-pointer flex w-full justify-center items-center h-10 rounded-lg bg-neutral-900 text-sm font-medium text-white transition-all hover:bg-neutral-800 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                      {loading ? (
                        <Loader size={16} />
                      ) : '发送重置链接'}
                    </button>
                  </div>

                  {/* 小屏幕登录链接 */}
                  <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 lg:hidden">
                    记起密码了？{' '}
                    <Link href="/login" className="text-neutral-900 hover:text-neutral-600 dark:text-neutral-100 dark:hover:text-neutral-300 transition-colors">
                      直接登录
                    </Link>
                  </p>
                </motion.form>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#09090b]">
        <LoadingIndicator />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
