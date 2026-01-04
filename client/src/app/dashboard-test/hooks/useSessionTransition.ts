/**
 * Session 切换动画 Hook
 * 处理会话切换时的淡入淡出效果
 */

import { useState, useCallback } from 'react';
import type { Session } from '../types';

interface UseSessionTransitionReturn {
  selectedSession: Session;
  isTransitioning: boolean;
  handleSessionSelect: (session: Session) => void;
}

export function useSessionTransition(initialSession: Session): UseSessionTransitionReturn {
  const [selectedSession, setSelectedSession] = useState(initialSession);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSessionSelect = useCallback((session: Session) => {
    if (session.id === selectedSession.id) return;
    
    // 开始过渡动画
    setIsTransitioning(true);
    
    // 等待淡出完成后切换数据
    setTimeout(() => {
      setSelectedSession(session);
      // 短暂延迟后开始淡入
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  }, [selectedSession.id]);

  return { selectedSession, isTransitioning, handleSessionSelect };
}
