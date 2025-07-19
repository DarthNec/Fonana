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
    ],
  },
  // Отключаем TypeScript и ESLint проверки при сборке
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    esmExternals: false,
    // Отключаем static generation для всех страниц
    forceSwcTransforms: true,
  },
  // Отключаем static generation полностью
  output: 'standalone',
  trailingSlash: false,
  // Принудительно отключаем static optimization
  generateBuildId: async () => {
    return 'fonana-build-' + Date.now()
  }
}

module.exports = nextConfig 