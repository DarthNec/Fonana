# 🔍 DISCOVERY REPORT: Новый мессенджер без shadcn/ui

## 📋 Общая цель
Создать новую страницу мессенджера с нуля, полностью отказавшись от shadcn/ui и используя только стабильные технологии: HTML + Tailwind + существующие паттерны проекта.

## 🔎 Анализ существующей архитектуры

### ✅ **РАБОЧИЕ API ENDPOINTS:**

#### 1. **GET /api/conversations** 
- **Статус**: ✅ Работает, требует JWT токен
- **Функционал**: Получение всех диалогов пользователя
- **Response**: `{ conversations: [] }` с участниками и последними сообщениями
- **Особенности**: 
  - Использует raw SQL queries для обхода проблем Prisma
  - Включает unread count для каждого диалога
  - Поддерживает paid messages с маскировкой контента

#### 2. **POST /api/conversations**
- **Статус**: ✅ Работает, требует JWT токен 
- **Функционал**: Создание нового диалога с участником
- **Payload**: `{ participantId: string }`
- **Response**: `{ conversation: {...} }` с участниками
- **Особенности**: Проверяет существующие диалоги перед созданием

#### 3. **GET /api/conversations/[id]/messages**
- **Статус**: ✅ Работает, требует JWT токен
- **Функционал**: Получение сообщений из диалога с пагинацией
- **Params**: `?before=messageId&limit=20`
- **Response**: `{ messages: [], hasMore: boolean }`
- **Особенности**: 
  - Автоматически помечает сообщения как прочитанные
  - Маскирует платные сообщения для неоплативших
  - Включает информацию об отправителе

#### 4. **POST /api/conversations/[id]/messages** 
- **Статус**: ✅ Работает, требует JWT токен
- **Функционал**: Отправка нового сообщения
- **Payload**: `{ content?, mediaUrl?, isPaid?, price?, metadata? }`
- **Response**: `{ message: {...} }`
- **Особенности**: 
  - Поддерживает текст, медиа и платные сообщения
  - Создает уведомления для получателей
  - Валидирует права участника

#### 5. **POST /api/messages/[id]/purchase**
- **Статус**: ✅ Работает, требует JWT токен
- **Функционал**: Покупка платного сообщения
- **Payload**: `{ txSignature: string }`
- **Response**: `{ purchase: {...}, message: {...} }`
- **Особенности**: Валидация Solana транзакций

### 🗃️ **СТРУКТУРА БАЗЫ ДАННЫХ:**

#### Таблица `Conversation`
```sql
id            | text (PK)
lastMessageAt | timestamp
createdAt     | timestamp 
updatedAt     | timestamp
```

#### Таблица `Message`
```sql
id             | text (PK)
conversationId | text (FK)
senderId       | text (FK)
content        | text (nullable)
mediaUrl       | text (nullable) 
mediaType      | text (nullable)
isPaid         | boolean (default: false)
price          | double precision (nullable)
isRead         | boolean (default: false)
createdAt      | timestamp
metadata       | jsonb (nullable)
```

#### Таблица `MessagePurchase`
```sql
id          | text (PK)
messageId   | text (FK)
userId      | text (FK) 
amount      | double precision
txSignature | text
createdAt   | timestamp
```

#### Связующая таблица `_UserConversations`
```sql
A | text (conversationId)
B | text (userId)
```

### 🔌 **WEBSOCKET СЕРВЕР (PORT 3002):**

#### Архитектура:
- **JWT аутентификация** для всех подключений
- **Channel-based subscriptions** (notifications, feed, creator, post)
- **Redis Pub/Sub** для масштабирования (опционально)
- **Real-time events** для уведомлений и обновлений

#### Интеграция с API:
- API endpoints отправляют WebSocket события
- Автоматические уведомления при новых сообщениях
- Поддержка offline пользователей через БД уведомлений

#### Статус: ✅ **СТАБИЛИЗИРОВАН** 
- Auto-connect отключен для предотвращения infinite loops
- Все critical loops остановлены

### 🎯 **СУЩЕСТВУЮЩИЕ КОМПОНЕНТЫ:**

#### Рабочие компоненты:
- `Navbar.tsx` - навигация с аватарами
- `Avatar.tsx` - система аватаров пользователей
- `MobileNavigationBar.tsx` - мобильная навигация
- `Button.tsx`, `Input.tsx`, `Card.tsx` - базовые UI компоненты

#### Проблемные компоненты: 
- `app/messages/[id]/page.tsx` - JSX syntax errors из-за shadcn
- `MessagesPageClient.tsx` - зависимости от shadcn Badge/Avatar

### 📊 **ДАННЫЕ В БД:**
- **Conversations**: 0 (таблица пустая)
- **Messages**: 3 (тестовые сообщения)
- **Users**: 54 (из них 52 креатора)
- **MessagePurchases**: неизвестно

## 🔬 **АНАЛИЗ АЛЬТЕРНАТИВНЫХ ПОДХОДОВ**

### Подход 1: **Исправление существующего мессенджера**
**Плюсы**: Быстрее, сохраняет историю
**Минусы**: Может остаться технический долг от shadcn
**Оценка**: ❌ Не рекомендуется, слишком много зависимостей

### Подход 2: **Полная замена с нуля** ⭐ **РЕКОМЕНДУЕТСЯ**
**Плюсы**: 
- Чистая архитектура без shadcn
- Использование проверенных паттернов проекта
- Лучший контроль над кодом
- Возможность оптимизации под мобильные устройства

**Минусы**: Требует больше времени на разработку
**Оценка**: ✅ Оптимальное решение

### Подход 3: **Гибридный подход**
**Плюсы**: Сохраняет работающие части API
**Минусы**: Сложность интеграции, возможные конфликты
**Оценка**: ⚠️ Не нужен, API уже работает идеально

## 📝 **ЛУЧШИЕ ПРАКТИКИ ВЫЯВЛЕННЫЕ:**

### 1. **HTML + Tailwind паттерны:**
```jsx
// Проверенный паттерн для кнопок
<button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors">
  Отправить
</button>

// Проверенный паттерн для карточек  
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
  {content}
</div>
```

### 2. **Аутентификация через JWT:**
```javascript
// Паттерн для API запросов
const response = await fetch('/api/conversations', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### 3. **Обработка ошибок:**
```javascript
// Defensive programming паттерн
const conversations = response.ok ? await response.json() : { conversations: [] }
```

### 4. **Mobile-first дизайн:**
```jsx
// Адаптивные классы Tailwind
<div className="px-4 sm:px-6 lg:px-8">
  {/* mobile → tablet → desktop */}
</div>
```

## 🛠️ **ТЕХНОЛОГИЧЕСКИЙ СТЕК:**

### ✅ **Использовать:**
- **React 18** с хуками
- **Next.js 14** App Router
- **TypeScript** для типобезопасности
- **Tailwind CSS** для стилизации
- **Heroicons** для иконок
- **Существующие hooks**: `useUser`, `useWalletAuth`
- **Prisma** для работы с БД

### ❌ **НЕ использовать:**
- **shadcn/ui** - источник проблем
- **Любые сторонние UI библиотеки** - потенциальные проблемы  
- **CSS-in-JS** - не нужно при наличии Tailwind

## 🎨 **ДИЗАЙН РЕФЕРЕНСЫ:**

### Внутренние примеры:
- **Dashboard** - отличный пример современного UI
- **Главная страница** - хороший паттерн карточек
- **Navbar** - проверенная навигация

### Внешние референсы:
- **Telegram Web** - чистый интерфейс мессенджера
- **Discord** - хорошая организация каналов
- **WhatsApp Web** - простота и функциональность

## 🔧 **ПРОТОТИПИРОВАНИЕ:**

### Прототип 1: **Минимальный мессенджер**
```jsx
// Базовая структура
function Messenger() {
  return (
    <div className="flex h-screen">
      <ConversationsList />
      <ChatArea />
    </div>
  )
}
```

### Прототип 2: **Мобильная адаптация**
```jsx
// Одноколоночный layout для мобильных
function MobileMessenger() {
  const [showChat, setShowChat] = useState(false)
  
  return (
    <div className="h-screen">
      {showChat ? <ChatArea /> : <ConversationsList />}
    </div>
  )
}
```

### Прототип 3: **Управление состоянием**
```jsx
// React hooks для состояния
function useMessenger() {
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  
  // CRUD операции...
}
```

## 📈 **МЕТРИКИ УСПЕХА:**

### Технические:
- ✅ 0 shadcn зависимостей
- ✅ TypeScript coverage 100%
- ✅ Mobile responsive
- ✅ <200ms API response время
- ✅ Real-time messaging работает

### UX метрики:
- ✅ Intuitive навигация
- ✅ Быстрая загрузка диалогов
- ✅ Seamless отправка сообщений
- ✅ Proper error handling

## ⚠️ **ВЫЯВЛЕННЫЕ РИСКИ:**

### 🔴 **Critical:**
- **JWT токен** - необходим для всех API calls
- **Prisma модель naming** - Message/Conversation с заглавных букв
- **WebSocket подключение** - требует proper error handling

### 🟡 **Major:**
- **Mobile optimization** - необходимо тестирование на устройствах
- **Performance** - при большом количестве сообщений
- **Accessibility** - требует ARIA labels

### 🟢 **Minor:**
- **Dark mode** - поддерживается через existing context
- **Internationalization** - пока не требуется

## 🎯 **СЛЕДУЮЩИЕ ШАГИ:**

1. **Architecture Context** - детальный анализ интеграций
2. **Solution Plan** - пошаговый план разработки
3. **Impact Analysis** - оценка влияния на существующую систему
4. **Implementation Simulation** - моделирование всех сценариев
5. **Risk Mitigation** - планы устранения критических рисков
6. **Implementation** - разработка нового мессенджера
7. **Implementation Report** - финальный отчет с метриками

---

**✅ Discovery Phase завершен успешно.**
**🎯 Рекомендация: Приступить к Architecture Context анализу.** 