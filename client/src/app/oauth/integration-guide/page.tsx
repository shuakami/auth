'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CodeBlock } from '@/components/ui/CodeBlock';

// Section component
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="text-lg font-medium text-primary mb-6">{title}</h2>
      {children}
    </section>
  );
}

// Parameter table component
function ParamTable({ params }: { params: { name: string; type: string; desc: string; required?: boolean }[] }) {
  return (
    <div className="my-4 rounded-xl border border-muted overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-l1">
            <th className="px-4 py-3 text-left font-medium text-regular">Parameter</th>
            <th className="px-4 py-3 text-left font-medium text-regular">Type</th>
            <th className="px-4 py-3 text-left font-medium text-regular">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-muted">
          {params.map((p) => (
            <tr key={p.name} className="hover:bg-overlay-hover transition-colors">
              <td className="px-4 py-3">
                <code className="text-sm font-mono text-primary">{p.name}</code>
                {p.required && <span className="ml-2 text-xs text-red-500">*</span>}
              </td>
              <td className="px-4 py-3 text-muted">{p.type}</td>
              <td className="px-4 py-3 text-muted">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sections = [
  { id: 'quick-start', title: 'Quick Start' },
  { id: 'architecture', title: 'Architecture' },
  { id: 'oidc-discovery', title: 'OIDC Discovery' },
  { id: 'pkce-flow', title: 'PKCE Flow' },
  { id: 'api-endpoints', title: 'API Endpoints' },
  { id: 'tokens', title: 'Token Details' },
];

export default function OAuthIntegrationGuide() {
  const [activeId, setActiveId] = useState('quick-start');

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
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-0 py-10 pl-8 pr-4 h-screen">
            <Link 
              href="/dashboard-test"
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Link>

            <nav className="mt-10">
              <div className="space-y-0.5">
                {sections.map(({ id, title }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`block py-1.5 text-sm transition-colors ${
                      activeId === id
                        ? 'text-primary'
                        : 'text-muted hover:text-primary'
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
            <div className="mb-12">
              <h1 className="text-3xl font-medium text-primary mb-3">OAuth 2.0 Integration Guide</h1>
              <p className="text-muted text-lg">A comprehensive guide to integrating with our OAuth 2.0 and OpenID Connect authentication service.</p>
            </div>

            <div className="space-y-16">
              {/* Quick Start */}
              <Section id="quick-start" title="Quick Start">
                <p className="text-muted mb-6">Get your first Access Token in under 30 minutes.</p>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="text-base font-medium text-primary mb-3">1. Register Your Application</h3>
                    <p className="text-muted mb-4">
                      Register your application in the <Link href="/dashboard-test" className="text-primary hover:underline">OAuth Applications</Link> dashboard to get started.
                    </p>
                    <ul className="space-y-2 text-muted">
                      <li className="flex gap-2"><span className="text-primary">•</span>Application Name - The name users will see during authorization</li>
                      <li className="flex gap-2"><span className="text-primary">•</span>Redirect URI - Where users are redirected after authorization (HTTPS required)</li>
                    </ul>
                    <div className="mt-4 p-4 rounded-xl border border-muted bg-surface-l1">
                      <p className="text-sm text-muted">
                        <span className="font-medium text-primary">Security:</span> Never expose Client Secret in frontend code. For SPAs and mobile apps, use PKCE flow.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-medium text-primary mb-3">2. Initiate Authorization</h3>
                    <p className="text-muted mb-4">Redirect users to our authorization endpoint:</p>
                    <CodeBlock 
                      language="http"
                      code={`GET /api/oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  scope=openid profile email&
  state=RANDOM_STRING&
  code_challenge=PKCE_CODE_CHALLENGE&
  code_challenge_method=S256`}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-medium text-primary mb-3">3. Exchange Code for Token</h3>
                    <p className="text-muted mb-4">After user authorization, exchange the code for tokens:</p>
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
              <Section id="architecture" title="Architecture">
                <p className="text-muted mb-6">Our authentication system is built on a modular, layered architecture.</p>
                <div className="grid gap-4">
                  {[
                    { title: 'Authorization Server', desc: 'Handles user authentication, authorization requests, and token issuance' },
                    { title: 'Token Service', desc: 'Manages Access Token and Refresh Token lifecycle' },
                    { title: 'User Service', desc: 'Manages user identities and third-party account bindings' },
                    { title: 'Security Service', desc: 'Provides 2FA, device fingerprinting, and session monitoring' },
                  ].map((item) => (
                    <div key={item.title} className="p-4 rounded-xl border border-muted hover:bg-overlay-hover transition-colors">
                      <h4 className="font-medium text-primary mb-1">{item.title}</h4>
                      <p className="text-sm text-muted">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* OIDC Discovery */}
              <Section id="oidc-discovery" title="OIDC Discovery">
                <p className="text-muted mb-4">We support the OIDC Discovery specification for simplified client configuration.</p>
                <CodeBlock 
                  language="http"
                  code="GET /.well-known/openid-configuration"
                />
                <p className="text-muted mt-4">Returns configuration including:</p>
                <ul className="mt-2 space-y-1 text-muted text-sm">
                  <li><code className="font-mono text-primary">issuer</code> - Issuer URL</li>
                  <li><code className="font-mono text-primary">authorization_endpoint</code> - Authorization endpoint</li>
                  <li><code className="font-mono text-primary">token_endpoint</code> - Token endpoint</li>
                  <li><code className="font-mono text-primary">userinfo_endpoint</code> - User info endpoint</li>
                  <li><code className="font-mono text-primary">jwks_uri</code> - JSON Web Key Set URL</li>
                </ul>
              </Section>

              {/* PKCE Flow */}
              <Section id="pkce-flow" title="PKCE Flow">
                <p className="text-muted mb-6">For maximum security, we recommend using PKCE for all application types.</p>
                
                <div className="space-y-4 mb-8">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-l1 flex items-center justify-center text-xs text-muted">1</div>
                    <div>
                      <p className="text-primary text-sm">Generate code_verifier</p>
                      <p className="text-xs text-muted">High-entropy random string</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-l1 flex items-center justify-center text-xs text-muted">2</div>
                    <div>
                      <p className="text-primary text-sm">Create code_challenge</p>
                      <p className="text-xs text-muted">SHA-256 hash, then Base64Url encode</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-l1 flex items-center justify-center text-xs text-muted">3</div>
                    <div>
                      <p className="text-primary text-sm">Include in authorization request</p>
                      <p className="text-xs text-muted">Send code_challenge with method S256</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-l1 flex items-center justify-center text-xs text-muted">4</div>
                    <div>
                      <p className="text-primary text-sm">Exchange with code_verifier</p>
                      <p className="text-xs text-muted">Server verifies by hashing and comparing</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-medium text-primary mb-3">JavaScript Implementation</h3>
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
              <Section id="api-endpoints" title="API Endpoints">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">Authorization Endpoint</h3>
                    <code className="text-sm font-mono text-muted">GET /api/oauth/authorize</code>
                    <ParamTable params={[
                      { name: 'response_type', type: 'string', desc: 'Must be "code"', required: true },
                      { name: 'client_id', type: 'string', desc: 'Your application Client ID', required: true },
                      { name: 'redirect_uri', type: 'string', desc: 'Callback URL after authorization', required: true },
                      { name: 'scope', type: 'string', desc: 'Space-separated scopes (e.g., openid profile email)', required: true },
                      { name: 'state', type: 'string', desc: 'Random string for CSRF protection' },
                      { name: 'code_challenge', type: 'string', desc: 'PKCE challenge code' },
                      { name: 'code_challenge_method', type: 'string', desc: 'Must be "S256"' },
                    ]} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">Token Endpoint</h3>
                    <code className="text-sm font-mono text-muted">POST /api/oauth/token</code>
                    <ParamTable params={[
                      { name: 'grant_type', type: 'string', desc: '"authorization_code" or "refresh_token"', required: true },
                      { name: 'code', type: 'string', desc: 'Authorization code from callback', required: true },
                      { name: 'redirect_uri', type: 'string', desc: 'Must match authorization request', required: true },
                      { name: 'client_id', type: 'string', desc: 'Your Client ID', required: true },
                      { name: 'client_secret', type: 'string', desc: 'Your Client Secret' },
                      { name: 'code_verifier', type: 'string', desc: 'Original PKCE verifier' },
                    ]} />
                    
                    <h4 className="text-sm text-muted mt-6 mb-3">Success Response</h4>
                    <CodeBlock 
                      language="json"
                      code={`{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "def502005c0e1b...",
  "id_token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}`}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-primary mb-2">User Info Endpoint</h3>
                    <code className="text-sm font-mono text-muted">GET /api/oauth/userinfo</code>
                    <p className="text-muted text-sm mt-2 mb-4">Requires Bearer token in Authorization header.</p>
                    <CodeBlock 
                      language="json"
                      code={`{
  "sub": "user_unique_identifier",
  "username": "johndoe",
  "email": "john@example.com",
  "email_verified": true
}`}
                    />
                  </div>
                </div>
              </Section>

              {/* Token Details */}
              <Section id="tokens" title="Token Details">
                <div className="space-y-4">
                  {[
                    { 
                      title: 'Access Token', 
                      format: 'JWT (RS256)',
                      purpose: 'Credential for accessing protected resources',
                      lifecycle: 'Short-lived (1 hour recommended)',
                      storage: 'Client memory, avoid Local Storage'
                    },
                    { 
                      title: 'Refresh Token', 
                      format: 'Opaque encrypted string',
                      purpose: 'Obtain new Access Token without re-authentication',
                      lifecycle: 'Long-lived (15 days), rotated on each use',
                      storage: 'Server-side httpOnly, secure, sameSite=strict Cookie'
                    },
                    { 
                      title: 'ID Token', 
                      format: 'JWT (OIDC specification)',
                      purpose: 'Verify user identity on client side',
                      lifecycle: 'Same as Access Token',
                      storage: 'Client memory'
                    },
                  ].map((token) => (
                    <div key={token.title} className="p-4 rounded-xl border border-muted">
                      <h4 className="text-sm font-medium text-primary mb-3">{token.title}</h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted">Format</span>
                          <span className="text-regular">{token.format}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Purpose</span>
                          <span className="text-regular text-right max-w-[60%]">{token.purpose}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Lifecycle</span>
                          <span className="text-regular text-right max-w-[60%]">{token.lifecycle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Storage</span>
                          <span className="text-regular text-right max-w-[60%]">{token.storage}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-muted">
              <p className="text-sm text-muted">
                Need help? Contact us at <a href="mailto:shuakami@sdjz.wiki" className="text-primary hover:underline">shuakami@sdjz.wiki</a>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
