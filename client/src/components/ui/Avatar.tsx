'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from 'lucide-react';

/**
 * Gravatar头像选项
 */
export interface GravatarOptions {
  /** 邮箱地址 */
  email?: string;
  /** 邮箱MD5哈希值（如果提供则忽略email） */
  hash?: string;
  /** 头像尺寸，1-2048像素 */
  size?: number;
  /** 默认头像类型 */
  defaultImage?: 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank' | '404';
  /** 头像分级 */
  rating?: 'g' | 'pg' | 'r' | 'x';
}

/**
 * 生成Gravatar头像URL
 * @param options Gravatar选项
 * @returns 完整的头像URL
 */
export function generateGravatarUrl(options: GravatarOptions): string {
  const { email, hash, size = 80, defaultImage = 'identicon', rating = 'g' } = options;
  
  // 构建查询参数
  const params = new URLSearchParams({
    s: size.toString(),
    d: defaultImage,
    r: rating,
  });

  // 如果提供了hash，优先使用hash；否则直接使用email
  if (hash) {
    params.set('hash', hash);
  } else if (email) {
    params.set('email', email);
  } else {
    throw new Error('必须提供email或hash参数');
  }

  // 使用提供的代理服务
  return `https://uapis.cn/api/v1/avatar/gravatar?${params.toString()}`;
}

/**
 * Gravatar头像组件属性
 */
export interface AvatarProps {
  /** 邮箱地址 */
  email?: string;
  /** 邮箱MD5哈希值 */
  hash?: string;
  /** 头像尺寸（像素） */
  size?: number;
  /** CSS类名 */
  className?: string;
  /** 默认头像类型 */
  defaultImage?: GravatarOptions['defaultImage'];
  /** 头像分级 */
  rating?: GravatarOptions['rating'];
  /** 是否显示加载占位符 */
  showPlaceholder?: boolean;
  /** 占位符内容 */
  placeholder?: React.ReactNode;
  /** 图片加载失败时的回调 */
  onError?: () => void;
  /** 图片加载成功时的回调 */
  onLoad?: () => void;
}

/**
 * Gravatar头像组件
 * 
 * 支持高性能的Gravatar头像显示，内置缓存和错误处理
 */
export default function Avatar({
  email,
  hash,
  size = 40,
  className = '',
  defaultImage = 'identicon',
  rating = 'g',
  showPlaceholder = true,
  placeholder,
  onError,
  onLoad,
}: AvatarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 生成头像URL
  const avatarUrl = useMemo(() => {
    try {
      return generateGravatarUrl({
        email,
        hash,
        size: size * 2, // 使用2倍尺寸以支持高DPI显示
        defaultImage,
        rating,
      });
    } catch (error) {
      console.error('生成Gravatar URL失败:', error);
      return null;
    }
  }, [email, hash, size, defaultImage, rating]);

  // 重置状态当URL变化时
  useEffect(() => {
    if (avatarUrl) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [avatarUrl]);

  // 处理图片加载成功
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  // 处理图片加载失败
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // 计算容器样式
  const containerClasses = `
    relative inline-flex items-center justify-center
    bg-neutral-100 dark:bg-zinc-800
    rounded-full overflow-hidden
    ${className}
  `.trim();

  // 如果没有有效的URL，显示默认头像
  if (!avatarUrl || hasError) {
    return (
      <div 
        className={containerClasses}
        style={{ width: size, height: size }}
      >
        {placeholder || (
          <User 
            className="text-neutral-400 dark:text-zinc-500" 
            size={size * 0.6} 
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className={containerClasses}
      style={{ width: size, height: size }}
    >
      {/* 加载占位符 */}
      {isLoading && showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center">
          {placeholder || (
            <div className="w-full h-full bg-neutral-200 dark:bg-zinc-700 animate-pulse rounded-full" />
          )}
        </div>
      )}
      
      {/* 头像图片 */}
      <img
        src={avatarUrl}
        alt="头像"
        className={`
          w-full h-full object-cover rounded-full
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          transition-opacity duration-200
        `}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}

/**
 * 头像组件的变体，支持更多自定义选项
 */
export function AvatarWithFallback({
  email,
  username,
  size = 40,
  className = '',
  ...props
}: AvatarProps & { username?: string }) {
  // 如果有用户名，使用首字母作为后备
  const fallbackContent = username ? (
    <span 
      className="text-neutral-600 dark:text-zinc-300 font-medium"
      style={{ fontSize: size * 0.4 }}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  ) : undefined;

  return (
    <Avatar
      email={email}
      size={size}
      className={className}
      placeholder={fallbackContent}
      {...props}
    />
  );
}