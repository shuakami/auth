/**
 * i18n Context
 * 提供语言切换和翻译功能
 * 支持从用户账户同步语言偏好
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { zh, type Locale } from './locales/zh';
import { en } from './locales/en';
import { useAuth } from '@/context/AuthContext';
import { updateLocale } from '@/services/api';

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
  const { user, isAuthenticated } = useAuth();
  const initializedFromUser = useRef(false);

  // 初始化时从用户账户或 localStorage 读取语言设置
  useEffect(() => {
    // 优先使用用户账户的语言设置
    if (isAuthenticated && user?.locale && !initializedFromUser.current) {
      const userLocale = user.locale as Language;
      if (userLocale === 'zh' || userLocale === 'en') {
        setLanguageState(userLocale);
        localStorage.setItem(STORAGE_KEY, userLocale);
        initializedFromUser.current = true;
      }
    } else if (!initializedFromUser.current) {
      // 未登录或用户无语言设置时，从 localStorage 读取
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && (stored === 'zh' || stored === 'en')) {
        setLanguageState(stored);
      }
    }
    setMounted(true);
  }, [isAuthenticated, user?.locale]);

  // 切换语言（同时保存到本地和服务器）
  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    
    // 如果已登录，同步到服务器
    if (isAuthenticated) {
      try {
        await updateLocale(lang);
      } catch (err) {
        // 静默失败，本地已保存
        console.error('Failed to sync locale to server:', err);
      }
    }
  }, [isAuthenticated]);

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
