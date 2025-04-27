import expressJSDocSwagger from 'express-jsdoc-swagger';

/* --------------------------------------------------------------------------
 * Swagger / API-Docs 配置
 * ----------------------------------------------------------------------- */
const options = {
  info: {
    version: '1.0.0',
    title: 'Auth | 统一身份验证服务',
    description: `SDJZ.Wiki 统一身份验证服务 API 文档

[![Security: XSS Defense](https://img.shields.io/badge/Security-XSS_Defense-22c55e?style=flat-square&logo=shield&logoColor=white)](https://owasp.org/www-community/attacks/xss/)
[![Security: Rate Limiting](https://img.shields.io/badge/Security-Rate_Limiting-22c55e?style=flat-square&logo=shield&logoColor=white)](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
[![Auth: Token Mechanism](https://img.shields.io/badge/Auth-Token_Mechanism-3b82f6?style=flat-square&logo=jwt&logoColor=white)](https://jwt.io/)
[![Auth: Argon2 Hashing](https://img.shields.io/badge/Auth-Argon2_Hashing-3b82f6?style=flat-square&logo=keycdn&logoColor=white)](https://github.com/P-H-C/phc-winner-argon2)
`,
    license: { name: 'GPL-3.0' }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '认证使用短生命周期Access Token（JWT），通过Authorization: Bearer <token>传递。'
      }
    }
  },
  security: [{ bearerAuth: [] }],
  baseDir: process.cwd(),
  filesPattern: './src/{routes,types}/**/*.js',
  swaggerUIPath: '/api-docs/swagger',
  exposeSwaggerUI: true,
  exposeApiDocs: true,
  apiDocsPath: '/api-docs/json',
  notRequiredAsNullable: false,
  servers: [
    {
      url: '/api',
      description: 'API Server'
    }
  ]
};

/* --------------------------------------------------------------------------
 * 文档中间件
 * ----------------------------------------------------------------------- */
export function setupDocs(app) {
  /* 仅在开发环境启用文档与调试 UI */
  if (process.env.NODE_ENV === 'production') return;

  /* 初始化 swagger-ui / scalar-ui */
  const swagger = expressJSDocSwagger(app)(options);

  const appVersion = process.env.npm_package_version || '1.1.0';
  const environment = (process.env.NODE_ENV || 'development').toUpperCase();

  swagger.on('finish', () => console.log('Swagger 生成完成'));

  /* ------------------------------------------------------------------
   * 根路由：自定义 Scalar UI
   * ----------------------------------------------------------------*/
  app.get('/', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Documentation</title>
  <link rel="icon" href="/favicon.ico" />

  <style>
    :root{
      --header-bg:var(--scalar-background-color);
      --header-border:var(--scalar-background-2);
      --header-text:#333;
      --header-info:#555;
    }
    @media(prefers-color-scheme:dark){
      :root{--header-text:#eee;--header-info:#bbb;}
    }
    .custom-scalar-header{
      background:var(--header-bg);
      padding:8px 20px;
      border-bottom:1px solid var(--header-border);
      display:flex;align-items:center;justify-content:space-between;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,sans-serif;
      color:var(--header-text);
    }
    .custom-scalar-header img{height:24px}
    .custom-scalar-header .header-info{font-size:.8em;color:var(--header-info);}
    .custom-scalar-header .header-info span+span{margin-left:10px;}
  </style>
</head>
<body>
  <!-- 顶部信息栏 -->
  <div class="custom-scalar-header">
    <img src="/assets/images/logo/logo-text-white.png" alt="Logo" />
    <div class="header-info"><span>${appVersion}</span><span>/</span><span>${environment}</span></div>
  </div>

  <!-- Scalar UI 占位 -->
  <script id="api-reference" data-url="/api-docs/json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference" defer></script>
</body>
</html>`);
  });

  /* API-Docs 生成错误处理 */
  app.use('/api-docs/json', (err, _req, res, _next) => {
    console.error('API 文档生成错误:', err);
    res.status(500).json({ error: '文档生成失败' });
  });
}
