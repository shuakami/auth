/**
 * Docs 布局组件
 */

'use client';

import { I18nProvider } from '../dashboard/i18n';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider defaultLanguage="zh">
      {children}
    </I18nProvider>
  );
}
