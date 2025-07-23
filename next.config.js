// Переменные окружения теперь передаются через PM2 ecosystem.config.js
// Загрузка dotenv больше не нужна

require('dotenv').config()

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/posts/*',
      },
    ],
  },
  
  // 🔧 ФИКС M7: App Router body size limit для file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // Supports images(10MB), videos(100MB), audio(50MB)
    },
  },

  webpack: (config, { isServer }) => {
    // Не загружать определенные модули на клиенте
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    return config
  },

  // Отключаем static generation полностью
  // output: 'standalone', // 🔧 REMOVED: ломает static file serving в subdirectories
  // Ignore pre-render errors for standalone generation
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  
  // Experimental features
  swcMinify: true,
  
  // Enable source maps in production для better debugging
  productionBrowserSourceMaps: false,
  
  // Добавляем поддержку модулей
  transpilePackages: ['three'],
}

module.exports = nextConfig 