'use client';
import { useEffect, useState, Suspense, memo, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  Check,
  X,
  User,
  Mail,
  Phone,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Image from 'next/image';
import Footer from '@/components/shared/Footer';

interface UserInfo {
  id: string;
  email: string;
  username: string;
}

async function getMe(): Promise<{ user: UserInfo }> {
  const res = await fetch('/api/me', {
    credentials: 'include', // 确保发送 cookie
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    const errorData = await res.json();
    throw new Error(errorData.error || '获取用户信息失败');
  }
  return res.json();
}

async function postConsent(data: Record<string, unknown>) {
  const res = await fetch('/api/oauth/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // 确保发送 cookie
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || '授权请求失败');
  }
  return res.json();
}

const AuthLayout = ({ leftContent, rightContent }: { leftContent: ReactNode, rightContent: ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-background">
    <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-24 items-center">
        {leftContent}
        {rightContent}
      </div>
    </main>
    <Footer />
  </div>
);

const LeftContent = ({ clientName, user }: { clientName: string | null; user: UserInfo | null }) => {
  const buildSwitchAccountUrl = () => {
    const switchUrl = new URL('/account/switch', window.location.origin);
    switchUrl.searchParams.set('redirect', window.location.href);
    return switchUrl.toString();
  };

  return (
    <div className="hidden lg:block text-center lg:text-left">
      <Image
        src="/assets/images/logo/logo-text-white.png"
        alt="Logo"
        width={140}
        height={36}
        className="mx-auto lg:mx-0 mb-6 block dark:hidden"
        priority
      />
      <Image
        src="/assets/images/logo/logo-text-black.png"
        alt="Logo"
        width={140}
        height={36}
        className="mx-auto lg:mx-0 mb-6 hidden dark:block"
        priority
      />
      <h1 className="text-2xl font-medium text-primary">
        授权访问您的账户
      </h1>
      <p className="mt-3 text-sm text-muted">
        <span className="text-primary font-medium">{clientName || '一个应用'}</span> 正请求获取您账户数据的权限。
      </p>
      <p className="mt-1.5 text-sm text-muted">
        请在继续操作前仔细核对请求的权限。
      </p>

      {user && (
        <div className="mt-6 flex items-center gap-3 p-3 rounded-xl border border-muted bg-surface-l1">
          <Image
            src={`https://uapis.cn/api/v1/avatar/gravatar?email=${encodeURIComponent(user.email)}&s=80&d=mp&r=g`}
            alt="User Avatar"
            width={36}
            height={36}
            className="rounded-full"
          />
          <div className="text-sm flex-1 min-w-0">
            <p className="font-medium text-primary truncate">{user.username || user.email}</p>
          </div>
          <a
            href={buildSwitchAccountUrl()}
            className="text-xs text-muted hover:text-primary transition-colors cursor-pointer flex items-center gap-0.5"
          >
            切换
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
};

const ScopeIcon = memo(function ScopeIcon({ scope }: { scope: string }) {
  const iconClass = "h-4 w-4 text-muted flex-shrink-0";
  switch (scope) {
    case 'openid': return <User className={iconClass} />;
    case 'profile': return <Shield className={iconClass} />;
    case 'email': return <Mail className={iconClass} />;
    case 'phone': return <Phone className={iconClass} />;
    case 'offline_access': return <RefreshCw className={iconClass} />;
    default: return <Check className={iconClass} />;
  }
});

const ErrorDisplay = ({ error }: { error: string }) => {
  const isWrongEndpointError = error.includes('错误的访问方式');
  const isMissingRedirectUri = error.includes('redirect_uri');

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
        <X className="h-6 w-6 text-red-500" />
      </div>
      <h1 className="text-xl font-medium text-primary">授权失败</h1>
      <p className="mt-2 text-sm text-muted">{error}</p>
      
      {isWrongEndpointError && (
        <div className="mt-6 p-4 rounded-xl border border-muted bg-surface-l1 text-left">
          <h3 className="text-sm font-medium text-primary mb-2">正确的 OAuth 授权流程</h3>
          <div className="text-xs text-muted space-y-2">
            <p>1. 应用应该访问后端 API 端点：</p>
            <code className="block px-2 py-1.5 rounded-lg bg-background font-mono text-xs text-primary">
              /api/oauth/authorize?...
            </code>
            <p>2. 而不是直接访问前端页面：</p>
            <code className="block px-2 py-1.5 rounded-lg bg-red-500/10 font-mono text-xs text-red-500">
              /oauth/authorize?...
            </code>
          </div>
        </div>
      )}
      
      {isMissingRedirectUri && (
        <div className="mt-6 p-4 rounded-xl border border-muted bg-surface-l1 text-left">
          <h3 className="text-sm font-medium text-primary mb-2">缺少必要参数</h3>
          <div className="text-xs text-muted space-y-2">
            <p>OAuth 2.0 授权请求必须包含以下参数：</p>
            <ul className="space-y-1 font-mono">
              <li>• client_id</li>
              <li>• redirect_uri</li>
              <li>• response_type=code</li>
              <li>• scope</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="flex gap-3 justify-center mt-6">
        <button
          onClick={() => window.location.href = '/'}
          className="h-9 px-4 rounded-full border border-muted bg-transparent text-sm text-primary hover:bg-overlay-hover transition-colors cursor-pointer"
        >
          返回首页
        </button>
        <button
          onClick={() => window.location.href = '/oauth/integration-guide'}
          className="h-9 px-4 rounded-full bg-foreground text-background text-sm hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
        >
          查看集成指南
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

function AuthorizePageContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  const params = {
    client_id: searchParams.get('client_id'),
    client_name: searchParams.get('client_name'),
    redirect_uri: searchParams.get('redirect_uri'),
    scope: searchParams.get('scope'),
    state: searchParams.get('state'),
    code_challenge: searchParams.get('code_challenge'),
    code_challenge_method: searchParams.get('code_challenge_method'),
  };
  
  const isParamsMissing = !params.client_id || !params.client_name || !params.redirect_uri || !params.scope;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { user: fetchedUser } = await getMe();
        setUser(fetchedUser);
      } catch (err: unknown) {
        // 401 Unauthorized 是预期情况（用户未登录）
        // 不需要设置错误，页面会显示没有用户信息的状态
        // 用户可以通过正常流程重新登录
        if (err instanceof Error && err.message !== 'Unauthorized') {
          setError(err.message);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (isParamsMissing) {
      const missingParams = [];
      if (!params.client_id) missingParams.push('client_id');
      if (!params.redirect_uri) missingParams.push('redirect_uri');
      if (!params.scope) missingParams.push('scope');
      if (!params.client_name) missingParams.push('client_name');
      
      if (!params.client_name && params.client_id && params.redirect_uri && params.scope) {
        setError('错误的访问方式：请通过后端 API 端点 /api/oauth/authorize 发起 OAuth 授权请求。');
      } else {
        setError(`无效的授权请求：缺少必要参数 (${missingParams.join(', ')})。`);
      }
    }
  }, [isParamsMissing, params]);

  const handleConsent = async (consent: 'allow' | 'deny') => {
    setLoading(true);
    setError(null);
    try {
      const { redirect_uri } = await postConsent({ ...params, consent });
      window.location.href = redirect_uri;
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      setLoading(false);
    }
  };
  
  const scopes = params.scope?.split(' ') || [];
  const scopeDescriptions: Record<string, { title: string; description: string }> = {
    openid: { title: '验证您的身份', description: '使用您的账户进行身份验证' },
    profile: { title: '访问基本资料', description: '读取您的昵称、头像等公开信息' },
    email: { title: '访问电子邮件', description: '获取您账户绑定的主要邮箱地址' },
    phone: { title: '访问电话号码', description: '获取您账户绑定的主要电话号码' },
    offline_access: { title: '保持登录状态', description: '应用会一直保持您的登录状态' },
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <ErrorDisplay error={error} />
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <AuthLayout
      leftContent={<LeftContent clientName={params.client_name} user={user} />}
      rightContent={
        <div className="mt-10 lg:mt-0 w-full max-w-md mx-auto">
          {/* 小屏幕标题 */}
          <div className="text-center lg:hidden mb-8">
            <Image src="/assets/images/logo/logo-black.png" alt="Logo" width={40} height={40} className="mx-auto mb-4 block dark:hidden" />
            <Image src="/assets/images/logo/logo-white.png" alt="Logo" width={40} height={40} className="mx-auto mb-4 hidden dark:block" />
            <h1 className="text-xl font-medium text-primary">授权请求</h1>
            <p className="mt-1.5 text-sm text-muted">
              <span className="text-primary font-medium">{params.client_name}</span> 想要访问您的账户
            </p>
          </div>

          <div className="space-y-6">
            {/* 大屏幕标题 */}
            <div className="hidden lg:block">
              <h2 className="text-xl font-medium text-primary">审查权限</h2>
              <p className="mt-1 text-sm text-muted">
                授权 <span className="text-primary font-medium">{params.client_name}</span> 访问您的数据
              </p>
            </div>
            
            {/* 权限列表 */}
            <div className="rounded-xl border border-muted bg-surface-l1 p-4">
              <p className="text-xs text-muted uppercase tracking-wide mb-3">将授予以下权限</p>
              <ul className="space-y-3">
                {scopes.map(s => (
                  <li key={s} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <ScopeIcon scope={s} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-primary">
                        {scopeDescriptions[s]?.title || `${s} 权限`}
                      </span>
                      <p className="text-xs text-muted mt-0.5">
                        {scopeDescriptions[s]?.description || '此为自定义权限'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                onClick={() => handleConsent('allow')}
                disabled={loading}
                className="w-full h-10 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <LoadingIndicator /> : '授权并继续'}
              </button>
              <button
                onClick={() => handleConsent('deny')}
                disabled={loading}
                className="w-full h-10 rounded-full border border-muted bg-transparent text-sm text-muted hover:text-primary hover:bg-overlay-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                拒绝
              </button>
            </div>
            
            <p className="text-xs text-center text-muted">
              您可以在账户设置中随时撤销授权
            </p>
          </div>
        </div>
      }
    />
  );
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingIndicator />
      </div>
    }>
      <AuthorizePageContent />
    </Suspense>
  );
}
