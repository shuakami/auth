/**
 * 移动端底部导航组件
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { navItems } from '../../constants/navigation';
import { useI18n } from '../../i18n';
import type { TabType } from '../../types';

interface MobileNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

// Tab 对应的路由
const tabRoutes: Record<TabType, string> = {
  account: '/dashboard-test',
  security: '/dashboard-test/security',
  sessions: '/dashboard-test/sessions',
  user: '/dashboard-test/user',
  oauth: '/dashboard-test/oauth',
};

export function MobileNav({ currentTab }: MobileNavProps) {
  const { t } = useI18n();

  return (
    <div className="bg-background h-16 shrink-0 border-t lg:hidden">
      <nav className="flex h-full items-stretch gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const label = t.nav[item.id as keyof typeof t.nav] || item.label;
          return (
            <Link
              key={item.id}
              href={tabRoutes[item.id]}
              className={`cursor-pointer relative flex h-full flex-1 flex-col items-center justify-center gap-1.5 px-3 py-1 text-sm font-medium duration-150 ${
                isActive ? 'text-primary' : 'text-subtle/75'
              }`}
            >
              {isActive && <div className="bg-primary absolute inset-x-0 -top-px h-px" />}
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
