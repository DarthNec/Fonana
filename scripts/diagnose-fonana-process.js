#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 УГЛУБЛЕННАЯ ДИАГНОСТИКА ПРОЦЕССА FONANA\n');
console.log('=' .repeat(50));

// 1. Получаем PID процесса fonana
console.log('\n📦 Информация о процессе:');
try {
  const pm2List = execSync('pm2 jlist', { encoding: 'utf8' });
  const processes = JSON.parse(pm2List);
  const fonanaProcess = processes.find(p => p.name === 'fonana');
  
  if (fonanaProcess) {
    console.log(`   - PID: ${fonanaProcess.pid}`);
    console.log(`   - Uptime: ${fonanaProcess.pm2_env.pm_uptime}`);
    console.log(`   - Restart count: ${fonanaProcess.pm2_env.restart_time}`);
    console.log(`   - Script: ${fonanaProcess.pm2_env.pm_exec_path}`);
    
    // 2. Проверяем переменные окружения через /proc
    console.log('\n🔐 Переменные окружения из /proc:');
    try {
      const envVars = execSync(`cat /proc/${fonanaProcess.pid}/environ | tr '\\0' '\\n' | grep -E 'NEXTAUTH_SECRET|DATABASE_URL|NODE_ENV' | head -5`, { encoding: 'utf8' });
      
      if (envVars) {
        const lines = envVars.split('\n').filter(line => line);
        lines.forEach(line => {
          const [key, value] = line.split('=');
          if (key === 'NEXTAUTH_SECRET') {
            console.log(`   - ${key}: ${value ? `настроен (длина: ${value.length})` : 'НЕ УСТАНОВЛЕН'}`);
          } else {
            console.log(`   - ${key}: ${value || 'НЕ УСТАНОВЛЕН'}`);
          }
        });
      } else {
        console.log('   ⚠️ Переменные не найдены в /proc');
      }
    } catch (error) {
      console.log('   ❌ Ошибка чтения /proc:', error.message);
    }
    
    // 3. Проверяем аргументы запуска
    console.log('\n🚀 Команда запуска:');
    try {
      const cmdline = execSync(`cat /proc/${fonanaProcess.pid}/cmdline | tr '\\0' ' '`, { encoding: 'utf8' });
      console.log(`   ${cmdline}`);
    } catch (error) {
      console.log('   ❌ Ошибка чтения cmdline:', error.message);
    }
  } else {
    console.log('❌ Процесс fonana не найден в PM2');
  }
} catch (error) {
  console.log('❌ Ошибка получения информации о процессе:', error.message);
}

// 4. Проверяем start-production.js
console.log('\n\n📄 Проверка start-production.js:');
try {
  const startScript = execSync('cat /var/www/Fonana/start-production.js | grep -E "dotenv|NEXTAUTH_SECRET|require" | head -10', { encoding: 'utf8' });
  console.log(startScript);
} catch (error) {
  console.log('❌ Ошибка чтения start-production.js:', error.message);
}

// 5. Проверяем реальный запущенный процесс next
console.log('\n\n🎯 Поиск процесса Next.js:');
try {
  const nextProcesses = execSync('ps aux | grep "next start" | grep -v grep', { encoding: 'utf8' });
  const lines = nextProcesses.split('\n').filter(line => line);
  
  if (lines.length > 0) {
    console.log('✅ Найдены процессы Next.js:');
    lines.forEach(line => {
      const parts = line.split(/\s+/);
      const pid = parts[1];
      console.log(`\n   PID: ${pid}`);
      
      // Проверяем переменные этого процесса
      try {
        const hasSecret = execSync(`strings /proc/${pid}/environ | grep NEXTAUTH_SECRET`, { encoding: 'utf8' }).trim();
        console.log(`   - NEXTAUTH_SECRET: ${hasSecret ? 'ЕСТЬ ✅' : 'НЕТ ❌'}`);
      } catch (err) {
        console.log('   - NEXTAUTH_SECRET: НЕТ ❌');
      }
    });
  } else {
    console.log('❌ Процессы Next.js не найдены');
  }
} catch (error) {
  console.log('❌ Ошибка поиска процессов Next.js:', error.message);
}

// 6. Тестируем прямой вызов next с переменными
console.log('\n\n🧪 Тест прямого запуска с переменными:');
try {
  // Создаем тестовый скрипт
  const testScript = `
const secret = process.env.NEXTAUTH_SECRET;
console.log('NEXTAUTH_SECRET loaded:', !!secret);
console.log('Length:', secret ? secret.length : 0);
console.log('First 10 chars:', secret ? secret.substring(0, 10) : 'not-set');
`;
  
  execSync(`echo '${testScript}' > /tmp/test-env.js`, { encoding: 'utf8' });
  
  // Запускаем с dotenv
  console.log('\nЗапуск с dotenv:');
  const withDotenv = execSync('cd /var/www/Fonana && node -r dotenv/config /tmp/test-env.js', { encoding: 'utf8' });
  console.log(withDotenv);
  
  // Запускаем без dotenv
  console.log('Запуск БЕЗ dotenv:');
  const withoutDotenv = execSync('cd /var/www/Fonana && node /tmp/test-env.js', { encoding: 'utf8' });
  console.log(withoutDotenv);
  
} catch (error) {
  console.log('❌ Ошибка теста:', error.message);
}

console.log('\n' + '=' .repeat(50));
console.log('📊 ДИАГНОСТИКА ЗАВЕРШЕНА\n'); 