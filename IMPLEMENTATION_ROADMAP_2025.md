# 🚀 План внедрения критического функционала Fonana Q1-Q2 2025

## 📅 Январь 2025: Базовые коммуникации

### Неделя 1-2: Личные сообщения (Direct Messages)

#### Задачи:
1. **База данных**
   ```prisma
   model Conversation {
     id           String   @id @default(cuid())
     participants User[]   @relation("UserConversations")
     messages     Message[]
     lastMessageAt DateTime?
     createdAt    DateTime @default(now())
   }
   
   model Message {
     id             String   @id @default(cuid())
     conversationId String
     senderId       String
     content        String?
     mediaUrl       String?
     mediaType      String?
     isPaid         Boolean  @default(false)
     price          Float?
     isRead         Boolean  @default(false)
     createdAt      DateTime @default(now())
     
     conversation   Conversation @relation(fields: [conversationId], references: [id])
     sender         User @relation(fields: [senderId], references: [id])
   }
   ```

2. **API endpoints**
   - `GET /api/conversations` - список чатов
   - `GET /api/conversations/:id/messages` - сообщения чата
   - `POST /api/conversations/:id/messages` - отправка сообщения
   - `PUT /api/messages/:id/read` - отметка прочитано

3. **UI компоненты**
   - MessagesPage - страница со списком чатов
   - ConversationView - окно переписки
   - MessageInput - ввод сообщения с прикреплением медиа
   - MessageBubble - отображение сообщения

4. **Real-time обновления**
   - Polling каждые 5 секунд для новых сообщений
   - Индикатор набора текста
   - Статус прочтения

### Неделя 3: Tips (Чаевые)

#### Задачи:
1. **UI компонент TipButton**
   ```tsx
   // Быстрые суммы
   const quickAmounts = [0.5, 1, 5, 10] // SOL
   
   // Кастомная сумма
   const [customAmount, setCustomAmount] = useState('')
   ```

2. **API endpoint**
   - `POST /api/tips` - отправка чаевых

3. **Интеграция в**
   - Профиль автора
   - Под каждым постом
   - В личных сообщениях

4. **Уведомления**
   - Push уведомление автору
   - История чаевых в профиле

### Неделя 4: PPV сообщения

#### Задачи:
1. **Расширение модели Message**
   ```prisma
   model MessagePurchase {
     id        String   @id @default(cuid())
     messageId String
     userId    String
     amount    Float
     txSignature String
     createdAt DateTime @default(now())
   }
   ```

2. **UI для PPV**
   - Блокировка контента с размытием
   - Кнопка "Разблокировать за X SOL"
   - Превью первых 20 символов

3. **Массовая рассылка**
   - Выбор подписчиков для рассылки
   - Шаблоны сообщений
   - Статистика открытий

## 📅 Февраль 2025: Контент и поиск

### Неделя 1: Поиск по платформе

#### Задачи:
1. **Elasticsearch интеграция**
   ```javascript
   // Индексация
   - Авторы (nickname, fullName, bio)
   - Посты (title, content, tags)
   - Категории
   ```

2. **SearchPage компонент**
   - Поисковая строка с автокомплитом
   - Фильтры (тип контента, цена, категория)
   - Табы: Все / Авторы / Посты

3. **API endpoints**
   - `GET /api/search?q=...&type=...&filters=...`
   - `GET /api/search/suggestions?q=...`

4. **Оптимизация**
   - Дебаунс поисковых запросов
   - Кеширование результатов
   - Пагинация

### Неделя 2: Запланированные посты

#### Задачи:
1. **Модель ScheduledPost**
   ```prisma
   model ScheduledPost {
     id           String   @id @default(cuid())
     creatorId    String
     postData     Json     // Данные поста
     scheduledFor DateTime
     status       String   // 'pending', 'published', 'cancelled'
     publishedId  String?  // ID опубликованного поста
   }
   ```

2. **UI компоненты**
   - Календарь публикаций
   - Очередь запланированных постов
   - Выбор даты/времени в CreatePostModal

3. **Cron job для публикации**
   ```javascript
   // Каждую минуту проверять посты к публикации
   cron.schedule('* * * * *', publishScheduledPosts)
   ```

### Неделя 3-4: Расширенная аналитика

#### Задачи:
1. **AnalyticsDashboard страница**
   - График доходов (день/неделя/месяц/год)
   - Топ постов по доходам
   - Конверсия подписчиков
   - Источники трафика

2. **Метрики для отслеживания**
   ```javascript
   // Просмотры постов
   await trackEvent('post_view', { postId, viewerId })
   
   // Конверсии
   await trackEvent('subscription_conversion', { 
     creatorId, 
     source: 'profile' | 'post' | 'search' 
   })
   ```

3. **Экспорт данных**
   - CSV экспорт транзакций
   - PDF отчеты по периодам

## 📅 Март 2025: Stories и базовый стриминг

### Неделя 1-2: Stories функционал

#### Задачи:
1. **Модель Story**
   ```prisma
   model Story {
     id        String   @id @default(cuid())
     creatorId String
     mediaUrl  String
     mediaType String   // 'image' | 'video'
     caption   String?
     viewCount Int      @default(0)
     expiresAt DateTime // createdAt + 24 часа
     replies   StoryReply[]
   }
   ```

2. **UI компоненты**
   - StoriesBar - горизонтальный список историй
   - StoryViewer - полноэкранный просмотр
   - StoryCamera - запись историй
   - StoryProgress - индикатор просмотра

3. **Функционал**
   - Автоудаление через 24 часа
   - Счетчик просмотров
   - Ответы на истории (в DM)
   - Фильтры и стикеры

### Неделя 3-4: MVP Live Streaming

#### Задачи:
1. **WebRTC интеграция**
   - Использовать Agora.io или LiveKit
   - Поддержка до 100 зрителей в MVP

2. **Модель Stream**
   ```prisma
   model Stream {
     id          String   @id @default(cuid())
     creatorId   String
     title       String
     thumbnail   String?
     isLive      Boolean  @default(false)
     viewerCount Int      @default(0)
     startedAt   DateTime?
     endedAt     DateTime?
     donations   StreamDonation[]
   }
   ```

3. **Базовый функционал**
   - Старт/стоп трансляции
   - Чат для зрителей
   - Счетчик зрителей
   - Уведомления о начале

## 📅 Апрель 2025: Платежи и безопасность

### Неделя 1-2: 2FA аутентификация

#### Задачи:
1. **Интеграция Google Authenticator**
   ```javascript
   import { authenticator } from 'otplib'
   
   // Генерация секрета
   const secret = authenticator.generateSecret()
   
   // QR код для сканирования
   const qrCodeUrl = authenticator.keyuri(
     user.email, 
     'Fonana', 
     secret
   )
   ```

2. **UI flow**
   - Включение 2FA в настройках
   - QR код + резервные коды
   - Ввод кода при входе

### Неделя 3: Промокоды и скидки

#### Задачи:
1. **Модель PromoCode**
   ```prisma
   model PromoCode {
     id           String   @id @default(cuid())
     code         String   @unique
     creatorId    String?  // null = платформенный
     discountType String   // 'percentage' | 'fixed'
     discount     Float
     maxUses      Int?
     usedCount    Int      @default(0)
     validUntil   DateTime?
   }
   ```

2. **Применение промокодов**
   - При оформлении подписки
   - Валидация и расчет скидки
   - История использования

### Неделя 4: Водяные знаки

#### Задачи:
1. **Автоматическое добавление watermark**
   ```javascript
   // При загрузке изображений
   const addWatermark = async (image, username) => {
     // Добавить полупрозрачный текст
     // "fonana.me/@username"
   }
   ```

2. **Настройки для авторов**
   - Включить/выключить watermark
   - Позиция (углы экрана)
   - Прозрачность

## 📅 Май 2025: Мобильная оптимизация

### Неделя 1-2: PWA улучшения

#### Задачи:
1. **Manifest.json оптимизация**
2. **Service Worker для оффлайн**
3. **Push уведомления**
4. **Установка на домашний экран**

### Неделя 3-4: Адаптивные улучшения

#### Задачи:
1. **Мобильная камера**
   - Доступ к фронтальной/задней камере
   - Фильтры в реальном времени
   - Оптимизация для вертикальных видео

2. **Жесты и свайпы**
   - Свайп между stories
   - Pull-to-refresh
   - Swipe-to-reply в сообщениях

## 📅 Июнь 2025: Fiat gateway (начало)

### Неделя 1-2: Исследование и выбор провайдера

#### Варианты:
1. **MoonPay** - прямая покупка SOL
2. **Transak** - покупка крипты картой
3. **Stripe** - конвертация в SOL

### Неделя 3-4: MVP интеграция

#### Задачи:
1. **KYC процесс**
2. **Покупка SOL картой**
3. **Автоматическая конвертация**

## 💰 Бюджет на Q1-Q2 2025

### Команда:
- 2 Full-stack dev: $24,000/мес
- 1 Frontend dev: $10,000/мес
- 1 DevOps: $8,000/мес
- 1 Designer (part-time): $5,000/мес
- **Итого: $47,000/мес × 6 = $282,000**

### Инфраструктура:
- Серверы: $2,000/мес
- Сервисы (Elasticsearch, CDN): $1,000/мес
- WebRTC (Agora/LiveKit): $500/мес
- **Итого: $3,500/мес × 6 = $21,000**

### Общий бюджет: ~$300,000

## 📊 KPI и метрики успеха

### К концу Q1 (март 2025):
- ✅ 500+ активных пользователей в DM
- ✅ $50,000+ обработано в tips
- ✅ 20%+ конверсия в PPV сообщениях
- ✅ 1000+ stories в день

### К концу Q2 (июнь 2025):
- ✅ 50+ активных стримеров
- ✅ 30%+ пользователей с 2FA
- ✅ 10%+ транзакций через fiat
- ✅ $500,000+ месячный оборот

## 🎯 Приоритеты

### Критично для успеха:
1. **DM + PPV** - основа монетизации как в OF
2. **Tips** - простой способ поддержки
3. **Поиск** - discovery новых авторов
4. **Stories** - вовлечение аудитории

### Можно отложить:
1. Видеозвонки
2. Продвинутая аналитика
3. ML рекомендации
4. Полноценные мобильные приложения

## ✅ Чек-лист запуска

### Перед запуском каждой функции:
- [ ] Функция протестирована на staging
- [ ] Написана документация
- [ ] Подготовлены FAQ для пользователей
- [ ] Настроен мониторинг
- [ ] План отката в случае проблем
- [ ] Уведомление пользователей о новой функции

## 🚀 Вывод

При фокусе на этих функциях и следовании плану, к середине 2025 года Fonana будет иметь все критически важные функции для конкуренции с OnlyFans, сохраняя при этом уникальные преимущества Web3 платформы. 