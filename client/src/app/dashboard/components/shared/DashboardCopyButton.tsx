/**
 * Dashboard 专用复制按钮
 * 自动使用 i18n 翻译
 */

'use client';

import { CopyButton } from '@/components/ui/CopyButton';
import { useTranslation } from '../../i18n';

interface DashboardCopyButtonProps {
  text: string;
  className?: string;
}

export function DashboardCopyButton({ text, className }: DashboardCopyButtonProps) {
  const t = useTranslation();
  
  return (
    <CopyButton
      text={text}
      className={className}
      copyLabel={t.common.copy}
      copiedLabel={t.common.copied}
    />
  );
}
