"use client"
import Link from 'next/link';
import Image from 'next/image';
import Footer from './dashboard/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import LoadingIndicator from '@/components/ui/LoadingIndicator';

// 定义动画变体
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // 子元素依次入场，间隔 0.2 秒
      ease: "easeOut",
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 }, // 初始状态：透明、下方 20px、略微缩小
  visible: {
    opacity: 1,
    y: 0,           // 最终状态：不透明、原始位置
    scale: 1,       // 最终状态：原始大小
    transition: {
      duration: 0.5, // 动画持续时间
      ease: [0.4, 0, 0.2, 1] // 自定义缓动效果 (类似 easeOutQuint)
    }
  }
};

export default function HomePage() {
  const { user, isLoading, initialLoading } = useAuth();

  // 如果还在初始加载中，显示加载指示器
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
          <motion.div className="mb-8" variants={itemVariants}>
            <Image
                src="/assets/images/logo/logo-text-white.png"
                alt="Logo"
                width={150}
                height={40}
                className="mx-auto block dark:hidden"
                priority
            />
            <Image
                src="/assets/images/logo/logo-text-black.png"
                alt="Logo"
                width={150}
                height={40}
                className="mx-auto hidden dark:block"
                priority
            />
          </motion.div>

          <motion.h1
            className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl"
            variants={itemVariants}
          >
            用户身份认证中心
          </motion.h1>

          <motion.p
            className="mt-6 text-lg leading-8 text-neutral-600 dark:text-neutral-400"
            variants={itemVariants}
          >
            在这里，您可以安全、便捷地管理您的账户信息、登录方式和安全设置。
          </motion.p>

          <motion.div
            className="mt-10 flex items-center justify-center gap-x-6"
            variants={itemVariants}
          >
            <div>
              {isLoading ? (
                <div className="h-[15px]"></div>
              ) : user ? (
                <Link
                  href="/dashboard"
                  className="rounded-md bg-[#0582FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#006ADF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0582FF] dark:bg-[#3898FF] dark:hover:bg-[#5CAEFF] dark:focus-visible:outline-[#3898FF]"
                >
                  进入用户中心
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-x-6">
                  <Link
                    href="/login"
                    className="rounded-md bg-[#0582FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#006ADF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0582FF] dark:bg-[#3898FF] dark:hover:bg-[#5CAEFF] dark:focus-visible:outline-[#3898FF]"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
