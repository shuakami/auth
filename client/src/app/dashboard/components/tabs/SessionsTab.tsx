/**
 * 会话管理页面组件
 * 使用真实 API 数据
 */

'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Globe } from 'lucide-react';
import { PageHeader } from '../shared';
import { useI18n } from '../../i18n';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { Session } from '../../hooks/useSessions';

// 动态导入地图组件
const SessionMap = dynamic(() => import('../../SessionMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-l1">
      <Globe className="h-12 w-12 text-muted animate-pulse" />
    </div>
  ),
});

interface SessionsTabProps {
  sessions: Session[];
  isLoading: boolean;
  isRevoking: boolean;
  onRevokeSession: (sessionId: string) => Promise<void>;
  onRevokeAllOther: () => Promise<void>;
}

export function SessionsTab({
  sessions,
  isLoading,
  isRevoking,
  onRevokeSession,
  onRevokeAllOther,
}: SessionsTabProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  
  // 选中的会话（用于地图显示）
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 弹窗状态
  const [showSignOutAllModal, setShowSignOutAllModal] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null);

  // 初始化选中当前会话
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      const current = sessions.find(s => s.isCurrent) || sessions[0];
      setSelectedSession(current);
    }
  }, [sessions, selectedSession]);

  // 切换会话（带过渡动画）
  const handleSessionSelect = (session: Session) => {
    if (session.id === selectedSession?.id) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedSession(session);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  };

  // 撤销单个会话
  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return;
    try {
      await onRevokeSession(sessionToRevoke.id);
      toast('会话已登出');
      setSessionToRevoke(null);
      // 如果撤销的是当前选中的，切换到第一个
      if (sessionToRevoke.id === selectedSession?.id) {
        const remaining = sessions.filter(s => s.id !== sessionToRevoke.id);
        if (remaining.length > 0) {
          setSelectedSession(remaining[0]);
        }
      }
    } catch (err: any) {
      toast(err.message || '登出失败');
    }
  };

  // 撤销所有其他会话
  const handleRevokeAllOther = async () => {
    try {
      await onRevokeAllOther();
      toast(t.toast.signedOutAll);
      setShowSignOutAllModal(false);
    } catch (err: any) {
      toast(err.message || '登出失败');
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <>
        <PageHeader title={t.sessions.title} description={t.sessions.description} />
        <div className="p-4 md:py-6 lg:px-0">
          <div className="animate-pulse space-y-6">
            <div className="h-[240px] rounded-xl bg-muted/30" />
            <div className="h-32 rounded-xl bg-muted/30" />
          </div>
        </div>
      </>
    );
  }

  // 无会话
  if (sessions.length === 0 || !selectedSession) {
    return (
      <>
        <PageHeader title={t.sessions.title} description={t.sessions.description} />
        <div className="p-4 md:py-6 lg:px-0">
          <div className="text-center py-12 text-muted">
            没有找到活跃会话
          </div>
        </div>
      </>
    );
  }

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <>
      <PageHeader title={t.sessions.title} description={t.sessions.description} />

      <div className="p-4 md:py-6 lg:px-0 space-y-10">
        <div className="bg-border shrink-0 h-[1px] w-full bg-foreground/10" />

        {/* 当前会话 */}
        <div>
          <h4 className="text-base font-medium text-regular mb-4">{t.sessions.currentSession}</h4>
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl bg-surface-l1 relative h-[240px] w-full">
              <div
                className="absolute inset-0"
                style={{
                  opacity: isTransitioning ? 0 : 1,
                  filter: isTransitioning ? 'blur(4px)' : 'blur(0px)',
                  transition: 'opacity 0.25s ease, filter 0.25s ease',
                }}
              >
                {selectedSession.lat !== 0 && selectedSession.lng !== 0 ? (
                  <SessionMap lat={selectedSession.lat} lng={selectedSession.lng} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-l1">
                    <Globe className="h-12 w-12 text-muted" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-regular mb-1">
                  {selectedSession.city}{selectedSession.region ? `, ${selectedSession.region}` : ''}
                </h3>
                <p className="text-base text-subtle">{selectedSession.country}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <div className="text-subtle mb-0.5">{t.sessions.ipAddress}</div>
                  <div className="text-regular font-mono">{selectedSession.ip}</div>
                </div>
                <div>
                  <div className="text-subtle mb-0.5">{t.sessions.timezone}</div>
                  <div className="text-regular">{selectedSession.timezone}</div>
                </div>
                {selectedSession.browser !== 'Unknown' && (
                  <div>
                    <div className="text-subtle mb-0.5">浏览器</div>
                    <div className="text-regular">{selectedSession.browser}</div>
                  </div>
                )}
                {selectedSession.os !== 'Unknown' && (
                  <div>
                    <div className="text-subtle mb-0.5">操作系统</div>
                    <div className="text-regular">{selectedSession.os}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-border shrink-0 h-[1px] w-full bg-foreground/10" />

        {/* 活跃会话列表 */}
        <div>
          <h4 className="text-base font-medium text-regular mb-4">{t.sessions.activeSessions}</h4>
          <div className="flex flex-col gap-6">
            <div className="overflow-clip rounded-xl border transition-all bg-surface-l1 shadow-sm dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors">
                      <th className="text-muted-foreground h-10 whitespace-nowrap px-2 text-left align-middle font-medium sm:px-5">
                        {t.sessions.location}
                      </th>
                      <th className="text-muted-foreground h-10 whitespace-nowrap px-2 text-left align-middle font-medium sm:px-5">
                        {t.sessions.createdOn}
                      </th>
                      <th className="text-muted-foreground h-10 whitespace-nowrap px-2 text-left align-middle font-medium sm:px-5">
                        {t.sessions.expiresOn}
                      </th>
                      <th className="text-muted-foreground h-10 whitespace-nowrap px-2 text-left align-middle font-medium sm:px-5" />
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {sessions.map((session) => (
                      <tr
                        key={session.id}
                        onClick={() => handleSessionSelect(session)}
                        className={`border-b transition-all duration-200 cursor-pointer group ${
                          selectedSession.id === session.id
                            ? 'bg-foreground/[0.03]'
                            : 'hover:bg-overlay-hover'
                        }`}
                      >
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-5" style={{ width: '180px' }}>
                          <div className="flex items-center gap-2">
                            <span>{session.city}</span>
                            {session.isCurrent && (
                              <span className="text-xs text-muted">(当前)</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-5" style={{ width: '150px' }}>
                          {session.createdAt}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle text-muted sm:px-5" style={{ width: '150px' }}>
                          {session.expiresAt}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-5" style={{ width: '100px' }}>
                          {!session.isCurrent && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToRevoke(session);
                              }}
                              className="cursor-pointer text-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                            >
                              登出
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {otherSessions.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSignOutAllModal(true)}
                  className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 min-h-10 gap-x-3 px-4 py-2 sm:text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
                >
                  {t.sessions.signOutAll}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 登出单个会话确认 */}
      <Modal
        isOpen={!!sessionToRevoke}
        onClose={() => setSessionToRevoke(null)}
        title="登出此会话？"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted">
            确定要登出 {sessionToRevoke?.city} 的会话吗？该设备需要重新登录。
          </p>
          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setSessionToRevoke(null)}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleRevokeSession}
              disabled={isRevoking}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {isRevoking ? t.common.processing : '登出'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 登出所有其他会话确认 */}
      <Modal
        isOpen={showSignOutAllModal}
        onClose={() => setShowSignOutAllModal(false)}
        title={t.modals.signOutAllTitle}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted">{t.modals.signOutAllDesc}</p>
          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setShowSignOutAllModal(false)}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleRevokeAllOther}
              disabled={isRevoking}
              className="cursor-pointer flex-1 h-9 font-medium text-sm rounded-full text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {isRevoking ? t.common.processing : t.modals.signOutAll}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
