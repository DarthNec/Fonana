module.exports = {
  apps: [
    {
      name: 'fonana-debug',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3011',
      cwd: '/var/www/fonana',
      env: {
        NODE_ENV: 'production',
        PORT: 3011,
        NEXT_PUBLIC_NODE_ENV: 'staging'
      },
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/fonana-debug-error.log',
      out_file: './logs/fonana-debug-out.log',
      log_file: './logs/fonana-debug-combined.log',
      time: true
    }
  ]
} 