// Переменные окружения теперь передаются через PM2 ecosystem.config.js

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
    // 🔧 ФИКС: Отключаем оптимизацию для BunnyStorage чтобы сохранить оригинальный формат
    unoptimized: true,
  },
  
  // 🔧 ФИКС M7: App Router body size limit для file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb', // Supports images(100MB), videos(200MB), audio(100MB)
    },
  },

  webpack: (config, { isServer, dev }) => {
    // 🔧 ФИКС: Исправление проблемы с tr46.js и другими webpack ошибками
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    }


    // 🔧 ФИКС: Игнорируем проблемные модули
    config.externals = config.externals || []
    if (isServer) {
      config.externals.push({
        'tr46': 'commonjs tr46',
        'web-streams-polyfill': 'commonjs web-streams-polyfill',
      })
    }

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
  typescript: {
    ignoreBuildErrors: true,
  },
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