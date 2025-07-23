# 🎯 IMPLEMENTATION SIMULATION v1: Standalone Fix Step-by-Step

**Дата**: 2025-01-20  
**Цель**: Промоделировать каждый шаг выполнения для предотвращения проблем  
**Включает**: Command simulation, edge cases, Playwright automation  

## 🔄 SIMULATION OVERVIEW

**Total Steps**: 24 операции  
**Estimated Time**: 15 минут  
**Critical Points**: 3 (PM2 restart, file copy, validation)  
**Rollback Points**: 4  

## 📊 STEP-BY-STEP SIMULATION

### **PHASE 1: Pre-flight Validation (3 minutes)**

#### **Step 1.1: SSH Connection Test**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'echo "SSH OK"'

# Expected Output:
SSH OK

# Edge Cases:
- Connection timeout → Retry с verbose mode
- Permission denied → Проверить SSH key
- Host unreachable → Проверить IP/DNS
```

#### **Step 1.2: Current System Status Check**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'pm2 status && df -h && free -h'

# Expected Output:
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┐
│ id  │ name         │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┤
│ 0   │ fonana-app   │ default     │ 0.1.0   │ fork    │ 342101   │ 20m    │ 2    │ online    │ 0%       │ 156.6mb  │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┘

Filesystem      Size  Used Avail Use% Mounted on
/dev/vda1        30G   15G   14G  52% /

              total        used        free      shared  buff/cache   available
Mem:           2.9G        1.2G        800M         15M        900M        1.5G

# Validation Criteria:
✅ PM2 status = "online"
✅ Disk space > 1GB free
✅ Memory > 500MB available
```

#### **Step 1.3: Static Files Source Check**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'ls -la /var/www/Fonana/.next/static/chunks/ | head -5'

# Expected Output:
total 2140
drwxr-xr-x  4 root root   4096 Jul 21 00:04 .
drwxr-xr-x  6 root root   4096 Jul 21 00:04 ..
-rw-r--r--  1 root root  13303 Jul 21 00:04 1827-612106339a276bef.js
-rw-r--r--  1 root root  15860 Jul 21 00:04 1840-75d83b3066b2833a.js

# Edge Cases:
- Directory not found → Build не выполнен, запустить npm run build
- Empty directory → Static files не созданы
- Permission denied → Проверить ownership
```

### **PHASE 2: Static Files Copy (5 minutes)**

#### **Step 2.1: Create Target Directory**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'mkdir -p /var/www/Fonana/.next/standalone/.next'

# Expected Output:
(no output = success)

# Edge Cases:
- Permission denied → sudo или check ownership
- Disk full → Очистить место
- Path не существует → mkdir с -p флагом
```

#### **Step 2.2: Copy Static Files**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'cp -r /var/www/Fonana/.next/static /var/www/Fonana/.next/standalone/.next/ && echo "Copy completed"'

# Expected Output:
Copy completed

# Progress Monitoring:
du -sh /var/www/Fonana/.next/standalone/.next/static/

# Edge Cases:
- Disk space insufficient → Используйте symlink
- Copy interrupted → Проверить partial files, retry
- Permission issues → chown/chmod files
```

#### **Step 2.3: Verify Copy Integrity**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'find /var/www/Fonana/.next/standalone/.next/static/chunks/ -name "*.js" | wc -l'

# Expected Output:
42  # (или другое число > 30)

# Validation Commands:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'ls -la /var/www/Fonana/.next/standalone/.next/static/chunks/3513-e74e0943a2287f8d.js'

# Expected:
-rw-r--r-- 1 root root 372581 Jul 21 00:04 3513-e74e0943a2287f8d.js

# Edge Cases:
- 0 files → Copy failed, investigate
- Missing specific files → Selective copy retry
- Size mismatch → Corruption, re-copy
```

### **PHASE 3: Ecosystem Config Update (2 minutes)**

#### **Step 3.1: Backup Current Config**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'cp /var/www/Fonana/ecosystem.config.js /var/www/Fonana/ecosystem.config.js.backup'

# Expected Output:
(no output = success)
```

#### **Step 3.2: Update Ecosystem Config**
```bash
# Command: (через SCP локального файла)
# Создать правильный ecosystem.config.js локально, затем:
scp -i ~/.ssh/fonana_deploy ecosystem.config.js.fixed root@64.20.37.222:/var/www/Fonana/ecosystem.config.js

# Expected Output:
ecosystem.config.js    100%  245    XX.XKB/s   00:00

# Validation:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'cat /var/www/Fonana/ecosystem.config.js | grep script'

# Expected:
    script: '.next/standalone/server.js',
```

### **PHASE 4: PM2 Restart (3 minutes)**

#### **Step 4.1: Stop Current Process**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'pm2 stop fonana-app'

# Expected Output:
[PM2] Applying action stopProcessId on app [fonana-app](ids: [ 0 ])
[PM2] [fonana-app](0) ✓

# Edge Cases:
- Process not found → Проверить имя процесса с pm2 list
- Already stopped → Ожидаемо, продолжить
- Stop timeout → pm2 kill, затем cleanup
```

#### **Step 4.2: Start with New Config**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'cd /var/www/Fonana && pm2 start ecosystem.config.js'

# Expected Output:
[PM2] Starting /var/www/Fonana/ecosystem.config.js
[PM2] App [fonana] launched (1 instances)

# Edge Cases:
- Config syntax error → Проверить JSON валидность
- Port conflict → Kill process на порту 3000
- Memory insufficient → Restart сервер или увеличить swap
```

#### **Step 4.3: Verify PM2 Status**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'pm2 status && pm2 show fonana-app | grep "script path"'

# Expected Output:
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┐
│ id  │ name         │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┤
│ 0   │ fonana-app   │ default     │ 0.1.0   │ fork    │ 423891   │ 0s     │ 0    │ online    │ 0%       │ 45.2mb   │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┘

│ script path       │ /var/www/Fonana/.next/standalone/server.js │

# Validation Criteria:
✅ Status = "online"
✅ PID изменился (новый процесс)
✅ Script path = standalone/server.js
```

### **PHASE 5: HTTP Validation (2 minutes)**

#### **Step 5.1: Internal Server Test**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'curl -I http://localhost:3000'

# Expected Output:
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Type: text/html; charset=utf-8
```

#### **Step 5.2: Static Files Direct Test**
```bash
# Command:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'curl -I http://localhost:3000/_next/static/chunks/3513-e74e0943a2287f8d.js'

# Expected Output:
HTTP/1.1 200 OK
Content-Type: application/javascript
Content-Length: 372581

# Edge Cases:
- 404 Not Found → Static files не находятся, проверить копирование
- 500 Internal Error → Server error, проверить logs
- Connection refused → PM2 процесс не запущен
```

### **PHASE 6: Playwright MCP Validation (3 minutes)**

#### **Step 6.1: Browser Navigation Test**
```javascript
// Playwright MCP Automation:
await browser_navigate({ url: "https://fonana.me" });

// Expected: Page loads without timeout
// Edge Cases:
// - Navigation timeout → DNS/SSL issues
// - SSL certificate error → Nginx config problem
// - Connection refused → Server down
```

#### **Step 6.2: Console Error Collection**
```javascript
// Command:
const console_messages = await browser_console_messages();
const errors = console_messages.filter(m => m.type === 'error');

// Expected Output:
[]  // No errors

// Edge Cases:
// - CSS load errors → Static files still not serving
// - JS execution errors → Malformed files
// - Network errors → Proxy issues
```

#### **Step 6.3: Network Request Analysis**
```javascript
// Command:
const network_requests = await browser_network_requests();
const failed_requests = network_requests.filter(r => r.status >= 400);

// Expected Output:
[]  // No failed requests

// Success Criteria:
// - All /_next/static/* requests = 200 OK
// - CSS files load successfully
// - JS chunks load successfully
```

## 🔄 BOTTLENECK ANALYSIS

### **Bottleneck #1: File Copy Duration**
- **Estimated Time**: 30-60 seconds для ~100MB
- **Factors**: Disk I/O speed, file count
- **Mitigation**: Monitor с `du -sh` progress

### **Bottleneck #2: PM2 Restart Window**  
- **Downtime**: 10-15 seconds
- **Factors**: Application startup time
- **Mitigation**: Coordinate с users, pre-warm process

### **Bottleneck #3: Browser Cache TTL**
- **Issue**: Cached 404 responses для static files
- **Duration**: До 5 минут
- **Mitigation**: Hard refresh (Ctrl+F5)

## ⚠️ RACE CONDITIONS

### **Race #1: Copy vs PM2 Start**
```bash
# Problem: PM2 starts before copy completes
# Solution: Verify copy completion before PM2 start
test -d /var/www/Fonana/.next/standalone/.next/static/ && pm2 start
```

### **Race #2: Multiple Static Requests**
```bash
# Problem: Concurrent requests во время копирования
# Solution: Copy атомарно в temp, затем rename/move
```

## 🚨 EMERGENCY ROLLBACK SIMULATION

### **Rollback Scenario A: PM2 Won't Start**
```bash
# Steps:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'pm2 stop fonana-app'
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'pm2 start .next/standalone/server.js --name fonana-app'

# Expected: Back to broken but stable state
```

### **Rollback Scenario B: Config Corruption**
```bash
# Steps:
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'cp ecosystem.config.js.backup ecosystem.config.js'
ssh -i ~/.ssh/fonana_deploy root@64.20.37.222 'pm2 reload ecosystem.config.js'
```

## ✅ SUCCESS VALIDATION MATRIX

| Check | Command | Expected | Status |
|-------|---------|----------|--------|
| PM2 Status | `pm2 status` | "online" | ⏸️ |
| Static File Exists | `ls .next/standalone/.next/static/` | Files present | ⏸️ |
| HTTP Response | `curl -I localhost:3000` | 200 OK | ⏸️ |
| Static HTTP | `curl -I localhost:3000/_next/static/` | 200 OK | ⏸️ |
| Browser Load | Playwright navigate | No timeout | ⏸️ |
| Console Clean | Browser console | 0 errors | ⏸️ |
| Network Clean | Browser network | 0 failed | ⏸️ |

## 🎯 EXECUTION READINESS

**All edge cases модeled**: ✅  
**Rollback plans готовы**: ✅  
**Validation automation готова**: ✅  
**Risk mitigation покрыто**: ✅  

**Готов к выполнению**: ✅ **PROCEED**

---
**NEXT**: Выполнить implementation plan step-by-step 