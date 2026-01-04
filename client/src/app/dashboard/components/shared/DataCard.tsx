/**
 * 数据卡片组件
 * 用于用户管理、OAuth应用等列表展示
 */

import React from 'react';
import { Search } from 'lucide-react';

interface DataCardProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  searchPlaceholder?: string;
  children: React.ReactNode;
}

export function DataCard({ title, description, action, searchPlaceholder, children }: DataCardProps) {
  return (
    <div className="overflow-clip border transition-all border-muted shadow-sm dark:shadow-none divide-y rounded-xl bg-surface-l1 mt-4">
      {/* 头部 */}
      <div className="p-6 flex-row gap-x-6 space-y-0 px-5 py-4 flex items-center justify-between border-b-0">
        <div>
          <div className="flex max-w-lg flex-col gap-y-1">
            <h4 className="text-base font-medium text-regular">{title}</h4>
          </div>
          <p className="text-sm text-subtle">{description}</p>
        </div>
        {action}
      </div>

      {/* 装饰条 */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

      {/* 内容区 */}
      <div className="flex flex-col p-0">
        <div className="flex w-full flex-col">
          <div className="overflow-clip transition-all bg-surface-l1">
            {/* 搜索栏 */}
            {searchPlaceholder && (
              <div className="grid grid-cols-2 border-b sm:flex sm:divide-x [&>div]:flex [&>div]:h-10 [&>div]:items-center">
                <div className="relative col-span-2 flex flex-grow items-center gap-3">
                  <div className="absolute inset-y-0 left-4 flex items-center overflow-hidden">
                    <Search className="text-foreground/50 size-4" />
                  </div>
                  <input
                    placeholder={searchPlaceholder}
                    className="h-full w-full bg-transparent py-2 pl-10 pr-4 text-sm focus:outline-none"
                    type="text"
                  />
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
