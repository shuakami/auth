'use client';

import React from 'react';
import Header from '@/app/dashboard/components/Header';
import Footer from '@/app/dashboard/components/Footer';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AboutPage() {
  const { user } = useAuth();

  const theme = {
    bg: 'bg-white dark:bg-[#09090b]',
    textPrimary: 'text-neutral-900 dark:text-neutral-100',
    textSecondary: 'text-neutral-600 dark:text-zinc-400',
    link: 'text-indigo-600 hover:underline dark:text-indigo-400',
    border: 'border-neutral-200 dark:border-zinc-700',
  };

  return (
    <div className={`flex min-h-screen flex-col ${theme.bg}`}>
      <Header user={user} />
      <main className="flex-grow px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1070px]">
          {/* 介绍部分 */}
          <div className="mb-10">
            <h1 className="text-3xl font-extralight mb-4 tracking-tight text-neutral-900 dark:text-neutral-100">
              关于 sdjz.wiki 认证服务
            </h1>
            <p className={`${theme.textSecondary} text-base leading-relaxed`}>
              这是 sdjz.wiki 官方提供的统一身份认证服务，为各项服务提供安全、统一的登录和账户管理入口。
            </p>
          </div>

          {/* 分隔线 */}
          <hr className={`${theme.border} my-8`} />

          {/* 主要特性 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-3 text-neutral-900 dark:text-neutral-100">主要特性</h2>
            <ul className={`list-disc list-outside pl-5 mt-2 space-y-2 text-sm ${theme.textSecondary}`}>
              <li className="leading-relaxed">
                <strong>统一账户：</strong> 一次注册，通行于需要认证的 sdjz.wiki 服务。
              </li>
              <li className="leading-relaxed">
                <strong>多种登录方式：</strong> 支持邮箱密码登录，以及 Google、GitHub 等第三方账号快速登录。
              </li>
              <li className="leading-relaxed">
                <strong>安全增强：</strong> 提供两步验证 (2FA) 选项，包括 TOTP 动态密码和备份码。
              </li>
              <li className="leading-relaxed">
                <strong>账户自管理：</strong> 在用户中心方便地更新个人信息、修改密码、管理安全设置和关联的第三方账号。
              </li>
            </ul>
          </div>

          {/* 分隔线 */}
          <hr className={`${theme.border} my-8`} />

          {/* 联系与支持 */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-3 text-neutral-900 dark:text-neutral-100">联系与支持</h2>
            <p className={`${theme.textSecondary} leading-relaxed`}>
              如果您在使用过程中遇到任何问题或有任何建议，请通过{' '}
              <Link href="/help" className={theme.link}>
                帮助中心
              </Link>
              {' '}或发送邮件至{' '}
              <a href="mailto:shuakami@sdjz.wiki" className={theme.link}>
                shuakami@sdjz.wiki
              </a>
              {' '}与我们联系。
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 