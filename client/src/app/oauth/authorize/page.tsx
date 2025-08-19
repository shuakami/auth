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
            setError('无效的授权请求：缺少必要的参数。');
        }
    }, [isParamsMissing]);

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
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 text-center px-4">
                <div className="w-full max-w-md">
                    <X className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">授权失败</h1>
                    <p className="mt-2 text-neutral-600 dark:text-neutral-400">{error}</p>
                    <Button onClick={() => router.push('/')} className="mt-6">
                        返回首页
                    </Button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-900 p-4">
            <div className="w-full max-w-md mx-auto bg-white dark:bg-neutral-950 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-8">
                <div className="text-center">
                    <Image src="/assets/images/logo/logo-black.png" alt="Logo" width={48} height={48} className="mx-auto mb-4 dark:hidden" />
                    <Image src="/assets/images/logo/logo-white.png" alt="Logo" width={48} height={48} className="mx-auto mb-4 hidden dark:block" />
                    
                    <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                        授权 <span className="text-blue-600 dark:text-blue-400 font-extrabold">{params.client_name}</span>
                    </h1>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                        此应用想要访问您的账户信息
                    </p>
                </div>

                <div className="my-6">
                    <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">将授予以下权限：</h2>
                    <ul className="space-y-3">
                        {scopes.map(s => (
                            <li key={s} className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                                <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                                    {scopeDescriptions[s] || `访问 ${s} 信息`}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                
                <p className="text-xs text-center text-neutral-500 dark:text-neutral-600 mb-6">
                    授权后，您将被重定向到: <br />
                    <span className="font-mono text-blue-600 dark:text-blue-400 break-all">{params.redirect_uri}</span>
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