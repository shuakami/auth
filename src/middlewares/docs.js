import expressJSDocSwagger from 'express-jsdoc-swagger';

// API文档配置
const options = {
  info: {
    version: '1.0.0',
    title: 'Auth | 统一身份验证服务',
    description: `SDJZ.Wiki 统一身份验证服务 API 文档`,
    license: {
      name: 'GPL-3.0',
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sid',
        description: '会话 Cookie (Session ID)。登录后自动设置，有效期 30 分钟，具有滚动续期机制。'
      }
    }
  },
  security: [
    {
      cookieAuth: []
    }
  ],
  baseDir: process.cwd(),
  filesPattern: './src/{routes,types}/**/*.js',
  swaggerUIPath: '/api-docs/swagger',
  exposeSwaggerUI: true,
  exposeApiDocs: true,
  apiDocsPath: '/api-docs/json',
  notRequiredAsNullable: false,
};

// 文档中间件
export function setupDocs(app) {
  if (process.env.NODE_ENV !== 'production') {
    const instance = expressJSDocSwagger(app)(options);
    const appVersion = process.env.npm_package_version || '1.1.0'; // 从 package.json 获取版本号
    const environment = (process.env.NODE_ENV || 'development').toUpperCase(); // 获取环境并大写

    // 监听文档生成完成事件
    instance.on('finish', (swaggerDef) => {
      console.log('Swagger生成完成');
    });
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>API Documentation</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" type="image/x-icon" href="/favicon.ico">
            <style>
              :root {
                --header-bg: var(--scalar-background-color);
                --header-border: var(--scalar-background-2);
                --header-text: #333;
                --header-info: #555;
              }

              @media (prefers-color-scheme: dark) {
                :root {
                  --header-text: #eee;
                  --header-info: #bbb;
                }
              }

              /* Custom header styling */
              .custom-scalar-header {
                background-color: var(--header-bg);
                padding: 8px 20px;
                border-bottom: 1px solid var(--header-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif;
                color: var(--header-text);
              }

              .custom-scalar-header img.scalar-logo {
                height: 24px;
                width: auto;
              }

              .custom-scalar-header .header-info {
                font-size: 0.8em;
                color: var(--header-info);
              }

              .custom-scalar-header .header-info span + span {
                margin-left: 10px;
              }

              /* Floating Logo styles */
              #floating-logo {
                position: fixed;
                bottom: 15px;
                right: 5px;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 48px;
                height: 48px;
              }

              #floating-logo.visible {
                opacity: 1;
                visibility: visible;
              }

              #floating-logo img {
                width: 32px;
                height: 32px;
              }
            </style>
          </head>
          <body>
            <!-- Custom Header with Logo and Info -->
            <div class="custom-scalar-header">
              <img class="scalar-logo" src="/assets/images/logo/logo-text-white.png" alt="Logo" />
              <div class="header-info">
                <span>${appVersion}</span>
                <span>/</span>
                <span>${environment}</span>
              </div>
            </div>

            <!-- Scalar API Reference script tag -->
            <script
              id="api-reference"
              data-url="/api-docs/json"
            >
            </script>

            <!-- Floating Logo / Scroll to Top -->
            <a href="#" id="floating-logo" title="返回顶部">
              <img src="/assets/images/logo/logo-white.png" alt="Logo" />
            </a>

            <!-- Scalar CDN script & Scroll logic -->
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
            <script>
              const floatingLogo = document.getElementById('floating-logo');
              const scrollThreshold = 150;

              window.addEventListener('scroll', () => {
                if (window.scrollY > scrollThreshold) {
                  floatingLogo.classList.add('visible');
                } else {
                  floatingLogo.classList.remove('visible');
                }
              });

              floatingLogo.addEventListener('click', (event) => {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              });

              // 根据暗色模式切换logo
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
              const updateLogos = (isDark) => {
                document.querySelector('.scalar-logo').src = isDark ? 
                  '/assets/images/logo/logo-text-black.png' : 
                  '/assets/images/logo/logo-text-white.png';
                document.querySelector('#floating-logo img').src = isDark ? 
                  '/assets/images/logo/logo-black.png' : 
                  '/assets/images/logo/logo-white.png';
              };

              prefersDark.addEventListener('change', (e) => updateLogos(e.matches));
              updateLogos(prefersDark.matches);
            </script>
          </body>
        </html>
      `);
    });

    // 添加错误处理中间件
    app.use('/api-docs/json', (err, req, res, next) => {
      console.error('API文档生成错误:', err);
      res.status(500).json({ error: '文档生成失败' });
    });
  }
} 