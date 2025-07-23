# 📊 IMPACT ANALYSIS v1: Standalone Fix Production Impact

**Дата**: 2025-01-20  
**Анализируемые изменения**: Копирование static files + обновление PM2 config  
**Классификация рисков**: 🔴 Critical | 🟡 Major | 🟢 Minor  

## 🎯 SCOPE АНАЛИЗА

### **Затрагиваемые системы:**
- ✅ **PM2 Process Manager** - restart приложения  
- ✅ **File System** - копирование static files
- ✅ **Network/HTTP** - изменение serving статики
- ❌ **Database** - НЕ затрагивается
- ❌ **SSL/Security** - НЕ затрагивается  
- ❌ **DNS/Domain** - НЕ затрагивается

### **Пользовательское воздействие:**
- **Downtime**: 10-15 секунд во время PM2 restart
- **Performance**: Значительное улучшение (404 → работающие static files)
- **Functionality**: От 0% функциональности к 100%

## 🔴 КРИТИЧЕСКИЕ РИСКИ

### **Risk #1: PM2 Restart Failure**
**Вероятность**: 5% | **Воздействие**: Полный downtime

**Сценарий**: PM2 не может запустить новый процесс
```bash
# Симптомы:
pm2 status → "stopped" или "errored"
curl localhost:3000 → Connection refused
```

**Причины**:
- Некорректный ecosystem.config.js синтаксис
- Недостаток памяти на сервере
- Конфликт портов

**Mitigation**:
- ✅ Валидация ecosystem.config.js перед применением
- ✅ Проверка свободной памяти: `free -h`
- ✅ Готовый rollback план

### **Risk #2: Disk Space Exhaustion**  
**Вероятность**: 10% | **Воздействие**: System instability

**Сценарий**: Копирование static files заполняет диск
```bash
# Проверка размера:
du -sh /var/www/Fonana/.next/static/  # ~50-100MB ожидается
df -h  # Проверить свободное место
```

**Mitigation**:
- ✅ Pre-check disk space перед копированием
- ✅ Использовать symlink вместо copy если места мало

## 🟡 СРЕДНИЕ РИСКИ

### **Risk #3: Static Files Corruption During Copy**
**Вероятность**: 2% | **Воздействие**: Broken assets, но сайт функционален

**Сценарий**: Неполное копирование или повреждение файлов
```bash
# Валидация:
find .next/standalone/.next/static/ -size 0  # Найти пустые файлы
```

**Mitigation**:
- ✅ Проверка integrity после копирования
- ✅ Backup текущих static files

### **Risk #4: Cache Issues**
**Вероятность**: 15% | **Воздействие**: Пользователи видят старые/сломанные версии

**Сценарий**: Browser/CDN cache содержит 404 ответы для static files

**Mitigation**:
- ✅ Force refresh после fix: Ctrl+F5
- ✅ Версионирование static files через Next.js build ID

### **Risk #5: Ecosystem Config Mismatch**
**Вероятность**: 5% | **Воздействие**: Несоответствие PM2 процесса и конфига

**Сценарий**: PM2 запущен вручную, но ecosystem.config.js другой

**Mitigation**:
- ✅ Остановить все процессы и запустить через ecosystem.config.js
- ✅ Проверить соответствие: `pm2 show fonana-app`

## 🟢 МАЛЫЕ РИСКИ

### **Risk #6: Temporary Performance Degradation**
**Вероятность**: 20% | **Воздействие**: Медленная загрузка 30-60 секунд

**Сценарий**: Static files не в cache, первые запросы медленные

**Mitigation**: Ожидаемо и временно

### **Risk #7: Log Flooding**
**Вероятность**: 10% | **Воздействие**: Много логов в первые минуты

**Сценарий**: Изменение error 404 → success 200 генерирует много логов

**Mitigation**: Ожидаемо и не критично

## 🔄 ОБРАТНАЯ СОВМЕСТИМОСТЬ

### **Изменения в API**: ❌ НЕТ
### **Изменения в Database**: ❌ НЕТ  
### **Изменения в Authentication**: ❌ НЕТ
### **Изменения в External Services**: ❌ НЕТ

### **Backward Compatibility**: ✅ 100%
- Все существующие URLs работают
- Все API endpoints сохраняются
- Пользовательские данные не затрагиваются

## 📊 PERFORMANCE IMPACT MATRIX

| Метрика | До | После | Изменение |
|---------|----|----|-------|
| Page Load Time | ∞ (broken) | 2s | +100% |
| Static Assets Load | 404 error | 200ms | +100% |
| Server Response Time | 20ms | 20ms | 0% |
| Memory Usage | 150MB | 150MB | 0% |
| Disk Usage | 2GB | 2.1GB | +5% |
| Network Bandwidth | Low (404s) | Normal | +10% |

## 🚨 EMERGENCY SCENARIOS

### **Scenario A: Полный отказ после изменений**
```bash
# Recovery план:
ssh root@64.20.37.222
pm2 stop fonana-app
pm2 start .next/standalone/server.js --name fonana-app
# Возврат к сломанному но стабильному состоянию
```

### **Scenario B: Static files не служатся**
```bash
# Fallback к Nginx static serving:
# Добавить в nginx конфиг location /_next/static/
nginx -t && systemctl reload nginx
```

### **Scenario C: Out of disk space**
```bash
# Очистка дублированных файлов:
rm -rf /var/www/Fonana/.next/standalone/.next/static/
# Переход на symlink approach
```

## ✅ PRE-FLIGHT CHECKLIST

Перед выполнением изменений проверить:

- [ ] **Disk space**: `df -h` > 1GB свободного места
- [ ] **Memory**: `free -h` > 500MB свободной памяти  
- [ ] **PM2 status**: `pm2 status` показывает stable process
- [ ] **Backup**: Создать snapshot текущего состояния
- [ ] **Network**: `curl localhost:3000` отвечает 200 OK
- [ ] **SSL**: `curl https://fonana.me` работает

## 🎯 SUCCESS CRITERIA

### **Immediate (0-5 минут):**
- ✅ PM2 процесс в статусе "online"
- ✅ `curl localhost:3000` возвращает 200 OK
- ✅ Static files существуют в standalone папке

### **Short-term (5-15 минут):**
- ✅ Browser загружает сайт без ошибок
- ✅ Console показывает 0 network errors
- ✅ CSS стили применяются корректно

### **Long-term (15+ минут):**
- ✅ Сайт стабильно работает без downtime
- ✅ Performance metrics в норме
- ✅ No regression в функциональности

## 📋 OVERALL RISK ASSESSMENT

**Общий уровень риска**: 🟢 **НИЗКИЙ**

**Обоснование**:
- Минимальные изменения в production компонентах
- Обратимые операции с clear rollback планом  
- Не затрагивает критические системы (DB, Auth, SSL)
- Высокий potential benefit vs низкий risk

**Рекомендация**: ✅ **PROCEED** с выполнением плана

---
**NEXT**: Создать IMPLEMENTATION_SIMULATION.md для моделирования выполнения 