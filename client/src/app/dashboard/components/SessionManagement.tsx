"use client";

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
  isCurrent?: boolean; // 标记是否为当前会话
}

/* ----------------------------- 图标（中性风格） ----------------------------- */

// 中性化浏览器图标
function getBrowserIcon(browser: string) {
  const cls = "text-neutral-700 dark:text-zinc-300";
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

// 中性化操作系统图标
function getOSIcon(os: string) {
  const cls = "text-neutral-500 dark:text-zinc-400";
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

/* --------------------------------- Tooltip -------------------------------- */

function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <span className="relative inline-block group">
      {children}
      <span
        className="pointer-events-none absolute left-1/2 z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/10 bg-neutral-900 px-2.5 py-1 text-xs text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 dark:border-white/10 dark:bg-zinc-800"
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
  const [showConfirmModal, setShowConfirmModal] = useState(false); // 控制 ConfirmModal
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null); // 要吊销的 Session ID
  const [revokeMessage, setRevokeMessage] = useState<string | null>(null); // 操作结果消息
  const [revokeLoading, setRevokeLoading] = useState(false); // 登出操作 loading 状态

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

  // 打开确认
  const openRevokeConfirm = (sessionId: string) => {
    setSessionToRevoke(sessionId);
    setShowConfirmModal(true);
    setRevokeMessage(null);
  };
  // 关闭确认
  const closeRevokeConfirm = () => {
    setSessionToRevoke(null);
    setShowConfirmModal(false);
  };

  // 吊销
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
            <div className="h-5 w-5 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-4 w-4 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-4 w-16 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-20 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="ml-auto h-8 w-12 rounded bg-neutral-200 dark:bg-zinc-700 animate-pulse" />
      </td>
    </tr>
  );

  /* --------------------------------- 计算 --------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">已登录设备</h3>
          <p className="text-sm text-neutral-600 dark:text-zinc-400">管理您当前已登录的设备会话。</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-black/5 dark:divide-white/10">
            <thead className="bg-neutral-50 dark:bg-zinc-800/60">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">设备</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">最近活动</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">首次登录</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">地理位置</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // 分页数据
  const totalPages = Math.ceil(sessions.length / sessionsPerPage) || 1;
  const startIndex = (currentPage - 1) * sessionsPerPage;
  const endIndex = startIndex + sessionsPerPage;
  const currentSessions = sessions.slice(startIndex, endIndex);

  // 分页组件（中性风格）
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between border-t border-black/5 px-2 py-4 text-sm dark:border-white/10">
        <div className="text-neutral-600 dark:text-zinc-400">
          显示 <span className="font-medium text-neutral-900 dark:text-neutral-100">{sessions.length === 0 ? 0 : startIndex + 1}</span> -
          <span className="font-medium text-neutral-900 dark:text-neutral-100"> {Math.min(endIndex, sessions.length)}</span>，
          共 <span className="font-medium text-neutral-900 dark:text-neutral-100">{sessions.length}</span> 项
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
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
                  ? 'rounded-md bg-neutral-900 px-2.5 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'rounded-md px-2.5 py-1.5 text-sm text-neutral-700 ring-1 ring-black/10 hover:bg-black/[0.03] dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/[0.04]'
              }
              aria-current={n === currentPage ? 'page' : undefined}
            >
              {n}
            </button>
          ))}
          <Button
            size="sm"
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
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">已登录设备</h3>
        <p className="text-sm text-neutral-600 dark:text-zinc-400">管理您当前已登录的设备会话。如果发现可疑活动，请登出对应设备。</p>
      </div>

      {/* 操作反馈（中性边框） */}
      {revokeMessage && (
        <div
          className={`rounded-md border p-3 text-sm ${
            revokeMessage.includes('失败')
              ? 'border-red-300/50 bg-red-50/60 text-red-700 dark:border-red-600/40 dark:bg-red-900/20 dark:text-red-300'
              : 'border-emerald-300/50 bg-emerald-50/60 text-emerald-700 dark:border-emerald-600/40 dark:bg-emerald-900/20 dark:text-emerald-300'
          }`}
        >
          {revokeMessage}
        </div>
      )}

      {/* 表格（无外层卡片，仅分隔线与轻表头） */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-black/5 dark:divide-white/10">
          <thead className="bg-neutral-50 dark:bg-zinc-800/60">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">设备</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">最近活动</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">首次登录</th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">地理位置</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>

          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {currentSessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-neutral-500 dark:text-zinc-400">
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
                    .filter((item, i, arr) => i === 0 || item !== arr[i - 1]); // 去重相邻重复
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
                  <tr key={session.id} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04]">
                    {/* 设备 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2" aria-hidden>
                          {getBrowserIcon(browser)}
                          {getOSIcon(os)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{deviceDesc}</div>
                          <div className="text-xs text-neutral-500 dark:text-zinc-400">
                            {session.isCurrent ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300"
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
                    <td className="px-6 py-4 text-sm text-neutral-700 dark:text-zinc-300">
                      {lastUsed ? (
                        <Tooltip content={lastUsedTooltip}>
                          <span>{lastUsedText}前</span>
                        </Tooltip>
                      ) : (
                        '未知'
                      )}
                    </td>

                    {/* 首次登录 */}
                    <td className="px-6 py-4 text-sm text-neutral-700 dark:text-zinc-300">
                      {session.firstLoginAt
                        ? formatDistanceToNow(new Date(session.firstLoginAt), { addSuffix: true, locale: zhCN })
                        : '未知'}
                    </td>

                    {/* 地理位置 */}
                    <td className="px-6 py-4 text-sm text-neutral-700 dark:text-zinc-300">{location}</td>

                    {/* 操作 */}
                    <td className="px-6 py-4 text-right">
                      {!session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRevokeConfirm(session.id)}
                          className="h-8 px-3 text-red-600 hover:bg-red-100 dark:text-red-500 dark:hover:bg-red-900/20"
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
      </div>

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
            <p className="text-sm text-neutral-600 dark:text-zinc-400">
              您确定要登出此设备吗？该设备将需要重新登录才能访问您的账户。
            </p>
            {revokeMessage && revokeMessage.includes('失败') && (
              <p className="text-sm text-red-600 dark:text-red-400">{revokeMessage}</p>
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
