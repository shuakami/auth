import app from './app.js';

const port = process.env.PORT || 3000;

// 启动日志函数
function startupLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [STARTUP-${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
}

// 🔥 根本解决方案：不在函数启动时做数据库初始化！
(async () => {
  const startupStartTime = Date.now();
  
  try {
    startupLog('info', 'Starting auth system (fast startup mode)', {
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform
    });

    // ✅ 移除数据库初始化 - 使用懒加载模式
    // 数据库初始化移到第一次数据库调用时进行
    
    const startupDuration = Date.now() - startupStartTime;
    startupLog('info', 'Auth system ready (database will initialize on first request)', {
      startupDuration: `${startupDuration}ms`,
      environment: process.env.NODE_ENV
    });

    // 本地开发服务器
    if (process.env.NODE_ENV !== 'production') {
      app.listen(port, () => {
        startupLog('info', `Development server listening on http://localhost:${port}`, { port });
      });
    }

  } catch (error) {
    const startupDuration = Date.now() - startupStartTime;
    startupLog('error', 'Auth system startup failed', {
      startupDuration: `${startupDuration}ms`,
      error: error.message,
      code: error.code
    });
    
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    } else {
      throw error;
    }
  }
})();

export default app;
