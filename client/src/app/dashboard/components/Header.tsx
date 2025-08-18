import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

// 定义 User 类型
interface User {
  id: string;
  username: string | null;
}

interface HeaderProps {
  user: User | null; // 明确 user 可以是 null
}

export default function Header({ user }: HeaderProps) {
  const { logout } = useAuth(); // logout 只有在 user 存在时才需要

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/80 backdrop-blur-sm dark:border-[#262626]/80 dark:bg-[#09090b]/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* 左侧 Logo 和导航 */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <div className="relative">
              <Image
                src="/assets/images/logo/logo-text-white.png"
                alt="Logo Text"
                className="block dark:hidden"
                width={60}
                height={32}
                priority
              />
              <Image
                src="/assets/images/logo/logo-text-black.png"
                alt="Logo Text"
                className="hidden dark:block"
                width={60}
                height={32}
                priority
              />
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex mt-1">
            <Link
              href={user ? "/dashboard" : "/"} // 如果未登录，仪表盘链接指向首页
              className="rounded-md px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-100 dark:text-zinc-100 dark:hover:bg-[#262626]"
            >
              {user ? "仪表盘" : "首页"}
            </Link>
          </nav>
        </div>

        {/* 右侧内容 - 条件渲染 */}
        <div className="flex items-center gap-3">
          {user ? (
            // 用户已登录：显示用户名和登出按钮
            <>
              <div className="hidden items-center gap-3 sm:flex">
                <span className="text-xs font-medium text-neutral-900 dark:text-zinc-100">
                  {user.username || '未设置用户名'}
                </span>
                <div className="h-6 w-px bg-neutral-200 dark:bg-[#404040]" />
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                登出
              </Button>
            </>
          ) : (
            // 用户未登录：显示登录和注册按钮
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-zinc-300 dark:hover:bg-[#262626]"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-[#0582FF] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#006ADF] dark:bg-[#3898FF] dark:hover:bg-[#5CAEFF]"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
} 