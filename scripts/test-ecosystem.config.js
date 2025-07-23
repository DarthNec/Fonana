module.exports = {
  apps: [{
    name: 'env-test',
    script: './test-pm2-env-loading.js',
    cwd: '/var/www/Fonana/websocket-server',
    env_file: '/var/www/Fonana/websocket-server/.env',
    autorestart: false
  }]
} 