# 🔍 DISCOVERY REPORT: Post Type Detection Logic Fix

**Дата**: 17 июля 2025  
**ID задачи**: [post_type_detection_fix_2025_017]  
**Методология**: Ideal Methodology M7 + Database Analysis  
**Статус**: 🔴 CRITICAL DATA INTEGRITY ISSUE

## 🚨 ОБНАРУЖЕННАЯ ПРОБЛЕМА

### **Критическое несоответствие**: 
- **Визуально**: Пост lafufu содержит фотографию улицы с машинами
- **В базе данных**: Все посты lafufu помечены как `type: "text"`
- **Результат**: Media Only табка показывает 0 постов вместо реальных медиа

### **Scope проблемы**:
```
[API] Post "🎵 Новый трек от Lafufu" - тип: text (ожидается: audio/image)
[API] Post "Beautiful Sunset Through Playwright" - тип: text (ожидается: image)
[API] Post "📱 Vertical Image Test" - тип: text (ожидается: image)
[API] Post "🔢 Numeric Aspect Test" - тип: text (ожидается: image)
```

## 🔍 ROOT CAUSE ANALYSIS

### **Hypothesis 1**: Создание постов не анализирует медиа контент
- При создании поста система не проверяет наличие `mediaUrl`
- Всем постам присваивается дефолтный `type: "text"`

### **Hypothesis 2**: Legacy данные в БД
- Существующие посты созданы без правильной типизации
- Нужна миграция данных для исправления типов

### **Hypothesis 3**: API POST логика сломана
- Endpoint `/api/posts` не обрабатывает тип контента корректно
- Frontend передает mediaUrl, но тип остается "text"

## 📊 DATABASE INVESTIGATION NEEDED

### **Задачи для анализа**:
1. **Проверить реальные данные БД**: сколько постов имеют mediaUrl но тип "text"
2. **Анализ создания постов**: как работает POST /api/posts
3. **Логика определения типа**: где должна происходить детекция типа

## 🎯 SOLUTION STRATEGY

### **ФАЗА 1**: Database Analysis & Fix Logic
1. **Создать функцию автоматического определения типа поста**
2. **Исправить POST API для новых постов**
3. **Создать миграционный скрипт для существующих постов**

### **ФАЗА 2**: Validation & Testing  
1. **Протестировать создание новых постов**
2. **Валидировать исправленные типы через Playwright**
3. **Проверить Media Only табку**

## 🚀 IMPLEMENTATION PLAN

### **Auto Type Detection Logic**:
```typescript
function detectPostType(post: {mediaUrl?: string, content: string}): PostType {
  if (post.mediaUrl) {
    if (post.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image'
    if (post.mediaUrl.match(/\.(mp4|webm|mov|avi)$/i)) return 'video'  
    if (post.mediaUrl.match(/\.(mp3|wav|m4a|ogg)$/i)) return 'audio'
  }
  return 'text'
}
```

### **Database Migration**:
```sql
UPDATE posts 
SET type = CASE 
  WHEN mediaUrl LIKE '%.jpg' OR mediaUrl LIKE '%.jpeg' OR mediaUrl LIKE '%.png' THEN 'image'
  WHEN mediaUrl LIKE '%.mp4' OR mediaUrl LIKE '%.webm' THEN 'video'
  WHEN mediaUrl LIKE '%.mp3' OR mediaUrl LIKE '%.wav' THEN 'audio'
  ELSE 'text'
END
WHERE mediaUrl IS NOT NULL;
```

## ⏰ ESTIMATED TIMELINE
- **Database Analysis**: 30 минут
- **Fix Logic Implementation**: 45 минут  
- **Migration Script**: 30 минут
- **Testing & Validation**: 30 минут
- **Total**: 2.25 часа

## 🎭 SUCCESS CRITERIA
1. **Media Only табка показывает реальное количество медиа постов**
2. **Новые посты с изображениями получают тип "image"**
3. **Все существующие медиа-посты правильно типизированы**
4. **API логи показывают корректные типы постов**

**PRIORITY**: CRITICAL - влияет на базовую функциональность системы 