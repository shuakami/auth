'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'borderless';
}

export function Select({ value, onChange, options, placeholder = 'Select...', className = '', variant = 'default' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 150);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const selectedOption = options.find(o => o.value === value);

  // 根据 variant 决定触发器样式
  const triggerStyles = variant === 'borderless'
    ? 'w-full h-10 px-3 rounded-lg bg-transparent text-left flex items-center justify-between gap-2 hover:bg-overlay-hover transition-colors focus:outline-none cursor-pointer'
    : 'w-full h-10 px-3 rounded-lg border border-muted bg-transparent text-left flex items-center justify-between gap-2 hover:border-primary/50 transition-colors focus:outline-none focus:border-primary cursor-pointer';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerStyles}
      >
        <span className={selectedOption ? 'text-primary text-sm' : 'text-muted text-sm'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {shouldRender && (
        <div 
          className="absolute top-full right-0 mt-1.5 p-1 bg-background border border-muted rounded-xl shadow-lg z-50 min-w-full whitespace-nowrap"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                handleClose();
              }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-3 rounded-lg transition-colors cursor-pointer ${
                option.value === value 
                  ? 'bg-foreground/5 text-primary' 
                  : 'text-regular hover:bg-overlay-hover'
              }`}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
