import expressJSDocSwagger from 'express-jsdoc-swagger';

// API文档配置
const options = {
  info: {
    version: '1.0.0',
    title: 'Auth | 统一身份验证服务',
    description: `SDJZ.Wiki 统一身份验证服务 API 文档`,
    license: {
      name: 'MIT',
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sid'
      }
    }
  },
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

    // 监听文档生成完成事件
    instance.on('finish', (swaggerDef) => {
      console.log('Swagger生成完成');
    });

    // 注入Scalar UI
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>API Documentation</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body>
            <script
              id="api-reference"
              data-url="/api-docs/json">
            </script>
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
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