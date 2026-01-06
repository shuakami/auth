/**
 * Dashboard 布局组件
 * 为所有子页面提供共享布局和 i18n Provider
 */

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { I18nProvider } from './i18n';
import { DashboardHeader, Sidebar, MobileNav } from './components/layout';
import { useScrollHeader } from './hooks';
import { mockUser } from './data/mock';
import type { TabType } from './types';

// 路径到 Tab 的映射
function getTabFromPath(pathname: string): TabType {
  if (pathname.includes('/security')) return 'security';
  if (pathname.includes('/sessions')) return 'sessions';
  if (pathname.includes('/user')) return 'user';
  if (pathname.includes('/oauth')) return 'oauth';
  return 'account';
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const currentTab = getTabFromPath(pathname);
  const { headerHidden, scrollContainerRef } = useScrollHeader();

  // Tab 切换使用路由导航
  const handleTabChange = (tab: TabType) => {
    const routes: Record<TabType, string> = {
      account: '/dashboard',
      security: '/dashboard/security',
      sessions: '/dashboard/sessions',
      user: '/dashboard/user',
      oauth: '/dashboard/oauth',
    };
    window.location.href = routes[tab];
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-x-hidden bg-white dark:bg-[#09090b] sm:overflow-hidden">
      <div className="bg-white dark:bg-[#09090b] fixed inset-0 flex h-[100dvh] flex-col overflow-hidden lg:static lg:inset-auto">
        {/* 顶部导航 */}
        <DashboardHeader hidden={headerHidden} />

        {/* 主内容区 */}
        <div
          ref={scrollContainerRef as React.RefObject<HTMLDivElement>}
          className="relative flex grow flex-col items-center overflow-y-auto pt-16 lg:flex-row lg:items-start lg:pt-16 bg-white dark:bg-[#09090b]"
        >
          {/* 侧边栏 */}
          <Sidebar currentTab={currentTab} onTabChange={handleTabChange} userName={mockUser.name} />

          {/* 主内容 */}
          <main className="flex w-full grow justify-center lg:pt-12 bg-white dark:bg-[#09090b] min-h-[50vh]">
            <div className="w-full max-w-2xl">
              <div className="h-6 w-full lg:hidden" />
              <div className="min-h-[200px]">{children}</div>
              <div className="h-6 w-full" />
            </div>
          </main>
        </div>

        {/* 移动端底部导航 */}
        <MobileNav currentTab={currentTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <I18nProvider defaultLanguage="zh">
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </I18nProvider>
  );
}
