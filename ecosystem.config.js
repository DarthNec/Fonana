module.exports = {
  apps: [
    {
      name: 'fonana',
      script: './start-production-final.js',
      instances: 1,
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      error_file: '/var/www/fonana/logs/pm2-error.log',
      out_file: '/var/www/fonana/logs/pm2-out.log',
      env_file: './.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      time: true,
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 3,
      restart_delay: 4000
    },
    {
      name: 'fonana-ws',
      script: './websocket-server/index.js',
      instances: 1,
      exec_mode: 'cluster',
      max_memory_restart: '200M',
      env_file: './.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      time: true,
      merge_logs: true
    }
  ]
} 