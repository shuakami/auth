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
      <h2 className="text-lg font-medium text-neutral-900 dark:text-zinc-100">{title}</h2>
      {children}
    </section>
  ),
);
Section.displayName = 'Section';

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
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
      'rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 transition ease-in-out duration-150';
    const sizeMap = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    const variantMap = {
      primary: `bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      secondary: `bg-neutral-200 text-neutral-700 hover:bg-neutral-300 focus:ring-indigo-500 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      danger: `bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      ghost: `bg-transparent text-neutral-600 hover:bg-neutral-100 focus:ring-indigo-500 dark:text-zinc-400 dark:hover:bg-zinc-700 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      link: `bg-transparent text-blue-600 underline hover:text-blue-700 focus:ring-indigo-500 dark:text-blue-400 dark:hover:text-blue-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } p-0`,
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
/* Input                                                                      */
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
      className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder-zinc-500 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

/* -------------------------------------------------------------------------- */
/* NavItem                                                                    */
/* -------------------------------------------------------------------------- */

export const NavItem = memo(
  ({ active, children, onClick, ...props }: { active: boolean; children: ReactNode; onClick: () => void } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'>) => (
    <button
      onClick={onClick}
      {...props}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active
          ? 'bg-neutral-100 font-medium text-neutral-900 dark:bg-zinc-800 dark:text-zinc-100'
          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  ),
);
NavItem.displayName = 'NavItem';
