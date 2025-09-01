/**
 * 生物验证注册弹窗组件
 * 用于用户首次设置生物验证
 */
import { memo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, Shield, AlertCircle, Check } from 'lucide-react';

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
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          {browserSupported ? (
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <span className="text-base text-neutral-700 dark:text-neutral-300">
            浏览器支持 WebAuthn
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {platformSupported ? (
            <Fingerprint className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          )}
          <span className="text-base text-neutral-700 dark:text-neutral-300">
            {platformSupported ? '设备支持生物认证器' : '可使用安全密钥'}
          </span>
        </div>
      </div>
    );
  };

  const renderIntroStep = () => (
          <div className="space-y-8">
        <div className="text-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
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
      <div className="text-center space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
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
        <div className="flex justify-center">
          <div className="animate-pulse">
            <Fingerprint className="h-16 w-16 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
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
      <DialogContent className="max-w-6xl p-0 gap-0 border-0 bg-white dark:bg-[#09090b]">
        <div className="flex min-h-[700px]">
          {/* 左侧介绍区域 */}
          <div className="w-3/5 p-8 lg:p-16 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900/50 dark:to-neutral-800/30">
            <div className="max-w-lg mx-auto lg:mx-0 h-full flex flex-col justify-center">
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
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
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
                    <Fingerprint className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
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
                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
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
          <div className="w-2/5 p-8 lg:p-12 flex items-center justify-center bg-white dark:bg-[#09090b]">
            <div className="w-full max-w-md">
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