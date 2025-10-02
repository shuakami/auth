'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { getSessions, revokeSession } from '@/services/api';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  SiGooglechrome,
  SiFirefox,
  SiSafari,
  SiMacos,
  SiLinux,
  SiAndroid,
  SiApple
} from 'react-icons/si';
import {
  TbBrowserCheck,
  TbBrowser,
  TbBrandWindows,
  TbDeviceLaptop
} from 'react-icons/tb';

// 动态导入 ConfirmModal
const ConfirmModal = dynamic(() => import('@/components/ui/confirm-modal'), { ssr: false });

interface Session {
  id: string;
  device_info: string;
  created_at: string;
  last_used_at?: string;
  expires_at: string;
  firstLoginAt?: string;
  lastLoginAt?: string;
  lastLocation?: { country?: string; region?: string; city?: string; isp?: string };
  lastIp?: string;
  isCurrent?: boolean;
}

/* ----------------------------- 图标（中性化） ----------------------------- */

function getBrowserIcon(browser: string) {
  const cls = "text-muted-foreground";
  const size = 20;
  switch (browser.toLowerCase()) {
    case 'chrome': return <SiGooglechrome className={cls} size={size} />;
    case 'firefox': return <SiFirefox className={cls} size={size} />;
    case 'safari': return <SiSafari className={cls} size={size} />;
    case 'edge': return <TbBrowserCheck className={cls} size={size} />;
    case 'msie':
    case 'trident':
    case 'opera': return <TbBrowser className={cls} size={size} />;
    default: return <TbBrowser className={cls} size={size} />;
  }
}

function getOSIcon(os: string) {
  const cls = "text-muted-foreground/80";
  const size = 18;
  switch (os.toLowerCase()) {
    case 'windows': return <TbBrandWindows className={cls} size={size} />;
    case 'macos': return <SiMacos className={cls} size={size} />;
    case 'linux': return <SiLinux className={cls} size={size} />;
    case 'android': return <SiAndroid className={cls} size={size} />;
    case 'ios': return <SiApple className={cls} size={size} />;
    default: return <TbDeviceLaptop className={cls} size={size} />;
  }
}

/* ------------------------------- UA 解析简版 ------------------------------- */

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = '未知', os = '未知';
  if (!ua) return { browser, os };
  const browserMatch = ua.match(/(Firefox|Chrome|Safari|Edge|MSIE|Trident|Opera)/i);
  if (browserMatch) browser = browserMatch[1];
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  return { browser, os };
}

/* -------------------------------- Tooltip -------------------------------- */

function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <span className="relative inline-block group">
      {children}
      <span
        className="pointer-events-none absolute left-1/2 z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-foreground px-2.5 py-1 text-xs text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 dark:bg-muted"
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

/* ------------------------------- 主组件渲染 -------------------------------- */

export default function SessionManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [revokeMessage, setRevokeMessage] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 5;

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setRevokeMessage(null);
    try {
      const response = await getSessions();
      const fetchedSessions: Session[] = response.data.sessions || [];
      setSessions(fetchedSessions);
      setCurrentPage(1);
    } catch (err) {
      setError('无法加载设备列表，请稍后重试');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const openRevokeConfirm = (sessionId: string) => {
    setSessionToRevoke(sessionId);
    setShowConfirmModal(true);
    setRevokeMessage(null);
  };
  const closeRevokeConfirm = () => {
    setSessionToRevoke(null);
    setShowConfirmModal(false);
  };

  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return;
    setRevokeLoading(true);
    setRevokeMessage(null);
    try {
      await revokeSession(sessionToRevoke);
      setRevokeMessage('设备已成功登出。');
      closeRevokeConfirm();
      await fetchSessions();
    } catch {
      setRevokeMessage('登出失败，请稍后重试。');
    } finally {
      setRevokeLoading(false);
    }
  };

  /* -------------------------------- 骨架屏 -------------------------------- */

  const SkeletonRow = () => (
    <tr className="transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted animate-pulse" />
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="ml-auto h-8 w-12 rounded bg-muted animate-pulse" />
      </td>
    </tr>
  );

  /* --------------------------------- 计算 --------------------------------- */

  if (loading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full table-fixed divide-y divide-border">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">设备</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">最近活动</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">首次登录</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">地理位置</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-md border border-border p-8">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(sessions.length / sessionsPerPage) || 1;
  const startIndex = (currentPage - 1) * sessionsPerPage;
  const endIndex = startIndex + sessionsPerPage;
  const currentSessions = sessions.slice(startIndex, endIndex);

  const Pagination = () => {
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return (
      <div className="flex items-center justify-between border-t border-border px-2 py-4 text-sm">
        <div className="text-muted-foreground">
          显示 <span className="font-medium text-foreground">{sessions.length === 0 ? 0 : startIndex + 1}</span> -
          <span className="font-medium text-foreground"> {Math.min(endIndex, sessions.length)}</span>，
          共 <span className="font-medium text-foreground">{sessions.length}</span> 项
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="h-8"
          >
            上一页
          </Button>
          {pages.map(n => (
            <button
              key={n}
              onClick={() => setCurrentPage(n)}
              className={
                n === currentPage
                  ? 'rounded-md bg-foreground px-2.5 py-1.5 text-sm font-medium text-background'
                  : 'rounded-md px-2.5 py-1.5 text-sm text-foreground/80 ring-1 ring-border hover:bg-muted/50'
              }
              aria-current={n === currentPage ? 'page' : undefined}
            >
              {n}
            </button>
          ))}
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="h-8"
          >
            下一页
          </Button>
        </div>
      </div>
    );
  };

  /* --------------------------------- 渲染 --------------------------------- */

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full table-fixed divide-y divide-border">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">设备</th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">最近活动</th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">首次登录</th>
            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">地理位置</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {currentSessions.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                没有找到已登录的设备。
              </td>
            </tr>
          ) : (
            currentSessions.map((session) => {
              const { browser, os } = parseUserAgent(session.device_info);

              // 地理位置
              let location = '未知';
              if (session.lastLocation) {
                const parts = [session.lastLocation.country, session.lastLocation.region, session.lastLocation.city]
                  .filter(Boolean)
                  .filter((item, i, arr) => i === 0 || item !== arr[i - 1]);
                if (parts.length > 0) location = parts.join(' ');
              }

              // 设备描述
              const deviceDesc = `${browser}${os !== '未知' ? `（${os}）` : ''}`;

              // 最近活动
              let lastUsed: string | null = null;
              let lastUsedText = '未知';
              let lastUsedTooltip = '';
              let lastUsedType = '';
              if (session.last_used_at) {
                lastUsed = session.last_used_at;
                lastUsedType = '最近活动';
              } else if (session.lastLoginAt) {
                lastUsed = session.lastLoginAt;
                lastUsedType = '上次登录';
              }
              if (lastUsed) {
                const date = new Date(lastUsed);
                lastUsedText = formatDistanceToNow(date, { addSuffix: false, locale: zhCN });
                lastUsedTooltip = `${lastUsedType}：${lastUsedText}前`;
              }

              return (
                <tr key={session.id} className="transition-colors hover:bg-muted/30">
                  {/* 设备 */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2" aria-hidden>
                        {getBrowserIcon(browser)}
                        {getOSIcon(os)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{deviceDesc}</div>
                        <div className="text-xs text-muted-foreground">
                          {session.isCurrent ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium"
                              aria-label="当前设备"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                              当前设备
                            </span>
                          ) : (
                            <>ID: {session.id.substring(0, 8)}…</>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 最近活动 */}
                  <td className="px-6 py-4 text-sm text-foreground/90">
                    {lastUsed ? (
                      <Tooltip content={lastUsedTooltip}>
                        <span>{lastUsedText}前</span>
                      </Tooltip>
                    ) : (
                      '未知'
                    )}
                  </td>

                  {/* 首次登录 */}
                  <td className="px-6 py-4 text-sm text-foreground/90">
                    {session.firstLoginAt
                      ? formatDistanceToNow(new Date(session.firstLoginAt), { addSuffix: true, locale: zhCN })
                      : '未知'}
                  </td>

                  {/* 地理位置 */}
                  <td className="px-6 py-4 text-sm text-foreground/90">{location}</td>

                  {/* 操作 */}
                  <td className="px-6 py-4 text-right">
                    {!session.isCurrent && (
                      <Button
                        variant="outline"
                        onClick={() => openRevokeConfirm(session.id)}
                        className="h-8 px-3 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        登出
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* 分页 */}
      <Pagination />

      {/* 确认登出 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={closeRevokeConfirm}
        onConfirm={handleRevokeSession}
        title="确认登出？"
        message={
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              您确定要登出此设备吗？该设备将需要重新登录才能访问您的账户。
            </p>
            {revokeMessage && revokeMessage.includes('失败') && (
              <p className="text-sm text-red-600">{revokeMessage}</p>
            )}
          </div>
        }
        type="danger"
        confirmText={revokeLoading ? "登出中..." : "确认登出"}
        cancelText="取消"
        isLoading={revokeLoading}
      />
    </div>
  );
}