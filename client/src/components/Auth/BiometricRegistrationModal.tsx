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
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          检查设备兼容性
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          我们需要确认您的设备支持生物验证功能
        </p>
      </div>

      {renderSupportInfo()}

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={loading}
          className="border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          取消
        </Button>
        <Button
          onClick={handleRegister}
          disabled={!browserSupported || loading}
          className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          下一步
        </Button>
      </div>
    </div>
  );

  const renderNamingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          设备命名
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          给这个认证器起个名字，方便您在多个设备间进行管理
        </p>
      </div>

      <div>
        <label htmlFor="credential-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          设备名称（可选）
        </label>
        <input
          id="credential-name"
          type="text"
          value={credentialName}
          onChange={(e) => setCredentialName(e.target.value)}
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-500"
          placeholder={platformSupported ? "我的iPhone" : "我的安全密钥"}
          maxLength={50}
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          如果不填写，将使用默认名称
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={() => setStep('intro')}
          disabled={loading}
          className="border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          上一步
        </Button>
        <Button
          onClick={handleRegister}
          disabled={loading}
          loading={loading}
          className="bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          注册生物验证
        </Button>
      </div>
    </div>
  );

  const renderRegisteringStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div className="animate-pulse">
            <Fingerprint className="h-8 w-8 text-neutral-600 dark:text-neutral-400" />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            正在注册
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            请按照浏览器提示完成{platformSupported ? '生物验证' : '安全密钥'}设置
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="animate-pulse">
          <div className="h-2 bg-neutral-200 rounded dark:bg-neutral-700"></div>
        </div>
        <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>
          <div className="h-2 bg-neutral-200 rounded w-3/4 dark:bg-neutral-700"></div>
        </div>
        <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>
          <div className="h-2 bg-neutral-200 rounded w-1/2 dark:bg-neutral-700"></div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
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

        <div className="flex min-h-[500px]">
          {/* 左侧介绍区域 */}
          <div className="flex-1 p-8 lg:p-12 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="max-w-md mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <div className="mx-auto lg:mx-0 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 mb-6">
                  {platformSupported ? (
                    <Fingerprint className="h-10 w-10 text-neutral-600 dark:text-neutral-400" />
                  ) : (
                    <Shield className="h-10 w-10 text-neutral-600 dark:text-neutral-400" />
                  )}
                </div>
                
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-4">
                  设置生物验证
                </h1>
                
                <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
                  {platformSupported 
                    ? '使用您的指纹、Face ID 或其他生物特征进行安全快速的登录体验。'
                    : '使用安全密钥进行无密码登录，提供企业级的安全保障。'
                  }
                </p>

                {/* 功能特性 */}
                <div className="space-y-4 text-left">
                  <div className="flex items-start space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 mt-0.5">
                      <Shield className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        安全可靠
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        生物信息仅存储在您的设备上，不会上传到服务器
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 mt-0.5">
                      <Smartphone className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        多设备支持
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        您可以同时注册多个设备作为备份方案
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 mt-0.5">
                      <Check className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        备用登录
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        即使启用生物验证，您仍可以使用密码登录
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧操作区域 */}
          <div className="flex-1 p-8 lg:p-12">
            <div className="max-w-md mx-auto">
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