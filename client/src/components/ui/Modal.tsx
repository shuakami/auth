'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  showCloseButton = true,
  size = 'md',
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // 使用 setTimeout 确保 DOM 渲染后再触发动画
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isVisible) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        style={{
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
        onClick={handleBackdropClick}
      />

      {/* Modal Container */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className={`relative bg-background rounded-2xl w-full ${sizeClasses[size]} shadow-2xl`}
          style={{
            opacity: isAnimating ? 1 : 0,
            transform: isAnimating ? 'scale(1)' : 'scale(0.96)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between p-6 pb-0">
              <div className="flex-1 pr-4">
                {title && (
                  <h2 className="text-lg font-medium text-regular">{title}</h2>
                )}
                {description && (
                  <p className="text-sm text-muted mt-1">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-muted hover:text-regular transition-colors p-1 -m-1"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// 确认模态框
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  icon?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} size="sm">
      <div className="text-center">
        {icon && (
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
        <h2 className="text-lg font-medium text-regular">{title}</h2>
        {description && (
          <p className="text-sm text-muted mt-2">{description}</p>
        )}
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="cursor-pointer flex-1 h-10 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`cursor-pointer flex-1 h-10 font-medium text-sm rounded-full transition-colors ${
            variant === 'danger'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-foreground text-background hover:bg-foreground/90'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

// 表单模态框
interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  submitText?: string;
  cancelText?: string;
  children: React.ReactNode;
  isLoading?: boolean;
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  submitText = 'Save',
  cancelText = 'Cancel',
  children,
  isLoading = false,
}: FormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {children}
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer h-9 px-4 font-medium text-sm rounded-full border border-muted bg-transparent text-regular hover:bg-overlay-hover transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="cursor-pointer h-9 px-4 font-medium text-sm rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// 输入框组件
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-regular">{label}</label>
      )}
      <input
        className={`w-full h-10 px-3 text-sm rounded-lg border border-muted bg-transparent text-regular placeholder:text-muted focus:outline-none focus:border-primary transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}
