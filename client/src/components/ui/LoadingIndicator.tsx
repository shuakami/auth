import React from 'react';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-[#09090b]">
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