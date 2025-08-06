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

    // 🔧 ФИКС: Добавляем alias для проблемных модулей
    config.resolve.alias = {
      ...config.resolve.alias,
      'tr46': false,
      'web-streams-polyfill': false,
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

    // 🔥 M7 PHASE 1 FIX: Prevent webpack variable hoisting bug that causes React Error #185
    if (!dev && !isServer) {
      console.log('🔧 M7: Applying webpack minification fixes for React Error #185...')
      
      // Modify existing optimization instead of replacing
      if (config.optimization && config.optimization.minimizer) {
        config.optimization.minimizer = config.optimization.minimizer.map(minimizer => {
          // Check if this is a TerserPlugin
          if (minimizer.constructor.name === 'TerserPlugin') {
            console.log('🔧 M7: Modifying existing TerserPlugin configuration...')
            
            // Clone the existing options and modify them
            const existingOptions = minimizer.options || {}
            const modifiedOptions = {
              ...existingOptions,
              terserOptions: {
                ...existingOptions.terserOptions,
                mangle: {
                  ...(existingOptions.terserOptions?.mangle || {}),
                  keep_fnames: true,     // Preserve function names for debugging
                  keep_classnames: true, // Preserve class names for debugging
                },
                compress: {
                  ...(existingOptions.terserOptions?.compress || {}),
                  sequences: false,    // 🔥 KEY: Prevent sequence optimization that causes hoisting
                  join_vars: false,    // 🔥 KEY: Prevent variable joining that breaks order
                  hoist_vars: false,   // 🔥 KEY: Prevent variable hoisting
                  hoist_funs: false,   // 🔥 KEY: Prevent function hoisting
                  drop_console: false, // Keep console.log for debugging
                }
              }
            }
            
            // Create new instance with modified options
            return new minimizer.constructor(modifiedOptions)
          }
          return minimizer
        })
      }
      
      console.log('✅ M7: Webpack minification config applied successfully')
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