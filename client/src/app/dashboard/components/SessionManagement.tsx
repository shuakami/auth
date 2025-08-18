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

// 获取浏览器图标
function getBrowserIcon(browser: string) {
  const iconClass = "transition-all duration-200 hover:scale-110";
  const iconSize = 22;
  switch(browser.toLowerCase()) {
    case 'chrome': return (
      <div className={`${iconClass} text-[#4285F4] hover:text-[#EA4335]`}>
        <SiGooglechrome size={iconSize} />
      </div>
    );
    case 'firefox': return (
      <div className={`${iconClass} text-[#FF7139]`}>
        <SiFirefox size={iconSize} />
      </div>
    );
    case 'safari': return (
      <div className={`${iconClass} text-[#006CFF]`}>
        <SiSafari size={iconSize} />
      </div>
    );
    case 'edge': return (
      <div className={`${iconClass} text-[#0078D7]`}>
        <TbBrowserCheck size={iconSize} />
      </div>
    );
    case 'msie':
    case 'trident': 
    case 'opera': return (
      <div className={`${iconClass} text-[#FF1B2D]`}>
        <TbBrowser size={iconSize} />
      </div>
    );
    default: return (
      <div className={`${iconClass} text-neutral-600 dark:text-neutral-400`}>
        <TbBrowser size={iconSize} />
      </div>
    );
  }
}

// 获取操作系统图标
function getOSIcon(os: string) {
  const iconClass = "transition-all duration-200 hover:scale-110";
  const iconSize = 20;
  switch(os.toLowerCase()) {
    case 'windows': return (
      <div className={`${iconClass} text-[#00A4EF]`}>
        <TbBrandWindows size={iconSize} />
      </div>
    );
    case 'macos': return (
      <div className={`${iconClass} text-[#000000] dark:text-[#FFFFFF]`}>
        <SiMacos size={iconSize} />
      </div>
    );
    case 'linux': return (
      <div className={`${iconClass} text-[#FCC624]`}>
        <SiLinux size={iconSize} />
      </div>
    );
    case 'android': return (
      <div className={`${iconClass} text-[#3DDC84]`}>
        <SiAndroid size={iconSize} />
      </div>
    );
    case 'ios': return (
      <div className={`${iconClass} text-[#000000] dark:text-[#FFFFFF]`}>
        <SiApple size={iconSize} />
      </div>
    );
    default: return (
      <div className={`${iconClass} text-neutral-600 dark:text-neutral-400`}>
        <TbDeviceLaptop size={iconSize} />
      </div>
    );
  }
}

// 解析User Agent，提取关键信息
function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = '未知', os = '未知';
  if (!ua) return { browser, os };
  // 简单的解析，可根据需要引入更复杂的库
  const browserMatch = ua.match(/(Firefox|Chrome|Safari|Edge|MSIE|Trident|Opera)/i);
  if (browserMatch) browser = browserMatch[1];
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  return { browser, os };
}

// Tooltip 组件（原生 Tailwind 实现，支持暗色和动画）
function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="pointer-events-none absolute z-20 left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 shadow-lg dark:bg-zinc-800 dark:text-zinc-100">
        {content}
      </div>
    </div>
  );
}

export default function SessionManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // 控制 ConfirmModal
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null); // 要吊销的 Session ID
  const [revokeMessage, setRevokeMessage] = useState<string | null>(null); // 操作结果消息
  const [revokeLoading, setRevokeLoading] = useState(false); // 登出操作 loading 状态

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setRevokeMessage(null); // 清除旧消息
    try {
      const response = await getSessions();
      const fetchedSessions: Session[] = response.data.sessions || [];
      // 直接使用后端返回的 isCurrent 字段
      setSessions(fetchedSessions); // fetchedSessions 现在直接包含了 isCurrent
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

  // 打开确认弹窗
  const openRevokeConfirm = (sessionId: string) => {
    setSessionToRevoke(sessionId);
    setShowConfirmModal(true);
    setRevokeMessage(null); // 清除旧消息
  };

  // 关闭确认弹窗
  const closeRevokeConfirm = () => {
    setSessionToRevoke(null);
    setShowConfirmModal(false);
  };

  // 处理登出操作
  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return;
    setRevokeLoading(true);
    setRevokeMessage(null);
    try {
      await revokeSession(sessionToRevoke);
      setRevokeMessage("设备已成功登出。");
      closeRevokeConfirm(); // 关闭弹窗
      await fetchSessions(); // 刷新列表
    } catch {
      setRevokeMessage("登出失败，请稍后重试。");
      // 不关闭弹窗，让用户看到错误信息
    } finally {
      setRevokeLoading(false);
    }
  };

  // 骨架屏组件
  const SkeletonRow = () => (
    <tr className="hover:bg-neutral-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {/* 浏览器和OS图标骨架 */}
            <div className="w-6 h-6 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            <div className="w-5 h-5 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
          </div>
          <div className="space-y-2">
            {/* 设备描述骨架 */}
            <div className="h-4 w-32 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            {/* 当前设备标签骨架 */}
            <div className="h-6 w-16 bg-neutral-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {/* 最近活动时间骨架 */}
        <div className="h-4 w-24 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
      </td>
      <td className="px-6 py-4">
        {/* 首次登录时间骨架 */}
        <div className="h-4 w-20 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
      </td>
      <td className="px-6 py-4">
        {/* 地理位置骨架 */}
        <div className="h-4 w-28 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse"></div>
      </td>
      <td className="px-6 py-4 text-right">
        {/* 登出按钮骨架 */}
        <div className="h-8 w-12 bg-neutral-200 dark:bg-zinc-700 rounded animate-pulse ml-auto"></div>
      </td>
    </tr>
  );

  if (loading) return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          已登录设备
        </h3>
        <p className="text-sm text-neutral-600 dark:text-zinc-400">
          管理您当前已登录的设备会话。如果您发现任何可疑活动，可以登出相关设备。
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-zinc-700">
            <thead className="bg-neutral-50 dark:bg-zinc-800">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">设备</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">最近活动</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">首次登录</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">地理位置 (IP)</th>
                <th scope="col" className="relative px-6 py-4">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-700">
              {/* 渲染3个骨架屏行，模拟典型的会话数量 */}
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center p-8">
      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          已登录设备
        </h3>
        <p className="text-sm text-neutral-600 dark:text-zinc-400">
          管理您当前已登录的设备会话。如果您发现任何可疑活动，可以登出相关设备。
        </p>
      </div>

      {revokeMessage && (
        <div className={`rounded-lg p-4 ${
          revokeMessage.includes('失败') 
            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
            : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
        }`}>
          <p className="text-sm">{revokeMessage}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-zinc-700">
            <thead className="bg-neutral-50 dark:bg-zinc-800">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">设备</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">最近活动</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">首次登录</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">地理位置 (IP)</th>
                <th scope="col" className="relative px-6 py-4">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-700">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-neutral-500 dark:text-zinc-400">
                    没有找到已登录的设备。
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const { browser, os } = parseUserAgent(session.device_info);
                  // 构建地理位置显示字符串
                  let location = '未知';
                  if (session.lastLocation) {
                    const locationParts = [
                      session.lastLocation.country, 
                      session.lastLocation.region, 
                      session.lastLocation.city
                    ]
                    .filter(Boolean)
                    .filter((item, index, arr) => 
                      // 去重：如果当前项与前一项相同，则过滤掉
                      index === 0 || item !== arr[index - 1]
                    );
                    
                    if (locationParts.length > 0) {
                      location = locationParts.join(' ');
                    }
                  }
                  // 优化设备描述
                  const deviceDesc = `${browser}${os !== '未知' ? `（${os}）` : ''}`;
                  // 最近活动时间
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
                    <tr key={session.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {getBrowserIcon(browser)}
                            {getOSIcon(os)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {deviceDesc}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-zinc-400">
                              {session.isCurrent ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  当前设备
                                </span>
                              ) : (
                                `ID: ${session.id.substring(0, 8)}...`
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">
                        {lastUsed ? (
                          <Tooltip content={lastUsedTooltip}>
                            <span>{lastUsedText}前</span>
                          </Tooltip>
                        ) : '未知'}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">
                        {session.firstLoginAt ? formatDistanceToNow(new Date(session.firstLoginAt), { addSuffix: true, locale: zhCN }) : '未知'}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">
                        {location}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!session.isCurrent && (
                          <Button
                            variant="error"
                            size="sm"
                            onClick={() => openRevokeConfirm(session.id)}
                            className="transition-all hover:bg-red-600 hover:text-white"
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
      </div>

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