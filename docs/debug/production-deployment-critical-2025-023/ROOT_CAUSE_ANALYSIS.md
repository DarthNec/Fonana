# ROOT CAUSE ANALYSIS: Production Deployment Critical
**Date**: 2025-01-23  
**Status**: ROOT CAUSE IDENTIFIED  

## 🔥 CRITICAL FINDINGS

### PRIMARY ROOT CAUSE
**PM2 запускает `npm run dev` в PRODUCTION environment!**

```bash
# НЕПРАВИЛЬНО (текущее состояние):
│ script path       │ /usr/bin/npm                     │
│ script args       │ run dev                          │
│ node env          │ production                       │

# ПРАВИЛЬНО (должно быть):
│ script args       │ start                            │
```

### SECONDARY ISSUES

#### 1. Nginx Configuration Conflict
```bash
# Conflicting files:
/etc/nginx/sites-enabled/fonana        # HTTP only
/etc/nginx/sites-enabled/fonana.backup # HTTP→HTTPS redirect

# Both use: server_name fonana.me
# Result: "conflicting server name fonana.me on 0.0.0.0:80"
```

#### 2. Application Paths  
```bash
# Correct path: /var/www/Fonana (не /root/Fonana)
│ exec cwd          │ /var/www/Fonana                  │
```

#### 3. PM2 Restart Pattern
```bash
│ restarts          │ 2                                │
│ uptime            │ 20m                              │
# Indicates instability due to dev mode in production
```

## IMPACT ANALYSIS

### Why `npm run dev` Fails in Production:
1. **Tailwind CSS**: Dev mode uses different CSS processing
2. **ModuleParseError**: Development webpack config не для production
3. **Performance**: Dev mode медленнее и нестабильнее
4. **Memory Usage**: 87.8% heap usage (критично)

### Next.js Development vs Production:
```javascript
// npm run dev (ТЕКУЩЕЕ - НЕПРАВИЛЬНО):
- Hot Module Replacement (HMR)
- Development webpack config  
- Tailwind CSS @layer directives processing
- Source maps и debugging features

// npm start (НУЖНО):
- Production-optimized build
- Минифицированный CSS и JS
- Статические файлы pre-generated
- Optimized performance
```

## SOLUTION STRATEGY

### Phase 1: Build Production Version
```bash
cd /var/www/Fonana
npm run build  # Create .next/static and optimized files
```

### Phase 2: Fix PM2 Configuration  
```bash
pm2 delete fonana-app
pm2 start ecosystem.config.js  # With 'npm start' script
```

### Phase 3: Fix Nginx Conflicts
```bash
# Disable conflicting config:
rm /etc/nginx/sites-enabled/fonana
# Keep only fonana.backup (с SSL redirect)
nginx -s reload
```

## M7 VALIDATION PLAN

1. **Build Check**: Verify `.next/` directory создан правильно
2. **PM2 Update**: Confirm 'npm start' вместо 'npm run dev'  
3. **Nginx Test**: Eliminate conflicting server names
4. **Browser Test**: Verify HTTPS fonana.me возвращает 200 OK
5. **Performance**: Memory usage должен снизиться с 87.8%

## ESTIMATED TIME TO RESOLUTION
- **Build**: 3-5 minutes
- **PM2 Fix**: 1 minute  
- **Nginx Fix**: 1 minute
- **Testing**: 2 minutes
- **Total**: 7-9 minutes

## PREVENTION FOR FUTURE
- Always use `npm start` в production PM2 configs
- Separate development и production Nginx configs
- Add build verification в deployment script 