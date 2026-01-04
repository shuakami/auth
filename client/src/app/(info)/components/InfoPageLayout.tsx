'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/shared/Footer';

// 高端动画配置
const premiumEasing = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    }
  }
};

const itemVariants = {
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

interface InfoPageLayoutProps {
  title: string;
  description?: string;
  lastUpdated?: string;
  children: ReactNode;
}

export default function InfoPageLayout({ 
  title, 
  description, 
  lastUpdated,
  children 
}: InfoPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
      {/* 简洁顶部导航 */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between">
            <Link 
              href="/" 
              className="cursor-pointer flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>返回</span>
            </Link>
            <Link href="/">
              <Image
                src="/assets/images/logo/logo-white.png"
                alt="Logo"
                width={24}
                height={24}
                className="block dark:hidden"
              />
              <Image
                src="/assets/images/logo/logo-black.png"
                alt="Logo"
                width={24}
                height={24}
                className="hidden dark:block"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-grow px-4 py-12 sm:px-6 lg:px-8">
        <motion.div 
          className="mx-auto max-w-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 页面标题区域 */}
          <motion.div className="mb-10" variants={itemVariants}>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-base text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {description}
              </p>
            )}
            {lastUpdated && (
              <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">
                最后更新：{lastUpdated}
              </p>
            )}
          </motion.div>

          {/* 分隔线 */}
          <motion.div 
            className="h-px bg-neutral-100 dark:bg-neutral-800 mb-10"
            variants={itemVariants}
          />

          {/* 内容区域 */}
          <motion.div 
            className="prose prose-neutral dark:prose-invert max-w-none"
            variants={itemVariants}
          >
            {children}
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

// 通用章节组件
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section className="mb-10 last:mb-0" variants={itemVariants}>
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        {title}
      </h2>
      <div className="text-neutral-600 dark:text-neutral-400 text-[15px] leading-relaxed space-y-4">
        {children}
      </div>
    </motion.section>
  );
}

// 帮助项组件
export function HelpItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div className="mb-8 last:mb-0" variants={itemVariants}>
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-3">
        {title}
      </h3>
      <div className="text-neutral-600 dark:text-neutral-400 text-[15px] leading-relaxed space-y-3">
        {children}
      </div>
    </motion.div>
  );
}

// 链接样式
export const linkClasses = "text-neutral-900 dark:text-neutral-100 underline underline-offset-2 decoration-neutral-300 dark:decoration-neutral-600 hover:decoration-neutral-500 dark:hover:decoration-neutral-400 transition-colors";
