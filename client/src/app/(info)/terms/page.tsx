'use client';

import React from 'react';
import Header from '@/app/dashboard/components/Header';
import Footer from '@/app/dashboard/components/Footer';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-light text-neutral-900 dark:text-neutral-100">
        {title}
      </h2>
      <div className="text-neutral-600 dark:text-zinc-400 text-base leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
};

export default function TermsPage() {
  const { user } = useAuth();

  const theme = {
    bg: 'bg-white dark:bg-[#09090b]',
    textPrimary: 'text-neutral-900 dark:text-neutral-100',
    textSecondary: 'text-neutral-600 dark:text-zinc-400',
    link: 'text-indigo-600 hover:underline dark:text-indigo-400',
    border: 'border-neutral-200 dark:border-zinc-700',
  };

  const lastUpdated = new Date().toLocaleDateString('zh-CN'); // 获取当前日期作为最后更新日期

  return (
    <div className={`flex min-h-screen flex-col ${theme.bg}`}>
      <Header user={user} />
      <main className="flex-grow px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1070px]">
          {/* 介绍部分 */}
          <div className="mb-10">
            <h1 className="text-3xl font-extralight mb-4 tracking-tight text-neutral-900 dark:text-neutral-100">
              服务条款
            </h1>
            <p className={`${theme.textSecondary} text-base leading-relaxed mb-2`}>
              欢迎使用 sdjz.wiki 统一身份认证服务（以下简称&quot;本服务&quot;）。这些服务条款（以下简称&quot;本条款&quot;）适用于您对本服务的所有访问和使用。请在使用本服务前仔细阅读本条款。访问或使用本服务即表示您同意受本条款的约束。
            </p>
            <p className={`${theme.textSecondary} text-sm`}>最后更新日期：{lastUpdated}</p>
          </div>

          {/* 分隔线 */}
          <hr className={`${theme.border} my-8`} />

          {/* 内容部分 */}
          <div className="space-y-12">
            <Section title="服务描述">
              <p>本服务是由 sdjz.wiki 提供的集中式身份验证解决方案，旨在为 sdjz.wiki 的各项关联服务提供统一、安全的登录和账户管理功能。用户可以通过创建账户，使用一套凭据（或通过关联的第三方账户）访问支持本服务的多个平台或应用。</p>
            </Section>

            <Section title="用户账户">
              <ul className="list-disc pl-5 space-y-3">
                <li><strong>注册资格：</strong>您必须达到您所在司法管辖区的法定成年年龄，或在父母或法定监护人的监督下使用本服务。</li>
                <li><strong>账户信息准确性：</strong>您同意在注册和使用本服务过程中提供准确、最新和完整的信息，并及时更新这些信息以保持其准确性。</li>
                <li><strong>账户安全：</strong>您有责任维护您的账户凭据（包括密码和任何两步验证信息）的机密性。您应对通过您的账户发生的所有活动负责。如发现任何未经授权使用您账户的情况，请立即通知我们。</li>
                <li><strong>账户使用：</strong>您的账户仅供您个人使用，不得转让给他人或与他人共享。</li>
              </ul>
            </Section>

            <Section title="安全措施">
              <p>我们致力于采用行业认可的安全技术来保护本服务和您的账户安全。我们当前使用的部分关键安全技术包括：</p>
              <ul className="list-disc pl-5 space-y-3 mt-3">
                <li><strong>Argon2 Hashing：</strong>我们使用目前被广泛认为是强大且安全的 Argon2 算法对用户密码进行单向哈希处理和加盐存储，极大增加了密码被破解的难度。</li>
                <li><strong>安全的会话管理 (Session Mechanism)：</strong>我们实施了安全的会话管理机制，通过使用 HttpOnly、Secure 标记的 Cookie 以及定期更新会话标识符等方式，来保护用户登录状态，降低会话劫持的风险。</li>
                <li><strong>跨站脚本攻击防御 (XSS Defense)：</strong>我们在处理用户输入和在页面上显示内容时，采取了严格的过滤和转义措施，以防范跨站脚本攻击 (XSS)，保护您的浏览器环境和数据安全。</li>
                <li><strong>速率限制 (Rate Limiting)：</strong>我们对登录尝试、密码重置请求以及其他敏感操作实施了速率限制策略。这有助于防止自动化工具进行的暴力破解攻击和拒绝服务 (DoS) 攻击，保护服务稳定性和账户安全。</li>
              </ul>
              <p className="mt-4">请注意，安全是一个持续演进的过程，我们会根据技术发展和风险评估不断审视和更新我们的安全措施。</p>
            </Section>

            <Section title="用户行为规范">
              <p>您同意在使用本服务时遵守所有适用的法律法规，并且不得进行以下活动：</p>
              <ul className="list-disc pl-5 space-y-3 mt-3">
                <li>从事任何非法、欺诈或误导性活动。</li>
                <li>试图未经授权访问本服务、其他用户账户或与本服务连接的计算机系统或网络。</li>
                <li>干扰或破坏本服务的完整性或性能，或其中包含的数据。</li>
                <li>滥用本服务，例如创建大量虚假账户或进行垃圾信息活动。</li>
                <li>冒充任何个人或实体，或虚假陈述您与任何个人或实体的关系。</li>
                <li>侵犯他人的知识产权或其他合法权利。</li>
                <li>收集或存储其他用户的个人信息，除非符合我们的 <Link href="/privacy" className={theme.link}>隐私政策</Link>。</li>
              </ul>
              <p className="mt-4">我们保留自行决定暂停或终止任何违反本行为规范的用户账户的权利。</p>
            </Section>

            <Section title="知识产权">
              <p>本服务及其所有相关内容，包括但不限于软件、文本、图形、徽标、用户界面和数据（用户提供的信息除外），均为 sdjz.wiki 或其许可方的财产，并受版权、商标和其他知识产权法律的保护。</p>
              <p>我们授予您有限的、非排他性的、不可转让的、可撤销的许可，允许您仅为个人和非商业目的访问和使用本服务，但须遵守本条款。</p>
            </Section>

            <Section title="第三方服务">
              <p>本服务可能允许您使用 Google、GitHub 等第三方服务进行注册或登录。您对这些第三方服务的使用受其各自服务条款和隐私政策的约束。</p>
              <p>我们不对任何第三方服务的内容、功能、安全性或隐私实践负责，也不作任何保证。您与任何第三方服务提供商的互动完全由您自行承担风险。</p>
            </Section>

            <Section title="免责声明">
              <p>本服务按&quot;现状&quot;和&quot;可用&quot;的基础提供，不附带任何形式的明示或暗示担保，包括但不限于对适销性、特定用途适用性、非侵权性或服务不间断或无错误的担保。</p>
              <p>我们不保证本服务将满足您的要求，或本服务将始终可用、安全、及时或无错误。我们也不对通过本服务获得或存储的任何信息的准确性或可靠性作任何保证。</p>
            </Section>

            <Section title="责任限制">
              <p>在适用法律允许的最大范围内，sdjz.wiki 及其关联方、管理人员、员工、代理或许可方在任何情况下均不对因您访问或使用本服务或无法访问或使用本服务而产生的任何间接、附带、特殊、后果性或惩罚性损害负责，包括但不限于利润损失、数据丢失、商誉损失或其他无形损失，即使我们已被告知可能发生此类损害。</p>
              <p>在任何情况下，sdjz.wiki 对因本条款或您使用本服务引起或与之相关的所有索赔的总责任均不超过您在索赔发生前六个月内为使用本服务而向我们支付的总金额（如有）或一百美元（$100.00 USD），以较高者为准。</p>
            </Section>

            <Section title="服务的变更与终止">
              <p>我们保留随时修改、暂停或终止本服务（或其任何部分）的权利，无论是否通知您。例如，我们可能添加或删除功能，或调整服务限制。</p>
              <p>我们也可能因任何原因（包括违反本条款）随时暂停或终止您对本服务的访问权限，恕不另行通知。</p>
              <p>对于本服务的任何修改、暂停或终止，或您访问权限的任何暂停或终止，我们不对您或任何第三方承担任何责任。</p>
            </Section>

            <Section title="条款更新">
              <p>我们可能会不时修订本条款。如果我们做出重大变更，我们将在变更生效前通过在本服务上发布通知或向您发送电子邮件等方式通知您。</p>
              <p>我们鼓励您定期查看本条款以了解任何更新。在条款变更通知发布后，您继续访问或使用本服务即表示您同意受修订后条款的约束。</p>
            </Section>

            <Section title="适用法律与争议解决">
              <p>本条款受中华人民共和国法律管辖并据其解释，不考虑其法律冲突规定。</p>
              <p>因本条款或您使用本服务引起或与之相关的任何争议、索赔或纠纷，应首先尝试通过友好协商解决。如果协商不成，应提交至 sdjz.wiki 所在地有管辖权的人民法院通过诉讼解决。</p>
            </Section>

            <Section title="联系方式">
              <p>如果您对本服务条款有任何疑问，请通过以下方式与我们联系：</p>
              <p>电子邮箱：{' '}
                  <a href="mailto:shuakami@sdjz.wiki" className={theme.link}>
                    shuakami@sdjz.wiki
                  </a>
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 