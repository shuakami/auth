'use client';

import React from 'react';
import Header from '@/app/dashboard/components/Header';
import Footer from '@/app/dashboard/components/Footer';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const HelpItem = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <div className="mb-8 last:mb-0">
      <h3 className="text-xl font-semibold mb-3 text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      <div className="text-neutral-600 dark:text-zinc-400 text-base leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
};

export default function HelpPage() {
  const { user } = useAuth();

  const theme = {
    bg: 'bg-white dark:bg-[#09090b]',
    textPrimary: 'text-neutral-900 dark:text-neutral-100',
    textSecondary: 'text-neutral-600 dark:text-zinc-400',
    link: 'text-indigo-600 hover:underline dark:text-indigo-400',
    border: 'border-neutral-200 dark:border-zinc-700',
  };

  return (
    <div className={`flex min-h-screen flex-col ${theme.bg}`}>
      <Header user={user} />
      <main className="flex-grow px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1070px]">
          {/* 介绍部分 */}
          <div className="mb-10">
            <h1 className="text-3xl font-extralight mb-4 tracking-tight text-neutral-900 dark:text-neutral-100">
              帮助中心
            </h1>
            <p className={`${theme.textSecondary} text-base leading-relaxed`}>
              在使用 sdjz.wiki 统一身份认证服务时遇到问题？在这里查找常见问题的解答和操作指引。
            </p>
          </div>

          {/* 分隔线 */}
          <hr className={`${theme.border} my-10`} />

          {/* 常见问题 */}
          <div className="space-y-10">
            <HelpItem title="如何注册新账户？">
              <p>您可以选择以下方式创建账户：</p>
              <ul className="list-none pl-0 space-y-3 mt-2">
                <li>
                  <strong className="font-medium text-neutral-800 dark:text-neutral-200">使用电子邮箱：</strong> 在注册页面选择邮箱注册，输入邮箱地址和安全密码，然后可能需要完成邮件验证。
                </li>
                <li>
                  <strong className="font-medium text-neutral-800 dark:text-neutral-200">通过 Google 账号：</strong> 点击&quot;使用 Google 登录&quot;按钮，选择账号并授权即可。首次使用会自动创建账户。
                </li>
                <li>
                  <strong className="font-medium text-neutral-800 dark:text-neutral-200">通过 GitHub 账号：</strong> 点击&quot;使用 GitHub 登录&quot;按钮，在 GitHub 页面授权即可。首次使用会自动创建账户。
                </li>
              </ul>
            </HelpItem>

            <HelpItem title="忘记登录密码了怎么办？">
              <p>如果您是通过<strong className="font-medium">邮箱注册</strong>且忘记密码，请在登录页面点击&quot;忘记密码？&quot;，输入注册邮箱，然后根据收到的重置邮件（请检查垃圾箱）指引设置新密码。</p>
              <p className="text-sm italic text-neutral-500 dark:text-zinc-500">提示：Google 或 GitHub 登录用户无需此操作。</p>
            </HelpItem>

            <HelpItem title="如何启用账户的两步验证（2FA）？">
              <p>启用 2FA 可极大提升账户安全性。步骤如下：</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>登录后，进入&quot;用户中心&quot;的&quot;安全设置&quot;版块。</li>
                <li>找到&quot;两步验证 (2FA)&quot;选项，点击&quot;启用&quot;。</li>
                <li>
                  <strong>设置验证器 App（推荐）：</strong>
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-sm">
                    <li>使用 Google Authenticator, Authy 等 App 扫描页面显示的二维码或手动输入密钥。</li>
                    <li>将 App 生成的 6 位验证码输入到页面进行验证。</li>
                  </ul>
                </li>
                <li>
                  <strong className="text-red-600 dark:text-red-400">【极其重要】保存备份码：</strong>
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-sm">
                    <li>启用成功后，系统会显示一组一次性备份码。</li>
                    <li><strong>务必将这些备份码抄写或打印，并存放在绝对安全的地方！</strong> 这是您丢失手机或无法使用验证器 App 时登录的唯一方法。</li>
                  </ul>
                </li>
              </ol>
              <p className="mt-3 text-sm italic text-neutral-500 dark:text-zinc-500">启用后，登录时需额外输入验证码或备份码。</p>
            </HelpItem>

            <HelpItem title="无法使用两步验证（丢失手机/验证器）怎么办？">
              <p>如果您无法获取 2FA 验证码：</p>
              <ul className="list-none pl-0 space-y-3 mt-2">
                <li><strong className="font-medium text-neutral-800 dark:text-neutral-200">尝试使用备份码：</strong> 在输入验证码的页面选择&quot;使用备份码&quot;，输入一个您之前安全保存的、未使用过的备份码。登录成功后建议重新生成并保存新的备份码。</li>
                <li><strong className="font-medium text-neutral-800 dark:text-neutral-200">联系支持（无备份码时）：</strong> 如果丢失了所有备份码，请发送邮件至{' '}
                  <a href="mailto:shuakami@sdjz.wiki" className={theme.link}>
                    shuakami@sdjz.wiki
                  </a>
                  {' '}说明情况，我们可能需要额外信息验证您的身份。</li>
              </ul>
            </HelpItem>

            <HelpItem title="如何修改我的个人信息？">
              <p>登录后，您可以在&quot;用户中心&quot;进行修改：</p>
              <ul className="list-none pl-0 space-y-3 mt-2">
                <li><strong className="font-medium text-neutral-800 dark:text-neutral-200">用户名：</strong> 在&quot;个人资料&quot;区域修改显示名称。</li>
                <li><strong className="font-medium text-neutral-800 dark:text-neutral-200">电子邮箱地址：</strong> 在账户设置中找到修改选项，输入新邮箱并完成邮件验证。</li>
                <li><strong className="font-medium text-neutral-800 dark:text-neutral-200">密码：</strong> 在&quot;安全设置&quot;中修改，通常需要验证当前密码。</li>
                <li><strong className="font-medium text-neutral-800 dark:text-neutral-200">关联的第三方账号：</strong> 在&quot;关联账户&quot;设置中查看、解除或重新关联 Google/GitHub 账号。</li>
              </ul>
            </HelpItem>

            <HelpItem title="如何管理已关联的第三方账号？">
                <p>在用户中心的&quot;关联账户&quot;设置中，您可以查看当前已关联的 Google 或 GitHub 账号，并选择&quot;断开&quot;或&quot;解除关联&quot;来移除它们。</p>
                <p><strong className="font-medium text-red-600 dark:text-red-500">重要提示：</strong> 如果您只通过第三方账号注册且未设置密码，请在解除关联前务必先设置登录密码，否则将无法登录！</p>
                <p>您也可以根据需要重新关联账号。</p>
            </HelpItem>

            <HelpItem title="在哪里可以查看我的登录历史？">
                <p>您可以在用户中心的&quot;安全设置&quot;或&quot;活动日志&quot;中查看近期的登录记录，包括时间、IP 地址和设备信息。</p>
                <p className="text-sm italic text-neutral-500 dark:text-zinc-500">建议定期检查登录历史，如发现可疑活动，请立即修改密码并联系我们。</p>
            </HelpItem>

            <HelpItem title="联系支持">
              <p>
                如果仍有问题，请通过电子邮箱{' '}
                <a href="mailto:shuakami@sdjz.wiki" className={theme.link}>
                  shuakami@sdjz.wiki
                </a>
                {' '}联系我们，或访问{' '}
                <Link href="/about" className={theme.link}>关于页面</Link>
                {' '}获取更多信息。
              </p>
            </HelpItem>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 