/**
 * 账户页面组件
 * 展示用户账户信息、登录方式和语言设置
 */

'use client';

import { Mail, Globe, Key, Github } from 'lucide-react';
import { PageHeader, InfoCard, InfoCardItem, SignInMethodItem, ConnectMethodItem } from '../shared';
import { XIcon, GoogleIcon, AppleIcon } from '../icons';
import { languageNames, useI18n, type Language } from '../../i18n';
import { Select } from '@/components/ui/Select';
import type { CurrentUser, SignInMethodType } from '../../types';

// 语言选项
const languageOptions = [
  { value: 'zh', label: languageNames.zh },
  { value: 'en', label: languageNames.en },
];

interface AccountTabProps {
  user: CurrentUser;
  isEmailVerified?: boolean;
  hasPassword?: boolean;
  isGithubLinked?: boolean;
  isGoogleLinked?: boolean;
  onEditName: () => void;
  onUpdateEmail: () => void;
  onChangePassword?: () => void;
  onManageSubscription: () => void;
  onDisableMethod: (method: SignInMethodType) => void;
  onConnectMethod: (method: SignInMethodType) => void;
  onBindGithub?: () => void;
  onEditAvatar?: () => void;
}

export function AccountTab({
  user,
  isEmailVerified,
  hasPassword,
  isGithubLinked,
  isGoogleLinked,
  onEditName,
  onUpdateEmail,
  onChangePassword,
  onManageSubscription,
  onDisableMethod,
  onConnectMethod,
  onBindGithub,
  onEditAvatar,
}: AccountTabProps) {
  const { t, language, setLanguage } = useI18n();

  // 显示用户名或占位符
  const displayName = user.name || t.account.notSet || 'Not set';

  return (
    <>
      {/* 页面头部 + 头像 */}
      <PageHeader title={t.account.title} description={t.account.description}>
        <div className="px-4 lg:px-0">
          <div className="flex flex-col items-center justify-between gap-3">
            <div className="group relative flex size-16 cursor-pointer items-center justify-center rounded-full" onClick={onEditAvatar}>
              <span className="relative flex shrink-0 overflow-hidden rounded-full bg-background h-full w-full">
                <img className="aspect-square h-full w-full" alt={displayName} src={user.avatar} />
              </span>
              <div className="absolute bottom-0 right-0">
                <button
                  type="button"
                  className="cursor-pointer size-6 scale-75 rounded-full opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 bg-background border border-border p-1 hover:bg-secondary"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="m15.728 9.576-1.414-1.414L5 17.476v1.414h1.414zm1.414-1.414 1.414-1.414-1.414-1.414-1.414 1.414zm-9.9 12.728H3v-4.243L16.435 3.212a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageHeader>

      {/* 账户信息 */}
      <div className="p-4 md:py-6 lg:px-0 space-y-10">
        <div className="space-y-8">
          <InfoCard>
            <InfoCardItem
              label={t.account.fullName}
              value={displayName}
              muted={!user.name}
              action={
                <button
                  type="button"
                  onClick={onEditName}
                  className="cursor-pointer px-3 py-1 text-sm rounded-full border border-primary/15 bg-transparent text-primary hover:bg-overlay-hover transition-colors"
                >
                  {user.name ? t.common.edit : t.common.set || 'Set'}
                </button>
              }
            />
            <InfoCardItem
              label={t.account.email}
              value={
                <span className="flex items-center gap-2">
                  {user.email}
                  {isEmailVerified !== undefined && (
                    <span className={`text-xs ${isEmailVerified ? 'text-muted' : 'text-muted'}`}>
                      ({isEmailVerified ? t.account.verified || 'Verified' : t.account.unverified || 'Unverified'})
                    </span>
                  )}
                </span>
              }
              action={
                <button
                  type="button"
                  onClick={onUpdateEmail}
                  className="cursor-pointer px-3 py-1 text-sm rounded-full border border-primary/15 bg-transparent text-primary hover:bg-overlay-hover transition-colors"
                >
                  {t.account.updateEmail}
                </button>
              }
            />
            {onChangePassword && (
              <InfoCardItem
                label={t.account.password || 'Password'}
                value={hasPassword ? (t.account.passwordSet || 'Password set') : (t.account.passwordNotSet || 'No password')}
                muted={!hasPassword}
                action={
                  <button
                    type="button"
                    onClick={onChangePassword}
                    className="cursor-pointer px-3 py-1 text-sm rounded-full border border-primary/15 bg-transparent text-primary hover:bg-overlay-hover transition-colors"
                  >
                    {hasPassword ? t.common.change || 'Change' : t.common.set || 'Set'}
                  </button>
                }
              />
            )}
            <InfoCardItem
              label={t.account.subscription}
              value={t.account.freePlan || 'Free'}
              action={
                <button
                  onClick={onManageSubscription}
                  className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full border border-primary/15 bg-transparent text-primary hover:bg-overlay-hover transition-colors"
                >
                  {t.account.manage}
                </button>
              }
            />
            {user.createdAt && (
              <InfoCardItem label={t.account.accountCreated} value={user.createdAt} />
            )}
          </InfoCard>
        </div>

        {/* 语言设置 */}
        <div className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="grow">
              <div className="w-full sm:max-w-md">
                <div className="flex items-center justify-between gap-4 sm:justify-start">
                  <p className="text-base font-medium">{t.account.language}</p>
                </div>
                <p className="text-sm text-subtle mt-2 text-pretty">
                  {t.account.languageDescription}
                </p>
              </div>
            </div>
          </div>

          <InfoCard>
            <div className="flex flex-row items-end gap-3 px-4 py-4 sm:items-center">
              <div className="flex grow flex-col gap-4 sm:flex-row sm:items-center">
                <div className="bg-background flex size-10 items-center justify-center rounded-full border p-2">
                  <Globe className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t.account.language}</span>
                  </div>
                  <span className="text-subtle text-xs">
                    {language === 'zh' ? '中文' : 'English'}
                  </span>
                </div>
              </div>
              <div className="flex justify-end min-w-48">
                <Select
                  value={language}
                  onChange={(value) => setLanguage(value as Language)}
                  options={languageOptions}
                  variant="borderless"
                />
              </div>
            </div>
          </InfoCard>
        </div>

        {/* 登录方式 */}
        <div className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="grow">
              <div className="w-full sm:max-w-md">
                <div className="flex items-center justify-between gap-4 sm:justify-start">
                  <p className="text-base font-medium">{t.account.signInMethods}</p>
                </div>
                <p className="text-sm text-subtle mt-2 text-pretty">
                  {t.account.signInMethodsDesc}
                </p>
              </div>
            </div>
          </div>

          <InfoCard>
            {/* 邮箱密码登录 */}
            <SignInMethodItem
              icon={<Mail className="size-5" />}
              name={t.account.emailPassword}
              description={hasPassword ? t.account.emailPasswordDesc : (t.account.setPasswordHint || 'Set a password to enable')}
              enabled={!!hasPassword}
              onToggle={hasPassword ? () => onDisableMethod('Email and password') : onChangePassword}
              toggleLabel={hasPassword ? undefined : (t.common.set || 'Set')}
            />

            {/* GitHub */}
            {isGithubLinked !== undefined && (
              isGithubLinked ? (
                <SignInMethodItem
                  icon={<Github className="size-5" />}
                  name="GitHub"
                  description={t.account.linkedAccount || 'Account linked'}
                  enabled={true}
                  onToggle={() => {}}
                />
              ) : (
                <ConnectMethodItem
                  icon={<Github className="size-5" />}
                  name="GitHub"
                  description={t.account.connectAccount?.replace('{provider}', 'GitHub') || 'Connect GitHub'}
                  onConnect={onBindGithub || (() => {})}
                />
              )
            )}

            {/* Google */}
            {isGoogleLinked !== undefined && (
              isGoogleLinked ? (
                <SignInMethodItem
                  icon={<GoogleIcon className="size-5" />}
                  name="Google"
                  description={t.account.linkedAccount || 'Account linked'}
                  enabled={true}
                  onToggle={() => {}}
                />
              ) : (
                <ConnectMethodItem
                  icon={<GoogleIcon className="size-5" />}
                  name="Google"
                  description={t.account.connectAccount?.replace('{provider}', 'Google') || 'Connect Google'}
                  onConnect={() => onConnectMethod('Google')}
                />
              )
            )}

            {/* Apple (暂不支持) */}
            <ConnectMethodItem
              icon={<AppleIcon className="size-5" />}
              name="Apple"
              description={t.account.connectAccount?.replace('{provider}', 'Apple') || 'Connect Apple'}
              onConnect={() => onConnectMethod('Apple')}
            />
          </InfoCard>
        </div>
      </div>
    </>
  );
}
