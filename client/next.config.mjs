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
};

export default nextConfig; 