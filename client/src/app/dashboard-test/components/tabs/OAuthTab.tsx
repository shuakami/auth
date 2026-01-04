/**
 * OAuth 应用管理页面组件
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Settings, ArrowUpRight } from 'lucide-react';
import { PageHeader, DataCard, DashboardCopyButton } from '../shared';
import { useI18n } from '../../i18n';
import type { OAuthApp } from '../../types';

interface OAuthTabProps {
  apps: OAuthApp[];
  onAppSettings: (app: OAuthApp) => void;
}

export function OAuthTab({
  apps,
  onAppSettings,
}: OAuthTabProps) {
  const { t } = useI18n();

  // 列表页面
  return (
    <>
      <PageHeader title={t.oauth.title} description={t.oauth.description} />

      <div className="p-4 md:py-6 lg:px-0">
        <DataCard
          title={t.oauth.applications}
          description={t.oauth.applicationsDesc}
          searchPlaceholder={t.oauth.searchApps}
          action={
            <Link
              href="/dashboard-test/oauth/create"
              className="cursor-pointer inline-flex items-center justify-center gap-x-2 whitespace-nowrap font-medium transition-colors bg-foreground text-background hover:bg-foreground/90 h-7 px-3 text-xs rounded-full"
            >
              {t.common.create}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="w-full [&_tbody_tr:hover]:bg-transparent">
            <div className="flow-root">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors">
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[35%]">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow">{t.oauth.application}</div>
                      </div>
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[35%]">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow">{t.oauth.clientId}</div>
                      </div>
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[15%] whitespace-nowrap">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow">{t.oauth.usage}</div>
                      </div>
                    </th>
                    <th className="text-muted-foreground h-10 px-2 text-left align-middle font-medium sm:px-5 w-[15%]">
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="grow" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {apps.map((app) => (
                    <tr key={app.id} className="border-b transition-colors hover:bg-overlay-hover group">
                      <td className="px-2 py-3 align-middle sm:px-5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium truncate ${app.enabled ? '' : 'text-muted'}`}>{app.name}</span>
                          </div>
                          {app.description && <span className="text-xs text-muted truncate">{app.description}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-middle sm:px-5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-muted truncate">{app.clientId}</code>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <DashboardCopyButton text={app.clientId} />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-middle sm:px-5">
                        <span className="text-sm text-muted">{app.usageCount}</span>
                      </td>
                      <td className="px-2 py-3 align-middle sm:px-5">
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="cursor-pointer text-subtle hover:text-primary transition-colors"
                            title="Settings"
                            onClick={() => onAppSettings(app)}
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DataCard>

        <div className="mt-4 text-center">
          <a
            href="https://auth.sdjz.wiki/oauth/integration-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm cursor-pointer text-subtle hover:text-primary inline-flex items-center gap-1 transition-colors"
          >
            {t.oauth.viewGuide}
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </>
  );
}
