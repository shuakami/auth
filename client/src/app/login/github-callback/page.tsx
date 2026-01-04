'use client';
import { useEffect } from 'react';
import { Loader } from '@/components/ui/Loader';

const LoadingSpinner = () => (
  <Loader size={32} className="text-[#0582FF]" />
);

export default function GithubCallbackPage() {
  useEffect(() => {
    if (window.opener) {
      // 从URL中获取临时token
      const urlParams = new URLSearchParams(window.location.search);
      const tempToken = urlParams.get('temp_token');
      
      if (tempToken) {
        // 将临时token传递给主窗口
        window.opener.postMessage({
          type: 'github-login-success',
          tempToken: tempToken
        }, window.location.origin);
      } else {
        // 如果没有token，说明登录失败
        window.opener.postMessage({
          type: 'github-login-error',
          error: 'No temp token received'
        }, window.location.origin);
      }
    }
    setTimeout(() => window.close(), 300);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-white dark:bg-[#09090b]">
      <LoadingSpinner />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        正在完成 Github 认证，请稍候…
      </p>
    </div>
  );
} 