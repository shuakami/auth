'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CopyButtonProps {
  text: string;
  className?: string;
  copyLabel?: string;
  copiedLabel?: string;
}

export function CopyButton({ text, className = '', copyLabel = 'Copy', copiedLabel = 'Copied!' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip content={copied ? copiedLabel : copyLabel}>
      <button
        onClick={handleCopy}
        className={`cursor-pointer text-muted hover:text-primary transition-colors relative ${className}`}
      >
        <div className="relative w-3.5 h-3.5">
          <Copy 
            className="h-3.5 w-3.5 absolute inset-0 transition-all duration-200"
            style={{
              opacity: copied ? 0 : 1,
              transform: copied ? 'scale(0.8)' : 'scale(1)',
            }}
          />
          <Check 
            className="h-3.5 w-3.5 absolute inset-0 transition-all duration-200"
            style={{
              opacity: copied ? 1 : 0,
              transform: copied ? 'scale(1)' : 'scale(0.8)',
            }}
          />
        </div>
      </button>
    </Tooltip>
  );
}
