'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { Tooltip } from './Tooltip';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import http from 'highlight.js/lib/languages/http';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('http', http);

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative my-4 rounded-xl border border-muted overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-muted bg-surface-l1">
        <span className="text-xs text-muted uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{language}</span>
        <Tooltip content={copied ? 'Copied!' : 'Copy code'}>
          <button
            onClick={handleCopy}
            className="cursor-pointer text-muted hover:text-primary transition-colors relative"
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
      </div>
      <pre className="p-4 overflow-x-auto bg-background">
        <code 
          ref={codeRef}
          className={`text-sm leading-relaxed language-${language}`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
