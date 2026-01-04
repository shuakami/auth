'use client';

import InfoPageLayout, { Section, linkClasses } from '../components/InfoPageLayout';

export default function PrivacyPage() {
  return (
    <InfoPageLayout
      title="隐私政策"
      description="我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。本政策旨在阐明我们如何收集、使用、存储、共享和保护您的个人信息。"
      lastUpdated="2025/4/27"
    >
      <Section title="我们收集哪些个人信息">
        <p>为了向您提供统一身份认证服务，我们需要收集和处理您的部分个人信息：</p>
        
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-2">账户注册与登录</h4>
            <ul className="space-y-1.5 list-none pl-0">
              <li className="flex gap-2">
                <span className="text-neutral-400 dark:text-neutral-500">•</span>
                <span>邮箱注册时收集您的电子邮箱地址和密码（加密存储）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-400 dark:text-neutral-500">•</span>
                <span>第三方登录时获取您的唯一标识符和公开资料信息</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-400 dark:text-neutral-500">•</span>
                <span>通过 Cookie 安全存储 Access Token 和 Refresh Token</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-2">安全保障</h4>
            <ul className="space-y-1.5 list-none pl-0">
              <li className="flex gap-2">
                <span className="text-neutral-400 dark:text-neutral-500">•</span>
                <span>启用 2FA 时收集身份验证器密钥（加密）和备份码（哈希存储）</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-400 dark:text-neutral-500">•</span>
                <span>记录登录 IP 地址、时间、设备信息用于安全审计</span>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Cookie 使用">
        <p>我们使用必要的 Cookie 来：</p>
        <ul className="space-y-1.5 mt-3 list-none pl-0">
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>维持会话状态，使您能够在不同页面之间保持登录</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>增强安全性，帮助检测恶意活动</span>
          </li>
        </ul>
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          我们不会使用 Cookie 进行用户追踪或广告投放。
        </p>
      </Section>

      <Section title="信息存储与保护">
        <p>我们采取符合业界标准的安全措施来保护您的信息：</p>
        <ul className="space-y-1.5 mt-3 list-none pl-0">
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>使用 TLS 加密技术确保数据传输安全</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>敏感信息采用强加密算法进行加密或哈希处理</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>Access Token 采用 RS256 非对称加密算法签发</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>实施严格的访问控制和定期安全审计</span>
          </li>
        </ul>
      </Section>

      <Section title="信息共享">
        <p>除非获得您的明确同意或符合法律法规规定，我们不会与任何第三方共享您的个人信息。</p>
        <p className="mt-3">可能的例外情况：</p>
        <ul className="space-y-1.5 mt-2 list-none pl-0">
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>获得您的明确同意后</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>法律法规要求或政府强制性要求</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>必要的服务提供商（如邮件发送服务）</span>
          </li>
        </ul>
      </Section>

      <Section title="您的权利">
        <p>您对个人信息享有以下权利：</p>
        <ul className="space-y-1.5 mt-3 list-none pl-0">
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">访问和更正</strong> — 通过用户中心查看和修改您的信息</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">删除</strong> — 在特定情形下请求删除个人信息</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">撤回同意</strong> — 随时撤回对额外信息收集的授权</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">账户注销</strong> — 联系我们协助完成注销流程</span>
          </li>
        </ul>
      </Section>

      <Section title="未成年人保护">
        <p>
          我们的服务主要面向成年人。如果您是未成年人，请在父母或监护人同意的前提下使用我们的服务。
          如果我们发现在未获得父母同意的情况下收集了未成年人信息，将尽快删除相关数据。
        </p>
      </Section>

      <Section title="政策更新">
        <p>
          我们的隐私政策可能会适时变更。对于重大变更，我们会在服务内显著位置通知您。
          您继续使用我们的服务即表示您同意受更新后的隐私政策约束。
        </p>
      </Section>

      <Section title="联系我们">
        <p>
          如果您对本隐私政策有任何疑问，请通过电子邮箱{' '}
          <a href="mailto:shuakami@sdjz.wiki" className={linkClasses}>shuakami@sdjz.wiki</a>
          {' '}与我们联系。我们将在收到请求并验证身份后的十五天内予以回复。
        </p>
      </Section>

      <Section title="合规声明">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          本服务已符合多项国际与行业安全合规标准，包括 OWASP 安全认证最佳实践、OAuth 2.0、
          NIST SP 800-63-3、FIDO2/WebAuthn、RFC 6238 TOTP 等。
        </p>
      </Section>
    </InfoPageLayout>
  );
}
