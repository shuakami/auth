/**
 * 文档索引页面 - /docs
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useI18n } from '../dashboard/i18n';

export default function DocsPage() {
  const { t } = useI18n();

  const docs = [
    {
      title: t.docs.oauthGuide,
      description: t.docs.oauthGuideDesc,
      href: '/oauth/integration-guide',
    },
  ];

  const comingSoon = [
    { title: t.docs.securityGuide, description: t.docs.securityGuideDesc },
    { title: t.docs.userApiGuide, description: t.docs.userApiGuideDesc },
    { title: t.docs.webhookGuide, description: t.docs.webhookGuideDesc },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image
                src="/assets/images/logo/logo-white.png"
                alt="Logo"
                className="block w-full h-full object-contain dark:hidden"
                width={32}
                height={32}
                priority
              />
              <Image
                src="/assets/images/logo/logo-black.png"
                alt="Logo"
                className="hidden w-full h-full object-contain dark:block"
                width={32}
                height={32}
                priority
              />
            </div>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-primary transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t.common.back}
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-6 py-12 lg:py-16">
        {/* Title */}
        <div className="mb-12">
          <h1 className="text-2xl font-medium mb-2">{t.docs.title}</h1>
          <p className="text-muted">{t.docs.description}</p>
        </div>

        {/* Available Docs */}
        <div className="space-y-1">
          {docs.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="group flex items-center justify-between p-4 -mx-4 rounded-xl hover:bg-overlay-hover transition-colors"
            >
              <div>
                <h2 className="font-medium">{doc.title}</h2>
                <p className="text-sm text-muted mt-0.5">{doc.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mt-12 pt-8">
          <p className="text-xs text-muted uppercase tracking-wide mb-4">{t.docs.comingSoon}</p>
          <div className="space-y-3">
            {comingSoon.map((doc) => (
              <div key={doc.title} className="opacity-40">
                <p className="text-sm">{doc.title}</p>
                <p className="text-xs text-muted">{doc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="text-sm text-muted">
            {t.docs.needHelp}{' '}
            <a href="mailto:shuakami@sdjz.wiki" className="text-primary hover:underline">
              shuakami@sdjz.wiki
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
