/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  async rewrites() {
    return [
      {
        // 源路径：匹配所有以 /api/ 开头的请求
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
      {
        // 新增：匹配所有以 /auth/ 开头的请求
        source: '/auth/:path*',
        destination: 'http://localhost:3000/auth/:path*',
      },
    ];
  },
};

export default nextConfig; 