/**
 * 页面标题组件
 * 统一的页面头部样式，支持响应式
 */

import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="p-4 md:py-6 lg:px-0">
        {/* 移动端标题 */}
        <div className="lg:hidden">
          <h2 className="text-xl font-medium text-regular text-pretty">{title}</h2>
          <p className="text-sm text-muted mt-1.5 max-w-lg text-pretty">{description}</p>
        </div>
        {/* 桌面端标题 */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-medium text-regular text-pretty">{title}</h1>
          <p className="text-base text-muted mt-1.5 max-w-lg text-pretty">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
