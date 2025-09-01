import React, { useState, useEffect } from 'react';

interface TokenRefreshOverlayProps {
  show: boolean;
}

const TokenRefreshOverlay: React.FC<TokenRefreshOverlayProps> = ({ show }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 400);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-400 ease-out ${
        isVisible 
          ? 'backdrop-blur-xl bg-gradient-to-br from-white/40 via-white/20 to-white/40 dark:from-black/60 dark:via-black/40 dark:to-black/60' 
          : 'backdrop-blur-none bg-transparent'
      }`}
    >
      <div 
        className={`transition-all duration-400 ease-out ${
          isVisible 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-100'
        }`}
      >
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

export default TokenRefreshOverlay;