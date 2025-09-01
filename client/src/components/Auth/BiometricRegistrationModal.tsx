/**
 * 生物验证注册弹窗组件
 * 用于用户首次设置生物验证
 */
import { memo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, Shield, Check, AlertCircle, Smartphone } from 'lucide-react';
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
            browserSupported ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          )}>
            {browserSupported ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
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
            platformSupported ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
          )}>
            {platformSupported ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          {platformSupported ? (
            <Fingerprint className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          ) : (
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            设置生物验证
          </h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {platformSupported 
              ? '使用您的指纹、Face ID 或其他生物特征进行安全登录'
              : '使用安全密钥进行无密码登录'
            }
          </p>
        </div>
      </div>

      {renderSupportInfo()}

      <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
        <div className="flex">
          <Shield className="h-5 w-5 text-blue-400" aria-hidden="true" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">
              安全提示
            </h3>
            <ul className="mt-1 text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• 生物信息仅存储在您的设备上，不会上传到服务器</li>
              <li>• 您可以同时注册多个设备进行备份</li>
              <li>• 即使启用生物验证，您仍可以使用密码登录</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNamingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Smartphone className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            为您的设备命名
          </h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            给这个认证器起个名字，方便您在多个设备间进行管理
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="credential-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          设备名称（可选）
        </label>
        <input
          id="credential-name"
          type="text"
          value={credentialName}
          onChange={(e) => setCredentialName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-[#0582FF] focus:outline-none focus:ring-1 focus:ring-[#0582FF] dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-100 dark:placeholder-neutral-500"
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
    </div>
  );

  const renderRegisteringStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <div className="animate-pulse">
            <Fingerprint className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            正在设置生物验证
          </h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            请按照浏览器提示完成{platformSupported ? '生物验证' : '安全密钥'}设置
          </p>
        </div>
      </div>

      <div className="animate-pulse space-y-3">
        <div className="h-2 bg-neutral-200 rounded dark:bg-neutral-700"></div>
        <div className="h-2 bg-neutral-200 rounded w-3/4 dark:bg-neutral-700"></div>
        <div className="h-2 bg-neutral-200 rounded w-1/2 dark:bg-neutral-700"></div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'intro' && '设置生物验证'}
            {step === 'naming' && '设备命名'}
            {step === 'registering' && '正在注册'}
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && '为您的账户添加更安全便捷的登录方式'}
            {step === 'naming' && '为您的认证设备起个容易记住的名字'}
            {step === 'registering' && '请按照浏览器提示完成设置'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {step === 'intro' && renderIntroStep()}
          {step === 'naming' && renderNamingStep()}
          {step === 'registering' && renderRegisteringStep()}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          {step !== 'registering' && (
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </Button>
          )}
          
          {step === 'intro' && (
            <Button
              onClick={handleRegister}
              disabled={!browserSupported || loading}
            >
              开始设置
            </Button>
          )}
          
          {step === 'naming' && (
            <Button
              onClick={handleRegister}
              disabled={loading}
              loading={loading}
            >
              注册生物验证
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default BiometricRegistrationModal;