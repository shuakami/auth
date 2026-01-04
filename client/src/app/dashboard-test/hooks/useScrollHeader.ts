/**
 * 滚动隐藏 Header Hook
 * 移动端向下滚动时隐藏 header，向上滚动时显示
 */

import { useState, useEffect, useRef, RefObject } from 'react';

interface UseScrollHeaderReturn {
  headerHidden: boolean;
  scrollContainerRef: RefObject<HTMLDivElement>;
}

export function useScrollHeader(): UseScrollHeaderReturn {
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      // 向下滚动超过50px时隐藏
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setHeaderHidden(true);
      } else {
        setHeaderHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return { headerHidden, scrollContainerRef };
}
