'use client';
import { useEffect } from 'react';

const LoadingSpinner = () => (
  <svg className="animate-spin h-8 w-8 text-[#0582FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
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