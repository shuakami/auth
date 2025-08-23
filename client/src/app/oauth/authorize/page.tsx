'use client';
import { useEffect, useState, Suspense, memo, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  Check,
  X,
  LogIn,
  User,
  Mail,
  Phone,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Image from 'next/image';
import Footer from '@/app/dashboard/components/Footer';

// API 调用函数
async function postConsent(data: any) {
    const res = await fetch('/api/oauth/consent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '授权请求失败');
    }
    return res.json();
}

// --- 新的UI组件 ---

const AuthLayout = ({ leftContent, rightContent }: { leftContent: ReactNode, rightContent: ReactNode }) => (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
        <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-6xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-24 items-center">
                {leftContent}
                {rightContent}
            </div>
        </main>
        <Footer />
    </div>
);

const LeftContent = ({ clientName }: { clientName: string | null }) => (
    <div className="hidden lg:block text-center lg:text-left">
        <Image
            src="/assets/images/logo/logo-text-white.png"
            alt="Logo"
            width={150}
            height={40}
            className="mx-auto lg:mx-0 mb-6 block dark:hidden"
            priority
        />
        <Image
            src="/assets/images/logo/logo-text-black.png"
            alt="Logo"
            width={150}
            height={40}
            className="mx-auto lg:mx-0 mb-6 hidden dark:block"
            priority
        />
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">
            授权访问您的账户
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{clientName || '一个应用'}</span> 正请求获取您账户数据的权限。
        </p>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            请在继续操作前仔细核对请求的权限。
        </p>
    </div>
);


const ScopeIcon = memo(function ScopeIcon({ scope }: { scope: string }) {
  const iconClass = "w-5 h-5 text-neutral-500 dark:text-neutral-400 mr-3 flex-shrink-0 mt-0.5";
  switch (scope) {
    case 'openid':
      return <User className={iconClass} />;
    case 'profile':
      return <Shield className={iconClass} />;
    case 'email':
      return <Mail className={iconClass} />;
    case 'phone':
      return <Phone className={iconClass} />;
    case 'offline_access':
      return <RefreshCw className={iconClass} />;
    default:
      return <Check className={iconClass} />;
  }
});

const ErrorDisplay = ({ error }: { error: string }) => {
  const isWrongEndpointError = error.includes('错误的访问方式');
  const isMissingRedirectUri = error.includes('redirect_uri');

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
        <X className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">授权失败</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400 mb-6">{error}</p>
        
        {isWrongEndpointError && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-left mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">正确的OAuth授权流程：</h3>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
              <p>1. 应用应该访问后端API端点：</p>
              <code className="block bg-blue-100 dark:bg-blue-800/50 px-2 py-1 rounded text-xs font-mono">
                https://auth.sdjz.wiki/api/oauth/authorize?...
              </code>
              <p>2. 而不是直接访问前端页面：</p>
              <code className="block bg-red-100 dark:bg-red-800/50 px-2 py-1 rounded text-xs font-mono">
                https://auth.sdjz.wiki/oauth/authorize?...
              </code>
            </div>
          </div>
        )}
        
        {isMissingRedirectUri && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800 text-left mb-6">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">缺少必要参数：</h3>
            <div className="text-sm text-amber-800 dark:text-amber-300 space-y-2">
              <p>OAuth 2.0 授权请求必须包含以下参数：</p>
              <ul className="list-disc list-inside space-y-1 font-mono text-xs">
                <li>client_id</li>
                <li>redirect_uri</li>
                <li>response_type=code</li>
                <li>scope</li>
              </ul>
              <p className="mt-2">请检查您的OAuth应用配置中是否正确设置了重定向URI。</p>
            </div>
          </div>
        )}
        
        <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.href = '/'} variant="outline">
                返回首页
            </Button>
            <Button onClick={() => window.location.href = '/oauth/integration-guide'}>
                查看集成指南
            </Button>
        </div>
    </div>
  );
};


function AuthorizePageContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 从 URL 中提取所有需要的参数
    const params = {
        client_id: searchParams.get('client_id'),
        client_name: searchParams.get('client_name'),
        redirect_uri: searchParams.get('redirect_uri'),
        scope: searchParams.get('scope'),
        state: searchParams.get('state'),
        code_challenge: searchParams.get('code_challenge'),
        code_challenge_method: searchParams.get('code_challenge_method'),
    };
    
    // 检查是否有任何关键参数缺失
    const isParamsMissing = !params.client_id || !params.client_name || !params.redirect_uri || !params.scope;

    useEffect(() => {
        if (isParamsMissing) {
            // 检查具体缺少哪些参数
            const missingParams = [];
            if (!params.client_id) missingParams.push('client_id');
            if (!params.redirect_uri) missingParams.push('redirect_uri');
            if (!params.scope) missingParams.push('scope');
            if (!params.client_name) missingParams.push('client_name (内部参数)');
            
            if (!params.client_name && params.client_id && params.redirect_uri && params.scope) {
                // 如果只是缺少 client_name，说明用户直接访问了前端页面
                setError('错误的访问方式：请通过后端API端点 /api/oauth/authorize 发起OAuth授权请求，而不是直接访问此页面。');
            } else {
                setError(`无效的授权请求：缺少必要的参数 (${missingParams.join(', ')})。请确保您的OAuth授权URL包含所有必要参数。`);
            }
        }
    }, [isParamsMissing, params]);

    const handleConsent = async (consent: 'allow' | 'deny') => {
        setLoading(true);
        setError(null);
        try {
            const { redirect_uri } = await postConsent({ ...params, consent });
            window.location.href = redirect_uri; // 使用 window.location.href 保证跳转
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };
    
    const scopes = params.scope?.split(' ') || [];
    const scopeDescriptions: {
      [key: string]: {
        title: string,
        description: string
      }
    } = {
      openid: {
        title: '验证您的身份',
        description: '使用您的账户进行身份验证。'
      },
      profile: {
        title: '访问您的基本公开资料',
        description: '读取您的昵称、头像等您设置为公开的信息。'
      },
      email: {
        title: '访问您的电子邮件地址',
        description: '允许应用获取您账户绑定的主要电子邮件地址。'
      },
      phone: {
        title: '访问您的电话号码',
        description: '允许应用获取您账户绑定的主要电话号码。'
      },
      offline_access: {
        title: '保持离线访问权限',
        description: '应用将可以在您不在线时，继续访问您的数据。'
      },
    };

    if (error) {
        return (
            <div className="flex min-h-screen flex-col bg-white dark:bg-[#09090b]">
                <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                    <ErrorDisplay error={error} />
                </main>
                <Footer />
            </div>
        );
    }
    
    return (
        <AuthLayout
            leftContent={<LeftContent clientName={params.client_name} />}
            rightContent={
                <div className="mt-10 lg:mt-5 w-full max-w-md mx-auto">
                    {/* 小屏幕标题 */}
                    <div className="text-center lg:hidden mb-8">
                        <Image src="/assets/images/logo/logo-black.png" alt="Logo" width={48} height={48} className="mx-auto mb-4 block dark:hidden" />
                        <Image src="/assets/images/logo/logo-white.png" alt="Logo" width={48} height={48} className="mx-auto mb-4 hidden dark:block" />
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                            授权请求
                        </h1>
                        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{params.client_name}</span> 想要访问您的账户
                        </p>
                    </div>

                    <div className="space-y-6">
                         {/* 大屏幕标题 */}
                        <div className="hidden lg:block">
                            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                                审查权限
                            </h2>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                                授权 <span className="font-semibold text-neutral-700 dark:text-neutral-300">{params.client_name}</span> 访问您的数据。
                            </p>
                        </div>
                        
                        <div className="space-y-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-4">
                            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">将授予以下权限：</h3>
                            <ul className="space-y-3">
                                {scopes.map(s => (
                                    <li key={s} className="flex items-start">
                                        <ScopeIcon scope={s} />
                                        <div>
                                            <span className="text-neutral-800 dark:text-neutral-200 text-sm font-medium">
                                                {scopeDescriptions[s]?.title || `请求 ${s} 权限`}
                                            </span>
                                            <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-0.5">
                                                {scopeDescriptions[s]?.description || '此为自定义权限，请确认您信任该应用。'}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex flex-col space-y-3 pt-2">
                            <Button
                                onClick={() => handleConsent('allow')}
                                disabled={loading}
                                size="lg"
                                className="w-full bg-[#0582FF] text-white shadow-sm hover:bg-[#006ADF] dark:bg-[#3898FF] dark:hover:bg-[#5CAEFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0582FF] dark:focus-visible:outline-[#3898FF]"
                            >
                                {loading ? <LoadingIndicator /> : (
                                    <>
                                        授权并继续
                                    </>
                                )}
                            </Button>
                            <Button onClick={() => handleConsent('deny')} disabled={loading} variant="ghost" size="lg" className="w-full">
                                取消
                            </Button>
                        </div>
                        
                        <p className="text-xs text-center text-neutral-500 dark:text-neutral-700 pt-2">
                            您可以在账户设置中随时撤销授权。
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
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#09090b]">
                <LoadingIndicator />
            </div>
        }>
            <AuthorizePageContent />
        </Suspense>
    );
}