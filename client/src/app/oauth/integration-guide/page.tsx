'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Code, 
  Shield, 
  Users, 
  Globe,
  Key,
  Server,
  Smartphone,
  Monitor,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  BookOpen,
  Zap,
  Lock,
  RefreshCw,
  Settings,
  Eye,
  Clock,
  Database,
  Network,
  Layers,
  FileText,
  Terminal,
  GitBranch,
  Package
} from 'lucide-react';

export default function OAuthIntegrationGuide() {
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [activeSection, setActiveSection] = useState<string>('overview');

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
    title,
    showLineNumbers = false
  }: { 
    children: string; 
    language?: string;
    id: string;
    title?: string;
    showLineNumbers?: boolean;
  }) => (
    <div className="relative mb-6">
      {title && (
        <div className="flex items-center justify-between bg-neutral-100 dark:bg-zinc-800 px-4 py-2 rounded-t-lg border-b border-neutral-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-neutral-600 dark:text-zinc-400" />
            <span className="text-sm font-medium text-neutral-700 dark:text-zinc-300">{title}</span>
          </div>
          <span className="text-xs text-neutral-500 dark:text-zinc-400 bg-neutral-200 dark:bg-zinc-700 px-2 py-1 rounded">
            {language}
          </span>
        </div>
      )}
      <div className={`relative bg-neutral-50 dark:bg-zinc-900 ${title ? 'rounded-b-lg' : 'rounded-lg'} border border-neutral-200 dark:border-zinc-700`}>
        <button
          onClick={() => copyToClipboard(children, id)}
          className="absolute top-3 right-3 p-2 rounded-md bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-700 transition-colors shadow-sm z-10"
          title="复制代码"
        >
          {copiedCode === id ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-neutral-600 dark:text-zinc-400" />
          )}
        </button>
        <pre className="p-4 text-sm overflow-x-auto" style={{ paddingRight: '50px' }}>
          <code className="text-neutral-800 dark:text-zinc-200 font-mono">
            {showLineNumbers ? 
              children.split('\n').map((line, index) => 
                <div key={index} className="table-row">
                  <span className="table-cell text-neutral-400 dark:text-zinc-600 select-none pr-4 text-right w-8">
                    {index + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ) : 
              children
            }
          </code>
        </pre>
      </div>
    </div>
  );

  const InfoBox = ({ 
    type = 'info', 
    title, 
    children 
  }: { 
    type?: 'info' | 'warning' | 'error' | 'success' | 'tip';
    title: string;
    children: React.ReactNode;
  }) => {
    const styles = {
      info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
        titleColor: 'text-blue-900 dark:text-blue-200',
        textColor: 'text-blue-800 dark:text-blue-300'
      },
      warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        icon: <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        titleColor: 'text-amber-900 dark:text-amber-200',
        textColor: 'text-amber-800 dark:text-amber-300'
      },
      error: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
        titleColor: 'text-red-900 dark:text-red-200',
        textColor: 'text-red-800 dark:text-red-300'
      },
      success: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
        titleColor: 'text-green-900 dark:text-green-200',
        textColor: 'text-green-800 dark:text-green-300'
      },
      tip: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        icon: <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
        titleColor: 'text-purple-900 dark:text-purple-200',
        textColor: 'text-purple-800 dark:text-purple-300'
      }
    };

    const style = styles[type];

    return (
      <div className={`rounded-lg p-4 mb-6 ${style.bg} ${style.border} border`}>
        <div className="flex items-start gap-3">
          {style.icon}
          <div className="flex-1">
            <h4 className={`font-semibold ${style.titleColor} mb-2`}>{title}</h4>
            <div className={`text-sm ${style.textColor}`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sections = [
    { id: 'overview', label: '系统概述', icon: Globe },
    { id: 'architecture', label: '架构设计', icon: Layers },
    { id: 'getting-started', label: '快速开始', icon: Zap },
    { id: 'oauth-flow', label: 'OAuth2 流程', icon: GitBranch },
    { id: 'endpoints', label: 'API 端点', icon: Network },
    { id: 'security', label: '安全特性', icon: Lock },
    { id: 'tokens', label: '令牌管理', icon: Key },
    { id: 'scopes', label: '权限范围', icon: Shield },
    { id: 'examples', label: '代码示例', icon: Code },
    { id: 'sdk', label: 'SDK 集成', icon: Package },
    { id: 'best-practices', label: '最佳实践', icon: CheckCircle },
    { id: 'troubleshooting', label: '故障排除', icon: Settings },
    { id: 'advanced', label: '高级功能', icon: Terminal }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100">
      {/* 顶部导航 */}
      <nav className="border-b border-neutral-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-lg font-semibold">OAuth2/OIDC 完整集成指南</h1>
                <p className="text-sm text-neutral-500 dark:text-zinc-400">企业级单点登录解决方案</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="text-sm text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                返回控制台
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* 侧边导航 */}
          <nav className="lg:col-span-1 space-y-1">
            <div className="sticky top-24">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      activeSection === section.id
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:text-neutral-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* 主要内容 */}
          <div className="lg:col-span-4 space-y-12">
            {/* 系统概述 */}
            {activeSection === 'overview' && (
              <section id="overview">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                      <Globe className="w-8 h-8 text-indigo-600" />
                      企业级OAuth2/OIDC认证系统
                    </h2>
                    <p className="text-lg text-neutral-600 dark:text-zinc-400 leading-relaxed">
                      我们的统一身份认证系统是一个完整的OAuth2.0和OpenID Connect (OIDC)实现，
                      为企业级应用提供安全、可扩展的单点登录(SSO)解决方案。
                    </p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                      <h3 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-600" />
                        核心特性
                      </h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>完整的OAuth2.0和OIDC支持</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>高级刷新令牌轮换机制</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>PKCE扩展安全支持</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>多因子认证(2FA)集成</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>设备指纹和会话管理</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>企业级安全监控</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                      <h3 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                        <Users className="w-6 h-6 text-green-600" />
                        支持场景
                      </h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <span>Web应用单点登录</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-green-600" />
                          <span>移动应用认证</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-purple-600" />
                          <span>桌面应用集成</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-orange-600" />
                          <span>服务间认证</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Network className="w-4 h-4 text-indigo-600" />
                          <span>API网关集成</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-red-600" />
                          <span>微服务架构</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <InfoBox type="info" title="为什么选择我们的解决方案？">
                    <p className="mb-3">
                      与市面上其他OAuth解决方案相比，我们的系统在安全性、性能和可扩展性方面都有显著优势：
                    </p>
                    <ul className="space-y-1">
                      <li>• <strong>安全优先</strong>：实现了所有OWASP推荐的安全最佳实践</li>
                      <li>• <strong>高性能</strong>：优化的令牌验证和缓存机制，支持高并发</li>
                      <li>• <strong>可扩展</strong>：模块化架构，支持自定义扩展和集成</li>
                      <li>• <strong>合规性</strong>：满足GDPR、SOC2等合规要求</li>
                      <li>• <strong>监控友好</strong>：完整的审计日志和监控指标</li>
                    </ul>
                  </InfoBox>

                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-6 h-6" />
                      准备开始？
                    </h3>
                    <p className="mb-4">
                      我们提供完整的文档、代码示例和技术支持，帮助您快速集成。
                    </p>
                    <button
                      onClick={() => setActiveSection('getting-started')}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-md font-medium hover:bg-neutral-100 transition-colors flex items-center gap-2"
                    >
                      立即开始
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* 架构设计 */}
            {activeSection === 'architecture' && (
              <section id="architecture">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                      <Layers className="w-8 h-8 text-indigo-600" />
                      系统架构设计
                    </h2>
                    <p className="text-lg text-neutral-600 dark:text-zinc-400 leading-relaxed">
                      深入了解我们OAuth2/OIDC系统的架构设计和核心组件。
                    </p>
                  </div>

                  <div className="grid gap-6">
                    <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Network className="w-6 h-6 text-blue-600" />
                        系统架构图
                      </h3>
                      <div className="bg-neutral-50 dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-zinc-700">
                        <pre className="text-sm text-neutral-600 dark:text-zinc-400 overflow-x-auto font-mono">
{`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   客户端应用     │    │   认证服务器     │    │   资源服务器     │
│                │    │                │    │                │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │    Web    │  │    │  │  OAuth2   │  │    │  │    API    │  │
│  │   应用    │◄─┼────┼─►│  端点     │  │    │  │   服务    │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│                │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  ┌───────────┐  │    │  │  Token    │  │    │  │   用户    │  │
│  │   移动    │  │    │  │  管理     │◄─┼────┼─►│   数据    │  │
│  │   应用    │◄─┼────┼─►│           │  │    │  └───────────┘  │
│  └───────────┘  │    │  └───────────┘  │    │                │
│                │    │  ┌───────────┐  │    │                │
│  ┌───────────┐  │    │  │   2FA     │  │    │                │
│  │   桌面    │  │    │  │  验证     │  │    │                │
│  │   应用    │◄─┼────┼─►│           │  │    │                │
│  └───────────┘  │    │  └───────────┘  │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                               │
                    ┌─────────────────┐
                    │   数据库层      │
                    │                │
                    │  ┌───────────┐  │
                    │  │  用户表   │  │
                    │  └───────────┘  │
                    │  ┌───────────┐  │
                    │  │ OAuth应用 │  │
                    │  └───────────┘  │
                    │  ┌───────────┐  │
                    │  │ 令牌管理  │  │
                    │  └───────────┘  │
                    │  ┌───────────┐  │
                    │  │ 会话记录  │  │
                    │  └───────────┘  │
                    └─────────────────┘
`}
                        </pre>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Server className="w-5 h-5 text-green-600" />
                          核心服务组件
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                            <div>
                              <div className="font-medium">OAuth控制器</div>
                              <div className="text-neutral-600 dark:text-zinc-400">处理授权请求和令牌交换</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                            <div>
                              <div className="font-medium">令牌服务</div>
                              <div className="text-neutral-600 dark:text-zinc-400">管理访问令牌和刷新令牌</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                            <div>
                              <div className="font-medium">用户绑定服务</div>
                              <div className="text-neutral-600 dark:text-zinc-400">处理用户账号关联和创建</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                            <div>
                              <div className="font-medium">2FA集成服务</div>
                              <div className="text-neutral-600 dark:text-zinc-400">多因子认证流程管理</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Database className="w-5 h-5 text-indigo-600" />
                          数据模型
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                            <div>
                              <div className="font-medium">oauth_applications</div>
                              <div className="text-neutral-600 dark:text-zinc-400">第三方应用注册信息</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                            <div>
                              <div className="font-medium">oauth_authorization_codes</div>
                              <div className="text-neutral-600 dark:text-zinc-400">授权码临时存储</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-cyan-600 rounded-full mt-2"></div>
                            <div>
                              <div className="font-medium">oauth_access_tokens</div>
                              <div className="text-neutral-600 dark:text-zinc-400">访问令牌管理</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-pink-600 rounded-full mt-2"></div>
                            <div>
                              <div className="font-medium">refresh_tokens</div>
                              <div className="text-neutral-600 dark:text-zinc-400">刷新令牌轮换链</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <InfoBox type="tip" title="架构优势">
                      <p className="mb-2">我们的架构设计具有以下优势：</p>
                      <ul className="space-y-1">
                        <li>• <strong>模块化设计</strong>：各组件职责清晰，易于维护和扩展</li>
                        <li>• <strong>安全隔离</strong>：令牌生成、验证和存储分离，降低安全风险</li>
                        <li>• <strong>高可用</strong>：支持集群部署和负载均衡</li>
                        <li>• <strong>监控友好</strong>：每个组件都有详细的日志和指标</li>
                      </ul>
                    </InfoBox>
                  </div>
                </div>
              </section>
            )}

            {/* 快速开始 */}
            {activeSection === 'getting-started' && (
              <section id="getting-started">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                      <Zap className="w-8 h-8 text-indigo-600" />
                      快速开始指南
                    </h2>
                    <p className="text-lg text-neutral-600 dark:text-zinc-400 leading-relaxed">
                      30分钟内完成OAuth2/OIDC集成，让您的应用支持企业级单点登录。
                    </p>
                  </div>

                  <div className="grid gap-6">
                    <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-blue-600" />
                        步骤1：注册OAuth应用
                      </h3>
                      <div className="space-y-4">
                        <p className="text-neutral-700 dark:text-zinc-300">
                          首先在管理控制台中注册您的应用，获取必要的客户端凭证。
                        </p>
                        
                        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-neutral-200 dark:border-zinc-700">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Key className="w-4 h-4 text-green-600" />
                            必填信息
                          </h4>
                          <div className="grid gap-3 text-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span><strong>应用名称</strong>：您应用的显示名称</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span><strong>应用类型</strong>：Web、移动、桌面或服务端</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span><strong>重定向URI</strong>：授权后的回调地址</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span><strong>权限范围</strong>：需要访问的用户数据</span>
                            </div>
                          </div>
                        </div>

                        <InfoBox type="warning" title="重定向URI安全须知">
                          <ul className="space-y-1">
                            <li>• 必须使用HTTPS协议（生产环境）</li>
                            <li>• 避免使用通配符或过于宽泛的域名</li>
                            <li>• 每个环境（开发、测试、生产）使用不同的URI</li>
                            <li>• 定期审核和更新重定向URI列表</li>
                          </ul>
                        </InfoBox>
                      </div>
                    </div>

                    <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Code className="w-6 h-6 text-green-600" />
                        步骤2：集成认证流程
                      </h3>
                      <div className="space-y-4">
                        <p className="text-neutral-700 dark:text-zinc-300">
                          获取客户端凭证后，在您的应用中实现OAuth2授权流程。
                        </p>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">环境配置</h4>
                            <CodeBlock 
                              id="env-config" 
                              title=".env" 
                              language="bash"
                            >
{`# OAuth2/OIDC 配置
OAUTH_CLIENT_ID=your_client_id_here
OAUTH_CLIENT_SECRET=your_client_secret_here
OAUTH_REDIRECT_URI=https://your-app.com/auth/callback
OAUTH_BASE_URL=https://auth.your-domain.com

# 可选：PKCE支持（推荐用于移动和SPA应用）
OAUTH_USE_PKCE=true`}
                            </CodeBlock>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">基础集成示例</h4>
                            <CodeBlock 
                              id="basic-integration" 
                              title="oauth-client.js" 
                              language="javascript"
                              showLineNumbers={true}
                            >
{`import crypto from 'crypto';

class OAuthClient {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.baseUrl = config.baseUrl;
    this.usePKCE = config.usePKCE || false;
  }

  // 生成授权URL
  getAuthorizationUrl(scopes = ['openid', 'profile', 'email'], state = null) {
    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', this.clientId);
    params.set('redirect_uri', this.redirectUri);
    params.set('scope', scopes.join(' '));
    params.set('state', state || this.generateState());

    // PKCE支持
    if (this.usePKCE) {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      
      // 存储code_verifier（实际应用中应该安全存储）
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    return \`\${this.baseUrl}/oauth/authorize?\${params.toString()}\`;
  }

  // 交换授权码获取令牌
  async exchangeCodeForTokens(code, state = null) {
    const tokenData = {
      grant_type: 'authorization_code',
      code: code,
      client_id: this.clientId,
      redirect_uri: this.redirectUri
    };

    // 添加客户端认证
    if (this.usePKCE) {
      // PKCE流程：使用code_verifier
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
      if (!codeVerifier) {
        throw new Error('缺少code_verifier');
      }
      tokenData.code_verifier = codeVerifier;
      sessionStorage.removeItem('oauth_code_verifier');
    } else {
      // 标准流程：使用client_secret
      tokenData.client_secret = this.clientSecret;
    }

    const response = await fetch(\`\${this.baseUrl}/oauth/token\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(tokenData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(\`令牌交换失败: \${error.error_description || error.error}\`);
    }

    return await response.json();
  }

  // 获取用户信息
  async getUserInfo(accessToken) {
    const response = await fetch(\`\${this.baseUrl}/oauth/userinfo\`, {
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('获取用户信息失败');
    }

    return await response.json();
  }

  // 刷新访问令牌
  async refreshAccessToken(refreshToken) {
    const response = await fetch(\`\${this.baseUrl}/oauth/token\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(\`令牌刷新失败: \${error.error_description || error.error}\`);
    }

    return await response.json();
  }

  // 工具方法
  generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
}`}
                            </CodeBlock>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-purple-600" />
                        步骤3：测试集成
                      </h3>
                      <div className="space-y-4">
                        <p className="text-neutral-700 dark:text-zinc-300">
                          完成基础集成后，测试完整的认证流程确保一切正常工作。
                        </p>

                        <CodeBlock 
                          id="test-integration" 
                          title="test-oauth.js" 
                          language="javascript"
                        >
{`// 初始化OAuth客户端
const oauthClient = new OAuthClient({
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  redirectUri: process.env.OAUTH_REDIRECT_URI,
  baseUrl: process.env.OAUTH_BASE_URL,
  usePKCE: true
});

// 测试流程
async function testOAuthFlow() {
  try {
    // 1. 生成授权URL
    const authUrl = oauthClient.getAuthorizationUrl(
      ['openid', 'profile', 'email'],
      'test-state-123'
    );
    console.log('授权URL:', authUrl);

    // 2. 模拟用户授权后的回调（实际中由浏览器重定向触发）
    // const code = 'authorization_code_from_callback';
    
    // 3. 交换令牌
    // const tokens = await oauthClient.exchangeCodeForTokens(code, 'test-state-123');
    // console.log('获取的令牌:', tokens);

    // 4. 获取用户信息
    // const userInfo = await oauthClient.getUserInfo(tokens.access_token);
    // console.log('用户信息:', userInfo);

    console.log('OAuth集成测试准备完成！');
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testOAuthFlow();`}
                        </CodeBlock>

                        <InfoBox type="success" title="测试检查清单">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>授权URL生成正确</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>用户可以成功授权</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>授权码能正确交换为令牌</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>访问令牌可以获取用户信息</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>刷新令牌工作正常</span>
                            </div>
                          </div>
                        </InfoBox>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-6 text-white">
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-6 h-6" />
                      下一步
                    </h3>
                    <p className="mb-4">
                      基础集成完成后，建议您了解更多高级功能和安全最佳实践。
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setActiveSection('oauth-flow')}
                        className="bg-white text-green-600 px-4 py-2 rounded-md font-medium hover:bg-neutral-100 transition-colors text-sm"
                      >
                        了解OAuth流程
                      </button>
                      <button
                        onClick={() => setActiveSection('security')}
                        className="bg-white text-green-600 px-4 py-2 rounded-md font-medium hover:bg-neutral-100 transition-colors text-sm"
                      >
                        安全最佳实践
                      </button>
                      <button
                        onClick={() => setActiveSection('examples')}
                        className="bg-white text-green-600 px-4 py-2 rounded-md font-medium hover:bg-neutral-100 transition-colors text-sm"
                      >
                        更多代码示例
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* OAuth流程详解 */}
            {activeSection === 'oauth-flow' && (
              <section id="oauth-flow">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                      <GitBranch className="w-8 h-8 text-indigo-600" />
                      OAuth2/OIDC 授权流程详解
                    </h2>
                    <p className="text-lg text-neutral-600 dark:text-zinc-400 leading-relaxed">
                      深入理解OAuth2授权码流程的每个步骤，以及我们系统的具体实现细节。
                    </p>
                  </div>

                  <div className="grid gap-6">
                    <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Network className="w-6 h-6 text-blue-600" />
                        完整流程时序图
                      </h3>
                      <div className="bg-neutral-50 dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-zinc-700 overflow-x-auto">
                        <pre className="text-sm text-neutral-600 dark:text-zinc-400 font-mono whitespace-pre">
{`
    客户端应用              认证服务器              资源服务器              用户
        │                      │                      │                    │
        │  1. 发起授权请求        │                      │                    │
        │─────────────────────→  │                      │                    │
        │                      │                      │                    │
        │  2. 重定向到授权页面     │                      │                    │
        │←─────────────────────  │                      │                    │
        │                      │                      │                    │
        │                      │  3. 显示授权页面       │                    │
        │                      │─────────────────────────────────────────→  │
        │                      │                      │                    │
        │                      │  4. 用户登录并授权      │                    │
        │                      │←─────────────────────────────────────────  │
        │                      │                      │                    │
        │                      │  5. 可选：2FA验证      │                    │
        │                      │←────────────────────→  │                    │
        │                      │                      │                    │
        │  6. 返回授权码         │                      │                    │
        │←─────────────────────  │                      │                    │
        │                      │                      │                    │
        │  7. 用授权码换取令牌    │                      │                    │
        │─────────────────────→  │                      │                    │
        │                      │                      │                    │
        │  8. 返回访问令牌        │                      │                    │
        │←─────────────────────  │                      │                    │
        │                      │                      │                    │
        │  9. 使用令牌访问API                            │                    │
        │─────────────────────────────────────────────→  │                    │
        │                      │                      │                    │
        │  10. 验证令牌          │                      │                    │
        │                      │←─────────────────────  │                    │
        │                      │                      │                    │
        │  11. 返回令牌信息       │                      │                    │
        │                      │─────────────────────→  │                    │
        │                      │                      │                    │
        │  12. 返回用户数据                              │                    │
        │←─────────────────────────────────────────────  │                    │
        │                      │                      │                    │
`}
                        </pre>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-6">
                        <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-blue-50 dark:bg-blue-900/20">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                            发起授权请求
                          </h3>
                          <div className="space-y-3 text-sm">
                            <p className="text-neutral-700 dark:text-zinc-300">
                              客户端应用将用户重定向到认证服务器的授权端点。
                            </p>
                            <CodeBlock id="step1" title="授权请求URL" language="http">
{`GET /oauth/authorize?
  response_type=code&
  client_id=your_client_id&
  redirect_uri=https%3A//your-app.com/callback&
  scope=openid%20profile%20email&
  state=random_state_string&
  code_challenge=challenge&
  code_challenge_method=S256`}
                            </CodeBlock>
                            <div className="space-y-1">
                              <div className="text-xs text-neutral-600 dark:text-zinc-400">
                                <strong>关键参数：</strong>
                              </div>
                              <div className="text-xs space-y-1">
                                <div>• <code>response_type=code</code> - 使用授权码流程</div>
                                <div>• <code>state</code> - 防止CSRF攻击的随机字符串</div>
                                <div>• <code>code_challenge</code> - PKCE扩展的挑战码</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-green-50 dark:bg-green-900/20">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                            用户授权
                          </h3>
                          <div className="space-y-3 text-sm">
                            <p className="text-neutral-700 dark:text-zinc-300">
                              用户在认证服务器上登录并授权应用访问其数据。
                            </p>
                            <div className="bg-white dark:bg-zinc-800 rounded p-3 border border-neutral-200 dark:border-zinc-700">
                              <div className="text-xs text-neutral-600 dark:text-zinc-400 mb-2">授权流程包括：</div>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                  <span>身份验证（用户名/密码）</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                                  <span>2FA验证（如果启用）</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                  <span>权限范围确认</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                  <span>生成授权码</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-purple-50 dark:bg-purple-900/20">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                            令牌交换
                          </h3>
                          <div className="space-y-3 text-sm">
                            <p className="text-neutral-700 dark:text-zinc-300">
                              客户端使用授权码换取访问令牌和刷新令牌。
                            </p>
                            <CodeBlock id="step3" title="令牌请求" language="http">
{`POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
client_id=your_client_id&
client_secret=your_client_secret&
redirect_uri=https://your-app.com/callback&
code_verifier=PKCE_CODE_VERIFIER`}
                            </CodeBlock>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-orange-50 dark:bg-orange-900/20">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                            令牌响应
                          </h3>
                          <div className="space-y-3 text-sm">
                            <p className="text-neutral-700 dark:text-zinc-300">
                              认证服务器返回访问令牌、刷新令牌和ID令牌。
                            </p>
                            <CodeBlock id="step4" title="令牌响应" language="json">
{`{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "def502005c0e1b...",
  "id_token": "eyJ0eXAiOiJKV1Qi...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}`}
                            </CodeBlock>
                            <div className="space-y-1">
                              <div className="text-xs text-neutral-600 dark:text-zinc-400">
                                <strong>令牌说明：</strong>
                              </div>
                              <div className="text-xs space-y-1">
                                <div>• <code>access_token</code> - 访问API的凭证</div>
                                <div>• <code>refresh_token</code> - 刷新访问令牌</div>
                                <div>• <code>id_token</code> - OIDC身份信息</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-cyan-50 dark:bg-cyan-900/20">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="bg-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
                            访问资源
                          </h3>
                          <div className="space-y-3 text-sm">
                            <p className="text-neutral-700 dark:text-zinc-300">
                              使用访问令牌调用受保护的API获取用户数据。
                            </p>
                            <CodeBlock id="step5" title="API调用" language="http">
{`GET /oauth/userinfo
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Accept: application/json`}
                            </CodeBlock>
                            <CodeBlock id="step5-response" title="用户信息响应" language="json">
{`{
  "sub": "248289761001",
  "name": "张三",
  "email": "zhangsan@example.com",
  "email_verified": true,
  "picture": "https://avatar.example.com/user123.jpg",
  "locale": "zh-CN"
}`}
                            </CodeBlock>
                          </div>
                        </div>

                        <div className="p-6 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-pink-50 dark:bg-pink-900/20">
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="bg-pink-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">6</span>
                            令牌刷新
                          </h3>
                          <div className="space-y-3 text-sm">
                            <p className="text-neutral-700 dark:text-zinc-300">
                              访问令牌过期时，使用刷新令牌获取新的访问令牌。
                            </p>
                            <CodeBlock id="step6" title="刷新令牌" language="http">
{`POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=def502005c0e1b...&
client_id=your_client_id&
client_secret=your_client_secret`}
                            </CodeBlock>
                          </div>
                        </div>
                      </div>
                    </div>

                    <InfoBox type="tip" title="流程优化建议">
                      <div className="space-y-2">
                        <p><strong>性能优化：</strong></p>
                        <ul className="space-y-1 ml-4">
                          <li>• 使用token缓存减少验证请求</li>
                          <li>• 实现静默刷新避免用户感知</li>
                          <li>• 合理设置令牌过期时间</li>
                        </ul>
                        <p className="mt-3"><strong>安全增强：</strong></p>
                        <ul className="space-y-1 ml-4">
                          <li>• 始终验证state参数</li>
                          <li>• 使用PKCE扩展增强安全性</li>
                          <li>• 实现令牌绑定到特定设备</li>
                        </ul>
                      </div>
                    </InfoBox>
                  </div>
                </div>
              </section>
            )}

            {/* 其他章节占位符 */}
            {activeSection === 'endpoints' && (
              <section id="endpoints">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                      <Network className="w-8 h-8 text-indigo-600" />
                      API 端点参考
                    </h2>
                    <p className="text-lg text-neutral-600 dark:text-zinc-400 leading-relaxed">
                      完整的OAuth2/OIDC API端点文档，包括请求参数、响应格式和错误代码。
                    </p>
                  </div>
                  
                  <InfoBox type="info" title="开发中">
                    此章节正在完善中，将包含详细的API端点文档。
                  </InfoBox>
                </div>
              </section>
            )}

            
          </div>
        </div>
      </div>
    </div>
  );
}