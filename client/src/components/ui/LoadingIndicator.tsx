import React from 'react';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-xl bg-gradient-to-br from-white/40 via-white/20 to-white/40 dark:from-black/60 dark:via-black/40 dark:to-black/60">
      <div className="animate-pulse">
        <img
          src="/assets/images/logo/logo-text-white.png"
          alt="Logo"
          className="dark:hidden w-auto h-[70px] object-contain"
        />
        <img
          src="/assets/images/logo/logo-text-black.png"
          alt="Logo"
          className="hidden dark:block w-auto h-[70px] object-contain"
        />
      </div>
    </div>
  );
};

export default LoadingIndicator; 