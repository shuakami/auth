'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, Check, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Image from 'next/image';

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
            router.push(redirect_uri);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };
    
    const scopes = params.scope?.split(' ') || [];
    const scopeDescriptions: { [key: string]: string } = {
        openid: '验证您的身份',
        profile: '访问您的基本个人资料（昵称，头像）',
        email: '访问您的电子邮件地址',
        phone: '访问您的电话号码',
    };

    if (error) {
        const isWrongEndpointError = error.includes('错误的访问方式');
        const isMissingRedirectUri = error.includes('redirect_uri');
        
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-center px-4">
                <div className="w-full max-w-2xl p-8 bg-white dark:bg-gray-950 rounded-lg shadow-md border dark:border-gray-800">
                    <X className="w-16 h-16 mx-auto text-red-500 mb-6" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">授权失败</h1>
                    <p className="mt-3 text-gray-600 dark:text-gray-400 mb-8">{error}</p>
                    
                    {isWrongEndpointError && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700 text-left mb-6">
                            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">正确的OAuth授权流程：</h3>
                            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                                <p>1. 应用应该访问后端API端点：</p>
                                <code className="block bg-blue-100 dark:bg-blue-800/50 px-3 py-2 rounded-md text-xs font-mono">
                                    https://auth.sdjz.wiki/api/oauth/authorize?...
                                </code>
                                <p>2. 而不是直接访问前端页面：</p>
                                <code className="block bg-red-100 dark:bg-red-800/50 px-3 py-2 rounded-md text-xs font-mono">
                                    https://auth.sdjz.wiki/oauth/authorize?...
                                </code>
                            </div>
                        </div>
                    )}
                    
                    {isMissingRedirectUri && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 border border-amber-200 dark:border-amber-700 text-left mb-6">
                            <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">缺少必要参数：</h3>
                            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
                                <p>OAuth 2.0 授权请求必须包含以下参数：</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li><code>client_id</code> - 应用的客户端ID</li>
                                    <li><code>redirect_uri</code> - 授权后的回调地址</li>
                                    <li><code>response_type=code</code> - 响应类型</li>
                                    <li><code>scope</code> - 请求的权限范围</li>
                                </ul>
                                <p className="mt-2">请检查您的OAuth应用配置中是否正确设置了重定向URI。</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex gap-4 justify-center mt-8">
                        <Button onClick={() => router.push('/')} variant="outline">
                            返回首页
                        </Button>
                        <Button onClick={() => router.push('/oauth/integration-guide')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            查看集成指南
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-black p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800">
                    <Image src="/assets/images/logo/logo-black.png" alt="Logo" width={56} height={56} className="mx-auto mb-5 dark:hidden" />
                    <Image src="/assets/images/logo/logo-white.png" alt="Logo" width={56} height={56} className="mx-auto mb-5 hidden dark:block" />
                    
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        授权请求
                    </h1>
                     <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{params.client_name}</span> 想访问您的账户
                    </p>
                </div>

                <div className="p-8">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">将授予以下权限：</h2>
                    <ul className="space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border dark:border-gray-800">
                        {scopes.map(s => (
                            <li key={s} className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-1" />
                                <div className="text-sm">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{scopeDescriptions[s]?.split('您的')[0] || `访问 ${s}`}</span>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {scopeDescriptions[s]?.split('您的')[1] || `信息`}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                
                <div className="p-8 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-500 mb-5">
                        授权后，您将被重定向到: <br />
                        <code className="text-blue-600 dark:text-blue-400 break-all bg-blue-50 dark:bg-blue-900/30 rounded px-1 py-0.5 mt-1 inline-block">{params.redirect_uri}</code>
                    </p>

                    <div className="flex flex-col space-y-3">
                        <Button onClick={() => handleConsent('allow')} disabled={loading} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition-transform transform hover:scale-105">
                            {loading ? <LoadingIndicator /> : (
                                <>
                                    <LogIn className="w-5 h-5 mr-2" />
                                    授权并继续
                                </>
                            )}
                        </Button>
                        <Button onClick={() => handleConsent('deny')} disabled={loading} variant="ghost" size="lg" className="w-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                            取消
                        </Button>
                    </div>
                </div>
                
                <div className="p-4 text-center border-t border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-400 dark:text-gray-600">
                        您可以在账户设置中随时撤销授权。
                    </p>
                </div>
            </div>
        </div>
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