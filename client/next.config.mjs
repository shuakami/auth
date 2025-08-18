/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  reactStrictMode: false,
  
  async rewrites() {
    if (isDev) {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3000/api/:path*',
        },
        {
          source: '/auth/:path*',
          destination: 'http://localhost:3000/auth/:path*',
        },
      ];
    }
    return [];
  },

  async redirects() {
    if (isDev) {
      return [
        {
          source: '/auth/github',
          destination: 'http://localhost:3000/api/github',
          permanent: false,
        },
        {
          source: '/auth/google',
          destination: 'http://localhost:3000/api/google',
          permanent: false,
        },
        {
          source: '/api/session/list',
          destination: 'http://localhost:3000/api/session/list',
          permanent: false,
        },
      ];
    }
    return [];
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  // 优化构建配置
  webpack: (config, { dev, isServer }) => {
    // 优化react-icons的处理
    config.module.rules.push({
      test: /react-icons.*\.mjs$/,
      type: 'javascript/auto',
    });
    
    return config;
  },
  
  // 优化构建性能
  experimental: {
    optimizePackageImports: ['react-icons']
  },
};

export default nextConfig; 