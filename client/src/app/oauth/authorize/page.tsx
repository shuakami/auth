'use client';
import { useEffect, useState, Suspense, memo, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, Check, X, LogIn, User, Mail, Phone } from 'lucide-react';
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

const AuthLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-900">
    <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {children}
      </div>
    </main>
    <Footer />
  </div>
);

const ScopeIcon = memo(function ScopeIcon({ scope }: { scope: string }) {
  switch (scope) {
    case 'openid':
      return <User className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />;
    case 'profile':
      return <Shield className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />;
    case 'email':
      return <Mail className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0 mt-0.5" />;
    case 'phone':
      return <Phone className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />;
    default:
      return <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />;
  }
});

const ErrorDisplay = ({ error }: { error: string }) => {
  const isWrongEndpointError = error.includes('错误的访问方式');
  const isMissingRedirectUri = error.includes('redirect_uri');

  return (
    <div className="text-center px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">
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
    </div>
  );
};


function AuthorizePageContent() {
    const router = useRouter();
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
    const scopeDescriptions: { [key: string]: { title: string, description: string } } = {
        openid: { title: '验证您的身份', description: '使用您的账户进行身份验证。' },
        profile: { title: '访问基本资料', description: '读取您的昵称、头像等公开信息。' },
        email: { title: '访问电子邮件', description: '允许应用获取您的电子邮件地址。' },
        phone: { title: '访问电话号码', description: '允许应用获取您的电话号码。' },
    };

    if (error) {
        return (
          <AuthLayout>
            <ErrorDisplay error={error} />
          </AuthLayout>
        );
    }
    
    return (
      <AuthLayout>
        <div className="w-full max-w-md mx-auto bg-white dark:bg-neutral-950 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-8">
            <div className="text-center">
                <Image src="/assets/images/logo/logo-black.png" alt="Logo" width={48} height={48} className="mx-auto mb-4 dark:hidden" />
                <Image src="/assets/images/logo/logo-white.png" alt="Logo" width={48} height={48} className="mx-auto mb-4 hidden dark:block" />
                
                <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    授权请求
                </h1>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{params.client_name}</span> 想要访问您的账户
                </p>
            </div>

            <div className="my-6 space-y-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-4">
                <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">将授予以下权限：</h2>
                <ul className="space-y-3">
                    {scopes.map(s => (
                        <li key={s} className="flex items-start">
                            <ScopeIcon scope={s} />
                            <div>
                                <span className="text-neutral-800 dark:text-neutral-200 text-sm font-medium">
                                    {scopeDescriptions[s]?.title || `访问 ${s} 信息`}
                                </span>
                                <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-0.5">
                                    {scopeDescriptions[s]?.description || '提供基础权限'}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            
            <p className="text-xs text-center text-neutral-500 dark:text-neutral-600 mb-6">
                授权后，您将被重定向到: <br />
                <span className="font-mono text-blue-500 dark:text-blue-400 break-all text-[11px]">{params.redirect_uri}</span>
            </p>

            <div className="flex flex-col space-y-3">
                <Button onClick={() => handleConsent('allow')} disabled={loading} size="lg" className="w-full">
                    {loading ? <LoadingIndicator /> : (
                        <>
                            <LogIn className="w-4 h-4 mr-2" />
                            授权并继续
                        </>
                    )}
                </Button>
                <Button onClick={() => handleConsent('deny')} disabled={loading} variant="ghost" size="lg" className="w-full">
                    取消
                </Button>
            </div>
            
            <p className="text-xs text-center text-neutral-400 dark:text-neutral-700 mt-6">
                您可以在账户设置中随时撤销授权。
            </p>
        </div>
      </AuthLayout>
    );
}

export default function AuthorizePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900">
                <LoadingIndicator />
            </div>
        }>
            <AuthorizePageContent />
        </Suspense>
    );
}