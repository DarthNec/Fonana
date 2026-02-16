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
    },
    {
      name: 'sora-checker',
      script: './sorachecker.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '*/1 * * * *', // Запускается каждые 1 минут
      autorestart: false, // Отключаем автоперезапуск, только по крону
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/Fonana/logs/sora-checker-error.log',
      out_file: '/var/www/Fonana/logs/sora-checker-out.log',
      time: true,
      merge_logs: true
    },
    {
      name: 'generation-updater',
      script: './updateUserGeneration.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 4 * * *', // Запускается каждый день в 4:00 утра
      autorestart: false, // Отключаем автоперезапуск, только по крону
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/Fonana/logs/generation-updater-error.log',
      out_file: '/var/www/Fonana/logs/generation-updater-out.log',
      time: true,
      merge_logs: true
    },
    /*
    {
      name: 'ai-chat-bot',
      script: './ai-chat-bot.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/Fonana/logs/ai-chat-bot-error.log',
      out_file: '/var/www/Fonana/logs/ai-chat-bot-out.log',
      time: true,
      merge_logs: true,
      max_restarts: 10,
      restart_delay: 5000
    },
    */
    {
      name: 'ai-activity-bot',
      script: './ai-activity-bot.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '*/30 * * * *', // Каждые 30 минут
      autorestart: false, // Не перезапускаем автоматически, только по крону
      watch: false,
      max_memory_restart: '200M',
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/Fonana/logs/ai-activity-bot-error.log',
      out_file: '/var/www/Fonana/logs/ai-activity-bot-out.log',
      time: true,
      merge_logs: true
    },
    {
      name: 'ai-sora-generation-activity',
      script: './ai-sora-generation-activity.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 */4 * * *', // Каждые 4 часа (в 00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
      autorestart: false, // Не перезапускаем автоматически, только по крону
      watch: false,
      max_memory_restart: '300M',
      env_file: './.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/Fonana/logs/ai-sora-generation-error.log',
      out_file: '/var/www/Fonana/logs/ai-sora-generation-out.log',
      time: true,
      merge_logs: true
    }
  ]
} 