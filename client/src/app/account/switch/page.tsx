'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { logout } from '@/services/api'; 
import LoadingIndicator from '@/components/ui/LoadingIndicator';

function SwitchAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    const switchAccount = async () => {
      try {
        await logout();
      } catch (error) {
        console.error('登出失败:', error);
      } finally {
        const loginUrl = new URL('/login', window.location.origin);
        if (redirectUrl) {
          loginUrl.searchParams.set('redirect', redirectUrl);
        }
        router.replace(loginUrl.toString());
      }
    };

    switchAccount();
  }, [router, redirectUrl]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <LoadingIndicator />
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        正在为您切换账号...
      </p>
    </div>
  );
}

export default function SwitchAccountPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <LoadingIndicator />
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          正在准备切换账号...
        </p>
      </div>
    }>
      <SwitchAccountContent />
    </Suspense>
  );
}