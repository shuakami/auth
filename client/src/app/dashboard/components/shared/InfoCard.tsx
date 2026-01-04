/**
 * 信息卡片组件
 * 用于展示账户信息等键值对数据
 */

import type { ReactNode } from 'react';

interface InfoCardItemProps {
  label: string;
  value: ReactNode;
  action?: ReactNode;
  muted?: boolean;
}

export function InfoCardItem({ label, value, action, muted }: InfoCardItemProps) {
  return (
    <div className="border-l-2 border-transparent px-4 py-4 lg:px-6">
      <div className="flex items-center justify-between gap-6">
        <div className="flex max-w-full flex-col gap-1.5 overflow-hidden text-sm">
          <span className="text-subtle">{label}</span>
          <span className={`break-words ${muted ? 'text-muted' : ''}`}>{value}</span>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

interface InfoCardProps {
  children: ReactNode;
}

export function InfoCard({ children }: InfoCardProps) {
  return (
    <div className="divide-y rounded-2xl border bg-surface-l1">
      {children}
    </div>
  );
}
