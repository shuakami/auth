/**
 * 面包屑导航组件
 */

import React from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="flex gap-2 p-4 lg:-mt-5 lg:p-0">
      <div className="flex w-full items-center gap-1.5 overflow-hidden">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = item.href || item.onClick;
          
          return (
            <React.Fragment key={index}>
              {index > 0 && <p className="text-sm text-muted flex-shrink-0">/</p>}
              <div className={isLast ? 'overflow-hidden flex-shrink-0' : 'overflow-hidden min-w-0'}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="cursor-pointer block overflow-hidden duration-150 hover:opacity-75"
                  >
                    <p className="text-sm text-muted">{item.label}</p>
                  </Link>
                ) : item.onClick ? (
                  <button
                    onClick={item.onClick}
                    className="cursor-pointer block overflow-hidden duration-150 hover:opacity-75"
                  >
                    <p className="text-sm text-muted">{item.label}</p>
                  </button>
                ) : (
                  <p className={`text-sm ${isClickable ? 'text-muted' : 'text-regular'}`}>{item.label}</p>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
