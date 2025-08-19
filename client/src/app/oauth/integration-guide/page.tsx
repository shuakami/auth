'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
  Copy, Check, ExternalLink, Code, Shield, Users, Globe, Key, Server, Smartphone, Monitor,
  Zap, Lock, RefreshCw, GitBranch, Package, CheckCircle, Settings, Terminal, Layers, Network, Database
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// =======================================================================================
// 主文档内容 (Markdown 格式)
// =======================================================================================
const markdownContent = `
# 统一身份认证 (OAuth 2.0 / OIDC) 集成指南

我们的统一身份认证服务 (Auth) 是一个实现了 OAuth 2.0 和 OpenID Connect (OIDC) 核心规范的企业级身份解决方案。它旨在为您的应用提供安全、可靠且可扩展的单点登录 (SSO) 和 API 授权能力。本指南将帮助您深入理解其工作原理，并快速将其集成到您的业务中。

---

## 快速开始

在 30 分钟内，您可以完成从注册应用到获取第一个 Access Token 的全过程。

### 步骤 1: 注册您的应用

在开始之前，您需要在控制台的 [OAuth 应用管理](/dashboard) 页面注册您的应用。

- **应用名称**: 用户在授权页面看到的名称 (例如: “Acme 公司”)。
- **应用类型**:
    - **Web 应用**: 运行在服务器端的传统 Web 应用 (例如: Node.js, Python, Java)。
    - **单页应用 (SPA)**: 运行在浏览器端的 JavaScript 应用 (例如: React, Vue, Angular)。
    - **移动/桌面应用**: 原生移动或桌面客户端。
- **重定向 URI**: 用户授权后，我们将把用户重定向到此 URL。**这是安全流程中最关键的配置之一**，请确保使用 HTTPS 协议，并且域名尽可能精确。

注册成功后，您将获得一个 **Client ID** 和一个 **Client Secret**。

> **安全警告**
> \`Client Secret\` 是极其敏感的凭证，**绝对不能**暴露在任何前端代码或不安全的环境中。对于 SPA 或移动应用，请始终使用 PKCE 流程，该流程不需要 \`Client Secret\`。

### 步骤 2: 发起授权请求

您的应用需要引导用户跳转到我们的授权端点。

\`\`\`http
GET /api/oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  scope=openid profile email&
  state=RANDOM_STRING&
  code_challenge=PKCE_CODE_CHALLENGE&
  code_challenge_method=S256
\`\`\`

### 步骤 3: 交换授权码获取令牌

用户授权后，我们会携带 \`code\` 和 \`state\` 参数重定向回您的 \`redirect_uri\`。您的后端服务需要用此 \`code\` 向令牌端点发起请求。

\`\`\`bash
curl --request POST 'https://your-auth-server.com/api/oauth/token' \\
--header 'Content-Type: application/x-www-form-urlencoded' \\
--data-urlencode 'grant_type=authorization_code' \\
--data-urlencode 'code=CODE_FROM_CALLBACK' \\
--data-urlencode 'redirect_uri=YOUR_REDIRECT_URI' \\
--data-urlencode 'client_id=YOUR_CLIENT_ID' \\
--data-urlencode 'client_secret=YOUR_CLIENT_SECRET' \\
--data-urlencode 'code_verifier=PKCE_CODE_VERIFIER'
\`\`\`

成功后，您将收到包含 \`access_token\` 和 \`refresh_token\` 的 JSON 响应。

---

## 核心架构

我们的认证系统基于模块化和分层设计，确保高可用、高安全和易于扩展。

![架构图](https://your-image-url/architecture.png "我们的系统由客户端、认证服务器、资源服务器和数据库层组成。")

- **认证服务器**: 系统的核心，处理用户认证、授权请求、令牌签发与验证。
- **令牌服务**: 负责 Access Token 和 Refresh Token 的生命周期管理，包括生成、轮换和吊销。
- **用户服务**: 管理用户身份信息和第三方账号绑定。
- **安全服务**: 提供 2FA、设备指纹、会话监控等高级安全功能。

---

## 授权码 + PKCE 流程

为了达到最高的安全性，我们强烈推荐所有类型的应用（特别是 SPA 和移动应用）使用 **带 PKCE (Proof Key for Code Exchange) 的授权码流程**。

### 流程详解

1.  **客户端**: 生成一个高熵随机字符串 \`code_verifier\`。
2.  **客户端**: 使用 SHA-256 哈希 \`code_verifier\`，然后进行 Base64Url 编码，生成 \`code_challenge\`。
3.  **客户端**: 在发起授权请求时，带上 \`code_challenge\` 和 \`code_challenge_method=S256\` 参数。
4.  **认证服务器**: 存储 \`code_challenge\`，并将用户重定向回客户端，并附上 \`authorization_code\`。
5.  **客户端**: 向令牌端点发起请求，除了 \`authorization_code\` 外，还需附上原始的 \`code_verifier\`。
6.  **认证服务器**: 验证 \`code_verifier\`，方法是执行与客户端相同的哈希和编码操作，然后与之前存储的 \`code_challenge\` 进行比较。
7.  **认证服务器**: 如果验证通过，则返回令牌；否则，拒绝请求。

这个流程确保了即使 \`authorization_code\` 在传输过程中被截获，攻击者没有原始的 \`code_verifier\`，也无法用它来交换令牌。

### 代码实现 (JavaScript)

\`\`\`javascript
// 1. 生成 Verifier 和 Challenge
async function generatePkce() {
  const verifier = window.btoa(String.fromCharCode(...window.crypto.getRandomValues(new Uint8Array(32))));
  
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  const challenge = window.btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=/g, '');

  return { verifier, challenge };
}

// 2. 在发起授权时使用
const { verifier, challenge } = await generatePkce();
sessionStorage.setItem('code_verifier', verifier);

const authUrl = \`\${AUTH_SERVER}/authorize?...\&code_challenge=\${challenge}\&code_challenge_method=S256\`;
window.location.assign(authUrl);

// 3. 在令牌交换时使用
const codeVerifier = sessionStorage.getItem('code_verifier');
const response = await fetch(\`\${AUTH_SERVER}/token\`, {
  method: 'POST',
  body: new URLSearchParams({
    // ...其他参数
    code_verifier: codeVerifier,
  })
});
\`\`\`

---

## API 端点参考

所有 API 端点都遵循 RESTful 设计原则和标准的 HTTP 响应码。

### 授权端点

\`GET /api/oauth/authorize\`

此端点用于启动 OAuth 2.0 流程，并将用户重定向到登录和授权页面。

| 参数 | 类型 | 描述 | 是否必需 |
| :--- | :--- | :--- | :--- |
| \`response_type\` | string | 必须为 \`code\`。 | **是** |
| \`client_id\` | string | 您的应用 Client ID。 | **是** |
| \`redirect_uri\` | string | 授权后的回调 URL。必须与您应用设置中注册的 URL 完全匹配。 | **是** |
| \`scope\` | string | 以空格分隔的权限范围列表 (e.g., \`openid profile email\`)。 | **是** |
| \`state\` | string | 用于防止 CSRF 攻击的随机字符串。认证服务器将原样返回此值。 | **推荐** |
| \`code_challenge\`| string | PKCE 流程中的挑战码。 | **推荐** |
| \`code_challenge_method\` | string | 必须为 \`S256\`。 | **推荐** |

### 令牌端点

\`POST /api/oauth/token\`

此端点用于交换授权码获取令牌，或使用刷新令牌获取新的访问令牌。请求体必须为 \`application/x-www-form-urlencoded\` 格式。

**授权码交换**

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| \`grant_type\` | string | 必须为 \`authorization_code\`。 |
| \`code\` | string | 从授权端点回调中获取的授权码。 |
| \`redirect_uri\` | string | 必须与发起授权请求时使用的 \`redirect_uri\` 相同。 |
| \`client_id\` | string | 您的应用 Client ID。 |
| \`client_secret\` | string | 您的应用 Client Secret (仅用于 Web 服务器应用)。 |
| \`code_verifier\` | string | PKCE 流程中的原始验证码。 |

**刷新令牌**

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| \`grant_type\` | string | 必须为 \`refresh_token\`。 |
| \`refresh_token\` | string | 用于获取新访问令牌的刷新令牌。 |
| \`client_id\` | string | 您的应用 Client ID。 |
| \`client_secret\` | string | 您的应用 Client Secret (仅用于 Web 服务器应用)。 |


**成功响应**

\`\`\`json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "def502005c0e1b...",
  "id_token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "Bearer",
  "expires_in": 600,
  "scope": "openid profile email"
}
\`\`\`

### 用户信息端点

\`GET /api/oauth/userinfo\`

此端点使用 \`access_token\` 获取已授权用户的基本信息。

**请求头**

\`\`\`http
Authorization: Bearer YOUR_ACCESS_TOKEN
\`\`\`

**成功响应**

\`\`\`json
{
  "sub": "user_unique_identifier",
  "name": "张三",
  "username": "zhangsan",
  "picture": "https://example.com/avatar.jpg",
  "email": "zhangsan@example.com",
  "email_verified": true
}
\`\`\`

---

## 令牌详解

我们的系统签发三种类型的令牌，每种都有其独特的用途和生命周期。

### Access Token

- **格式**: JWT (JSON Web Token)，使用 RS256 算法签名。
- **用途**: 作为访问受保护资源（例如 \`/userinfo\` API）的凭证。
- **生命周期**: **短暂** (推荐 10-15 分钟)，以降低泄露风险。
- **存储**: 应存储在客户端的内存中，避免使用 Local Storage。

### Refresh Token

- **格式**: 不透明的加密字符串。
- **用途**: 在 Access Token 过期后，安全地获取新的 Access Token，而无需用户重新登录。
- **生命周期**: **较长** (例如 30 天)，但每次使用都会进行**轮换**。
- **安全特性**:
    - **轮换 (Rotation)**: 每次使用后，旧的 Refresh Token 都会失效，并返回一个新的 Refresh Token。
    - **盗用检测**: 如果一个已被使用的 Refresh Token 再次被使用，系统会判定为令牌泄露，并立即吊销该令牌及其所有后代令牌，强制用户下线。
- **存储**: 必须安全存储。对于 Web 应用，应存储在服务端的 \`httpOnly\`, \`secure\`, \`sameSite=strict\` Cookie 中。

### ID Token

- **格式**: JWT (OIDC 规范)。
- **用途**: 仅用于在客户端验证用户的身份信息，**不应用于** API 授权。
- **内容**: 包含用户的唯一标识符(\`sub\`)、签发者(\`iss\`)、客户端ID(\`aud\`)以及用户的基本资料(\`name\`, \`email\`等)。

`;

// =======================================================================================
// React 组件定义
// =======================================================================================
export default function OAuthIntegrationGuide() {
  const [activeId, setActiveId] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const headings = useMemo(() => {
    const matches = Array.from(markdownContent.matchAll(/^## (.*)$/gm));
    return matches.map(match => ({
      id: match[1].toLowerCase().replace(/\s/g, '-').replace(/[+]/g, 'plus'),
      text: match[1]
    }));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      let foundId = '';
      headings.forEach(({ id }) => {
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
  }, [headings]);
  
  const CustomCodeBlock = ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : 'bash';
    const code = String(children).replace(/\n$/, '');
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };

    return (
      <div className="relative my-6 rounded-xl border border-neutral-200/50 dark:border-white/10 shadow-md">
        <div className="flex items-center justify-between bg-neutral-100/50 dark:bg-zinc-800/50 px-4 py-2 rounded-t-xl border-b border-neutral-200/50 dark:border-white/10">
          <span className="text-xs font-mono text-neutral-500 dark:text-zinc-400">{lang}</span>
          <button onClick={handleCopy} className="text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-white transition-colors">
            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <SyntaxHighlighter
          style={atomDark}
          language={lang}
          customStyle={{
            margin: 0,
            padding: '1rem',
            backgroundColor: '#1E1E1E', // Vercel-like dark background
            borderBottomLeftRadius: '0.75rem',
            borderBottomRightRadius: '0.75rem',
            fontSize: '0.875rem'
          }}
          codeTagProps={{
            style: {
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  };
  
  const components = {
    h1: ({ node, ...props }: any) => <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-8 pb-4 border-b border-neutral-200 dark:border-zinc-800" {...props} />,
    h2: ({ node, ...props }: any) => {
      const id = String(props.children).toLowerCase().replace(/\s/g, '-').replace(/[+]/g, 'plus');
      return <h2 id={id} className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mt-12 mb-6 scroll-mt-24" {...props} />;
    },
    h3: ({ node, ...props }: any) => <h3 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mt-8 mb-4" {...props} />,
    p: ({ node, ...props }: any) => <p className="leading-7 text-neutral-600 dark:text-zinc-400 my-4" {...props} />,
    a: ({ node, ...props }: any) => <a className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 my-4 space-y-2 text-neutral-600 dark:text-zinc-400" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 my-4 space-y-2 text-neutral-600 dark:text-zinc-400" {...props} />,
    li: ({ node, ...props }: any) => <li className="pl-2" {...props} />,
    blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-neutral-500 dark:text-zinc-500 my-6" {...props} />,
    code: ({ node, className, children, ...props }: any) => {
      if (className) {
        return <CustomCodeBlock className={className} {...props}>{children}</CustomCodeBlock>;
      }
      return <code className="bg-neutral-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-mono text-sm px-1.5 py-1 rounded-md" {...props}>{children}</code>;
    },
    hr: ({ node, ...props }: any) => <hr className="my-12 border-neutral-200 dark:border-zinc-800" {...props} />,
    table: ({ node, ...props }: any) => <div className="overflow-x-auto my-6"><table className="w-full text-sm border-collapse" {...props} /></div>,
    thead: ({ node, ...props }: any) => <thead className="bg-neutral-50 dark:bg-zinc-800/50" {...props} />,
    th: ({ node, ...props }: any) => <th className="px-4 py-2 border border-neutral-200 dark:border-zinc-700 font-semibold text-left" {...props} />,
    td: ({ node, ...props }: any) => <td className="px-4 py-2 border border-neutral-200 dark:border-zinc-700" {...props} />,
  };

  return (
    <div className="bg-white dark:bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-neutral-200 dark:border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Shield className="w-7 h-7 text-indigo-600" />
              <h1 className="text-md font-semibold text-zinc-800 dark:text-white">集成指南</h1>
            </div>
            <Link href="/dashboard" className="text-sm text-neutral-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2">
              返回控制台 <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
          
          {/* Left Sidebar (placeholder for future main nav) */}
          <div className="hidden lg:block lg:col-span-2"></div>
          
          {/* Center Content */}
          <main ref={contentRef} className="lg:col-span-7 py-12">
            <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
              {markdownContent}
            </ReactMarkdown>
          </main>
          
          {/* Right Sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-28 py-12">
              <h3 className="font-semibold text-sm mb-4 text-zinc-800 dark:text-white">On this page</h3>
              <ul className="space-y-2 text-sm">
                {headings.map(({ id, text }) => (
                  <li key={id}>
                    <a 
                      href={`#${id}`}
                      className={`block pl-4 border-l-2 transition-colors ${
                        activeId === id 
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold' 
                        : 'border-neutral-200 dark:border-zinc-700 text-neutral-500 dark:text-zinc-400 hover:border-neutral-400 dark:hover:border-zinc-500 hover:text-neutral-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}