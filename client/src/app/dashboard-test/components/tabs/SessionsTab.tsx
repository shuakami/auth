/**
 * 会话管理页面组件
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Globe } from 'lucide-react';
import { PageHeader } from '../shared';
import { useI18n } from '../../i18n';
import type { Session } from '../../types';

// 动态导入地图组件
const SessionMap = dynamic(() => import('../../SessionMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-l1">
      <Globe className="h-12 w-12 text-blue-500 dark:text-blue-400 animate-pulse" />
    </div>
  ),
});

interface SessionsTabProps {
  sessions: Session[];
  selectedSession: Session;
  isTransitioning: boolean;
  onSessionSelect: (session: Session) => void;
  onSignOutAll: () => void;
}

export function SessionsTab({
  sessions,
  selectedSession,
  isTransitioning,
  onSessionSelect,
  onSignOutAll,
}: SessionsTabProps) {
  const { t } = useI18n();

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
                <SessionMap lat={selectedSession.lat} lng={selectedSession.lng} />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-regular mb-1">
                  {selectedSession.city}, {selectedSession.region}
                </h3>
                <p className="text-base text-subtle">{selectedSession.country}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <div className="text-subtle mb-0.5">{t.sessions.ipAddress}</div>
                  <div className="text-regular">{selectedSession.ip}</div>
                </div>
                <div>
                  <div className="text-subtle mb-0.5">{t.sessions.timezone}</div>
                  <div className="text-regular">{selectedSession.timezone}</div>
                </div>
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
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="grow">{t.sessions.location}</div>
                        </div>
                      </th>
                      <th className="text-muted-foreground h-10 whitespace-nowrap px-2 text-left align-middle font-medium sm:px-5">
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="grow">{t.sessions.createdOn}</div>
                        </div>
                      </th>
                      <th className="text-muted-foreground h-10 whitespace-nowrap px-2 text-left align-middle font-medium sm:px-5">
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="grow">{t.sessions.expiresOn}</div>
                        </div>
                      </th>
                      <th className="text-muted-foreground h-10 whitespace-nowrap px-2 text-left align-middle font-medium sm:px-5">
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="grow" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {sessions.map((session) => (
                      <tr
                        key={session.id}
                        onClick={() => onSessionSelect(session)}
                        className={`border-b transition-all duration-200 cursor-pointer group ${
                          selectedSession.id === session.id
                            ? 'bg-foreground/[0.03]'
                            : 'hover:bg-overlay-hover'
                        }`}
                      >
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-5" style={{ width: '150px' }}>
                          <span>{session.city}</span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-5" style={{ width: '150px' }}>
                          <div>{session.createdAt}</div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-5" style={{ width: '150px' }}>
                          <div className="text-muted">{session.expiresAt}</div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-middle sm:px-5" style={{ width: '150px' }}>
                          <button
                            type="button"
                            className="cursor-pointer flex w-full justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                              <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSignOutAll}
                className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border text-base focus:outline focus:outline-2 focus:outline-offset-2 min-h-10 gap-x-3 px-4 py-2 sm:text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
              >
                <span className="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden" aria-hidden="true" />
                {t.sessions.signOutAll}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
