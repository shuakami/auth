import React from 'react';
import Image from 'next/image';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-xl bg-gradient-to-br from-white/40 via-white/20 to-white/40 dark:from-black/60 dark:via-black/40 dark:to-black/60">
      <div className="animate-pulse">
        <Image
          src="/assets/images/logo/logo-text-white.png"
          alt="Logo"
          width={140}
          height={140}
          className="dark:hidden"
          priority
        />
        <Image
          src="/assets/images/logo/logo-text-black.png"
          alt="Logo"
          width={140}
          height={140}
          className="hidden dark:block"
          priority
        />
      </div>
    </div>
  );
};

export default LoadingIndicator; 