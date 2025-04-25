'use client';

import React from 'react';
import Header from '@/app/dashboard/components/Header';
import Footer from '@/app/dashboard/components/Footer';
import { useAuth } from '@/context/AuthContext';

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

export default function PrivacyPage() {
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
              隐私政策
            </h1>
            <p className={`${theme.textSecondary} text-base leading-relaxed mb-2`}>
              欢迎使用 sdjz.wiki 统一身份认证服务。我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。我们致力于维护您对我们的信任，恪守以下原则，保护您的个人信息：权责一致原则、目的明确原则、选择同意原则、最小必要原则、确保安全原则、主体参与原则、公开透明原则等。本隐私政策（以下简称&quot;本政策&quot;）旨在阐明我们如何收集、使用、存储、共享、转让和保护您的个人信息，以及您如何管理您的个人信息。
            </p>
            <p className={`${theme.textSecondary} text-sm`}>最后更新日期：{lastUpdated}</p>
          </div>

          {/* 分隔线 */}
          <hr className={`${theme.border} my-8`} />

          {/* 内容部分 */}
          <div className="space-y-12">
            <Section title="我们收集哪些个人信息以及为何收集">
              <p>为了向您提供统一身份认证服务，我们需要收集和处理您的部分个人信息。我们仅会出于本政策所述的以下目的，收集和使用您的个人信息：</p>
              <ul className="list-disc pl-5 space-y-3 mt-3">
                <li>
                  <strong>账户注册与登录：</strong>
                  <ul className="list-circle pl-5 space-y-2 mt-2">
                    <li>当您使用邮箱注册时，我们会收集您的<strong>电子邮箱地址</strong>和您设置的<strong>密码（加密存储）</strong>，用于创建和验证您的账户。</li>
                    <li>当您选择通过 Google 或 GitHub 等第三方服务登录时，我们会根据您的授权，从这些服务获取您的<strong>唯一标识符</strong>和<strong>公开的个人资料信息（如用户名、头像链接，具体取决于第三方服务的授权范围）</strong>，用于创建或关联您的账户，简化登录流程。</li>
                  </ul>
                </li>
                <li>
                  <strong>安全保障：</strong>
                  <ul className="list-circle pl-5 space-y-2 mt-2">
                    <li>为了保障您的账户安全，当您启用两步验证 (2FA) 时，我们会收集并安全存储您设置的<strong>身份验证器密钥（加密）</strong>或相关的安全信息。我们还会生成并提供一次性<strong>备份码（哈希存储）</strong>，用于在您无法访问身份验证器时恢复账户访问。</li>
                    <li>我们还会记录您的<strong>登录IP地址、登录时间、设备信息（如浏览器类型、操作系统）</strong>等日志信息。这些信息用于安全审计、风险识别、欺诈检测以及在出现安全事件时进行调查。</li>
                  </ul>
                </li>
                <li>
                  <strong>服务提供与优化：</strong>
                  <ul className="list-circle pl-5 space-y-2 mt-2">
                    <li>我们会使用您的<strong>用户名</strong>和<strong>邮箱地址</strong>来识别您的身份，并向您提供账户管理功能。</li>
                    <li>我们可能会分析匿名的、聚合的服务使用数据（例如用户活跃度、功能使用频率），以了解服务的使用情况，从而改进我们的服务设计和用户体验。这些分析不针对任何特定个人。</li>
                  </ul>
                </li>
                <li>
                  <strong>客户支持与沟通：</strong>
                  <ul className="list-circle pl-5 space-y-2 mt-2">
                    <li>当您通过邮件联系我们寻求支持时，我们会收集您的<strong>联系信息（如邮箱地址）</strong>和您在沟通过程中提供的<strong>问题描述、相关信息</strong>，以便我们能够理解并解决您的问题。</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-4">请注意，我们遵循数据最小化原则，仅收集为实现特定目的所必需的信息。</p>
            </Section>

            <Section title="我们如何使用 Cookie 和同类技术">
                <p>Cookie 是一种小型文本文件，当您访问网站时，网站会将其存储在您的计算机或移动设备上。</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                    <li><strong>维持会话状态：</strong>我们使用必要的 Cookie（通常是会话 Cookie）来识别您的登录状态，使您能够在不同页面之间保持登录，而无需重复输入凭据。这些 Cookie 对于提供核心认证功能至关重要。</li>
                    <li><strong>安全增强：</strong>部分 Cookie 可能用于增强安全性，例如帮助我们检测恶意活动或违反我们服务条款的行为。</li>
                </ul>
                <p className="mt-4">我们不会使用 Cookie 进行用户追踪、广告投放或与认证服务无关的目的。大多数浏览器允许您管理 Cookie 偏好设置。您可以选择阻止或删除 Cookie，但请注意，禁用对我们服务运行至关重要的 Cookie 可能会影响您的使用体验，甚至导致无法登录。</p>
            </Section>

            <Section title="我们如何存储和保护您的个人信息">
                <p>我们高度重视您的个人信息安全，并采取符合业界标准的安全措施来保护您的信息，防止数据遭到未经授权的访问、公开披露、使用、修改、损坏或丢失。</p>
                <ul className="list-disc pl-5 space-y-3 mt-3">
                    <li><strong>数据存储：</strong>您的个人信息存储在位于安全可控环境下的服务器中。我们会根据数据的重要性和敏感性，采取适当的技术和管理措施进行保护。</li>
                    <li><strong>加密技术：</strong>我们使用传输层安全协议（TLS）等加密技术，确保数据在传输过程中的机密性。对于密码、2FA 密钥等敏感信息，我们会采用业界认可的强加密算法进行加密或哈希处理后存储。</li>
                    <li><strong>访问控制：</strong>我们实施严格的访问控制机制，仅授权人员才能访问您的个人信息，并且这些人员都需要遵守相应的保密义务。我们会定期审计访问权限。</li>
                    <li><strong>安全审计与监控：</strong>我们会部署安全监控系统，及时发现并处理潜在的安全风险。我们会定期进行安全审计和漏洞扫描。</li>
                    <li><strong>数据保留：</strong>我们仅在为实现本政策所述目的所必需的期限内保留您的个人信息，除非法律有强制的存留要求。超出保留期限后，我们将对您的个人信息进行删除或匿名化处理。例如，您的账户信息将在您注销账户后按规定删除。</li>
                </ul>
                <p className="mt-4">尽管我们采取了上述合理的安全措施，但请理解，由于技术的限制以及可能存在的各种恶意手段，互联网环境并非绝对安全。我们将尽力确保您发送给我们的任何信息的安全性，但无法保证其绝对安全。如不幸发生个人信息安全事件，我们将按照法律法规的要求，及时向您告知安全事件的基本情况和可能的影响、我们已采取或将要采取的处置措施、您可自主防范和降低风险的建议、对您的补救措施等。</p>
            </Section>

            <Section title="我们如何共享、转让、公开披露您的个人信息">
                <p>我们深知个人信息保护的重要性，除非获得您的明确同意或符合法律法规的规定，我们不会与任何第三方公司、组织和个人共享您的个人信息。</p>
                <ul className="list-disc pl-5 space-y-3 mt-3">
                    <li><strong>共享：</strong>
                        <ul className="list-circle pl-5 space-y-2 mt-2">
                            <li><strong>获得您的明确同意：</strong>在获取您的明确同意后，我们可能会与您指定的第三方共享您的信息。</li>
                            <li><strong>法律法规要求或政府强制性要求：</strong>根据适用的法律法规、法律程序的要求、诉讼或政府主管部门的强制性要求，我们可能会对外共享您的个人信息。</li>
                            <li><strong>必要的服务提供商：</strong>为了提供某些功能（例如邮件发送服务用于发送密码重置邮件），我们可能会与可信赖的第三方服务提供商共享实现该功能所必需的最少信息。我们会对这些服务提供商进行严格评估，并与其签署保密协议，要求他们按照我们的说明、本政策以及其他任何相关的保密和安全措施来处理个人信息。</li>
                        </ul>
                    </li>
                    <li><strong>转让：</strong>我们不会将您的个人信息转让给任何公司、组织和个人，但以下情况除外：
                        <ul className="list-circle pl-5 space-y-2 mt-2">
                            <li>在获取明确同意的情况下转让：获得您的明确同意后，我们会向其他方转让您的个人信息；</li>
                            <li>在涉及合并、收购或破产清算时，如涉及到个人信息转让，我们会在要求新的持有您个人信息的公司、组织继续受此隐私政策的约束，否则我们将要求该公司、组织重新向您征求授权同意。</li>
                        </ul>
                    </li>
                    <li><strong>公开披露：</strong>我们仅会在以下情况下，公开披露您的个人信息：
                        <ul className="list-circle pl-5 space-y-2 mt-2">
                            <li>获得您明确同意后；</li>
                            <li>基于法律的披露：在法律、法律程序、诉讼或政府主管部门强制性要求的情况下，我们可能会公开披露您的个人信息。</li>
                        </ul>
                    </li>
                </ul>
            </Section>

            <Section title="您的权利">
              <p>我们非常重视您对个人信息的关注，并尽全力保护您对于自己个人信息访问、更正、删除以及撤回同意的权利，以使您拥有充分的能力保障您的隐私和安全。您的权利包括：</p>
              <ul className="list-disc pl-5 space-y-3 mt-3">
                <li>
                  <strong>访问和更正您的个人信息：</strong>
                  <p>您有权访问您的个人信息。您可以通过登录用户中心查看和修改您的用户名、邮箱地址（需要验证新邮箱）、密码以及管理关联的第三方账号和安全设置（如启用/禁用2FA）。如果您无法通过上述方式访问或更正这些个人信息，您可以随时通过本政策提供的联系方式与我们联系。</p>
                </li>
                <li>
                  <strong>删除您的个人信息：</strong>
                  <p>在以下情形中，您可以向我们提出删除个人信息的请求：</p>
                  <ul className="list-circle pl-5 space-y-2 mt-2">
                      <li>如果我们处理个人信息的行为违反法律法规；</li>
                      <li>如果我们收集、使用您的个人信息，却未征得您的同意；</li>
                      <li>如果我们处理个人信息的行为违反了与您的约定；</li>
                      <li>如果您不再使用我们的产品或服务，或您注销了账号；</li>
                      <li>如果我们不再为您提供产品或服务。</li>
                  </ul>
                  <p>若我们决定响应您的删除请求，我们还将同时通知从我们获得您的个人信息的实体，要求其及时删除，除非法律法规另有规定，或这些实体获得您的独立授权。</p>
                </li>
                <li>
                  <strong>改变您授权同意的范围：</strong>
                  <p>每个业务功能需要一些基本的个人信息才能得以完成。对于额外收集的个人信息的收集和使用，您可以随时给予或收回您的授权同意。例如，您可以取消第三方账号的关联。当您收回同意后，我们将不再处理相应的个人信息。但您收回同意的决定，不会影响此前基于您的授权而开展的个人信息处理。</p>
                </li>
                <li>
                  <strong>账户注销：</strong>
                  <p>目前我们暂未提供在线注销功能。如果您希望注销您的账户，请通过本政策提供的联系方式与我们联系，我们将协助您完成注销流程。在注销账户之后，我们将停止为您提供产品或服务，并依据您的要求，删除您的个人信息，法律法规另有规定的除外。</p>
                </li>
                <li>
                  <strong>响应您的上述请求：</strong>
                  <p>为保障安全，您可能需要提供书面请求，或以其他方式证明您的身份。我们可能会先要求您验证自己的身份，然后再处理您的请求。我们将在十五天内做出答复。对于您合理的请求，我们原则上不收取费用，但对多次重复、超出合理限度的请求，我们将视情收取一定成本费用。对于那些无端重复、需要过多技术手段（例如，需要开发新系统或从根本上改变现行惯例）、给他人合法权益带来风险或者非常不切实际的请求，我们可能会予以拒绝。</p>
                </li>
              </ul>
              <p className="mt-4">
                如需行使这些权利或对您的数据处理有任何疑问，请发送邮件至{' '}
                <a href="mailto:shuakami@sdjz.wiki" className={theme.link}>
                  shuakami@sdjz.wiki
                </a>
                。我们会及时响应您的请求。
              </p>
            </Section>

            <Section title="未成年人保护">
                <p>我们的服务主要面向成年人。如果您是未成年人，我们要求您请您的父母或监护人仔细阅读本隐私权政策，并在征得您的父母或监护人同意的前提下使用我们的服务或向我们提供信息。</p>
                <p>对于经父母同意而收集未成年人个人信息的情况，我们只会在受到法律允许、父母或监护人明确同意或者保护未成年人所必要的情况下使用或公开披露此信息。</p>
                <p>如果我们发现自己在未事先获得可证实的父母同意的情况下收集了未成年人的个人信息，则会设法尽快删除相关数据。</p>
            </Section>

            <Section title="本政策如何更新">
                <p>我们的隐私政策可能会适时发生变更。</p>
                <p>未经您明确同意，我们不会削减您按照本隐私政策所应享有的权利。</p>
                <p>对于重大变更，我们会在服务内显著位置（例如弹窗通知）或通过您预留的电子邮件向您发送通知。本政策所指的重大变更包括但不限于：</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                    <li>我们的服务模式发生重大变化。如处理个人信息的目的、处理的个人信息类型、个人信息的使用方式等；</li>
                    <li>我们在所有权结构、组织架构等方面发生重大变化。如业务调整、破产并购等引起的所有者变更等；</li>
                    <li>个人信息共享、转让或公开披露的主要对象发生变化；</li>
                    <li>您参与个人信息处理方面的权利及其行使方式发生重大变化；</li>
                    <li>我们负责处理个人信息安全的责任部门、联络方式及投诉渠道发生变化时；</li>
                    <li>个人信息安全影响评估报告表明存在高风险时。</li>
                </ul>
                <p className="mt-4">我们还会将本政策的旧版本存档，供您查阅。建议您定期查看本政策以了解最新信息。您继续使用我们的服务即表示您同意受更新后的隐私政策约束。</p>
            </Section>

            <Section title="如何联系我们">
                <p>如果您对本隐私政策有任何疑问、意见或建议，或者希望行使您的隐私权利，请通过以下方式与我们联系：</p>
                <p>电子邮箱：{' '}
                    <a href="mailto:shuakami@sdjz.wiki" className={theme.link}>
                      shuakami@sdjz.wiki
                    </a>
                </p>
                <p>我们将在收到您的请求并验证您的用户身份后的十五天内予以回复。</p>
            </Section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 