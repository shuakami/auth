/**
 * 侧边栏组件
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Monitor, BookOpen } from 'lucide-react';
import { navItems } from '../../constants/navigation';
import { useI18n, interpolate } from '../../i18n';
import type { TabType } from '../../types';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  userName: string;
}

// Tab 对应的路由
const tabRoutes: Record<TabType, string> = {
  account: '/dashboard-test',
  security: '/dashboard-test/security',
  sessions: '/dashboard-test/sessions',
  user: '/dashboard-test/user',
  oauth: '/dashboard-test/oauth',
};

export function Sidebar({ currentTab, userName }: SidebarProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useI18n();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="sticky top-0 hidden lg:flex lg:min-h-full lg:w-full lg:max-w-sm lg:flex-col lg:items-stretch lg:pt-12 xl:max-w-md">
      {/* 欢迎语 */}
      <div className="mb-12 grow">
        <div className="p-6">
          <h1 className="break-words text-2xl font-medium tracking-tight xl:text-3xl">
            <span>{interpolate(t.welcome.greeting, { name: userName.split(' ')[0] })}</span>
            <br />
            <span className="text-subtle">{t.welcome.subtitle}</span>
          </h1>
        </div>

        {/* 导航菜单 */}
        <div className="mt-8">
          <nav className="flex h-full items-stretch gap-2 lg:h-auto lg:max-w-48 lg:flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const label = t.nav[item.id as keyof typeof t.nav] || item.label;
              return (
                <Link
                  key={item.id}
                  href={tabRoutes[item.id]}
                  className={`cursor-pointer relative flex h-full flex-1 flex-col items-center justify-center gap-1.5 px-3 py-1 text-sm font-medium duration-150 sm:py-2 lg:h-auto lg:flex-initial lg:flex-row lg:justify-start lg:gap-3 lg:px-6 lg:text-xl ${
                    isActive ? 'text-primary' : 'text-subtle/75'
                  }`}
                >
                  {isActive && (
                    <>
                      <div className="bg-primary absolute left-2 top-1/2 hidden size-1.5 -translate-y-1/2 rounded-full lg:block" />
                      <div className="bg-primary absolute inset-x-0 -top-px h-px lg:hidden" />
                    </>
                  )}
                  <Icon className="size-4 shrink-0 lg:size-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="p-6">
        <div className="hidden gap-3 lg:flex">
          {/* 返回首页 */}
          <Link
            href="/"
            className="relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 min-h-10 gap-x-3 px-4 py-2 sm:text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
          >
            <span className="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden" aria-hidden="true" />
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="!size-4">
                <path d="M7 17V7h10" />
                <path d="M17 17 7 7" />
              </svg>
              <span>{t.nav.returnHome}</span>
            </div>
          </Link>

          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="cursor-pointer inline-flex items-center justify-center aspect-square min-h-10 p-3 rounded-full border border-primary/15 bg-transparent text-primary/75 hover:text-primary hover:bg-overlay-hover transition-colors"
            title={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            {resolvedTheme === 'dark' ? <Sun className="!size-5" /> : <Monitor className="!size-5" />}
          </button>

          {/* 文档链接 */}
          <Link
            href="/docs"
            className="inline-flex items-center justify-center aspect-square min-h-10 p-3 rounded-full border border-primary/15 bg-transparent text-primary/75 hover:text-primary hover:bg-overlay-hover transition-colors"
          >
            <BookOpen className="!size-5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
