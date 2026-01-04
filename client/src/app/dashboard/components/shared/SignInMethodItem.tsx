/**
 * 登录方式列表项组件
 */

import type { ReactNode } from 'react';
import { useTranslation } from '../../i18n';

interface SignInMethodItemProps {
  icon: ReactNode;
  name: string;
  description: string;
  enabled: boolean;
  onToggle?: () => void;
  toggleLabel?: string;
}

export function SignInMethodItem({ icon, name, description, enabled, onToggle, toggleLabel }: SignInMethodItemProps) {
  const t = useTranslation();
  
  // 确定按钮文本
  const buttonText = toggleLabel || (enabled ? t.common.disable : t.common.enable);
  
  return (
    <div className="flex flex-row items-end gap-3 px-4 py-4 sm:items-center">
      <div className="flex grow flex-col gap-4 sm:flex-row sm:items-center">
        <div className="bg-background flex size-10 items-center justify-center rounded-full border p-2">
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{name}</span>
          </div>
          <span className="text-subtle text-xs">{description}</span>
        </div>
      </div>
      <div className="flex justify-end">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className={`cursor-pointer min-w-24 px-3 py-1 text-sm rounded-full transition-colors ${
              enabled
                ? 'border border-primary/15 bg-transparent text-primary hover:bg-overlay-hover'
                : 'bg-foreground text-background hover:opacity-90 border-foreground border'
            }`}
          >
            {buttonText}
          </button>
        ) : (
          <span className="min-w-24 px-3 py-1 text-sm text-muted text-center">
            {t.common.linked || 'Linked'}
          </span>
        )}
      </div>
    </div>
  );
}

// 连接方式按钮（用于未连接的第三方登录）
interface ConnectMethodItemProps {
  icon: ReactNode;
  name: string;
  description: string;
  onConnect: () => void;
}

export function ConnectMethodItem({ icon, name, description, onConnect }: ConnectMethodItemProps) {
  const t = useTranslation();
  
  return (
    <div className="flex flex-row items-end gap-3 px-4 py-4 sm:items-center">
      <div className="flex grow flex-col gap-4 sm:flex-row sm:items-center">
        <div className="bg-background flex size-10 items-center justify-center rounded-full border p-2">
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{name}</span>
          </div>
          <span className="text-subtle text-xs">{description}</span>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onConnect}
          className="cursor-pointer min-w-24 px-3 py-1 text-sm rounded-full bg-foreground text-background hover:opacity-90 border-foreground border transition-colors"
        >
          {t.common.connect}
        </button>
      </div>
    </div>
  );
}
