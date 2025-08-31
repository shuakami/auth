import React from 'react';
import Image from 'next/image';

interface TokenRefreshOverlayProps {
  show: boolean;
}

const TokenRefreshOverlay: React.FC<TokenRefreshOverlayProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-sm dark:bg-black/90 transition-all duration-300">
      <div className="flex items-center justify-center">
        <Image
          src="/assets/images/logo/logo-black.png"
          alt="Logo"
          width={120}
          height={120}
          className="animate-pulse dark:hidden"
          priority
        />
        <Image
          src="/assets/images/logo/logo-white.png"
          alt="Logo"
          width={120}
          height={120}
          className="hidden animate-pulse dark:block"
          priority
        />
      </div>
    </div>
  );
};

export default TokenRefreshOverlay;