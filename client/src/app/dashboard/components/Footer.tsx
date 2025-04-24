import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export default function Footer() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = resolvedTheme;

  const handleToggleTheme = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    return (
       <footer className="mt-auto border-t border-neutral-200/80 bg-white dark:border-[#262626]/80 dark:bg-[#09090b]">
         <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
           <div className="py-4 space-y-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="relative">
                   <Image
                     src="/assets/images/logo/logo-white.png"
                     alt="Logo Text"
                     className="bloc w-auto dark:hidden"
                     width={30}
                     height={74}
                   />
                   <Image
                     src="/assets/images/logo/logo-black.png"
                     alt="Logo Text"
                     className="hidden w-auto dark:block"
                     width={30}
                     height={74}
                   />
                 </div>
                 <nav className="flex items-center text-xs text-neutral-500 dark:text-neutral-400">
                   <Link href="/about" className="hover:text-neutral-900 dark:hover:text-neutral-100">关于我们</Link>
                   <span className="px-2">/</span>
                   <Link href="/help" className="hover:text-neutral-900 dark:hover:text-neutral-100">帮助中心</Link>
                   <span className="px-2">/</span>
                   <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-neutral-100">隐私政策</Link>
                   <span className="px-2">/</span>
                   <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-neutral-100">服务条款</Link>
                 </nav>
               </div>
               <div className="h-8 w-8"></div>
             </div>

             <div className="flex items-center">
               <p className="text-xs text-neutral-400 dark:text-neutral-500 mx-2">
                 © {new Date().getFullYear()} sdjz.wiki Auth. All rights reserved.
               </p>
             </div>
           </div>
         </div>
       </footer>
     );
  }

  return (
    <footer className="mt-auto border-t border-neutral-200/80 bg-white dark:border-[#262626]/80 dark:bg-[#09090b]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Image
                  src="/assets/images/logo/logo-white.png"
                  alt="Logo Text"
                  className="bloc w-auto dark:hidden"
                  width={30}
                  height={74}
                />
                <Image
                  src="/assets/images/logo/logo-black.png"
                  alt="Logo Text"
                  className="hidden w-auto dark:block"
                  width={30}
                  height={74}
                />
              </div>
              <nav className="flex items-center text-xs text-neutral-500 dark:text-neutral-400">
                <Link href="/about" className="hover:text-neutral-900 dark:hover:text-neutral-100">关于我们</Link>
                <span className="px-2">/</span>
                <Link href="/help" className="hover:text-neutral-900 dark:hover:text-neutral-100">帮助中心</Link>
                <span className="px-2">/</span>
                <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-neutral-100">隐私政策</Link>
                <span className="px-2">/</span>
                <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-neutral-100">服务条款</Link>
              </nav>
            </div>
            <button
              onClick={handleToggleTheme}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-[#262626]"
              title={currentTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {currentTheme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex items-center">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mx-2">
              © {new Date().getFullYear()} sdjz.wiki Auth. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 