/**
 * Token状态监控组件
 * 用于开发和调试，显示token状态和刷新信息
 */

import React, { useState } from 'react';
import { useTokenManager } from '../hooks/useTokenManager';

interface TokenStatusMonitorProps {
  className?: string;
  showDetails?: boolean;
}

export const TokenStatusMonitor: React.FC<TokenStatusMonitorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const {
    tokenStatus,
    lastRefreshTime,
    refreshCount,
    lastError,
    manualRefresh,
    formatTimeToExpire,
    formatTimeSinceActivity,
    isNearExpiration,
    isRecentlyActive,
    shouldShowWarning
  } = useTokenManager();

  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await manualRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = () => {
    if (tokenStatus.isExpired) return 'text-red-600 bg-red-50';
    if (isNearExpiration) return 'text-orange-600 bg-orange-50';
    if (shouldShowWarning) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusText = () => {
    if (tokenStatus.isExpired) return '已过期';
    if (isNearExpiration) return '即将过期';
    if (shouldShowWarning) return '注意';
    return '正常';
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Token状态</h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={isExpanded ? '收起详情' : '展开详情'}
          >
            <svg 
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">过期时间:</span>
          <p className="font-medium">
            {tokenStatus.exp ? new Date(tokenStatus.exp * 1000).toLocaleString() : '未知'}
          </p>
        </div>
        <div>
          <span className="text-gray-500">剩余时间:</span>
          <p className="font-medium">
            {formatTimeToExpire()}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
          {/* 详细状态 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">页面状态:</span>
              <p className={`font-medium ${tokenStatus.isVisible ? 'text-green-600' : 'text-orange-600'}`}>
                {tokenStatus.isVisible ? '可见' : '隐藏'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">刷新状态:</span>
              <p className={`font-medium ${tokenStatus.isRefreshing ? 'text-blue-600' : 'text-gray-600'}`}>
                {tokenStatus.isRefreshing ? '进行中' : '空闲'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">最后活动:</span>
              <p className={`font-medium ${isRecentlyActive ? 'text-green-600' : 'text-gray-600'}`}>
                {formatTimeSinceActivity()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">刷新次数:</span>
              <p className="font-medium">{refreshCount}</p>
            </div>
          </div>

          {/* 最后刷新时间 */}
          {lastRefreshTime && (
            <div className="text-sm">
              <span className="text-gray-500">最后刷新:</span>
              <p className="font-medium">{lastRefreshTime.toLocaleString()}</p>
            </div>
          )}

          {/* 错误信息 */}
          {lastError && (
            <div className="text-sm">
              <span className="text-red-500">最后错误:</span>
              <p className="font-medium text-red-600 text-xs mt-1 bg-red-50 p-2 rounded">
                {lastError.message}
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-2 pt-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || tokenStatus.isRefreshing}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                isRefreshing || tokenStatus.isRefreshing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRefreshing ? '刷新中...' : '手动刷新'}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 rounded text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
            >
              重载页面
            </button>
          </div>

          {/* 开发信息 */}
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            <p>开发模式 - Token监控器</p>
            <p>仅在开发环境显示此组件</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenStatusMonitor;