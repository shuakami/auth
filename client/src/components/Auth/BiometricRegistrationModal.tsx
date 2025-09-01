/**
 * 生物验证注册弹窗组件
 * 用于用户首次设置生物验证
 */
import { memo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, Shield, Check, AlertCircle, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

interface BiometricRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (credentialName?: string) => Promise<void>;
  browserSupported: boolean;
  platformSupported: boolean;
  loading?: boolean;
  error?: string | null;
}

const BiometricRegistrationModal = memo(function BiometricRegistrationModal({
  isOpen,
  onClose,
  onRegister,
  browserSupported,
  platformSupported,
  loading = false,
  error = null,
}: BiometricRegistrationModalProps) {
  const [credentialName, setCredentialName] = useState('');
  const [step, setStep] = useState<'intro' | 'naming' | 'registering'>('intro');

  const handleRegister = async () => {
    if (step === 'intro') {
      setStep('naming');
      return;
    }

    if (step === 'naming') {
      setStep('registering');
      try {
        await onRegister(credentialName.trim() || undefined);
        // 成功后关闭弹窗
        handleClose();
      } catch (err) {
        // 错误会通过 props 传入，这里回到命名步骤
        setStep('naming');
      }
    }
  };

  const handleClose = () => {
    setStep('intro');
    setCredentialName('');
    onClose();
  };

  const renderSupportInfo = () => {
    if (!browserSupported) {
      return (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                浏览器不支持
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                您的浏览器不支持 WebAuthn 生物验证。请使用现代浏览器如 Chrome、Firefox、Safari 或 Edge。
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            browserSupported ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-red-100 dark:bg-red-900/30'
          )}>
            {browserSupported ? (
              <Check className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            浏览器支持 WebAuthn
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            platformSupported ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-yellow-100 dark:bg-yellow-900/30'
          )}>
            {platformSupported ? (
              <Check className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            ) : (
              <Smartphone className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            )}
          </div>
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {platformSupported ? '设备支持生物认证器' : '可使用安全密钥'}
          </span>
        </div>
      </div>
    );
  };

  const renderIntroStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 shadow-sm">
          <Check className="h-8 w-8 text-neutral-700 dark:text-neutral-300" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            检查设备兼容性
          </h3>
          <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            我们需要确认您的设备支持生物验证功能
          </p>
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-6">
        {renderSupportInfo()}
      </div>

      <div className="flex justify-center space-x-4 pt-6">
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={loading}
          size="lg"
          className="min-w-[120px]"
        >
          取消
        </Button>
        <Button
          onClick={handleRegister}
          disabled={!browserSupported || loading}
          variant="default"
          size="lg"
          className="min-w-[120px]"
        >
          下一步
        </Button>
      </div>
    </div>
  );

  const renderNamingStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/40 shadow-sm">
          <Smartphone className="h-8 w-8 text-blue-700 dark:text-blue-300" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            设备命名
          </h3>
          <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            给这个认证器起个名字，方便您在多个设备间进行管理
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="credential-name" className="block text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            设备名称（可选）
          </label>
          <input
            id="credential-name"
            type="text"
            value={credentialName}
            onChange={(e) => setCredentialName(e.target.value)}
            className="block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-700"
            placeholder={platformSupported ? "我的iPhone" : "我的安全密钥"}
            maxLength={50}
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            如果不填写，将使用默认名称
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" aria-hidden="true" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-4 pt-6">
        <Button
          variant="outline"
          onClick={() => setStep('intro')}
          disabled={loading}
          size="lg"
          className="min-w-[120px]"
        >
          上一步
        </Button>
        <Button
          onClick={handleRegister}
          disabled={loading}
          loading={loading}
          variant="default"
          size="lg"
          className="min-w-[120px]"
        >
          开始注册
        </Button>
      </div>
    </div>
  );

  const renderRegisteringStep = () => (
    <div className="space-y-8">
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/40 shadow-sm">
          <div className="animate-pulse">
            <Fingerprint className="h-10 w-10 text-green-700 dark:text-green-300" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            正在注册设备
          </h3>
          <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            请按照浏览器提示完成{platformSupported ? '生物验证' : '安全密钥'}设置
          </p>
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-6">
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-3 bg-neutral-300 rounded-full dark:bg-neutral-600"></div>
          </div>
          <div className="animate-pulse" style={{ animationDelay: '0.3s' }}>
            <div className="h-3 bg-neutral-300 rounded-full w-3/4 dark:bg-neutral-600"></div>
          </div>
          <div className="animate-pulse" style={{ animationDelay: '0.6s' }}>
            <div className="h-3 bg-neutral-300 rounded-full w-1/2 dark:bg-neutral-600"></div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 animate-pulse">
          处理中，请稍候...
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 border-0 bg-white dark:bg-[#09090b]">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">关闭</span>
        </button>

        <div className="flex min-h-[600px]">
          {/* 左侧介绍区域 */}
          <div className="w-2/5 p-8 lg:p-12 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900/50 dark:to-neutral-800/30">
            <div className="max-w-sm mx-auto lg:mx-0 h-full flex flex-col justify-center">
              <div className="text-center lg:text-left">
                <div className="mx-auto lg:mx-0 flex h-24 w-24 items-center justify-center rounded-2xl bg-white dark:bg-neutral-800 shadow-sm mb-8">
                  {platformSupported ? (
                    <Fingerprint className="h-12 w-12 text-neutral-700 dark:text-neutral-300" />
                  ) : (
                    <Shield className="h-12 w-12 text-neutral-700 dark:text-neutral-300" />
                  )}
                </div>
                
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-6">
                  设置生物验证
                </h1>
                
                <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed">
                  {platformSupported 
                    ? '使用您的指纹、Face ID 或其他生物特征进行安全快速的登录体验。'
                    : '使用安全密钥进行无密码登录，提供企业级的安全保障。'
                  }
                </p>

                {/* 功能特性 */}
                <div className="space-y-6 text-left">
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-neutral-700 shadow-sm mt-1">
                      <Shield className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                        安全可靠
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        生物信息仅存储在您的设备上，不会上传到服务器
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-neutral-700 shadow-sm mt-1">
                      <Smartphone className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                        多设备支持
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        您可以同时注册多个设备作为备份方案
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-neutral-700 shadow-sm mt-1">
                      <Check className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                        备用登录
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        即使启用生物验证，您仍可以使用密码登录
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧操作区域 */}
          <div className="flex-1 p-8 lg:p-16 flex items-center justify-center">
            <div className="w-full max-w-lg">
              {step === 'intro' && renderIntroStep()}
              {step === 'naming' && renderNamingStep()}
              {step === 'registering' && renderRegisteringStep()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default BiometricRegistrationModal;