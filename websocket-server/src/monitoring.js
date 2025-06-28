const fs = require('fs').promises;
const path = require('path');

// Статистика подключений
const stats = {
  totalConnections: 0,
  activeConnections: 0,
  totalMessages: 0,
  authFailures: 0,
  errors: 0,
  startTime: Date.now(),
  connectionsByChannel: new Map(),
  messagesByType: new Map()
};

// Путь к лог-файлам
const LOG_DIR = path.join(__dirname, '../../logs/websocket');

// Инициализация лог-директории
async function initLogs() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

// Логирование события
async function logEvent(type, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    data
  };
  
  // Обновляем статистику
  updateStats(type, data);
  
  // Записываем в файл
  const filename = `ws-${new Date().toISOString().split('T')[0]}.log`;
  const filepath = path.join(LOG_DIR, filename);
  
  try {
    await fs.appendFile(filepath, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

// Обновление статистики
function updateStats(type, data) {
  switch (type) {
    case 'connection':
      stats.totalConnections++;
      stats.activeConnections++;
      break;
      
    case 'disconnect':
      stats.activeConnections = Math.max(0, stats.activeConnections - 1);
      break;
      
    case 'auth_failure':
      stats.authFailures++;
      break;
      
    case 'message':
      stats.totalMessages++;
      if (data.messageType) {
        const count = stats.messagesByType.get(data.messageType) || 0;
        stats.messagesByType.set(data.messageType, count + 1);
      }
      break;
      
    case 'channel_subscribe':
      if (data.channel) {
        const count = stats.connectionsByChannel.get(data.channel) || 0;
        stats.connectionsByChannel.set(data.channel, count + 1);
      }
      break;
      
    case 'channel_unsubscribe':
      if (data.channel) {
        const count = stats.connectionsByChannel.get(data.channel) || 0;
        stats.connectionsByChannel.set(data.channel, Math.max(0, count - 1));
      }
      break;
      
    case 'error':
      stats.errors++;
      break;
  }
}

// Получение текущей статистики
function getStats() {
  const uptime = Date.now() - stats.startTime;
  const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    ...stats,
    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    connectionsByChannel: Object.fromEntries(stats.connectionsByChannel),
    messagesByType: Object.fromEntries(stats.messagesByType),
    averageMessagesPerMinute: stats.totalMessages / (uptime / 60000)
  };
}

// Периодический вывод статистики в консоль
function startStatsReporter(interval = 60000) { // каждую минуту
  setInterval(() => {
    const stats = getStats();
    console.log('\n📊 WebSocket Server Stats:');
    console.log(`   Active Connections: ${stats.activeConnections}`);
    console.log(`   Total Connections: ${stats.totalConnections}`);
    console.log(`   Total Messages: ${stats.totalMessages}`);
    console.log(`   Auth Failures: ${stats.authFailures}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Uptime: ${stats.uptime}`);
    console.log(`   Avg Messages/min: ${stats.averageMessagesPerMinute.toFixed(2)}`);
    
    if (stats.connectionsByChannel && Object.keys(stats.connectionsByChannel).length > 0) {
      console.log('   Connections by Channel:');
      Object.entries(stats.connectionsByChannel).forEach(([channel, count]) => {
        if (count > 0) {
          console.log(`     ${channel}: ${count}`);
        }
      });
    }
    
    if (stats.messagesByType && Object.keys(stats.messagesByType).length > 0) {
      console.log('   Messages by Type:');
      Object.entries(stats.messagesByType).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
    }
    console.log('');
  }, interval);
}

// Экспорт метрик в формате для внешних систем (например, Prometheus)
function exportMetrics() {
  const stats = getStats();
  const metrics = [];
  
  metrics.push(`# HELP ws_active_connections Number of active WebSocket connections`);
  metrics.push(`# TYPE ws_active_connections gauge`);
  metrics.push(`ws_active_connections ${stats.activeConnections}`);
  
  metrics.push(`# HELP ws_total_connections Total number of WebSocket connections`);
  metrics.push(`# TYPE ws_total_connections counter`);
  metrics.push(`ws_total_connections ${stats.totalConnections}`);
  
  metrics.push(`# HELP ws_total_messages Total number of messages processed`);
  metrics.push(`# TYPE ws_total_messages counter`);
  metrics.push(`ws_total_messages ${stats.totalMessages}`);
  
  metrics.push(`# HELP ws_auth_failures Number of authentication failures`);
  metrics.push(`# TYPE ws_auth_failures counter`);
  metrics.push(`ws_auth_failures ${stats.authFailures}`);
  
  metrics.push(`# HELP ws_errors Number of errors`);
  metrics.push(`# TYPE ws_errors counter`);
  metrics.push(`ws_errors ${stats.errors}`);
  
  return metrics.join('\n');
}

// HTTP endpoint для метрик
function createMetricsEndpoint() {
  const http = require('http');
  const METRICS_PORT = process.env.METRICS_PORT || 9090;
  
  const server = http.createServer((req, res) => {
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(exportMetrics());
    } else if (req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStats(), null, 2));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  server.listen(METRICS_PORT, () => {
    console.log(`📊 Metrics endpoint available at http://localhost:${METRICS_PORT}/metrics`);
    console.log(`📊 Stats endpoint available at http://localhost:${METRICS_PORT}/stats`);
  });
}

module.exports = {
  initLogs,
  logEvent,
  getStats,
  startStatsReporter,
  createMetricsEndpoint
}; 