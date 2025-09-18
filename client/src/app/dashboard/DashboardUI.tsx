'use client';

import {
  memo,
  type MouseEventHandler,
  type ChangeEventHandler,
  type ReactNode,
} from 'react';

/* -------------------------------------------------------------------------- */
/* Section（去卡面，强调标题节奏）                                            */
/* -------------------------------------------------------------------------- */

export const Section = memo(
  ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="space-y-4">
      <h2 className="text-[18px] font-medium leading-tight tracking-tight text-neutral-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  ),
);
Section.displayName = 'Section';

/* -------------------------------------------------------------------------- */
/* Button（中性主按钮 + 轻量交互）                                            */
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
      'rounded-md font-medium transition ease-in-out duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-zinc-900';
    const sizeMap = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    const disabledCls = disabled ? 'opacity-50 cursor-not-allowed' : '';

    const variantMap = {
      primary: `bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 ${disabledCls}`,
      secondary: `border border-black/10 bg-transparent text-neutral-900 hover:bg-black/[0.03] active:bg-black/[0.05] dark:border-white/10 dark:text-zinc-100 dark:hover:bg-white/[0.06] ${disabledCls}`,
      danger: `bg-red-600 text-white hover:bg-red-700 active:bg-red-700 ${disabledCls}`,
      ghost: `bg-transparent text-neutral-600 hover:bg-black/[0.03] active:bg-black/[0.05] dark:text-zinc-400 dark:hover:bg-white/[0.05] ${disabledCls}`,
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
/* Input（无厚重卡面；统一边框/焦点）                                          */
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
      className={`w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 
        focus:border-neutral-400/60 focus:outline-none focus:ring-2 focus:ring-neutral-400/40 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 
        dark:focus:ring-neutral-500/40 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

/* -------------------------------------------------------------------------- */
/* NavItem（纯文字侧栏：左侧细点指示 + 轻 hover）                             */
/* -------------------------------------------------------------------------- */

export const NavItem = memo(
  ({ active, children, onClick, ...props }: { active: boolean; children: ReactNode; onClick: () => void } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>) => (
    <button
      onClick={onClick}
      {...props}
      className={`group relative flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors
        ${active
          ? 'text-neutral-900 dark:text-zinc-100'
          : 'text-neutral-600 hover:text-neutral-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 dark:focus-visible:ring-neutral-600 dark:focus-visible:ring-offset-zinc-900
      `}
    >
      {/* 左侧细点：active 实心，hover 半透 */}
      <span
        className={`h-1.5 w-1.5 rounded-full transition-opacity
          ${active ? 'bg-neutral-900 dark:bg-zinc-100 opacity-100' : 'bg-neutral-900/60 dark:bg-zinc-100/60 opacity-0 group-hover:opacity-60'}`}
      />
      <span className="relative">{children}</span>
    </button>
  ),
);
NavItem.displayName = 'NavItem';
