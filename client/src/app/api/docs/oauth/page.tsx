'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Code, Shield, Users, Globe } from 'lucide-react';

export default function OAuthDocumentation() {
  const [copiedCode, setCopiedCode] = useState<string>('');

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const CodeBlock = ({ 
    children, 
    language = 'javascript', 
    id,
    title 
  }: { 
    children: string; 
    language?: string;
    id: string;
    title?: string;
  }) => (
    <div className="relative">
      {title && (
        <div className="flex items-center justify-between bg-neutral-100 dark:bg-zinc-800 px-4 py-2 rounded-t-lg border-b border-neutral-200 dark:border-zinc-700">
          <span className="text-sm font-medium text-neutral-700 dark:text-zinc-300">{title}</span>
          <span className="text-xs text-neutral-500 dark:text-zinc-400">{language}</span>
        </div>
      )}
      <div className={`relative bg-neutral-50 dark:bg-zinc-900 ${title ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <button
          onClick={() => copyToClipboard(children, id)}
          className="absolute top-3 right-3 p-2 rounded-md bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-700 transition-colors"
        >
          {copiedCode === id ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-neutral-600 dark:text-zinc-400" />
          )}
        </button>
        <pre className="p-4 text-sm overflow-x-auto">
          <code className="text-neutral-800 dark:text-zinc-200">{children}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100">
      {/* 顶部导航 */}
      <nav className="border-b border-neutral-200 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-lg font-semibold">OAuth2/OIDC 开发者文档</h1>
                <p className="text-sm text-neutral-500 dark:text-zinc-400">集成单点登录功能到您的应用</p>
              </div>
            </div>
            <a 
              href="/dashboard" 
              className="text-sm text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              返回控制台
            </a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* 侧边导航 */}
          <nav className="space-y-2">
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-zinc-100 mb-2">快速开始</h3>
              <ul className="space-y-1">
                <li><a href="#overview" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">概述</a></li>
                <li><a href="#register" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">注册应用</a></li>
                <li><a href="#flow" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">授权流程</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-zinc-100 mb-2">API 参考</h3>
              <ul className="space-y-1">
                <li><a href="#endpoints" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">端点</a></li>
                <li><a href="#tokens" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">Token 格式</a></li>
                <li><a href="#scopes" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">权限范围</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-zinc-100 mb-2">示例代码</h3>
              <ul className="space-y-1">
                <li><a href="#javascript" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">JavaScript</a></li>
                <li><a href="#python" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">Python</a></li>
                <li><a href="#nodejs" className="block px-3 py-2 text-sm text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md">Node.js</a></li>
              </ul>
            </div>
          </nav>

          {/* 主要内容 */}
          <div className="lg:col-span-3 space-y-12">
            {/* 概述 */}
            <section id="overview">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Globe className="w-6 h-6 text-indigo-600" />
                OAuth2/OIDC 概述
              </h2>
              
              <div className="space-y-4 text-neutral-600 dark:text-zinc-400">
                <p>
                  我们的认证系统支持标准的 OAuth2.0 和 OpenID Connect (OIDC) 协议，
                  让您可以轻松地将单点登录 (SSO) 功能集成到您的应用中。
                </p>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      OAuth2.0 支持
                    </h3>
                    <ul className="text-sm space-y-2">
                      <li>• 授权码流程 (Authorization Code Flow)</li>
                      <li>• 刷新令牌 (Refresh Tokens)</li>
                      <li>• PKCE 支持 (移动端安全)</li>
                      <li>• 自定义权限范围</li>
                    </ul>
                  </div>
                  
                  <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      OpenID Connect
                    </h3>
                    <ul className="text-sm space-y-2">
                      <li>• 用户信息端点</li>
                      <li>• ID Token (JWT 格式)</li>
                      <li>• 标准声明 (Claims)</li>
                      <li>• 发现端点</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* 注册应用 */}
            <section id="register">
              <h2 className="text-2xl font-bold mb-6">1. 注册您的应用</h2>
              
              <div className="space-y-4 text-neutral-600 dark:text-zinc-400">
                <p>
                  在开始集成之前，您需要在控制台中注册您的应用程序：
                </p>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-blue-900 dark:text-blue-200 font-medium mb-2">注册步骤</h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>1. 在控制台中点击"创建应用"</li>
                    <li>2. 填写应用名称和描述</li>
                    <li>3. 选择应用类型（Web/移动/桌面/服务端）</li>
                    <li>4. 配置重定向URI</li>
                    <li>5. 选择所需的权限范围</li>
                    <li>6. 获取 Client ID 和 Client Secret</li>
                  </ol>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="text-amber-900 dark:text-amber-200 font-medium mb-2">重要提醒</h4>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    请妥善保管您的 Client Secret，不要在客户端代码中硬编码或公开暴露。
                  </p>
                </div>
              </div>
            </section>

            {/* 授权流程 */}
            <section id="flow">
              <h2 className="text-2xl font-bold mb-6">2. OAuth2 授权流程</h2>
              
              <div className="space-y-6">
                <div className="bg-neutral-50 dark:bg-zinc-900 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">授权码流程图</h3>
                  <div className="bg-white dark:bg-zinc-800 rounded border border-neutral-200 dark:border-zinc-700 p-4">
                    <pre className="text-sm text-neutral-600 dark:text-zinc-400 overflow-x-auto">
{`
客户端应用        认证服务器        资源服务器
     |                |                |
     |  1. 跳转到授权页面  |                |
     |─────────────→    |                |
     |                |                |
     |  2. 用户登录授权    |                |
     |                |                |
     |  3. 返回授权码      |                |
     |←─────────────    |                |
     |                |                |
     |  4. 用授权码换取Token |               |
     |─────────────→    |                |
     |                |                |
     |  5. 返回 Access Token |            |
     |←─────────────    |                |
     |                |                |
     |  6. 使用 Token 访问 API            |
     |──────────────────────────────────→|
     |                |                |
     |  7. 返回用户数据                    |
     |←──────────────────────────────────|
`}
                    </pre>
                  </div>
                </div>
              </div>
            </section>

            {/* API 端点 */}
            <section id="endpoints">
              <h2 className="text-2xl font-bold mb-6">3. API 端点</h2>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">授权端点</h3>
                  <CodeBlock id="auth-endpoint" title="GET /oauth/authorize">
{`GET /oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  scope=openid profile email&
  state=RANDOM_STATE_STRING`}
                  </CodeBlock>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Token 端点</h3>
                  <CodeBlock id="token-endpoint" title="POST /oauth/token">
{`POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
redirect_uri=YOUR_REDIRECT_URI`}
                  </CodeBlock>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">用户信息端点</h3>
                  <CodeBlock id="userinfo-endpoint" title="GET /oauth/userinfo">
{`GET /oauth/userinfo
Authorization: Bearer ACCESS_TOKEN`}
                  </CodeBlock>
                </div>
              </div>
            </section>

            {/* JavaScript 示例 */}
            <section id="javascript">
              <h2 className="text-2xl font-bold mb-6">4. JavaScript 集成示例</h2>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">前端跳转到授权页面</h3>
                  <CodeBlock id="js-auth" language="javascript" title="client.js">
{`// 配置信息
const CLIENT_ID = 'your_client_id';
const REDIRECT_URI = 'https://yourapp.com/auth/callback';
const SCOPE = 'openid profile email';

// 生成随机状态字符串
function generateState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// 跳转到授权页面
function initiateOAuth() {
  const state = generateState();
  localStorage.setItem('oauth_state', state);
  
  const authUrl = new URL('/oauth/authorize', window.location.origin);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPE);
  authUrl.searchParams.set('state', state);
  
  window.location.href = authUrl.toString();
}

// 处理授权回调
function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const storedState = localStorage.getItem('oauth_state');
  
  // 验证状态参数
  if (state !== storedState) {
    throw new Error('Invalid state parameter');
  }
  
  if (code) {
    exchangeCodeForToken(code);
  }
}

// 用授权码换取访问令牌
async function exchangeCodeForToken(code) {
  const response = await fetch('/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: CLIENT_ID,
      client_secret: 'YOUR_CLIENT_SECRET', // 注意：不要在前端暴露
      redirect_uri: REDIRECT_URI,
    }),
  });
  
  const data = await response.json();
  
  if (data.access_token) {
    // 保存令牌
    localStorage.setItem('access_token', data.access_token);
    getUserInfo(data.access_token);
  }
}

// 获取用户信息
async function getUserInfo(accessToken) {
  const response = await fetch('/oauth/userinfo', {
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
    },
  });
  
  const userInfo = await response.json();
  console.log('用户信息:', userInfo);
}`}
                  </CodeBlock>
                </div>
              </div>
            </section>

            {/* Node.js 示例 */}
            <section id="nodejs">
              <h2 className="text-2xl font-bold mb-6">5. Node.js 后端集成</h2>
              
              <div className="space-y-6">
                <CodeBlock id="nodejs-example" language="javascript" title="server.js">
{`const express = require('express');
const axios = require('axios');
const app = express();

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/auth/callback';

// 启动授权流程
app.get('/auth', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  req.session.oauth_state = state;
  
  const authUrl = new URL('/oauth/authorize', 'https://your-auth-server.com');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  
  res.redirect(authUrl.toString());
});

// 处理授权回调
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // 验证状态参数
  if (state !== req.session.oauth_state) {
    return res.status(400).send('Invalid state parameter');
  }
  
  try {
    // 用授权码换取访问令牌
    const tokenResponse = await axios.post('/oauth/token', {
      grant_type: 'authorization_code',
      code: code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const { access_token, id_token } = tokenResponse.data;
    
    // 获取用户信息
    const userResponse = await axios.get('/oauth/userinfo', {
      headers: {
        'Authorization': \`Bearer \${access_token}\`,
      },
    });
    
    const userInfo = userResponse.data;
    
    // 处理用户登录逻辑
    req.session.user = userInfo;
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// 中间件：检查用户是否已认证
function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/auth');
  }
}

// 受保护的路由
app.get('/dashboard', requireAuth, (req, res) => {
  res.json({
    message: '欢迎！',
    user: req.session.user,
  });
});

app.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});`}
                </CodeBlock>
              </div>
            </section>

            {/* 权限范围 */}
            <section id="scopes">
              <h2 className="text-2xl font-bold mb-6">6. 权限范围说明</h2>
              
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border border-neutral-200 dark:border-zinc-700 rounded-lg">
                    <thead className="bg-neutral-50 dark:bg-zinc-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                          权限范围
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                          描述
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                          返回数据
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-neutral-200 dark:divide-zinc-700">
                      <tr>
                        <td className="px-6 py-4 text-sm font-mono text-neutral-900 dark:text-zinc-100">openid</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">OpenID Connect 标识</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">sub, iss, aud, exp, iat</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-mono text-neutral-900 dark:text-zinc-100">profile</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">基本资料信息</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">name, username, picture</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-mono text-neutral-900 dark:text-zinc-100">email</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">邮箱地址</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">email, email_verified</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-mono text-neutral-900 dark:text-zinc-100">phone</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">手机号码</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-zinc-400">phone_number, phone_number_verified</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 最佳实践 */}
            <section id="best-practices">
              <h2 className="text-2xl font-bold mb-6">7. 最佳实践与安全建议</h2>
              
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-4">✅ 推荐做法</h3>
                    <ul className="text-sm text-green-800 dark:text-green-300 space-y-2">
                      <li>• 使用 HTTPS 进行所有 OAuth 通信</li>
                      <li>• 验证 state 参数防止 CSRF 攻击</li>
                      <li>• 设置合理的令牌过期时间</li>
                      <li>• 使用 PKCE 增强移动端安全性</li>
                      <li>• 定期轮换 Client Secret</li>
                      <li>• 最小化权限范围请求</li>
                    </ul>
                  </div>
                  
                  <div className="p-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-4">❌ 避免的做法</h3>
                    <ul className="text-sm text-red-800 dark:text-red-300 space-y-2">
                      <li>• 在前端代码中硬编码 Client Secret</li>
                      <li>• 在 URL 中传递敏感信息</li>
                      <li>• 忽略 SSL 证书验证</li>
                      <li>• 使用过长的令牌有效期</li>
                      <li>• 在日志中记录敏感信息</li>
                      <li>• 跳过状态参数验证</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">📚 更多资源</h3>
                  <div className="grid gap-4 md:grid-cols-2 text-sm">
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">官方规范</h4>
                      <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• <a href="https://tools.ietf.org/html/rfc6749" className="hover:underline">RFC 6749: OAuth 2.0</a></li>
                        <li>• <a href="https://openid.net/connect/" className="hover:underline">OpenID Connect</a></li>
                        <li>• <a href="https://tools.ietf.org/html/rfc7636" className="hover:underline">RFC 7636: PKCE</a></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">调试工具</h4>
                      <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• JWT 解码器</li>
                        <li>• OAuth 调试器</li>
                        <li>• Postman 集合</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}