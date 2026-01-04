import { type FormEvent, memo } from 'react';
import Link from 'next/link';
import { AUTH_CONSTANTS } from '@/constants/auth';
import { Loader } from '@/components/ui/Loader';

interface LoginFormProps {
  email: string;
  password: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
}

const LoginForm = memo(function LoginForm({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  // 统一输入框样式 - 更柔和的 focus 效果
  const inputClasses = "mt-1.5 block w-full h-10 px-3 rounded-lg border border-neutral-200 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 邮箱输入 */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          邮箱地址
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className={inputClasses}
          placeholder="you@example.com"
          disabled={loading}
        />
      </div>

      {/* 密码输入 */}
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            密码
          </label>
          <Link 
            href={AUTH_CONSTANTS.ROUTES.FORGOT_PASSWORD} 
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
          >
            忘记密码？
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className={inputClasses}
          placeholder="请输入密码"
          disabled={loading}
        />
      </div>

      {/* 登录按钮 */}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer flex w-full justify-center items-center gap-2 h-10 rounded-lg bg-neutral-900 text-sm font-medium text-white transition-all duration-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {loading && <Loader size={16} />}
          <span>{loading ? '登录中...' : '登录'}</span>
        </button>
      </div>
    </form>
  );
});

export default LoginForm;