import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  user: any;
}

export default function Header({ user }: HeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200/80 bg-white/80 backdrop-blur-sm dark:border-[#262626]/80 dark:bg-[#09090b]/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <div className="relative">
              <Image
                src="/assets/images/logo/logo-text-white.png"
                alt="Logo Text"
                className="block dark:hidden"
                width={60}
                height={32}
              />
              <Image
                src="/assets/images/logo/logo-text-black.png"
                alt="Logo Text"
                className="hidden dark:block"
                width={60}
                height={32}
              />
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex mt-1">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-100 dark:text-zinc-100 dark:hover:bg-[#262626]"
            >
              仪表盘
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-neutral-900 dark:text-zinc-100">
                {user.username || '未设置用户名'}
              </span>
            </div>
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
        </div>
      </div>
    </header>
  );
} 