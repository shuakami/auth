'use client';

import Link from 'next/link';
import InfoPageLayout, { HelpItem, linkClasses } from '../components/InfoPageLayout';

export default function HelpPage() {
  return (
    <InfoPageLayout
      title="帮助中心"
      description="在使用 sdjz.wiki 统一身份认证服务时遇到问题？在这里查找常见问题的解答和操作指引。"
    >
      <div className="space-y-10">
        <HelpItem title="如何注册新账户？">
          <p>您可以选择以下方式创建账户：</p>
          <ul className="space-y-2 mt-3 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500 shrink-0">1.</span>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">使用电子邮箱</strong>
                <span className="text-neutral-500 dark:text-neutral-400"> — 在注册页面输入邮箱地址和安全密码，然后完成邮件验证。</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500 shrink-0">2.</span>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">通过 Google 账号</strong>
                <span className="text-neutral-500 dark:text-neutral-400"> — 点击"使用 Google 登录"按钮，选择账号并授权即可。</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500 shrink-0">3.</span>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">通过 GitHub 账号</strong>
                <span className="text-neutral-500 dark:text-neutral-400"> — 点击"使用 GitHub 登录"按钮，在 GitHub 页面授权即可。</span>
              </div>
            </li>
          </ul>
        </HelpItem>

        <HelpItem title="忘记登录密码了怎么办？">
          <p>
            如果您是通过邮箱注册且忘记密码，请在登录页面点击"忘记密码？"，输入注册邮箱，
            然后根据收到的重置邮件（请检查垃圾箱）指引设置新密码。
          </p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">
            提示：Google 或 GitHub 登录用户无需此操作。
          </p>
        </HelpItem>

        <HelpItem title="如何启用两步验证（2FA）？">
          <p>启用 2FA 可极大提升账户安全性。步骤如下：</p>
          <ol className="space-y-2 mt-3 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500 shrink-0">1.</span>
              <span>登录后，进入"用户中心"的"安全设置"版块。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500 shrink-0">2.</span>
              <span>找到"两步验证 (2FA)"选项，点击"启用"。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500 shrink-0">3.</span>
              <span>使用 Google Authenticator 或 Authy 等 App 扫描二维码。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500 shrink-0">4.</span>
              <span>将 App 生成的 6 位验证码输入到页面进行验证。</span>
            </li>
          </ol>
          <div className="mt-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
              重要：保存备份码
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              启用成功后，系统会显示一组一次性备份码。务必将这些备份码安全保存，
              这是您丢失手机或无法使用验证器 App 时登录的唯一方法。
            </p>
          </div>
        </HelpItem>

        <HelpItem title="无法使用两步验证怎么办？">
          <p>如果您无法获取 2FA 验证码：</p>
          <ul className="space-y-2 mt-3 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">尝试使用备份码</strong>
                <span className="text-neutral-500 dark:text-neutral-400"> — 在输入验证码的页面选择"使用备份码"，输入一个未使用过的备份码。</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <div>
                <strong className="text-neutral-800 dark:text-neutral-200">联系支持</strong>
                <span className="text-neutral-500 dark:text-neutral-400"> — 如果丢失了所有备份码，请发送邮件至{' '}
                  <a href="mailto:shuakami@sdjz.wiki" className={linkClasses}>shuakami@sdjz.wiki</a>
                  {' '}说明情况。
                </span>
              </div>
            </li>
          </ul>
        </HelpItem>

        <HelpItem title="如何修改个人信息？">
          <p>登录后，您可以在"用户中心"进行修改：</p>
          <ul className="space-y-2 mt-3 list-none pl-0">
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <span><strong className="text-neutral-800 dark:text-neutral-200">用户名</strong> — 在"个人资料"区域修改显示名称。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <span><strong className="text-neutral-800 dark:text-neutral-200">邮箱地址</strong> — 在账户设置中修改，需完成邮件验证。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <span><strong className="text-neutral-800 dark:text-neutral-200">密码</strong> — 在"安全设置"中修改，需验证当前密码。</span>
            </li>
            <li className="flex gap-3">
              <span className="text-neutral-400 dark:text-neutral-500">•</span>
              <span><strong className="text-neutral-800 dark:text-neutral-200">第三方账号</strong> — 在"关联账户"设置中管理。</span>
            </li>
          </ul>
        </HelpItem>

        <HelpItem title="如何管理已关联的第三方账号？">
          <p>
            在用户中心的"关联账户"设置中，您可以查看当前已关联的 Google 或 GitHub 账号，
            并选择"断开"来移除它们。
          </p>
          <div className="mt-3 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              <strong className="text-neutral-800 dark:text-neutral-200">注意：</strong>
              如果您只通过第三方账号注册且未设置密码，请在解除关联前务必先设置登录密码，否则将无法登录。
            </p>
          </div>
        </HelpItem>

        <HelpItem title="联系支持">
          <p>
            如果仍有问题，请通过电子邮箱{' '}
            <a href="mailto:shuakami@sdjz.wiki" className={linkClasses}>shuakami@sdjz.wiki</a>
            {' '}联系我们，或访问{' '}
            <Link href="/about" className={linkClasses}>关于页面</Link>
            {' '}获取更多信息。
          </p>
        </HelpItem>
      </div>
    </InfoPageLayout>
  );
}
