'use client';

import Link from 'next/link';
import InfoPageLayout, { Section, linkClasses } from '../components/InfoPageLayout';

export default function TermsPage() {
  return (
    <InfoPageLayout
      title="服务条款"
      description="这些服务条款适用于您对 sdjz.wiki 统一身份认证服务的所有访问和使用。请在使用本服务前仔细阅读。"
      lastUpdated="2025/4/27"
    >
      <Section title="服务描述">
        <p>
          本服务是由 sdjz.wiki 提供的集中式身份验证解决方案，旨在为 sdjz.wiki 的各项关联服务
          提供统一、安全的登录和账户管理功能。
        </p>
      </Section>

      <Section title="用户账户">
        <ul className="space-y-2 list-none pl-0">
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">注册资格</strong> — 您必须达到法定成年年龄，或在监护人监督下使用</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">信息准确性</strong> — 您同意提供准确、最新和完整的信息</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">账户安全</strong> — 您有责任维护账户凭据的机密性</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">账户使用</strong> — 账户仅供个人使用，不得转让或共享</span>
          </li>
        </ul>
      </Section>

      <Section title="安全措施">
        <p>我们采用行业认可的安全技术来保护本服务和您的账户安全：</p>
        <ul className="space-y-2 mt-3 list-none pl-0">
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">Argon2 Hashing</strong> — 使用强大的算法对密码进行单向哈希处理</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">现代化令牌认证</strong> — 短生命周期 Access Token 结合双重绑定 Refresh Token</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">XSS 防御</strong> — 严格的输入过滤和转义措施</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span><strong className="text-neutral-800 dark:text-neutral-200">速率限制</strong> — 防止暴力破解和 DoS 攻击</span>
          </li>
        </ul>
      </Section>

      <Section title="用户行为规范">
        <p>您同意在使用本服务时遵守所有适用的法律法规，并且不得：</p>
        <ul className="space-y-1.5 mt-3 list-none pl-0">
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>从事任何非法、欺诈或误导性活动</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>试图未经授权访问本服务或其他用户账户</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>干扰或破坏本服务的完整性或性能</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>滥用本服务，如创建大量虚假账户</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>冒充任何个人或实体</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neutral-400 dark:text-neutral-500">•</span>
            <span>侵犯他人的知识产权或其他合法权利</span>
          </li>
        </ul>
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          我们保留暂停或终止任何违反本行为规范的用户账户的权利。
        </p>
      </Section>

      <Section title="知识产权">
        <p>
          本服务及其所有相关内容均为 sdjz.wiki 或其许可方的财产，受版权、商标和其他知识产权法律保护。
          我们授予您有限的、非排他性的许可，允许您仅为个人和非商业目的访问和使用本服务。
        </p>
      </Section>

      <Section title="第三方服务">
        <p>
          本服务可能允许您使用 Google、GitHub 等第三方服务进行注册或登录。
          您对这些第三方服务的使用受其各自服务条款和隐私政策的约束。
          我们不对任何第三方服务的内容、功能、安全性或隐私实践负责。
        </p>
      </Section>

      <Section title="免责声明">
        <p>
          本服务按"现状"和"可用"的基础提供，不附带任何形式的明示或暗示担保。
          我们不保证本服务将满足您的要求，或本服务将始终可用、安全、及时或无错误。
        </p>
      </Section>

      <Section title="责任限制">
        <p>
          在适用法律允许的最大范围内，sdjz.wiki 及其关联方在任何情况下均不对因您访问或使用本服务
          而产生的任何间接、附带、特殊、后果性或惩罚性损害负责。
        </p>
      </Section>

      <Section title="服务变更与终止">
        <p>
          我们保留随时修改、暂停或终止本服务的权利。我们也可能因任何原因（包括违反本条款）
          随时暂停或终止您对本服务的访问权限。
        </p>
      </Section>

      <Section title="条款更新">
        <p>
          我们可能会不时修订本条款。如果我们做出重大变更，我们将通过在本服务上发布通知或
          向您发送电子邮件等方式通知您。您继续使用本服务即表示您同意受修订后条款的约束。
        </p>
      </Section>

      <Section title="适用法律">
        <p>
          本条款受中华人民共和国法律管辖。因本条款引起的任何争议，应首先尝试通过友好协商解决。
          如果协商不成，应提交至 sdjz.wiki 所在地有管辖权的人民法院通过诉讼解决。
        </p>
      </Section>

      <Section title="联系方式">
        <p>
          如果您对本服务条款有任何疑问，请通过电子邮箱{' '}
          <a href="mailto:shuakami@sdjz.wiki" className={linkClasses}>shuakami@sdjz.wiki</a>
          {' '}与我们联系。
        </p>
      </Section>

      <Section title="相关链接">
        <p>
          <Link href="/privacy" className={linkClasses}>隐私政策</Link>
          {' · '}
          <Link href="/help" className={linkClasses}>帮助中心</Link>
          {' · '}
          <Link href="/about" className={linkClasses}>关于我们</Link>
        </p>
      </Section>
    </InfoPageLayout>
  );
}
