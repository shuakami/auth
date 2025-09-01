/**
 * 生物验证设置管理组件
 * 用于在用户设置页面管理生物验证设备
 */
import { memo, useState, useCallback } from 'react';
import { 
  Fingerprint, 
  Smartphone, 
  Plus, 
  Trash2, 
  Edit3, 
  Shield, 
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/utils';
import { format } from 'date-fns';
import useWebAuthn from '@/hooks/useWebAuthn';
import BiometricRegistrationModal from './BiometricRegistrationModal';

interface BiometricSettingsProps {
  className?: string;
}

const BiometricSettings = memo(function BiometricSettings({
  className,
}: BiometricSettingsProps) {
  const {
    canUse,
    browserSupported,
    platformSupported,
    isEnabled,
    hasCredentials,
    credentials,
    isRegistering,
    isLoading,
    error,
    registerBiometric,
    updateCredentialName,
    deleteCredential,
    clearError,
    refresh,
  } = useWebAuthn();

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState<{id: string, name: string} | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingCredential, setDeletingCredential] = useState<string | null>(null);

  const handleRegister = useCallback(async (credentialName?: string) => {
    try {
      await registerBiometric(credentialName);
      setShowRegistrationModal(false);
    } catch (error) {
      // 错误会通过 useWebAuthn hook 处理
      throw error;
    }
  }, [registerBiometric]);

  const handleEditName = useCallback(async () => {
    if (!editingCredential || !editingName.trim()) return;
    
    try {
      await updateCredentialName(editingCredential.id, editingName.trim());
      setEditingCredential(null);
      setEditingName('');
    } catch (error: any) {
      console.error('更新凭据名称失败:', error);
    }
  }, [updateCredentialName, editingCredential, editingName]);

  const handleDelete = useCallback(async (credentialId: string) => {
    try {
      await deleteCredential(credentialId);
      setDeletingCredential(null);
    } catch (error: any) {
      console.error('删除凭据失败:', error);
    }
  }, [deleteCredential]);

  const startEdit = (credentialId: string, currentName: string) => {
    setEditingCredential({ id: credentialId, name: currentName });
    setEditingName(currentName);
  };

  const cancelEdit = () => {
    setEditingCredential(null);
    setEditingName('');
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'platform':
        return <Fingerprint className="h-5 w-5" />;
      case 'cross-platform':
        return <Shield className="h-5 w-5" />;
      default:
        return <Smartphone className="h-5 w-5" />;
    }
  };

  if (!canUse) {
    return (
      <div className={cn('rounded-lg border p-6', className)}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              生物验证不可用
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {!browserSupported 
                ? '您的浏览器不支持 WebAuthn 生物验证功能'
                : '生物验证功能当前不可用'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 标题和状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            isEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-neutral-100 dark:bg-neutral-800'
          )}>
            {isEnabled ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <Shield className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              生物验证
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {isEnabled 
                ? `已启用 • ${credentials.length} 个设备` 
                : '使用指纹、Face ID 或安全密钥进行快速登录'
              }
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowRegistrationModal(true)}
          disabled={isLoading}
          leftIcon={<Plus className="h-4 w-4" />}
          variant="default"
        >
          添加设备
        </Button>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-400">
                {error}
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={clearError}
                className="mt-1 text-red-600 dark:text-red-400"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 设备列表 */}
      {hasCredentials ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            已注册的设备
          </h4>
          <div className="space-y-2">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-neutral-600 dark:text-neutral-400">
                    {getDeviceIcon(credential.deviceType)}
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {credential.name}
                    </h5>
                    <div className="flex items-center space-x-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>注册于 {format(new Date(credential.createdAt), 'yyyy年MM月dd日')}</span>
                      </div>
                      {credential.lastUsedAt && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>最后使用 {format(new Date(credential.lastUsedAt), 'MM月dd日')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(credential.id, credential.name)}
                    leftIcon={<Edit3 className="h-4 w-4" />}
                  >
                    重命名
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingCredential(credential.id)}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <Fingerprint className="h-8 w-8 text-neutral-600 dark:text-neutral-400" />
          </div>
          <h4 className="mt-4 text-sm font-medium text-neutral-900 dark:text-neutral-100">
            尚未设置生物验证
          </h4>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            添加您的第一个生物验证设备来启用快速登录
          </p>
        </div>
      )}

      {/* 安全提示 */}
      <div className="rounded-md bg-neutral-50 p-4 dark:bg-neutral-800/50">
        <div className="flex">
          <Shield className="h-5 w-5 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              安全提示
            </h3>
            <ul className="mt-1 text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
              <li>• 建议注册多个设备作为备份</li>
              <li>• 生物信息仅存储在您的设备本地</li>
              <li>• 定期检查和清理不再使用的设备</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 注册弹窗 */}
      <BiometricRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onRegister={handleRegister}
        browserSupported={browserSupported}
        platformSupported={platformSupported}
        loading={isRegistering}
        error={error}
      />

      {/* 编辑名称弹窗 */}
      <Dialog 
        open={!!editingCredential} 
        onOpenChange={() => cancelEdit()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名设备</DialogTitle>
            <DialogDescription>
              为您的生物验证设备设置一个容易识别的名称
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="device-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                设备名称
              </label>
              <input
                id="device-name"
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                placeholder="我的设备"
                maxLength={50}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editingName.trim()) {
                    handleEditName();
                  } else if (e.key === 'Escape') {
                    cancelEdit();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={cancelEdit}
            >
              取消
            </Button>
            <Button
              onClick={handleEditName}
              disabled={!editingName.trim()}
              variant="default"
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog 
        open={!!deletingCredential} 
        onOpenChange={() => setDeletingCredential(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除生物验证设备</DialogTitle>
            <DialogDescription>
              您确定要删除这个生物验证设备吗？删除后您将无法使用此设备进行生物验证登录。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeletingCredential(null)}
            >
              取消
            </Button>
            <Button
              variant="error"
              onClick={() => deletingCredential && handleDelete(deletingCredential)}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default BiometricSettings;