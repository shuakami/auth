/**
 * MFA 设备选择页面 - /dashboard-test/security/mfa
 */

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader, Breadcrumb, SectionDivider } from '../../components/shared';
import { useI18n } from '../../i18n';

export default function MfaSelectPage() {
  const { t } = useI18n();

  return (
    <>
      <Breadcrumb
        items={[
          { label: t.nav.security, href: '/dashboard-test/security' },
          { label: t.security.addMfaDevice },
        ]}
      />
      <PageHeader title={t.security.addMfaDevice} description={t.security.addMfaDesc} />
      <div className="p-4 md:py-6 lg:px-0 space-y-10">
        <SectionDivider />
        
        {/* 验证器应用 */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.authenticatorApp}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">使用 Google Authenticator、Authy 等应用生成动态验证码</p>
            </div>
          </div>
          <div>
            <Link
              href="/dashboard-test/security/mfa/app"
              className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
            >
              {t.common.setup}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <SectionDivider />

        {/* 生物识别 */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="grow">
            <div className="w-full sm:max-w-md">
              <p className="text-base text-regular font-medium">{t.security.biometricAuth}</p>
              <p className="text-sm text-subtle mt-2 text-pretty">使用指纹、面容或安全密钥进行身份验证</p>
            </div>
          </div>
          <div>
            <Link
              href="/dashboard-test/security/mfa/biometric"
              className="cursor-pointer relative isolate inline-flex shrink-0 items-center justify-center rounded-full border focus:outline focus:outline-2 focus:outline-offset-2 min-h-8 gap-x-2 px-4 py-1.5 text-sm border-primary/15 bg-transparent text-primary hover:bg-overlay-hover"
            >
              {t.common.setup}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
