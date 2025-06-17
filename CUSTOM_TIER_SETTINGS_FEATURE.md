# Кастомные настройки тиров подписки

## Описание функции

Теперь создатели могут настраивать свои тиры подписки через вкладку "Creator Settings" в профиле:
- Изменять цены тиров
- Изменять описания
- Включать/отключать функции
- Добавлять свои кастомные функции

## Как это работает

1. **Настройка тиров** - Создатель заходит в Profile → Creator Settings и настраивает:
   - Basic tier - базовая подписка (синий цвет)
   - Premium tier - премиум подписка (фиолетовый цвет)
   - VIP tier - VIP подписка (золотой цвет)

2. **Сохранение** - Настройки сохраняются в новой таблице `creator_tier_settings`

3. **Отображение в модалке подписки** - Когда пользователь нажимает "Subscribe", модалка загружает кастомные настройки создателя

## Технические детали

### Новая модель БД
```prisma
model CreatorTierSettings {
  id            String   @id @default(cuid())
  creatorId     String   @unique
  basicTier     Json?    // { enabled, price, description, features: [] }
  premiumTier   Json?    
  vipTier       Json?    
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  creator       User     @relation(fields: [creatorId], references: [id])
}
```

### API endpoints
- `GET /api/user/tier-settings?creatorId=XXX` - получить настройки
- `PUT /api/user/tier-settings?wallet=XXX` - сохранить настройки (только для создателей)

### Компоненты
- `SubscriptionTiersSettings` - интерфейс настройки тиров
- `SubscribeModal` - обновлена для загрузки кастомных настроек

## Функция "Показать больше"

Если у тира больше 3 функций, показываются первые 3 и кнопка "+N more features". При клике раскрывается полный список.

## Важно

1. Стандартный тир "Standard" был удален - теперь только 4 тира: Free, Basic, Premium, VIP
2. Basic тир теперь синего цвета (вместо зеленого)
3. Если у создателя нет кастомных настроек, используются дефолтные 