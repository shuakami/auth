'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { I18nProvider, useI18n } from '@/app/dashboard/i18n/context';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-base font-medium text-primary mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ParamTable({ params, t }: { 
  params: { name: string; type: string; descKey: string; required?: boolean }[];
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <div className="my-4 rounded-xl border border-muted overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-l1">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide">{t.integrationGuide.params.parameter}</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide">{t.integrationGuide.params.type}</th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide">{t.integrationGuide.params.description}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-muted">
          {params.map((p) => (
            <tr key={p.name} className="hover:bg-overlay-hover transition-colors">
              <td className="px-4 py-2.5">
                <code className="text-sm font-mono text-primary">{p.name}</code>
                {p.required && <span className="ml-1.5 text-xs text-red-500">*</span>}
              </td>
              <td className="px-4 py-2.5 text-sm text-muted">{p.type}</td>
              <td className="px-4 py-2.5 text-sm text-muted">
                {(t.integrationGuide.params as Record<string, string>)[p.descKey] || p.descKey}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IntegrationGuideContent() {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState('quick-start');

  const sections = [
    { id: 'quick-start', title: t.integrationGuide.sections.quickStart },
    { id: 'architecture', title: t.integrationGuide.sections.architecture },
    { id: 'oidc-discovery', title: t.integrationGuide.sections.oidcDiscovery },
    { id: 'pkce-flow', title: t.integrationGuide.sections.pkceFlow },
    { id: 'api-endpoints', title: t.integrationGuide.sections.apiEndpoints },
    { id: 'security-management', title: '安全管理 API' },
    { id: 'tokens', title: t.integrationGuide.sections.tokens },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      let foundId = 'quick-start';
      sections.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (element && element.offsetTop <= scrollPosition) {
          foundId = id;
        }
      });
      setActiveId(foundId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-0 py-10 pl-8 pr-4 h-screen">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>{t.integrationGuide.back}</span>
            </Link>

            <nav className="mt-10">
              <div className="space-y-0.5">
                {sections.map(({ id, title }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`block py-1.5 text-sm transition-colors cursor-pointer ${
                      activeId === id ? 'text-primary' : 'text-muted hover:text-primary'
                    }`}
                  >
                    {title}
                  </a>
                ))}
              </div>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-6 py-8 lg:px-12 lg:py-12">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-2xl font-medium text-primary mb-2">{t.integrationGuide.pageTitle}</h1>
              <p className="text-muted">{t.integrationGuide.pageSubtitle}</p>
            </div>

            <div className="space-y-12">
              {/* Quick Start */}
              <Section id="quick-start" title={t.integrationGuide.quickStart.title}>
                <p className="text-sm text-muted mb-6">{t.integrationGuide.quickStart.subtitle}</p>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">{t.integrationGuide.quickStart.step1Title}</h3>
                    <p className="text-sm text-muted mb-3">
                      {t.integrationGuide.quickStart.step1Desc.replace('{link}', '')}
                      <Link href="/dashboard" className="text-primary hover:underline cursor-pointer">
                        {t.integrationGuide.quickStart.step1Link}
                      </Link>
                    </p>
                    <ul className="space-y-1.5 text-sm text-muted">
                      {t.integrationGuide.quickStart.step1Items.map((item, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-muted">•</span>{item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 p-3 rounded-xl border border-muted bg-surface-l1">
                      <p className="text-sm text-muted">
                        <span className="font-medium text-primary">{t.integrationGuide.quickStart.securityTip}</span> {t.integrationGuide.quickStart.securityTipContent}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">{t.integrationGuide.quickStart.step2Title}</h3>
                    <p className="text-sm text-muted mb-3">{t.integrationGuide.quickStart.step2Desc}</p>
                    <CodeBlock 
                      language="http"
                      code={`GET /api/oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  scope=openid profile email groups security.read security.write&
  state=RANDOM_STRING&
  code_challenge=PKCE_CODE_CHALLENGE&
  code_challenge_method=S256`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">{t.integrationGuide.quickStart.step3Title}</h3>
                    <p className="text-sm text-muted mb-3">{t.integrationGuide.quickStart.step3Desc}</p>
                    <CodeBlock 
                      language="bash"
                      code={`curl -X POST 'https://auth.sdjz.wiki/api/oauth/token' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d 'grant_type=authorization_code' \\
  -d 'code=CODE_FROM_CALLBACK' \\
  -d 'redirect_uri=YOUR_REDIRECT_URI' \\
  -d 'client_id=YOUR_CLIENT_ID' \\
  -d 'client_secret=YOUR_CLIENT_SECRET' \\
  -d 'code_verifier=PKCE_CODE_VERIFIER'`}
                    />
                  </div>
                </div>
              </Section>

              {/* Architecture */}
              <Section id="architecture" title={t.integrationGuide.architecture.title}>
                <p className="text-sm text-muted mb-4">{t.integrationGuide.architecture.subtitle}</p>
                <div className="grid gap-3">
                  {t.integrationGuide.architecture.components.map((item) => (
                    <div key={item.title} className="p-3 rounded-xl border border-muted hover:bg-overlay-hover transition-colors">
                      <h4 className="text-sm font-medium text-primary mb-0.5">{item.title}</h4>
                      <p className="text-sm text-muted">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* OIDC Discovery */}
              <Section id="oidc-discovery" title={t.integrationGuide.oidcDiscovery.title}>
                <p className="text-sm text-muted mb-3">{t.integrationGuide.oidcDiscovery.subtitle}</p>
                <CodeBlock language="http" code="GET /.well-known/openid-configuration" />
                <p className="text-sm text-muted mt-4 mb-2">{t.integrationGuide.oidcDiscovery.returns}</p>
                <ul className="space-y-1 text-sm text-muted">
                  <li><code className="font-mono text-primary">issuer</code> — {t.integrationGuide.oidcDiscovery.fields.issuer}</li>
                  <li><code className="font-mono text-primary">authorization_endpoint</code> — {t.integrationGuide.oidcDiscovery.fields.authorization_endpoint}</li>
                  <li><code className="font-mono text-primary">token_endpoint</code> — {t.integrationGuide.oidcDiscovery.fields.token_endpoint}</li>
                  <li><code className="font-mono text-primary">userinfo_endpoint</code> — {t.integrationGuide.oidcDiscovery.fields.userinfo_endpoint}</li>
                  <li><code className="font-mono text-primary">jwks_uri</code> — {t.integrationGuide.oidcDiscovery.fields.jwks_uri}</li>
                </ul>
              </Section>

              {/* PKCE Flow */}
              <Section id="pkce-flow" title={t.integrationGuide.pkceFlow.title}>
                <p className="text-sm text-muted mb-4">{t.integrationGuide.pkceFlow.subtitle}</p>
                
                <div className="space-y-3 mb-6">
                  {t.integrationGuide.pkceFlow.steps.map((step, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-l1 border border-muted flex items-center justify-center text-xs text-muted">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm text-primary">{step.title}</p>
                        <p className="text-xs text-muted">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-medium text-primary mb-2">{t.integrationGuide.pkceFlow.jsImplementation}</h3>
                <CodeBlock 
                  language="javascript"
                  code={`async function generatePkce() {
  const verifier = btoa(String.fromCharCode(
    ...crypto.getRandomValues(new Uint8Array(32))
  ));
  
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    'SHA-256', 
    encoder.encode(verifier)
  );
  
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=/g, '');

  return { verifier, challenge };
}`}
                />
              </Section>

              {/* API Endpoints */}
              <Section id="api-endpoints" title={t.integrationGuide.apiEndpoints.title}>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-primary mb-1">{t.integrationGuide.apiEndpoints.authEndpoint}</h3>
                    <code className="text-sm font-mono text-muted">GET /api/oauth/authorize</code>
                    <ParamTable 
                      t={t}
                      params={[
                        { name: 'response_type', type: 'string', descKey: 'response_type', required: true },
                        { name: 'client_id', type: 'string', descKey: 'client_id', required: true },
                        { name: 'redirect_uri', type: 'string', descKey: 'redirect_uri', required: true },
                        { name: 'scope', type: 'string', descKey: 'scope', required: true },
                        { name: 'state', type: 'string', descKey: 'state' },
                        { name: 'code_challenge', type: 'string', descKey: 'code_challenge' },
                        { name: 'code_challenge_method', type: 'string', descKey: 'code_challenge_method' },
                      ]} 
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-1">{t.integrationGuide.apiEndpoints.tokenEndpoint}</h3>
                    <code className="text-sm font-mono text-muted">POST /api/oauth/token</code>
                    <ParamTable 
                      t={t}
                      params={[
                        { name: 'grant_type', type: 'string', descKey: 'grant_type', required: true },
                        { name: 'code', type: 'string', descKey: 'code', required: true },
                        { name: 'redirect_uri', type: 'string', descKey: 'redirect_uri_token', required: true },
                        { name: 'client_id', type: 'string', descKey: 'client_id_token', required: true },
                        { name: 'client_secret', type: 'string', descKey: 'client_secret' },
                        { name: 'code_verifier', type: 'string', descKey: 'code_verifier' },
                      ]} 
                    />
                    
                    <h4 className="text-sm text-muted mt-4 mb-2">{t.integrationGuide.apiEndpoints.successResponse}</h4>
                    <CodeBlock 
                      language="json"
                      code={`{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "def502005c0e1b...",
  "id_token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email groups security.read security.write",
  "roles": ["user"],
  "groups": ["user"]
}`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-1">{t.integrationGuide.apiEndpoints.userInfoEndpoint}</h3>
                    <code className="text-sm font-mono text-muted">GET /api/oauth/userinfo</code>
                    <p className="text-sm text-muted mt-2 mb-3">{t.integrationGuide.apiEndpoints.requiresBearer}</p>
                    <CodeBlock 
                      language="json"
                      code={`{
  "sub": "user_unique_identifier",
  "username": "johndoe",
  "email": "john@example.com",
  "email_verified": true,
  "roles": ["user"],
  "groups": ["user"]
}`}
                    />
                  </div>

                </div>
              </Section>

              <Section id="security-management" title="安全管理 API">
                <p className="text-sm text-muted mb-4">
                  第三方前端可以使用这些接口自建账户安全 UI。所有接口只接受 OAuth Bearer access token，不读取浏览器 Cookie。
                </p>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">Base URL 与 Scope</h3>
                    <CodeBlock
                      language="text"
                      code={`Base URL: https://auth.sdjz.wiki/api/oidc

Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

Required scopes:
- security.read  读取安全状态
- security.write 管理 2FA、备份码和通行密钥；也允许读取`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">读取安全状态</h3>
                    <CodeBlock
                      language="http"
                      code={`GET /me/security
Authorization: Bearer ACCESS_TOKEN`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "ok": true,
  "data": {
    "user": {
      "sub": "user_id",
      "email": "user@example.com",
      "username": "username"
    },
    "totp": {
      "enabled": true,
      "configured": true
    },
    "backupCodes": {
      "remaining": 8
    },
    "webauthn": {
      "enabled": true,
      "count": 1,
      "credentials": [
        {
          "id": "credential_db_uuid",
          "credentialId": "webauthn_credential_id",
          "name": "MacBook Pro",
          "deviceType": "platform",
          "backedUp": true,
          "transports": ["internal"],
          "createdAt": "2026-06-10T10:00:00.000Z",
          "lastUsedAt": "2026-06-10T10:00:00.000Z"
        }
      ]
    }
  }
}`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">初始化 TOTP</h3>
                    <CodeBlock
                      language="http"
                      code={`POST /me/security/totp/setup
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "password": "用户当前密码"
}`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "ok": true,
  "data": {
    "qr": "data:image/png;base64,...",
    "secret": "BASE32SECRET",
    "otpauthUrl": "otpauth://totp/...",
    "backupCodes": ["xxxx-xxxx"]
  }
}`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">启用 TOTP</h3>
                    <CodeBlock
                      language="http"
                      code={`POST /me/security/totp/verify
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "token": "123456"
}`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "ok": true,
  "data": {
    "enabled": true
  }
}`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">关闭 TOTP</h3>
                    <CodeBlock
                      language="http"
                      code={`DELETE /me/security/totp
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "token": "123456"
}`}
                    />
                    <p className="text-sm text-muted my-3">也可以使用备份码关闭：</p>
                    <CodeBlock
                      language="json"
                      code={`{
  "backupCode": "xxxx-xxxx"
}`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">重新生成备份码</h3>
                    <CodeBlock
                      language="http"
                      code={`POST /me/security/backup-codes
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "password": "用户当前密码"
}`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "ok": true,
  "data": {
    "codes": ["xxxx-xxxx"]
  }
}`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">管理通行密钥</h3>
                    <CodeBlock
                      language="http"
                      code={`GET /me/security/webauthn/credentials
PUT /me/security/webauthn/credentials/:credentialId/name
DELETE /me/security/webauthn/credentials/:credentialId`}
                    />
                    <p className="text-sm text-muted mt-3">
                      这里的 <code className="font-mono text-primary">:credentialId</code> 使用列表返回里的 <code className="font-mono text-primary">id</code> 字段，也就是数据库 UUID，不是 WebAuthn 原始 credentialId。
                    </p>
                    <CodeBlock
                      language="json"
                      code={`{
  "name": "新的设备名"
}`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">错误响应</h3>
                    <CodeBlock
                      language="json"
                      code={`{
  "error": "invalid_token",
  "error_description": "Missing Bearer access token"
}`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "error": "insufficient_scope",
  "required_scopes": ["security.write"],
  "granted_scopes": ["security.read"]
}`}
                    />
                    <CodeBlock
                      language="json"
                      code={`{
  "error": "invalid_password",
  "error_description": "Password confirmation failed"
}`}
                    />
                  </div>

                  <div className="p-4 rounded-xl border border-muted bg-surface-l1">
                    <h3 className="text-sm font-medium text-primary mb-2">WebAuthn 注册说明</h3>
                    <p className="text-sm text-muted">
                      当前 WebAuthn RP ID 和 Origin 固定为 auth.sdjz.wiki。第三方页面不能直接完成通行密钥注册；可以读取、重命名、删除已注册凭据。需要新增通行密钥时，应引导用户回到 auth.sdjz.wiki 的安全设置页面。
                    </p>
                  </div>
                </div>
              </Section>

              {/* Token Details */}
              <Section id="tokens" title={t.integrationGuide.tokens.title}>
                <div className="space-y-3">
                  {[
                    t.integrationGuide.tokens.accessToken,
                    t.integrationGuide.tokens.refreshToken,
                    t.integrationGuide.tokens.idToken,
                  ].map((token) => (
                    <div key={token.title} className="p-4 rounded-xl border border-muted">
                      <h4 className="text-sm font-medium text-primary mb-3">{token.title}</h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted">{t.integrationGuide.tokens.format}</span>
                          <span className="text-primary">{token.format}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">{t.integrationGuide.tokens.purpose}</span>
                          <span className="text-primary text-right max-w-[60%]">{token.purpose}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">{t.integrationGuide.tokens.lifecycle}</span>
                          <span className="text-primary text-right max-w-[60%]">{token.lifecycle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">{t.integrationGuide.tokens.storage}</span>
                          <span className="text-primary text-right max-w-[60%]">{token.storage}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-muted">
              <p className="text-sm text-muted">
                {t.integrationGuide.footer.needHelp}{' '}
                <a href="mailto:shuakami@sdjz.wiki" className="text-primary hover:underline cursor-pointer">
                  shuakami@sdjz.wiki
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function OAuthIntegrationGuide() {
  return (
    <I18nProvider>
      <IntegrationGuideContent />
    </I18nProvider>
  );
}
