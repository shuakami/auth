/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  basePath: '/client',

  // ESLint and TypeScript checks should run during build
  // eslint: {
  //   ignoreDuringBuilds: false,
  // },
  // typescript: {
  //   ignoreBuildErrors: false,
  // },

  // Rewrites are handled by vercel.json, no need for them here on Vercel
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: '/api/:path*',
  //     },
  //     {
  //       source: '/auth/:path*',
  //       destination: '/api/auth/:path*',
  //     },
  //   ];
  // },
};

export default nextConfig; 