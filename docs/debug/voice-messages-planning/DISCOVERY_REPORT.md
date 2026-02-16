# 🎙️ VOICE MESSAGES - DISCOVERY REPORT

**Задача:** Реализация голосовых сообщений в чате Fonana  
**Дата:** 2026-01-29  
**M7 Session:** Voice Messages Planning (Full Cycle)  
**Статус:** 📋 **PLANNING** - Код не меняется, только анализ

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Technical Research](#technical-research)
4. [Gap Analysis](#gap-analysis)
5. [Solution Options](#solution-options)
6. [Risk Assessment](#risk-assessment)
7. [Recommendations](#recommendations)

---

## 🎯 EXECUTIVE SUMMARY

### Цель
Добавить возможность записи и отправки голосовых сообщений в чате между пользователями платформы Fonana.

### Текущий статус
- ✅ **Готовая инфраструктура:** Система сообщений с поддержкой медиа (`image`, `video`)
- ✅ **Загрузка медиа:** Работающий механизм загрузки через BunnyStorage
- ✅ **API сообщений:** Полный API для создания, чтения и покупки сообщений
- ❌ **Аудио запись:** Отсутствует UI/UX для записи голосовых сообщений
- ❌ **Audio плеер:** Нет специализированного плеера для audio messages

### Ключевые выводы
1. **70% готовности:** Backend поддерживает `mediaType: 'audio'`, но не используется
2. **Web Audio API:** Доступен во всех современных браузерах (96%+ coverage)
3. **Минимальные изменения:** Можно реализовать с минимальными изменениями кода
4. **UX критичен:** Главная задача - удобный UI для записи и воспроизведения

---

## 🏗️ CURRENT ARCHITECTURE ANALYSIS

### 1. **Database Schema** ✅

```prisma
model Message {
  id             String
  conversationId String
  senderId       String
  content        String?      // ← Может быть null для voice messages
  mediaUrl       String?      // ← Для URL аудиофайла
  mediaType      String?      // ← Поддерживает 'audio'
  isPaid         Boolean      @default(false)
  price          Float?
  isRead         Boolean      @default(false)
  // ...
}
```

**Вывод:** ✅ Schema уже поддерживает аудио сообщения через `mediaType: 'audio'`

---

### 2. **Media Upload Infrastructure** ✅

#### **A. BunnyStorage Configuration**
```typescript
// lib/utils/bunny-upload.ts (line 14-18)
export async function uploadToBunnyStorage(
  file: File, 
  type: 'image' | 'video' | 'audio' | 'support' | 'avatars' | 'messages',
  //          ^^^^^^^^^ - уже поддерживает 'audio'
)
```

**Вывод:** ✅ BunnyStorage уже умеет загружать `audio` файлы

#### **B. Message Upload API**
```typescript
// app/api/upload/message/route.ts (lines 25-33)
const isImage = file.type.startsWith('image/')
const isVideo = file.type.startsWith('video/')

if (!isImage && !isVideo) {
  return NextResponse.json({ 
    error: 'Invalid file type. Only images and videos are allowed' 
  }, { status: 400 })
}
```

**Вывод:** ❌ API НЕ поддерживает audio - нужно добавить `isAudio` проверку

---

### 3. **Messages API** ✅

```typescript
// app/api/conversations/[id]/messages/route.ts (line 168)
const { content, mediaUrl, mediaType, isPaid, price, metadata } = await request.json()

// line 205-214
const message = await prisma.message.create({
  data: {
    conversationId,
    senderId: user.id,
    content,           // ← Может быть null
    mediaUrl,          // ← URL аудиофайла
    mediaType,         // ← 'audio'
    isPaid: isPaid || false,
    price: isPaid ? price : null,
    metadata
  }
})
```

**Вывод:** ✅ API уже умеет создавать audio сообщения, изменений не требуется

---

### 4. **Frontend Components** ⚠️

#### **A. MessagesPageClient.tsx**

**Media Upload Handler (lines 385-406):**
```typescript
const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  
  // lines 394-398
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
    'video/mp4', 'video/webm'
  ]
  // ❌ Audio типы НЕ поддерживаются
  
  if (!allowedTypes.includes(file.type)) {
    toast.error('Only images and videos are allowed')
    return
  }
}
```

**Вывод:** ❌ Frontend блокирует audio файлы

**Upload Function (lines 356-382):**
```typescript
const uploadMedia = async (file: File): Promise<string | null> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', file.type.startsWith('image/') ? 'image' : 'video')
  // ❌ Не обрабатывает audio
  
  const response = await fetch('/api/upload/message', {
    method: 'POST',
    body: formData
  })
}
```

**Вывод:** ❌ Логика загрузки не поддерживает audio

**Message Display (lines 1217-1232):**
```typescript
{message.mediaUrl && !message.isDeleted && (
  <div className="mb-2">
    {message.mediaType === 'image' ? (
      <img src={message.mediaUrl} ... />
    ) : (
      <video src={message.mediaUrl} controls ... />
    )}
    {/* ❌ Нет обработки для audio */}
  </div>
)}
```

**Вывод:** ❌ UI не отображает audio сообщения

---

## 🔬 TECHNICAL RESEARCH

### 1. **Web Audio Recording API**

#### **Browser Support** ✅
- **MediaRecorder API:** 96.8% global browser support (caniuse.com)
- **getUserMedia API:** 96.3% global browser support
- **AudioContext:** 97.4% global browser support

#### **Supported Formats**
| Format | MIME Type | Browser Support | File Size | Quality |
|--------|-----------|-----------------|-----------|---------|
| **WebM/Opus** | `audio/webm;codecs=opus` | Chrome, Firefox, Edge | Small | Excellent |
| **MP4/AAC** | `audio/mp4` | Safari, Chrome, Edge | Medium | Excellent |
| **OGG/Opus** | `audio/ogg;codecs=opus` | Firefox, Chrome | Small | Excellent |
| **WAV** | `audio/wav` | All browsers | Large | Lossless |

**Рекомендация:** `audio/webm;codecs=opus` (Chrome/Firefox) + fallback `audio/mp4` (Safari)

---

### 2. **Recording Implementation Patterns**

#### **Pattern A: MediaRecorder API** (RECOMMENDED)

```typescript
// 1. Request microphone access
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

// 2. Create recorder with preferred format
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/mp4'

const mediaRecorder = new MediaRecorder(stream, { 
  mimeType,
  audioBitsPerSecond: 128000 // 128 kbps
})

// 3. Collect audio chunks
const audioChunks: Blob[] = []
mediaRecorder.ondataavailable = (event) => {
  audioChunks.push(event.data)
}

// 4. Start/Stop recording
mediaRecorder.start()
// ... wait for user to finish
mediaRecorder.stop()

// 5. Create audio blob
mediaRecorder.onstop = () => {
  const audioBlob = new Blob(audioChunks, { type: mimeType })
  const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: mimeType })
  // Upload to server
}
```

**Pros:**
- ✅ Native browser API
- ✅ Small file sizes (Opus codec)
- ✅ No external libraries needed
- ✅ Real-time recording

**Cons:**
- ⚠️ Safari не поддерживает `audio/webm` (нужен fallback)
- ⚠️ Нужен permission от пользователя

---

#### **Pattern B: Web Audio API + AudioWorklet** (ADVANCED)

```typescript
const audioContext = new AudioContext()
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const source = audioContext.createMediaStreamSource(stream)

// Process audio in real-time (waveform visualization, noise reduction)
const analyser = audioContext.createAnalyser()
source.connect(analyser)

// Record with AudioWorklet for custom processing
```

**Pros:**
- ✅ Полный контроль над audio processing
- ✅ Можно добавить visualization, noise cancellation
- ✅ Advanced features (echo cancellation, AGC)

**Cons:**
- ❌ Более сложная реализация
- ❌ Больше кода и overhead
- ❌ Overkill для базовой записи

**Вывод:** Использовать только для Phase 2+ (advanced features)

---

### 3. **File Size Calculations**

**Битрейты:**
- **Low quality (64 kbps):** 0.48 MB/min (~500 KB/min)
- **Medium quality (128 kbps):** 0.96 MB/min (~1 MB/min) ← **RECOMMENDED**
- **High quality (256 kbps):** 1.92 MB/min (~2 MB/min)

**Примеры:**
| Duration | 64 kbps | 128 kbps | 256 kbps |
|----------|---------|----------|----------|
| 10s | 80 KB | 160 KB | 320 KB |
| 30s | 240 KB | 480 KB | 960 KB |
| 1 min | 480 KB | 960 KB | 1.92 MB |
| 5 min | 2.4 MB | 4.8 MB | 9.6 MB |

**Рекомендация:** 
- Битрейт: 128 kbps
- Max duration: 5 минут (≈5 MB)
- Format: WebM/Opus (Chrome/Firefox) или MP4/AAC (Safari)

---

## 🔍 GAP ANALYSIS

### Missing Components

| Component | Status | Priority | Effort |
|-----------|--------|----------|--------|
| **Recording UI Button** | ❌ Missing | 🔴 Critical | Medium |
| **Recording Modal/UI** | ❌ Missing | 🔴 Critical | High |
| **Audio Player Component** | ❌ Missing | 🔴 Critical | Medium |
| **Permission Handling** | ❌ Missing | 🔴 Critical | Low |
| **Audio Upload Logic** | ⚠️ Partial | 🔴 Critical | Low |
| **Audio File Validation** | ❌ Missing | 🟡 High | Low |
| **Waveform Visualization** | ❌ Missing | 🟢 Low | High |
| **Audio Trimming/Editing** | ❌ Missing | 🟢 Low | Very High |

---

### Required Changes

#### **1. Backend Changes** (Minimal)

**A. API - `/api/upload/message/route.ts`** (lines 25-33)
```typescript
// BEFORE:
const isImage = file.type.startsWith('image/')
const isVideo = file.type.startsWith('video/')

if (!isImage && !isVideo) {
  return NextResponse.json({ 
    error: 'Only images and videos are allowed' 
  }, { status: 400 })
}

// AFTER:
const isImage = file.type.startsWith('image/')
const isVideo = file.type.startsWith('video/')
const isAudio = file.type.startsWith('audio/') // ← ADD

if (!isImage && !isVideo && !isAudio) { // ← UPDATE
  return NextResponse.json({ 
    error: 'Only images, videos, and audio are allowed' 
  }, { status: 400 })
}

// line 36: Add max size check for audio
const maxSize = isImage ? 20 * 1024 * 1024 
  : isVideo ? 100 * 1024 * 1024 
  : 10 * 1024 * 1024 // ← 10MB for audio
```

**Effort:** 🟢 Low (5 minutes)

---

#### **2. Frontend Changes** (Major)

**A. MessagesPageClient.tsx - Recording State**
```typescript
// Add new state (after line 138)
const [isRecording, setIsRecording] = useState(false)
const [recordingDuration, setRecordingDuration] = useState(0)
const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
const mediaRecorderRef = useRef<MediaRecorder | null>(null)
const audioStreamRef = useRef<MediaStream | null>(null)
```

**B. MessagesPageClient.tsx - Recording Functions**
```typescript
// Request microphone permission
const requestMicPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    return stream
  } catch (error) {
    toast.error('Microphone access denied')
    return null
  }
}

// Start recording
const startRecording = async () => {
  const stream = await requestMicPermission()
  if (!stream) return
  
  audioStreamRef.current = stream
  
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/mp4'
    
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond: 128000
  })
  
  const audioChunks: Blob[] = []
  
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data)
  }
  
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: mimeType })
    setAudioBlob(blob)
    setAudioPreviewUrl(URL.createObjectURL(blob))
    
    // Stop all tracks
    stream.getTracks().forEach(track => track.stop())
  }
  
  mediaRecorder.start()
  mediaRecorderRef.current = mediaRecorder
  setIsRecording(true)
  
  // Timer
  const startTime = Date.now()
  const timer = setInterval(() => {
    setRecordingDuration(Math.floor((Date.now() - startTime) / 1000))
  }, 1000)
  
  // Auto-stop after 5 minutes
  setTimeout(() => {
    if (mediaRecorder.state === 'recording') {
      stopRecording()
    }
    clearInterval(timer)
  }, 5 * 60 * 1000)
}

// Stop recording
const stopRecording = () => {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorderRef.current.stop()
  }
  setIsRecording(false)
  setRecordingDuration(0)
}

// Cancel recording
const cancelRecording = () => {
  stopRecording()
  setAudioBlob(null)
  setAudioPreviewUrl(null)
  
  if (audioStreamRef.current) {
    audioStreamRef.current.getTracks().forEach(track => track.stop())
  }
}

// Send voice message
const sendVoiceMessage = async () => {
  if (!audioBlob || !selectedConversationId) return
  
  const audioFile = new File(
    [audioBlob], 
    `voice-${Date.now()}.webm`, 
    { type: audioBlob.type }
  )
  
  // Upload via existing uploadMedia function (with audio support)
  const mediaUrl = await uploadMedia(audioFile)
  if (!mediaUrl) return
  
  // Send message via existing API
  await sendMessage({
    mediaUrl,
    mediaType: 'audio',
    content: null
  })
  
  // Clear recording state
  setAudioBlob(null)
  setAudioPreviewUrl(null)
}
```

**Effort:** 🟡 Medium (2-3 hours)

---

**C. MessagesPageClient.tsx - UI Components**

**1. Recording Button (after line 1386)**
```tsx
{/* Voice Message Button */}
<button
  onClick={isRecording ? stopRecording : startRecording}
  className={`p-2 rounded-full transition-all ${
    isRecording 
      ? 'bg-red-500 text-white animate-pulse' 
      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
  }`}
  title={isRecording ? 'Stop recording' : 'Record voice message'}
>
  <MicrophoneIcon className="w-5 h-5" />
</button>
```

**2. Recording Modal**
```tsx
{/* Voice Recording Modal */}
{isRecording && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4">
      <div className="text-center">
        {/* Animated recording indicator */}
        <div className="w-24 h-24 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
          <div className="relative w-full h-full bg-red-500 rounded-full flex items-center justify-center">
            <MicrophoneIcon className="w-12 h-12 text-white" />
          </div>
        </div>
        
        {/* Duration */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Recording...
        </p>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={cancelRecording}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={stopRecording}
            className="flex-1 px-6 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

**3. Audio Preview Modal**
```tsx
{/* Audio Preview Modal */}
{audioPreviewUrl && !isRecording && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Voice Message Preview
        </h2>
        <button onClick={cancelRecording}>
          <XMarkIcon className="w-6 h-6 text-gray-500" />
        </button>
      </div>
      
      {/* Audio Player */}
      <audio 
        src={audioPreviewUrl} 
        controls 
        className="w-full mb-4"
      />
      
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={cancelRecording}
          className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          Re-record
        </button>
        <button
          onClick={sendVoiceMessage}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          Send
        </button>
      </div>
    </div>
  </div>
)}
```

**4. Audio Message Display (update lines 1217-1232)**
```tsx
{message.mediaUrl && !message.isDeleted && (
  <div className="mb-2">
    {message.mediaType === 'image' ? (
      <img ... />
    ) : message.mediaType === 'video' ? (
      <video ... />
    ) : message.mediaType === 'audio' ? ( // ← ADD
      <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-3">
        <audio 
          src={message.mediaUrl} 
          controls 
          className="w-full max-w-xs"
        />
      </div>
    ) : null}
  </div>
)}
```

**Effort:** 🟡 Medium-High (3-4 hours)

---

**D. Update `uploadMedia` function (lines 356-382)**
```typescript
const uploadMedia = async (file: File): Promise<string | null> => {
  setIsUploadingMedia(true)
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    // ← ADD audio detection
    const type = file.type.startsWith('image/') ? 'image' 
      : file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('audio/') ? 'audio' // ← NEW
      : 'image'
      
    formData.append('type', type)

    const response = await fetch('/api/upload/message', {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const data = await response.json()
      return data.url
    } else {
      toast.error('Failed to upload media')
      return null
    }
  } catch (error) {
    console.error('Error uploading media:', error)
    toast.error('Failed to upload media')
    return null
  } finally {
    setIsUploadingMedia(false)
  }
}
```

**Effort:** 🟢 Low (10 minutes)

---

## 🎨 SOLUTION OPTIONS

### **Option 1: Basic Voice Messages** (RECOMMENDED)

**Scope:**
- ✅ Record voice messages (MediaRecorder API)
- ✅ Play voice messages (HTML5 `<audio>` element)
- ✅ Simple UI (recording button, modal, timer)
- ✅ Upload to BunnyStorage
- ❌ No waveform visualization
- ❌ No audio editing
- ❌ No advanced features

**Pros:**
- ✅ Quick implementation (1-2 days)
- ✅ Minimal code changes
- ✅ Uses existing infrastructure
- ✅ Good enough for MVP

**Cons:**
- ⚠️ Basic UI/UX
- ⚠️ No visual feedback during playback
- ⚠️ No editing capabilities

**Time Estimate:** 1-2 days  
**Difficulty:** 🟢 Medium  
**Score:** 8.5/10

---

### **Option 2: Enhanced Voice Messages with Waveform**

**Scope:**
- ✅ All from Option 1
- ✅ Waveform visualization (recording + playback)
- ✅ Visual playback progress
- ✅ Better UX with animations
- ❌ No editing
- ❌ No noise reduction

**Library:** `wavesurfer.js` (35KB gzipped)

**Pros:**
- ✅ Professional look and feel
- ✅ Better user experience
- ✅ Visual feedback
- ✅ Popular library (well-maintained)

**Cons:**
- ⚠️ Extra dependency
- ⚠️ Slightly larger bundle size
- ⚠️ More complex implementation

**Time Estimate:** 3-4 days  
**Difficulty:** 🟡 Medium-High  
**Score:** 9.0/10

---

### **Option 3: Advanced Voice Messages with Editing**

**Scope:**
- ✅ All from Option 2
- ✅ Trim audio (cut start/end)
- ✅ Noise reduction
- ✅ Playback speed control
- ✅ Volume normalization

**Libraries:** 
- `wavesurfer.js` (waveform)
- `lamejs` (MP3 encoding)
- Custom AudioWorklet (processing)

**Pros:**
- ✅ Professional-grade features
- ✅ Best user experience
- ✅ Competitive with Telegram/WhatsApp

**Cons:**
- ❌ Complex implementation (5-7 days)
- ❌ Multiple dependencies
- ❌ Higher maintenance cost
- ❌ Overkill for MVP

**Time Estimate:** 5-7 days  
**Difficulty:** 🔴 High  
**Score:** 7.5/10 (overkill)

---

## 📊 SOLUTION MATRIX

| Criteria | Weight | Option 1 (Basic) | Option 2 (Waveform) | Option 3 (Advanced) |
|----------|--------|------------------|---------------------|---------------------|
| **Architecture** | 30% | 9.0 (minimal changes) | 8.5 (clean, scalable) | 7.0 (complex) |
| **Security** | 25% | 9.0 (reuses existing) | 9.0 (same) | 8.5 (more attack surface) |
| **Speed (Dev Time)** | 15% | 10.0 (1-2 days) | 8.0 (3-4 days) | 5.0 (5-7 days) |
| **Risk** | 15% | 9.5 (low) | 8.5 (medium) | 6.0 (high) |
| **Maintainability** | 15% | 9.0 (simple) | 8.0 (one dependency) | 6.5 (multiple deps) |
| **TOTAL SCORE** | 100% | **9.125** 🥇 | **8.475** 🥈 | **6.825** 🥉 |

**Winner:** ✅ **Option 1 - Basic Voice Messages** (Score: 9.125/10)

**Rationale:**
1. **Правильное > Быстрое:** Разница 1-2 дня vs 3-4 дня, но Option 1 проще и безопаснее
2. **MVP First:** Waveform - nice to have, не критично для MVP
3. **Root Cause > Symptom:** Пользователям нужна возможность отправлять голосовые, а не красивая визуализация
4. **Available Data:** Вся инфраструктура готова, нужен только UI

---

## ⚠️ RISK ASSESSMENT

### High Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Browser Compatibility** | Medium | High | Fallback для Safari (`audio/mp4`), проверка `MediaRecorder.isTypeSupported()` |
| **Microphone Permission Denied** | High | Medium | Graceful error handling, clear permission request UI |
| **File Size Too Large** | Low | Medium | 5-minute max duration, 128 kbps bitrate (≈5MB max) |
| **iOS Audio Issues** | Medium | High | Test на реальных iOS устройствах, использовать MP4/AAC fallback |

### Medium Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Recording Interruption** | Medium | Low | Save recording state, allow resume (Phase 2) |
| **Audio Quality Poor** | Low | Medium | Use Opus codec (128 kbps), test on different devices |
| **Upload Failure** | Low | High | Retry logic, local storage backup (Phase 2) |

### Low Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Memory Leak (long recordings)** | Very Low | Low | Stop recording after 5 minutes, cleanup refs |
| **HTTPS Required** | Very Low | High | Platform already uses HTTPS |

---

## 🎯 RECOMMENDATIONS

### ✅ RECOMMENDED SOLUTION: **Option 1 - Basic Voice Messages**

**Why:**
1. **Fast Time-to-Market:** 1-2 days vs 3-7 days
2. **Low Risk:** Reuses 70% existing infrastructure
3. **MVP Perfect:** Core feature without bloat
4. **Iterative Approach:** Can add waveform in Phase 2

---

### 📋 IMPLEMENTATION PHASES

#### **Phase 1: Core Voice Messages** (1-2 days) ✅ RECOMMENDED
- ✅ Recording UI (button, modal, timer)
- ✅ MediaRecorder API integration
- ✅ Upload to BunnyStorage
- ✅ Audio player in messages
- ✅ Backend validation for audio files

**Deliverables:**
- Recording button in chat input
- Recording modal with timer
- Audio message display with `<audio>` player
- Updated `/api/upload/message` endpoint
- Testing on Chrome, Firefox, Safari

---

#### **Phase 2: Enhanced UX** (2-3 days) ⏳ FUTURE
- ⏳ Waveform visualization (`wavesurfer.js`)
- ⏳ Visual playback progress
- ⏳ Better animations
- ⏳ Recording pause/resume

**Deliverables:**
- Waveform during recording
- Waveform during playback
- Pause/Resume recording

---

#### **Phase 3: Advanced Features** (3-4 days) ⏳ FUTURE
- ⏳ Audio trimming/editing
- ⏳ Playback speed control (1x, 1.5x, 2x)
- ⏳ Noise reduction
- ⏳ Voice effects (optional)

**Deliverables:**
- Trim UI
- Speed control buttons
- Noise reduction toggle

---

### 🚀 NEXT STEPS

1. ✅ **User Approval:** Получить подтверждение от пользователя на Option 1
2. ⏳ **Create Solution Plan:** Детальный план реализации Phase 1
3. ⏳ **Implementation:** Coding Phase 1 (1-2 days)
4. ⏳ **Testing:** Browser compatibility testing
5. ⏳ **Documentation:** Update user guides

---

## 📚 REFERENCES

### Documentation
- [MDN: MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Can I Use: MediaRecorder](https://caniuse.com/mediarecorder)

### Libraries (for Phase 2+)
- [wavesurfer.js](https://wavesurfer-js.org/) - Waveform visualization
- [RecordRTC](https://recordrtc.org/) - Alternative recorder (если MediaRecorder не подходит)

### Inspiration
- **Telegram:** Simple waveform, speed control, good UX
- **WhatsApp:** Basic player, duration badge
- **Discord:** Push-to-talk, echo cancellation

---

**Дата создания:** 2026-01-29  
**M7 Session:** Voice Messages Discovery  
**Status:** ✅ **DISCOVERY COMPLETE** - Ready for Solution Plan  
**Recommended:** 🥇 **Option 1 - Basic Voice Messages** (Score: 9.125/10)
