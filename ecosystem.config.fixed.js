module.exports = {
  apps: [{
    name: 'fonana-app',
    script: '.next/standalone/server.js',
    cwd: '/var/www/Fonana',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: '/var/log/fonana-error.log',
    out_file: '/var/log/fonana-out.log',
    log_file: '/var/log/fonana.log',
    time: true,
    watch: false,
    autorestart: true,
    restart_delay: 4000
  }]
}; 