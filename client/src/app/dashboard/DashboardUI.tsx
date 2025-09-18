'use client';

import {
  memo,
  type MouseEventHandler,
  type ChangeEventHandler,
  type ReactNode,
} from 'react';

/* -------------------------------------------------------------------------- */
/* Section                                                                    */
/* -------------------------------------------------------------------------- */

export const Section = memo(
  ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="space-y-4">
      <h2 className="text-lg font-medium tracking-tight text-neutral-900 dark:text-zinc-100">{title}</h2>
      {children}
    </section>
  ),
);
Section.displayName = 'Section';

/* -------------------------------------------------------------------------- */
/* Button（统一中性风格 + 极简交互）                                          */
/* -------------------------------------------------------------------------- */

export const Button = memo(
  ({
    onClick,
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
    type = 'button',
  }: {
    onClick?: MouseEventHandler<HTMLButtonElement>;
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
  }) => {
    const base =
      'rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-zinc-900 transition ease-in-out duration-150';
    const sizeMap = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    const disabledCls = disabled ? 'opacity-50 cursor-not-allowed' : '';

    const variantMap = {
      // 亮色下黑底白字；暗色下白底黑字。贴近 Vercel/Apple 的中性主按钮。
      primary: `bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 ${disabledCls}`,
      // 细边框 + 透明/浅底：更克制的次级态
      secondary: `border border-black/10 bg-white/70 text-neutral-900 hover:bg-black/[0.03] active:bg-black/[0.05] dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100 dark:hover:bg-white/[0.06] ${disabledCls}`,
      // 危险操作保留红色，但仅此处使用鲜明色
      danger: `bg-red-600 text-white hover:bg-red-700 active:bg-red-700 ${disabledCls}`,
      // 纯透明的最轻按钮
      ghost: `bg-transparent text-neutral-600 hover:bg-black/[0.03] active:bg-black/[0.05] dark:text-zinc-400 dark:hover:bg-white/[0.05] ${disabledCls}`,
      // 链接风格去蓝色，统一中性
      link: `bg-transparent underline underline-offset-2 text-neutral-900 hover:opacity-80 active:opacity-70 dark:text-zinc-100 ${disabledCls} p-0`,
    };

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${sizeMap[size]} ${variantMap[variant]} ${className}`}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

/* -------------------------------------------------------------------------- */
/* Input（统一边框/焦点，轻内阴影）                                            */
/* -------------------------------------------------------------------------- */

export const Input = memo(
  ({
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    className = '',
    autoFocus = false,
    ...props
  }: {
    type?: string;
    value: string | number;
    onChange: ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    autoFocus?: boolean;
    pattern?: string;
    maxLength?: number;
    inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url" | "none";
  }) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      className={`w-full rounded-md border border-black/10 bg-white/70 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-inner 
        focus:border-neutral-400/60 focus:outline-none focus:ring-2 focus:ring-neutral-400/50 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-100 dark:placeholder-zinc-500 
        dark:focus:ring-neutral-500/50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

/* -------------------------------------------------------------------------- */
/* NavItem（左侧细指示条 + 克制 hover）                                       */
/* -------------------------------------------------------------------------- */

export const NavItem = memo(
  ({ active, children, onClick, ...props }: { active: boolean; children: ReactNode; onClick: () => void } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>) => (
    <button
      onClick={onClick}
      {...props}
      className={`group relative w-full rounded-md px-3 py-2 text-left text-sm transition-colors
        ${active
          ? 'bg-black/[0.03] text-neutral-900 dark:bg-white/[0.05] dark:text-zinc-100'
          : 'text-neutral-600 hover:bg-black/[0.02] hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-100'
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-zinc-900
      `}
    >
      {/* 左侧细指示条（active 时实线，hover 时半透明） */}
      <span
        className={`pointer-events-none absolute inset-y-1 left-0 w-1 rounded-full content-[''] transition-opacity
          ${active
            ? 'bg-neutral-900 opacity-100 dark:bg-zinc-100'
            : 'bg-neutral-900/60 opacity-0 group-hover:opacity-60 dark:bg-zinc-100/60'
          }`}
      />
      <span className="relative z-10">{children}</span>
    </button>
  ),
);
NavItem.displayName = 'NavItem';
