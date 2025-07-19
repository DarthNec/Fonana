# 🐛 CRITICAL BUGS DISCOVERY: Profile System Issues

**Дата**: 17 июля 2025  
**ID задачи**: [profile_system_expansion_bugs_2025_017]  
**Методология**: Ideal Methodology M7 + Playwright MCP Debugging  
**Статус**: 🔴 CRITICAL BUGS DETECTED

## 🚨 ОБНАРУЖЕННЫЕ КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. 🔴 **Посты всех пользователей вместо фильтрации**
**Проблема**: В профиле lafufu показываются 20 постов от разных авторов  
**Ожидается**: Только посты пользователя lafufu  
**Статус**: Critical  
**Локация**: CreatorPageClient.tsx + useOptimizedPosts

### 2. 🔴 **Edit Profile API 400 ошибки + бесконечный цикл**
**Проблема**: 
- `/api/user` возвращает 400 Bad Request
- Бесконечные повторные запросы при сохранении профиля
- "Error updating profile: Error: Failed to update profile"

**Статус**: Critical  
**Локация**: ProfileSetupModal + /api/user endpoint

### 3. 🟡 **Media Only табка пустая**
**Проблема**: Табка "Media Only" не показывает медиа контент  
**Ожидается**: Фильтрация постов только с изображениями/видео  
**Статус**: Major  

### 4. 🟡 **Background duplication не работает**
**Проблема**: Плашка с аватаром серая, background image не дублируется  
**Ожидается**: Background image из профиля должен отображаться на плашке  
**Статус**: Major

## 🎭 PLAYWRIGHT MCP ДИАГНОСТИКА

### ✅ Работающее:
- URL редирект `/lafufu` → `/creator/cmbymuez00004qoe1aeyoe7zf`
- Profile загрузка и отображение основной информации
- Табки переключение между "All Posts" и "Media Only"
- Edit Profile кнопка открывает модалку

### ❌ Сломанное:
- Posts filtering по creatorId 
- API /api/user authentication/validation
- Media filtering logic
- Background image CSS styling

## 🔍 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### API Logs Analysis:
```
[API] Current user: cmbymuez00004qoe1aeyoe7zf lafufu
[API] User viewing own post "🛍️ FOR SALE: Limited Edition NFT Art" - AUTHOR ACCESS
[API] Returning 20 posts with tier access info
```

**Проблема**: API возвращает все 20 постов, а не фильтрует по creatorId

### Console Errors:
```
:3000/api/user:1 Failed to load resource: the server responded with a status of 400 (Bad Request)
Error updating profile: Error: Failed to update profile
```

**Проблема**: API /api/user не принимает PUT запросы или проблема с валидацией

## 📊 IMPACT ANALYSIS

### Critical (Немедленно исправить):
1. **Posts filtering** - основная функциональность профиля
2. **Edit Profile API** - пользователи не могут редактировать профили

### Major (Важно):
3. **Media filtering** - UX улучшение
4. **Background duplication** - визуальный дизайн

## 🎯 ПЛАН ИСПРАВЛЕНИЯ

### ФАЗА 1: Critical Fixes (1-2 часа)
1. **Исправить posts filtering**: Добавить creatorId фильтр в useOptimizedPosts
2. **Диагностировать /api/user**: Проверить authentication и валидацию

### ФАЗА 2: Major Fixes (30 минут)  
3. **Реализовать media filtering**: Фильтр по type: image/video
4. **Исправить background duplication**: CSS стили для header card

## 🔧 ROOT CAUSE HYPOTHESIS

### Posts Filtering Issue:
- useOptimizedPosts не получает или не использует creatorId параметр
- API query не включает фильтрацию по creatorId

### Edit Profile API Issue:
- /api/user endpoint требует authentication header
- Проблема с JWT token передачей
- Валидация данных не проходит

### Media/Background Issues:
- Логика фильтрации медиа не реализована
- CSS для background duplication неправильный

## ⏰ ВРЕМЕННЫЕ ЗАТРАТЫ
**Estimated**: 2-3 часа на все исправления  
**Priority Order**: Posts → Edit Profile → Media → Background

## 📝 СЛЕДУЮЩИЕ ШАГИ
1. ✅ Discovery Phase завершена
2. 🔄 Debug Phase - начинается сейчас
3. 🔧 Fix Implementation Phase 
4. ✅ Validation Phase с Playwright MCP 