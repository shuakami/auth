'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'cursor-pointer inline-flex items-center justify-center font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-foreground text-background hover:bg-foreground/90 rounded-full',
      secondary: 'border border-muted bg-transparent text-regular hover:bg-overlay-hover rounded-full',
      danger: 'text-red-500 hover:bg-red-500/10 rounded-full',
      ghost: 'text-muted hover:text-primary hover:bg-overlay-hover rounded-lg',
    };

    const sizes = {
      sm: 'h-7 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-10 px-5 text-sm gap-2',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon button for standalone icon actions
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', size = 'md', children, ...props }, ref) => {
    const sizes = {
      sm: 'p-1',
      md: 'p-2',
    };

    return (
      <button
        ref={ref}
        className={`cursor-pointer text-muted hover:text-primary transition-colors ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
