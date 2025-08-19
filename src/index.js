import app from './app.js';
import { init as initDb, quickConnectTest } from './db/index.js';

const port = process.env.PORT || 3000;

// 启动日志函数
function startupLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [STARTUP-${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');
}

(async () => {
  const startupStartTime = Date.now();
  
  try {
    startupLog('info', 'Starting auth system initialization', {
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform
    });

    // 数据库初始化
    startupLog('info', 'Initializing database connection and schema...');
    await initDb();
    
    // 验证数据库连接
    startupLog('info', 'Performing quick database connection test...');
    await quickConnectTest();
    
    const startupDuration = Date.now() - startupStartTime;
    startupLog('info', 'Auth system initialization completed successfully', {
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
    startupLog('error', 'Auth system initialization failed catastrophically', {
      startupDuration: `${startupDuration}ms`,
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // 在生产环境中不退出进程，让Vercel处理错误
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    } else {
      // 抛出错误让Vercel显示适当的错误页面
      throw error;
    }
  }
})();

export default app;
