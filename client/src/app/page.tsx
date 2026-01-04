"use client"
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/shared/Footer';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

// 高端动画配置 - 使用 Apple 风格的缓动
const premiumEasing = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: premiumEasing,
    }
  }
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: premiumEasing,
    }
  }
};

const buttonVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: premiumEasing,
    }
  }
};

export default function HomePage() {
  const { user, isLoading, initialLoading } = useAuth();

  if (initialLoading) {
    return <LoadingIndicator />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
      <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          className="w-full max-w-md mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div className="mb-10" variants={logoVariants}>
            <Image
                src="/assets/images/logo/logo-text-white.png"
                alt="Logo"
                width={140}
                height={36}
                className="mx-auto block dark:hidden"
                priority
            />
            <Image
                src="/assets/images/logo/logo-text-black.png"
                alt="Logo"
                width={140}
                height={36}
                className="mx-auto hidden dark:block"
                priority
            />
          </motion.div>

          {/* 标题 */}
          <motion.h1
            className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl"
            variants={itemVariants}
          >
            用户身份认证中心
          </motion.h1>

          {/* 描述 */}
          <motion.p
            className="mt-5 text-base leading-7 text-neutral-500 dark:text-neutral-400"
            variants={itemVariants}
          >
            安全、便捷地管理您的账户信息、登录方式和安全设置。
          </motion.p>

          {/* 按钮区域 */}
          <motion.div
            className="mt-10"
            variants={buttonVariants}
          >
            {isLoading ? (
              <div className="h-10" />
            ) : user ? (
              <Link
                href="/dashboard"
                className="cursor-pointer inline-flex items-center justify-center h-10 px-6 rounded-lg bg-neutral-900 text-sm font-medium text-white transition-all hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                进入用户中心
              </Link>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="cursor-pointer inline-flex items-center justify-center h-10 px-6 rounded-lg bg-neutral-900 text-sm font-medium text-white transition-all hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="cursor-pointer inline-flex items-center justify-center h-10 px-6 rounded-lg border border-neutral-200 bg-transparent text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 hover:scale-[1.02] active:scale-[0.98] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  注册
                </Link>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
