# 📊 UTM Tracking Guide для Fonana

**Дата**: 19.02.2026  
**Статус**: ✅ Готово к использованию

---

## 🎯 ФОРМАТ ССЫЛОК

### **Базовый формат:**
```
https://fonana.me/?source=<ОТКУДА>&campaign=<ОТ_КОГО>
```

- **`source`** — откуда пришёл пользователь (социальная сеть, реклама, реферал)
- **`campaign`** — от кого / какая кампания (название рекламной кампании, имя инфлюенсера)

---

## 📱 ПРИМЕРЫ ССЫЛОК ДЛЯ РАЗНЫХ КАНАЛОВ

### **1. Facebook / Instagram Ads**
```
https://fonana.me/?source=facebook_ad&campaign=nft_creators
https://fonana.me/?source=facebook_ad&campaign=summer_sale_2026
https://fonana.me/?source=instagram_ad&campaign=stories_promo
https://fonana.me/?source=instagram_ad&campaign=reels_viral
```

**Когда использовать**: Реклама в Facebook/Instagram (таргетированные посты, stories, reels)

---

### **2. Google Ads / Контекстная реклама**
```
https://fonana.me/?source=google_ads&campaign=nft_platform_search
https://fonana.me/?source=google_ads&campaign=creators_keywords
https://fonana.me/?source=yandex_ads&campaign=crypto_artists
```

**Когда использовать**: Google Ads, Яндекс.Директ, поисковая реклама

---

### **3. Telegram**
```
https://fonana.me/?source=telegram&campaign=crypto_news_channel
https://fonana.me/?source=telegram&campaign=nft_russia_chat
https://fonana.me/?source=telegram_bot&campaign=promo_bot_march
https://fonana.me/?source=telegram_ad&campaign=sponsored_post
```

**Когда использовать**: 
- Посты в Telegram каналах
- Боты
- Спонсорские посты

---

### **4. Twitter (X)**
```
https://fonana.me/?source=twitter&campaign=launch_announcement
https://fonana.me/?source=twitter_ad&campaign=promoted_tweet_march
https://fonana.me/?source=twitter&campaign=influencer_collab_john
```

**Когда использовать**: Твиты, промо посты, коллаборации с инфлюенсерами

---

### **5. YouTube**
```
https://fonana.me/?source=youtube&campaign=tutorial_video
https://fonana.me/?source=youtube&campaign=review_cryptonews
https://fonana.me/?source=youtube_ad&campaign=pre_roll_march
```

**Когда использовать**: Ссылки в описании видео, промо в видео, реклама

---

### **6. Инфлюенсеры / Амбассадоры**
```
https://fonana.me/?source=influencer&campaign=ivan_crypto
https://fonana.me/?source=influencer&campaign=maria_nft_girl
https://fonana.me/?source=ambassador&campaign=alexey_blockchain
```

**Когда использовать**: Персональные ссылки для инфлюенсеров для отслеживания их эффективности

---

### **7. Email Рассылки**
```
https://fonana.me/?source=email&campaign=weekly_newsletter
https://fonana.me/?source=email&campaign=promo_march_creators
https://fonana.me/?source=email&campaign=welcome_series
```

**Когда использовать**: Email рассылки, newsletters

---

### **8. Реферальная программа**
```
https://fonana.me/?source=referral&campaign=user_john_doe
https://fonana.me/?source=referral&campaign=creator_maria_ivanova
https://fonana.me/?source=friend_invite&campaign=viral_program
```

**Когда использовать**: Реферальные ссылки пользователей, партнёрская программа

---

### **9. QR коды (Events, Offline)**
```
https://fonana.me/?source=qr_code&campaign=nft_expo_moscow_2026
https://fonana.me/?source=qr_code&campaign=blockchain_summit_spb
https://fonana.me/?source=qr_code&campaign=business_card_ceo
https://fonana.me/?source=qr_poster&campaign=metro_ad_march
```

**Когда использовать**: 
- QR коды на мероприятиях
- Визитки
- Постеры в метро
- Флаеры

---

### **10. Партнёрские сайты**
```
https://fonana.me/?source=partner_site&campaign=cryptonews_ru
https://fonana.me/?source=partner_site&campaign=nftcalendar_com
https://fonana.me/?source=media&campaign=vc_ru_article
```

**Когда использовать**: Упоминания на других сайтах, статьи, обзоры

---

### **11. TikTok**
```
https://fonana.me/?source=tiktok&campaign=viral_video_march
https://fonana.me/?source=tiktok_ad&campaign=creator_promo
https://fonana.me/?source=tiktok&campaign=blogger_anna
```

**Когда использовать**: Ссылка в bio, видео, промо

---

### **12. Баннеры на сайтах**
```
https://fonana.me/?source=banner&campaign=cryptonews_sidebar
https://fonana.me/?source=banner&campaign=nft_platform_footer
https://fonana.me/?source=display_ad&campaign=rtb_network_march
```

**Когда использовать**: Баннерная реклама, RTB, programmatic

---

## 🔍 ССЫЛКИ БЕЗ МЕТОК (Organic Traffic)

Если пользователь заходит БЕЗ UTM меток:
```
https://fonana.me/
```

**Что сохраняется**:
- `fonana_source` = `"None"`
- `fonana_campaign` = `"None"`

**Это означает**: Органический трафик (прямой заход, закладки, поиск без рекламы)

---

## 🛠️ КАК СОЗДАТЬ СВОЮ ССЫЛКУ

### **Шаг 1: Определи источник (`source`)**
Откуда идёт трафик?
- Social media → `facebook_ad`, `instagram_ad`, `twitter`, `tiktok`
- Реклама → `google_ads`, `yandex_ads`, `banner`
- Люди → `influencer`, `ambassador`, `referral`
- Offline → `qr_code`, `business_card`, `poster`
- Email → `email`
- Партнёры → `partner_site`, `media`

### **Шаг 2: Определи кампанию (`campaign`)**
Что это за акция / кто это / какое событие?
- Название рекламной кампании: `summer_sale_2026`, `nft_launch`
- Имя инфлюенсера: `ivan_crypto`, `maria_blogger`
- Название события: `nft_expo_moscow`, `blockchain_summit`
- Тип контента: `tutorial_video`, `review_article`

### **Шаг 3: Собери ссылку**
```
https://fonana.me/?source=<SOURCE>&campaign=<CAMPAIGN>
```

### **Примеры:**

**Пример 1**: Запускаешь рекламу в Instagram Stories
```
source = instagram_ad
campaign = stories_march_2026

Ссылка: https://fonana.me/?source=instagram_ad&campaign=stories_march_2026
```

**Пример 2**: Даёшь ссылку инфлюенсеру Ивану для его канала
```
source = influencer
campaign = ivan_crypto_telegram

Ссылка: https://fonana.me/?source=influencer&campaign=ivan_crypto_telegram
```

**Пример 3**: QR код на конференции NFT.Moscow
```
source = qr_code
campaign = nft_moscow_2026

Ссылка: https://fonana.me/?source=qr_code&campaign=nft_moscow_2026
```

---

## 📊 ЧТО СОХРАНЯЕТСЯ

### **В localStorage:**
```javascript
localStorage.getItem('fonana_source')       // → "facebook_ad"
localStorage.getItem('fonana_campaign')     // → "nft_creators"
localStorage.getItem('fonana_first_visit')  // → "2026-02-19T15:30:45.123Z"
```

### **В базе данных (таблица `metrics`):**
```sql
source = "facebook_ad|campaign:nft_creators"
```

**Формат**: `<source>|campaign:<campaign>`

---

## 🎯 РЕКОМЕНДАЦИИ ПО ИМЕНОВАНИЮ

### **✅ ХОРОШО:**
```
source=facebook_ad&campaign=summer_sale
source=influencer&campaign=john_crypto
source=qr_code&campaign=expo_moscow_2026
```
- Короткие, понятные названия
- Используй `_` вместо пробелов
- Lowercase (маленькие буквы)

### **❌ ПЛОХО:**
```
source=Facebook Ad Campaign&campaign=Summer Sale 2026!!!
source=ИНФЛЮЕНСЕР&campaign=Иван Крипто
```
- Пробелы → будут URL-encoded (%20)
- Кириллица → проблемы с encoding
- Uppercase → сложнее читать в аналитике

---

## 📈 ПРИМЕРЫ ДЛЯ КОНКРЕТНЫХ СЦЕНАРИЕВ

### **Сценарий 1: Запуск новой функции**
Хочешь протестировать разные каналы:

```
Facebook: https://fonana.me/?source=facebook_ad&campaign=feature_launch_fb
Twitter:  https://fonana.me/?source=twitter&campaign=feature_launch_tw
Email:    https://fonana.me/?source=email&campaign=feature_launch_email
```

**Результат**: Увидишь какой канал приводит больше пользователей

---

### **Сценарий 2: Работа с инфлюенсерами**
Даёшь каждому свою ссылку:

```
Иван:  https://fonana.me/?source=influencer&campaign=ivan_crypto
Мария: https://fonana.me/?source=influencer&campaign=maria_nft
Алексей: https://fonana.me/?source=influencer&campaign=alexey_blockchain
```

**Результат**: Точно знаешь кто сколько привёл пользователей

---

### **Сценарий 3: Мероприятие с QR кодами**
Разные QR коды в разных местах:

```
Стенд 1: https://fonana.me/?source=qr_code&campaign=expo_booth_1
Стенд 2: https://fonana.me/?source=qr_code&campaign=expo_booth_2
Визитки: https://fonana.me/?source=qr_code&campaign=expo_business_cards
Баннер:  https://fonana.me/?source=qr_code&campaign=expo_main_banner
```

**Результат**: Знаешь какой стенд эффективнее

---

## 🔧 ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ

### **Как работает:**
1. Пользователь кликает: `https://fonana.me/?source=facebook_ad&campaign=nft_creators`
2. Открывается `app/page.tsx`
3. Код извлекает `source` и `campaign` из URL
4. Сохраняет в `localStorage`:
   - `fonana_source` = `"facebook_ad"`
   - `fonana_campaign` = `"nft_creators"`
5. Редирект на `/creators`
6. При регистрации backend достаёт из `localStorage` и сохраняет в БД

### **Если меток нет:**
```
https://fonana.me/  (без параметров)
```
- Сохраняется: `fonana_source` = `"None"`
- Сохраняется: `fonana_campaign` = `"None"`

---

## 🚀 ГОТОВЫЕ ССЫЛКИ ДЛЯ СТАРТА

### **Для команды:**
```
Facebook Ads:      https://fonana.me/?source=facebook_ad&campaign=team_test
Telegram Channel:  https://fonana.me/?source=telegram&campaign=team_test
Email:             https://fonana.me/?source=email&campaign=team_test
```

### **Для инфлюенсеров:**
```
Инфлюенсер 1: https://fonana.me/?source=influencer&campaign=partner_1
Инфлюенсер 2: https://fonana.me/?source=influencer&campaign=partner_2
Инфлюенсер 3: https://fonana.me/?source=influencer&campaign=partner_3
```

### **Для тестирования:**
```
Test 1: https://fonana.me/?source=test&campaign=demo_1
Test 2: https://fonana.me/?source=test&campaign=demo_2
```

---

## ❓ FAQ

### **Q: Можно ли использовать русские буквы?**
A: Не рекомендуется. Используй английский: `ivan_crypto` вместо `иван_крипто`

### **Q: Что если забыл добавить campaign?**
A: Ничего страшного. Сохранится `source`, а `campaign` будет `"None"`

### **Q: Как посмотреть статистику?**
A: В базе данных таблица `metrics`, поле `source`. Можно сделать SQL запрос или admin dashboard.

### **Q: Можно добавить больше параметров?**
A: Да, но пока хватает `source` и `campaign`. Если нужно больше — скажи.

### **Q: Ссылки регистрозависимые?**
A: Нет, но рекомендую lowercase для консистентности.

---

## 📞 КОНТАКТЫ

Вопросы по UTM меткам → пиши в команду  
Технические вопросы → DevOps/Backend team

---

**Status**: ✅ Готово к использованию  
**Last Updated**: 19.02.2026  
**Version**: 1.0
