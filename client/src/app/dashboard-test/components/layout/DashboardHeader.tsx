/**
 * Dashboard 顶部导航组件
 */

'use client';

import React from 'react';
import Image from 'next/image';

interface DashboardHeaderProps {
  hidden: boolean;
}

export function DashboardHeader({ hidden }: DashboardHeaderProps) {
  return (
    <div className={`absolute top-0 left-0 right-0 z-10 h-16 shrink-0 lg:h-auto transition-transform duration-300 ${hidden ? '-translate-y-full lg:translate-y-0' : 'translate-y-0'}`}>
      <header className="flex items-center justify-between gap-3 px-4 py-3 lg:grid lg:grid-cols-2">
        {/* Logo */}
        <div className="flex justify-start">
          <a href="/" className="flex items-center">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Image
                src="/assets/images/logo/logo-white.png"
                alt="Logo"
                className="block w-full h-full object-contain dark:hidden"
                width={40}
                height={40}
                priority
              />
              <Image
                src="/assets/images/logo/logo-black.png"
                alt="Logo"
                className="hidden w-full h-full object-contain dark:block"
                width={40}
                height={40}
                priority
              />
            </div>
          </a>
        </div>

        {/* 移动端中间占位 */}
        <div className="flex justify-center lg:hidden" />

        {/* 右侧操作区 */}
        <div className="flex items-center justify-end gap-3" />
      </header>
    </div>
  );
}
