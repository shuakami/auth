import { memo } from 'react';

// 图标组件
const GithubIcon = memo(function GithubIcon() {
  return (
    <svg 
      className="mr-2 h-5 w-5" 
      fill="currentColor" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 012.9-.39c.99.01 1.99.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.7.42.36.79 1.09.79 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z" />
    </svg>
  );
});

const GoogleIcon = memo(function GoogleIcon() {
  return (
    <svg 
      height="20" 
      viewBox="0 0 24 24" 
      width="20" 
      xmlns="http://www.w3.org/2000/svg" 
      style={{flex: '0 0 auto', lineHeight: 1}} 
      className="mr-2 h-5 w-5"
      aria-hidden="true"
    >
      <title>Google</title>
      <path d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" fill="#4285F4" />
      <path d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" fill="#34A853" />
      <path d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" fill="#FBBC05" />
      <path d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" fill="#EB4335" />
    </svg>
  );
});

interface OAuthButtonsProps {
  onGitHubLogin: () => void;
  onGoogleLogin: () => void;
  disabled?: boolean;
}

const OAuthButtons = memo(function OAuthButtons({ 
  onGitHubLogin, 
  onGoogleLogin, 
  disabled = false 
}: OAuthButtonsProps) {
  const buttonBaseClasses = "inline-flex w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#0582FF] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-[#171717] dark:text-neutral-300 dark:hover:bg-[#262626] dark:focus:ring-offset-[#09090b]";

  return (
    <>
      {/* OAuth 分隔线 */}
      <div className="relative pt-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-2 text-sm text-neutral-500 dark:bg-[#09090b] dark:text-neutral-400">
            或使用
          </span>
        </div>
      </div>

      {/* OAuth 按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onGitHubLogin}
          disabled={disabled}
          className={buttonBaseClasses}
          aria-label="使用 GitHub 登录"
        >
          <GithubIcon />
          <span>GitHub</span>
        </button>
        
        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={disabled}
          className={buttonBaseClasses}
          aria-label="使用 Google 登录"
        >
          <GoogleIcon />
          <span>Google</span>
        </button>
      </div>
    </>
  );
});

export default OAuthButtons;