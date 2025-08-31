/**
 * Token刷新状态管理器
 * 用于控制刷新时Logo展示的显示和隐藏
 */

type RefreshListener = (isRefreshing: boolean) => void;

export class TokenRefreshManager {
  private static instance: TokenRefreshManager | null = null;
  private listeners: Set<RefreshListener> = new Set();
  private _isRefreshing = false;

  private constructor() {}

  public static getInstance(): TokenRefreshManager {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  /**
   * 开始显示刷新Logo
   */
  public startRefresh(): void {
    if (this._isRefreshing) return; // 避免重复调用
    
    this._isRefreshing = true;
    this.notifyListeners();
    console.log('[TokenRefreshManager] 开始显示Token刷新Logo');
  }

  /**
   * 结束显示刷新Logo
   */
  public endRefresh(): void {
    if (!this._isRefreshing) return; // 避免重复调用
    
    this._isRefreshing = false;
    this.notifyListeners();
    console.log('[TokenRefreshManager] 隐藏Token刷新Logo');
  }

  /**
   * 获取当前刷新状态
   */
  public get isRefreshing(): boolean {
    return this._isRefreshing;
  }

  /**
   * 添加状态变化监听器
   */
  public addListener(listener: RefreshListener): void {
    this.listeners.add(listener);
  }

  /**
   * 移除状态变化监听器
   */
  public removeListener(listener: RefreshListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器状态变化
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this._isRefreshing);
      } catch (error) {
        console.error('[TokenRefreshManager] 监听器执行出错:', error);
      }
    });
  }

  /**
   * 清理所有监听器（用于组件卸载时）
   */
  public clearListeners(): void {
    this.listeners.clear();
  }
}

// 导出单例实例
export const tokenRefreshManager = TokenRefreshManager.getInstance();