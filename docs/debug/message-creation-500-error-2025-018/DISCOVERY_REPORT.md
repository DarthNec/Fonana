# 🔍 DISCOVERY REPORT: Message Creation 500 Error

## 📊 ПРОБЛЕМА
**Описание**: При нажатии кнопки "Message" в профиле пользователя возникает ошибка 500 (Internal Server Error)
**Endpoint**: `POST /api/conversations`  
**Пользователь**: Fanana Dev
**Консоль**: 
```
[JWT] Valid token found in memory
CreatorPageClient.tsx:334  POST http://localhost:3000/api/conversations 500 (Internal Server Error)
```

## 🎯 CONTEXT7 ИССЛЕДОВАНИЕ

### JWT Authentication Libraries
- **NextAuth.js**: Требует проверку конфигурации NEXTAUTH_SECRET
- **jsonwebtoken**: Возможные проблемы с verify() - неправильный secret или payload
- **Известные issue patterns**: JWT token format mismatches, expired tokens, invalid signatures

### PostgreSQL/Prisma Integration  
- **Raw SQL queries**: `$queryRaw` и `$executeRaw` требуют правильного экранирования
- **Foreign key constraints**: Связи между users и conversations могут блокировать INSERT
- **Transaction isolation**: Concurrent requests могут вызывать deadlocks

### Next.js API Routes
- **Server errors**: Unhandled exceptions возвращают 500 без деталей
- **Database connections**: Pool exhaustion или connection timeouts
- **Memory leaks**: В production mode накопление соединений

## 🔍 PLAYWRIGHT MCP ПЛАН ВОСПРОИЗВЕДЕНИЯ

### Automated Bug Reproduction Steps
1. **Navigate** to http://localhost:3000 (home page)
2. **Navigate** to creator profile (e.g., /creator/fonanadev)  
3. **Take snapshot** of profile page structure
4. **Click** on "Message" button
5. **Monitor network requests** for POST /api/conversations
6. **Capture console errors** during request
7. **Screenshot** error state
8. **Analyze** response headers and body

### Network Analysis Plan
- Monitor all HTTP requests during message creation
- Check request payload structure and headers
- Verify JWT token is correctly passed
- Analyze response status codes and error messages

## 🔎 EXISTING SOLUTIONS ANALYSIS

### Internal Patterns (Codebase Search)
- **Search 1**: Найти все использования `/api/conversations` endpoint
- **Search 2**: Найти похожие ошибки с JWT verification
- **Search 3**: Проверить другие POST endpoints для паттернов обработки ошибок
- **Search 4**: Найти логирование ошибок в API routes

### External Best Practices
- **Error handling**: API routes должны возвращать структурированные ошибки
- **JWT verification**: Стандартные проверки exp, iat, signature
- **Database operations**: Транзакции для связанных INSERT операций
- **Logging**: Детальное логирование для debug production issues

## 🧪 ЭКСПЕРИМЕНТАЛЬНЫЕ ПОДХОДЫ

### Approach 1: Direct API Testing
- Curl commands для тестирования endpoint напрямую
- Проверка с валидными и невалидными JWT токенами
- Тестирование различных payload форматов

### Approach 2: Database State Analysis  
- Проверка состояния таблиц users, conversations, _UserConversations
- Анализ foreign key constraints и indices
- Проверка permissions и row-level security

### Approach 3: Server Logs Analysis
- Включение debug логирования в API route
- Анализ Next.js server logs
- Проверка PostgreSQL query logs

## ✅ DISCOVERY CHECKLIST

### Research Completion
- [ ] Context7 проверен для всех технологий
- [ ] Минимум 3 альтернативы исследованы  
- [ ] Playwright MCP план готов
- [ ] Существующие решения найдены
- [ ] Best practices documented

### Next Steps
1. **Выполнить Playwright MCP воспроизведение**
2. **Анализ логов сервера и БД**
3. **Создать ARCHITECTURE_CONTEXT.md**
4. **Прямое тестирование API endpoint**

## 📋 ГИПОТЕЗЫ

### Hypothesis 1: JWT Token Issues
- Неправильный NEXTAUTH_SECRET в окружении
- JWT payload не содержит userId
- Token format mismatch между frontend и backend

### Hypothesis 2: Database Constraints
- Foreign key violation при INSERT в _UserConversations
- Duplicate conversation creation race condition
- PostgreSQL permissions или connection issues

### Hypothesis 3: API Route Code Issues
- Unhandled exception в try/catch блоке
- Неправильное использование Prisma raw queries
- Missing error handling для edge cases

## 🎯 PRIORITY FOCUS
**Critical**: Проверить сервер логи и JWT verification в API route
**High**: Воспроизвести ошибку через Playwright MCP
**Medium**: Проанализировать database state и constraints 