module.exports = {
  apps: [{
    name: 'fonana-ws',
    script: './index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      WS_PORT: 3002
    },
    error_file: '../logs/ws-error.log',
    out_file: '../logs/ws-out.log',
    log_file: '../logs/ws-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
} 