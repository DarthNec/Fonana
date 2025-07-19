# 🎭 Playwright Authentication Bypass System

Система контролируемого байпаса авторизации для Playwright тестирования в development окружении.

## 🚀 Быстрый старт

### 1. Создание тестовых пользователей

```bash
# Создаем тестовых пользователей в БД
npm run seed:playwright

# Или полная настройка тестов
npm run test:playwright:setup
```

### 2. Использование в Playwright тестах

```typescript
import { authenticatePlaywrightUser } from '@/lib/test/playwright-browser-helpers'

test('Тест с аутентификацией', async ({ page }) => {
  // Простая аутентификация через URL параметры
  await authenticatePlaywrightUser(page, { userType: 'admin' })
  
  // Теперь можно тестировать защищенные страницы
  await page.goto('/dashboard')
  
  // Пользователь уже авторизован!
  await expect(page.locator('main')).toBeVisible()
})
```

### 3. Доступные типы пользователей

| User Type | Nickname | isCreator | isVerified | Описание |
|-----------|----------|-----------|------------|----------|
| `admin` | `playwright_admin` | ✅ | ✅ | Администратор с полными правами |
| `user` | `playwright_user` | ❌ | ❌ | Обычный пользователь |
| `creator` | `playwright_creator` | ✅ | ✅ | Верифицированный креатор |

## 📋 API Reference

### Browser Helpers

#### `authenticatePlaywrightUser(page, options)`
Основной метод аутентификации через URL параметры.

```typescript
await authenticatePlaywrightUser(page, { 
  userType: 'admin' // 'admin' | 'user' | 'creator'
})
```

#### `authenticatePlaywrightUserViaAPI(page, options)`
Аутентификация через API токены (для тестирования API).

```typescript
await authenticatePlaywrightUserViaAPI(page, { 
  userType: 'creator' 
})
```

#### `logoutPlaywrightUser(page)`
Выход из системы и очистка всех токенов.

```typescript
await logoutPlaywrightUser(page)
```

#### `getAuthenticatedUser(page)`
Получение данных текущего авторизованного пользователя.

```typescript
const user = await getAuthenticatedUser(page)
console.log(user.nickname) // 'playwright_admin'
```

#### `isAuthenticated(page)`
Проверка статуса аутентификации.

```typescript
const authenticated = await isAuthenticated(page)
expect(authenticated).toBe(true)
```

### API Endpoints

#### `POST /api/test/playwright-auth`
Генерация JWT токенов для тестирования.

```typescript
const response = await fetch('/api/test/playwright-auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userType: 'admin' })
})

const { token, user } = await response.json()
```

#### `GET /api/test/playwright-auth`
Информация о доступных пользователях.

```typescript
const response = await fetch('/api/test/playwright-auth')
const info = await response.json()
// { available_users: ['admin', 'user', 'creator'] }
```

## 🎯 Примеры использования

### Простой тест с аутентификацией

```typescript
test('Dashboard доступен для admin', async ({ page }) => {
  await authenticatePlaywrightUser(page, { userType: 'admin' })
  await page.goto('/dashboard')
  
  await expect(page.locator('h1')).toContainText('Dashboard')
})
```

### Тест переключения пользователей

```typescript
test('Разные права для разных типов пользователей', async ({ page }) => {
  // Обычный пользователь
  await authenticatePlaywrightUser(page, { userType: 'user' })
  await page.goto('/create-post')
  await expect(page.locator('text=Access Denied')).toBeVisible()
  
  // Переключаемся на креатора
  await authenticatePlaywrightUser(page, { userType: 'creator' })
  await page.goto('/create-post')
  await expect(page.locator('form')).toBeVisible()
})
```

### API тестирование с аутентификацией

```typescript
test('API создание поста', async ({ page }) => {
  // Получаем токен
  const response = await page.request.post('/api/test/playwright-auth', {
    data: { userType: 'creator' }
  })
  const { token } = await response.json()
  
  // Используем токен для API запроса
  const postResponse = await page.request.post('/api/posts', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { title: 'Test Post', content: 'Content' }
  })
  
  expect(postResponse.status()).toBe(201)
})
```

### Тест с проверкой персистентности

```typescript
test('Аутентификация сохраняется при навигации', async ({ page }) => {
  await authenticatePlaywrightUser(page, { userType: 'admin' })
  
  // Переходим по разным страницам
  const pages = ['/dashboard', '/creators', '/feed', '/profile']
  
  for (const path of pages) {
    await page.goto(path)
    const user = await getAuthenticatedUser(page)
    expect(user.nickname).toBe('playwright_admin')
  }
})
```

## 🔒 Безопасность

### Production Protection
- ✅ Все тестовые функции отключены в production
- ✅ Тестовые токены имеют специальные маркеры
- ✅ Тестовые пользователи легко идентифицируются

### Environment Checks
```typescript
// Все проверки environment
if (process.env.NODE_ENV === 'production') {
  return { error: 'Test features disabled in production' }
}
```

### Test Token Identification
```typescript
// JWT токены содержат специальные маркеры
{
  userId: 'playwright_admin_user',
  playwright_test: true,  // 🔍 Маркер тестового токена
  test_user_type: 'admin'
}
```

## 🐛 Troubleshooting

### Проблема: Пользователь не авторизуется

**Решение:**
1. Проверьте, что тестовые пользователи созданы: `npm run seed:playwright`
2. Убедитесь что NODE_ENV = 'development'
3. Проверьте консоль браузера на наличие ошибок

### Проблема: API возвращает 403

**Причина:** Скорее всего production окружение.

**Решение:**
```bash
# Проверьте переменную окружения
echo $NODE_ENV

# Должно быть 'development' или 'test'
export NODE_ENV=development
```

### Проблема: Тесты не находят элементы

**Причина:** Аутентификация не завершилась.

**Решение:**
```typescript
// Добавьте ожидание
await authenticatePlaywrightUser(page, { userType: 'admin' })
await page.waitForSelector('[data-testid="user-menu"]')
// Теперь продолжайте тест
```

## 📊 Мониторинг

### Логи аутентификации
```
[Playwright] Test mode detected, using test user
[Playwright] Using test user: playwright_admin (admin)
[Playwright Auth] Generated token for user: playwright_admin
```

### Отладка в браузере
```typescript
// В консоли браузера
localStorage.getItem('playwright_user')
// Должен содержать данные пользователя

new URLSearchParams(window.location.search).has('playwright_test')
// Должен возвращать true в тестовом режиме
```

## 🚀 Продвинутое использование

### Кастомная настройка пользователя

```typescript
// Модифицируйте PLAYWRIGHT_TEST_USERS в:
// lib/test/playwright-auth-helpers.ts

export const PLAYWRIGHT_TEST_USERS = {
  // Добавьте своего пользователя
  custom: {
    id: 'custom_user_id',
    nickname: 'custom_user',
    // ...другие поля
  }
}
```

### WebSocket тестирование

WebSocket сервер автоматически поддерживает тестовые токены:

```typescript
test('WebSocket подключение с аутентификацией', async ({ page }) => {
  await authenticatePlaywrightUser(page, { userType: 'admin' })
  
  // WebSocket автоматически использует тестовый токен
  await page.goto('/messages')
  // Соединение должно работать
})
```

### Интеграция с CI/CD

```yaml
# .github/workflows/test.yml
- name: Setup Playwright tests
  run: |
    npm run test:playwright:setup
    npx playwright test tests/auth/
```

---

**🎉 Готово!** Теперь вы можете тестировать защищенные части приложения с помощью Playwright без сложной настройки аутентификации. 