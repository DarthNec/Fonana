module.exports = {
  apps: [
    {
      name: 'fonana',
      script: './start-production-v2.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/fonana_dev?schema=public',
        NEXTAUTH_SECRET: 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U=',
        NEXTAUTH_URL: 'https://fonana.me'
      },
      error_file: '/var/www/fonana/logs/pm2-error.log',
      out_file: '/var/www/fonana/logs/pm2-out.log',
      log_file: '/var/www/fonana/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'fonana-ws',
      script: './index.js',
      cwd: './websocket-server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        WS_PORT: 3002,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/fonana_dev?schema=public',
        NEXTAUTH_SECRET: 'rFbhMWHvRfv9AacQlVquu9JnY1jCoioNdpaPfIkAK9U='
      },
      error_file: '/var/www/fonana/logs/ws-error.log',
      out_file: '/var/www/fonana/logs/ws-out.log',
      log_file: '/var/www/fonana/logs/ws-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
} 