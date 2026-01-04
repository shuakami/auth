/**
 * 自定义 Toast 组件
 * 带加载状态的通知提示
 */

'use client';

import React from 'react';
import { LoadingIcon, CheckIcon } from './icons';

interface CustomToastProps {
  visible: boolean;
  message: string;
  loading: boolean;
  closing: boolean;
}

export function CustomToast({ visible, message, loading, closing }: CustomToastProps) {
  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] ${
        closing
          ? 'animate-out fade-out slide-out-to-bottom-2 duration-300'
          : 'animate-in fade-in slide-in-from-bottom-2 duration-300'
      }`}
    >
      <div className="bg-surface-l1 border border-muted text-regular px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300">
        {loading ? (
          <LoadingIcon className="w-4 h-4 text-primary flex-shrink-0" />
        ) : (
          <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
