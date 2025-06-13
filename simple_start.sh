#!/bin/bash
cd /var/www/fonana
export NODE_ENV=production
export PORT=3001
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
exec /usr/bin/node .next/standalone/server.js 