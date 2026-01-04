/**
 * Toast 消息 Hook
 * 处理带加载状态的 toast 通知
 */

import { useState, useCallback } from 'react';

interface ToastState {
  visible: boolean;
  message: string;
  loading: boolean;
  closing: boolean;
}

interface UseToastMessageReturn {
  toast: ToastState;
  showToast: (message: string, loadingMessage?: string) => Promise<void>;
}

export function useToastMessage(): UseToastMessageReturn {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    loading: false,
    closing: false,
  });

  const showToast = useCallback(async (message: string, loadingMessage = 'Processing...') => {
    // 显示加载状态
    setToast({
      visible: true,
      message: loadingMessage,
      loading: true,
      closing: false,
    });

    // 模拟 API 请求
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 显示成功消息
    setToast(prev => ({
      ...prev,
      loading: false,
      message,
    }));

    // 延迟后开始关闭动画
    setTimeout(() => {
      setToast(prev => ({ ...prev, closing: true }));
      // 等待动画完成后隐藏
      setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false, closing: false }));
      }, 300);
    }, 1500);
  }, []);

  return { toast, showToast };
}
