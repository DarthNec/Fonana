module.exports = {
  apps: [
    {
      name: 'fonana',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: '/var/www/Fonana/logs/pm2-error.log',
      out_file: '/var/www/Fonana/logs/pm2-out.log',
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
      name: 'websocket-server',
      script: './websocket-server/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env_file: './websocket-server/.env',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 3002
      },
      time: true,
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 3,
      restart_delay: 4000,
      cron_restart: '0 4 * * *'
    }
  ]
} 