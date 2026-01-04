'use client';

import Link from 'next/link';
import InfoPageLayout, { Section, linkClasses } from '../components/InfoPageLayout';

export default function AboutPage() {
  return (
    <InfoPageLayout
      title="关于我们"
      description="sdjz.wiki 官方提供的统一身份认证服务，为各项服务提供安全、统一的登录和账户管理入口。"
    >
      <Section title="主要特性">
        <ul className="space-y-3 list-none pl-0">
          <li className="flex gap-3">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <div>
              <strong className="text-neutral-800 dark:text-neutral-200">统一账户</strong>
              <span className="text-neutral-500 dark:text-neutral-400"> — 一次注册，通行于需要认证的 sdjz.wiki 服务。</span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <div>
              <strong className="text-neutral-800 dark:text-neutral-200">多种登录方式</strong>
              <span className="text-neutral-500 dark:text-neutral-400"> — 支持邮箱密码登录，以及 Google、GitHub 等第三方账号快速登录。</span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <div>
              <strong className="text-neutral-800 dark:text-neutral-200">安全增强</strong>
              <span className="text-neutral-500 dark:text-neutral-400"> — 提供两步验证 (2FA) 选项，包括 TOTP 动态密码和备份码。</span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <div>
              <strong className="text-neutral-800 dark:text-neutral-200">账户自管理</strong>
              <span className="text-neutral-500 dark:text-neutral-400"> — 在用户中心方便地更新个人信息、修改密码、管理安全设置。</span>
            </div>
          </li>
        </ul>
      </Section>

      <Section title="联系与支持">
        <p>
          如果您在使用过程中遇到任何问题或有任何建议，请通过{' '}
          <Link href="/help" className={linkClasses}>帮助中心</Link>
          {' '}或发送邮件至{' '}
          <a href="mailto:shuakami@sdjz.wiki" className={linkClasses}>shuakami@sdjz.wiki</a>
          {' '}与我们联系。
        </p>
      </Section>
    </InfoPageLayout>
  );
}
