/**
 * i18n Context
 * 提供语言切换和翻译功能
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { zh, type Locale } from './locales/zh';
import { en } from './locales/en';

// 支持的语言
export type Language = 'zh' | 'en';

// 语言包映射
const locales: Record<Language, Locale> = { zh, en };

// 语言显示名称（双语标签）
export const languageNames: Record<Language, string> = {
  zh: '简体中文 (Chinese)',
  en: 'English (英文)',
};

// Context 类型
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Locale;
}

const I18nContext = createContext<I18nContextType | null>(null);

// 本地存储 key
const STORAGE_KEY = 'dashboard-language';

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
}

export function I18nProvider({ children, defaultLanguage = 'zh' }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [mounted, setMounted] = useState(false);

  // 初始化时从 localStorage 读取语言设置
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && (stored === 'zh' || stored === 'en')) {
      setLanguageState(stored);
    }
    setMounted(true);
  }, []);

  // 切换语言
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  // 当前语言包
  const t = useMemo(() => locales[language], [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  // 避免 hydration 不匹配
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ language: defaultLanguage, setLanguage, t: locales[defaultLanguage] }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Hook: 获取完整 i18n context
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Hook: 仅获取翻译对象
export function useTranslation() {
  const { t } = useI18n();
  return t;
}

// 工具函数：替换模板变量
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
}
