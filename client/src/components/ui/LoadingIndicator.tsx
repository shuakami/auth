import React from 'react';
import Image from 'next/image';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-gradient-to-br from-white/40 via-white/20 to-white/40 dark:from-black/60 dark:via-black/40 dark:to-black/60">
      <div className="flex flex-col items-center space-y-6">
        <div className="animate-pulse">
          <Image
            src="/assets/images/logo/logo-text-white.png"
            alt="Logo"
            width={160}
            height={160}
            className="dark:hidden"
            priority
          />
          <Image
            src="/assets/images/logo/logo-text-black.png"
            alt="Logo"
            width={160}
            height={160}
            className="hidden dark:block"
            priority
          />
        </div>
        <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300 animate-pulse">
          加载中，请稍候...
        </p>
      </div>
    </div>
  );
};

export default LoadingIndicator; 