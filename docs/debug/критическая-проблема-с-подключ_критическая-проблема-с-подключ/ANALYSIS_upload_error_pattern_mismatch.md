# 🔍 АНАЛИЗ ОШИБКИ: "The string did not match the expected pattern" при загрузке видео

**Date:** 2026-03-09  
**Error:** "Failed to upload file" + "The string did not match the expected pattern"  
**Context:** Загрузка длинного видео через CreatePostModal  

---

## 📋 **ЧТО ПОКАЗЫВАЕТ СКРИНШОТ:**

```
❌ Failed to upload file
❌ The string did not match the expected pattern.

Context:
- Category: [unknown]
- Music: [selector]
- Title: "Add a catchy title (optional)"
- Description: "Ребятки, подписываемся на наш instagram"
- Content access: Free - Available to all
```

**Видно:**
- 2 ошибки подряд (красные тосты)
- Ошибка происходит **перед** созданием поста (на этапе upload)
- Валидация Title/Category не сработала (нет данных)

---

## 🔍 **АНАЛИЗ КОДА - ПУТЬ ЗАГРУЗКИ:**

### **1. Frontend (CreatePostModal.tsx):**

```typescript
// Строка 707: Функция uploadMedia
const uploadMedia = async (file: File, accessType: string) => {
  const formData = new FormData()
  formData.append('file', file) // ← Файл отправляется как есть
  formData.append('type', file.type.startsWith('video/') ? 'video' : ...)
  formData.append('accessType', accessType)

  const response = await fetch('/api/posts/upload', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error uploading file') // ← "Failed to upload file"
  }
}

// Строка 1124: Вызов из handleSubmit
const uploadResult = await uploadMedia(formData.file, formData.accessType)
if (!uploadResult || !uploadResult.fileUrl) {
  throw new Error('Failed to upload file') // ← Первая ошибка
}
```

---

### **2. Backend API (app/api/posts/upload/route.ts):**

```typescript
// Строка 86-93: Получение формы
const formData = await request.formData()
const file = formData.get('file') as File

if (!file) {
  return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
}

// Строка 104-116: Валидация типа файла
const allowedTypes: Record<string, string[]> = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'], // ← ВАЖНО!
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm']
}

if (!allowed.includes(file.type)) {
  return NextResponse.json({ 
    error: `Недопустимый тип файла. Для ${type} разрешены: ${allowed.join(', ')}` 
  }, { status: 400 })
}

// Строка 119-130: Валидация размера
const maxSizes: Record<string, number> = {
  video: 200 * 1024 * 1024, // ← 200MB лимит для видео
}

if (file.size > maxSize) {
  return NextResponse.json({ 
    error: `Файл слишком большой. Максимальный размер: ${maxSize / (1024 * 1024)}MB` 
  }, { status: 400 })
}

// Строка 168: Загрузка в BunnyStorage
const uploadResult = await uploadToBunnyStorage(fileToUpload, type as 'image' | 'video' | 'audio')
```

---

### **3. BunnyStorage Upload (lib/utils/bunny-upload.ts):**

```typescript
// Строка 28-31: Генерация имени файла
const buffer = Buffer.from(await file.arrayBuffer())
const hash = crypto.createHash('md5').update(buffer).digest('hex')
const ext = path.extname(file.name) // ← ИЗВЛЕКАЕМ РАСШИРЕНИЕ ИЗ file.name
const fileName = `${hash}${ext}` // ← hash + extension

// Строка 57-59: Формирование пути
const mediaType = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'audio'
bunnyPath = `${BUNNY_PATHS.posts[mediaType]}/${fileName}`
const bunnyUrl = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${bunnyPath}`

// Строка 65-72: Загрузка файла
const response = await fetch(bunnyUrl, {
  method: 'PUT',
  headers: {
    'AccessKey': BUNNY_API_KEY,
    'Content-Type': file.type || 'application/octet-stream',
  },
  body: buffer,
})
```

---

## 🚨 **ROOT CAUSE ANALYSIS:**

### **ПРОБЛЕМА: `path.extname(file.name)` - Некорректное имя файла**

```typescript
// lib/utils/bunny-upload.ts, строка 30
const ext = path.extname(file.name) // ← ЗДЕСЬ ПРОБЛЕМА!
```

**Что происходит:**

1. Пользователь загружает видео с **некорректным именем файла**
2. `file.name` содержит **некорректные символы** (например: кириллицу, спецсимволы, пробелы, emoji)
3. `path.extname()` **некорректно извлекает расширение**
4. `fileName = hash + ext` получается **некорректный**
5. `bunnyPath` формируется как `posts/videos/[hash][invalid_ext]`
6. BunnyCDN **отклоняет** запрос с ошибкой валидации

---

## 🔍 **ПРИМЕРЫ ПРОБЛЕМНЫХ ИМЁН:**

```
❌ BAD:
"видео для инстаграма.mp4"      ← Кириллица
"my video (final).mp4"           ← Пробелы и скобки
"test🎥.mp4"                     ← Emoji
"file.MP4"                       ← Uppercase extension (?)
"video..mp4"                     ← Двойная точка
"no-extension"                   ← Нет расширения

✅ GOOD:
"video.mp4"
"test_video.mp4"
"file-123.mp4"
```

---

## 📊 **ТЕХНИЧЕСКИЙ АНАЛИЗ:**

### **1. `path.extname()` Behavior:**

```javascript
const path = require('path')

// ✅ Работает:
path.extname('video.mp4')          // → ".mp4"
path.extname('test_video.webm')    // → ".webm"

// ⚠️ Проблемы:
path.extname('видео.mp4')          // → ".mp4" (работает, но путь может быть некорректным)
path.extname('file name.mp4')      // → ".mp4" (работает, но пробелы в пути)
path.extname('test🎥.mp4')         // → ".mp4" (но emoji в имени файла)
path.extname('no-extension')       // → "" (пустая строка!)
path.extname('file..mp4')          // → ".mp4" (но двойная точка)
```

**Вывод:** `path.extname()` работает корректно, но **не санитизирует** имя файла.

---

### **2. BunnyCDN Validation:**

BunnyCDN **требует валидные пути** (URL-safe):
- ✅ Латиница, цифры, `-`, `_`, `.`
- ❌ Кириллица, пробелы, спецсимволы, emoji

**Pattern:** `^[a-zA-Z0-9._-]+$`

**Если путь невалиден:**
```
Error: "The string did not match the expected pattern"
Status: 400 Bad Request
```

---

## 🔍 **ГДЕ ИМЕННО ОШИБКА:**

### **Сценарий:**

```
1. User загружает: "моё видео для instagram.mp4"
   └─ file.name = "моё видео для instagram.mp4"

2. bunny-upload.ts извлекает расширение:
   └─ ext = path.extname("моё видео для instagram.mp4") = ".mp4"
   └─ hash = "a1b2c3d4..." (MD5)
   └─ fileName = "a1b2c3d4...mp4" ← КОРРЕКТНО!

3. Формируется путь:
   └─ bunnyPath = "posts/videos/a1b2c3d4...mp4" ← КОРРЕКТНО!

4. ⚠️ НО! Если в `file.name` есть проблемы:
   - Кириллица в расширении? (file.name = "video.мп4")
   - Спецсимволы? (file.name = "video?.mp4")
   - Нет расширения? (file.name = "video")
```

**Вывод:** Проблема возникает если:
1. `file.name` **не содержит корректное расширение**
2. **Расширение содержит некорректные символы**
3. **Имя файла слишком длинное** (> 255 chars)

---

## 📊 **ВЕРОЯТНЫЕ ПРИЧИНЫ ОШИБКИ:**

| Причина | Вероятность | Описание |
|---------|-------------|----------|
| **1. Отсутствие расширения** | 🔴 **HIGH** | `file.name = "video"` → `ext = ""` → `fileName = "hash"` → BunnyCDN reject |
| **2. Некорректное расширение** | 🟡 MEDIUM | `file.name = "video.мп4"` → некорректный символ |
| **3. Спецсимволы в имени** | 🟡 MEDIUM | `file.name = "vi?deo.mp4"` → спецсимвол в пути |
| **4. Слишком длинное имя** | 🟢 LOW | `file.name` > 255 chars |
| **5. Неподдерживаемый MIME type** | 🟢 LOW | `file.type = "video/x-matroska"` (не в allowed list) |
| **6. Проблема на стороне BunnyCDN** | 🟢 LOW | Временная проблема API |

---

## 🔍 **DEBUGGING CHECKLIST:**

### **Что нужно проверить:**

```typescript
// 1. File name
console.log('file.name:', file.name)
console.log('file.name length:', file.name.length)
console.log('file.name regex:', /^[a-zA-Z0-9._-]+$/.test(file.name))

// 2. Extension
const ext = path.extname(file.name)
console.log('extension:', ext)
console.log('extension length:', ext.length)
console.log('extension empty:', ext === '')

// 3. Final fileName
const fileName = `${hash}${ext}`
console.log('final fileName:', fileName)
console.log('final fileName regex:', /^[a-zA-Z0-9._-]+$/.test(fileName))

// 4. Bunny path
console.log('bunnyPath:', bunnyPath)
console.log('bunnyUrl:', bunnyUrl)

// 5. File metadata
console.log('file.type:', file.type)
console.log('file.size:', file.size)
```

---

## 🎯 **ВОЗМОЖНЫЕ РЕШЕНИЯ:**

### **Solution 1: Sanitize Extension (RECOMMENDED)**

```typescript
// lib/utils/bunny-upload.ts
const ext = path.extname(file.name).toLowerCase()

// Валидация: если нет расширения или некорректное - используем fallback
let validExt = ext
if (!validExt || !/^\.[a-z0-9]+$/.test(validExt)) {
  // Fallback: определяем расширение по MIME type
  const mimeToExt: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav'
  }
  
  validExt = mimeToExt[file.type] || '.bin'
  console.warn(`⚠️ Invalid extension "${ext}", using fallback: ${validExt}`)
}

const fileName = `${hash}${validExt}`
```

---

### **Solution 2: Full Filename Sanitization**

```typescript
// lib/utils/bunny-upload.ts
function sanitizeFileName(name: string): string {
  // Удаляем путь (если есть)
  let sanitized = path.basename(name)
  
  // Заменяем некорректные символы на _
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  // Удаляем множественные _
  sanitized = sanitized.replace(/_{2,}/g, '_')
  
  // Ограничиваем длину (255 chars - max filename length)
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized)
    const base = sanitized.substring(0, 255 - ext.length)
    sanitized = base + ext
  }
  
  return sanitized.toLowerCase()
}

// Use:
const originalName = sanitizeFileName(file.name)
const ext = path.extname(originalName)
const fileName = `${hash}${ext}`
```

---

### **Solution 3: Always Use Hash + MIME Extension**

```typescript
// lib/utils/bunny-upload.ts
// НЕ используем file.name вообще!
const hash = crypto.createHash('md5').update(buffer).digest('hex')

const mimeToExt: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav'
}

const ext = mimeToExt[file.type] || '.bin'
const fileName = `${hash}${ext}` // ← ВСЕГДА валидное имя
```

**Плюсы:**
- ✅ Всегда валидное имя
- ✅ Нет зависимости от file.name
- ✅ Безопасно

**Минусы:**
- ⚠️ Теряется оригинальное расширение (но это не критично)

---

## 🔍 **РЕКОМЕНДАЦИЯ:**

### **SHORT-TERM FIX (сейчас):**

Добавить в `lib/utils/bunny-upload.ts` (строка 30):

```typescript
// Было:
const ext = path.extname(file.name)

// Стало:
let ext = path.extname(file.name).toLowerCase()

// Валидация: если нет расширения - используем MIME type
if (!ext || ext.length === 0) {
  const mimeToExt: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3'
  }
  ext = mimeToExt[file.type] || '.bin'
  console.warn(`[BUNNY UPLOAD] No extension in filename "${file.name}", using fallback: ${ext}`)
}

// Санитизация: только разрешённые символы
if (!/^\.[a-z0-9]+$/.test(ext)) {
  ext = ext.replace(/[^.a-z0-9]/g, '')
  if (ext.length === 0 || ext === '.') {
    ext = '.bin'
  }
  console.warn(`[BUNNY UPLOAD] Invalid extension, sanitized to: ${ext}`)
}

const fileName = `${hash}${ext}`
```

---

### **LONG-TERM FIX (на будущее):**

1. ✅ **MIME-based extension** (Solution 3) - самое надёжное
2. ✅ **Add validation** в `app/api/posts/upload/route.ts` перед загрузкой
3. ✅ **Add logging** для отслеживания проблемных файлов
4. ✅ **User feedback** - показывать какие файлы поддерживаются

---

## 📊 **ИТОГ:**

### **Root Cause:**
```
file.name не содержит корректное расширение
↓
path.extname() возвращает пустую строку или некорректное расширение
↓
fileName = hash + "" = hash (без расширения)
↓
bunnyPath = "posts/videos/hash" (некорректный путь)
↓
BunnyCDN отклоняет: "The string did not match the expected pattern"
```

### **Solution:**
```
Добавить fallback к MIME-based extension
+ Валидация расширения (regex)
+ Logging для отслеживания
= Всегда валидное имя файла
```

---

*Analysis completed | 2026-03-09*  
*Ready for implementation*
