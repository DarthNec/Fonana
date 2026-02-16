# 🎙️ VOICE MESSAGES - SOLUTION PLAN

**Проект:** Fonana Voice Messages Implementation  
**Дата:** 2026-01-29  
**M7 Session:** Voice Messages Planning (Phase 1)  
**Рекомендация:** ✅ **Option 1 - Basic Voice Messages**  
**Статус:** 📋 **PLANNING** - Готов к реализации

---

## 📋 TABLE OF CONTENTS

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Core Voice Messages](#phase-1-core-voice-messages)
3. [File Changes Breakdown](#file-changes-breakdown)
4. [Code Snippets](#code-snippets)
5. [Testing Plan](#testing-plan)
6. [Deployment Strategy](#deployment-strategy)
7. [Timeline](#timeline)

---

## 🎯 IMPLEMENTATION OVERVIEW

### Goals
- ✅ Пользователи могут записывать голосовые сообщения (до 5 минут)
- ✅ Голосовые сообщения загружаются в BunnyStorage
- ✅ Голосовые сообщения отображаются с audio player
- ✅ Работает на всех браузерах (Chrome, Firefox, Safari, Edge)
- ✅ Graceful error handling для permissions

### Scope
**Included:**
- 🎤 Recording UI (button, modal, timer)
- 🎵 Audio upload to BunnyStorage
- ▶️ Audio player in messages
- 🔒 Permission handling
- ✅ Backend validation

**Excluded (Phase 2+):**
- ❌ Waveform visualization
- ❌ Audio editing/trimming
- ❌ Noise reduction
- ❌ Playback speed control

---

## 🚀 PHASE 1: CORE VOICE MESSAGES

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                           │
├─────────────────────────────────────────────────────────────┤
│  MessagesPageClient.tsx                                     │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ Record Button   │→ │ Recording Modal  │                 │
│  │ (Microphone)    │  │ (Timer + Actions)│                 │
│  └─────────────────┘  └──────────────────┘                 │
│           ↓                     ↓                           │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ Audio Preview   │→ │ Send Voice Msg   │                 │
│  │ Modal           │  │ Function         │                 │
│  └─────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Browser APIs                             │
├─────────────────────────────────────────────────────────────┤
│  navigator.mediaDevices.getUserMedia({ audio: true })      │
│                     ↓                                       │
│  MediaRecorder API (WebM/Opus or MP4/AAC)                  │
│                     ↓                                       │
│  Blob → File                                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Upload Flow                              │
├─────────────────────────────────────────────────────────────┤
│  uploadMedia(audioFile) [MessagesPageClient.tsx]           │
│                     ↓                                       │
│  POST /api/upload/message [route.ts]                       │
│    - Validate: audio/* MIME type                           │
│    - Max size: 10MB                                        │
│    - Upload to BunnyStorage (messages/audio/)              │
│                     ↓                                       │
│  Return: { url: "https://cdn.fonana.app/..." }             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Message Creation                         │
├─────────────────────────────────────────────────────────────┤
│  POST /api/conversations/[id]/messages                      │
│    {                                                        │
│      content: null,                                         │
│      mediaUrl: "https://cdn.fonana.app/...",               │
│      mediaType: "audio"                                     │
│    }                                                        │
│                     ↓                                       │
│  Prisma: Create message in DB                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Message Display                          │
├─────────────────────────────────────────────────────────────┤
│  MessagesPageClient.tsx - Message List                     │
│    {message.mediaType === 'audio' && (                     │
│      <audio src={message.mediaUrl} controls />             │
│    )}                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 FILE CHANGES BREAKDOWN

### Changes Summary

| File | Type | Lines Changed | Difficulty | Priority |
|------|------|---------------|------------|----------|
| `app/api/upload/message/route.ts` | Update | ~15 | 🟢 Low | 🔴 Critical |
| `components/MessagesPageClient.tsx` | Update | ~250 | 🟡 Medium | 🔴 Critical |
| `lib/constants/bunny-storage.ts` | Read | 0 (check paths) | 🟢 Low | 🟡 High |

**Total:** 2 файла изменений + ~265 строк кода

---

### File 1: `app/api/upload/message/route.ts`

**Location:** `app/api/upload/message/route.ts`  
**Type:** Backend API Update  
**Difficulty:** 🟢 Low  
**Priority:** 🔴 Critical

#### Changes Required

**1. Update File Type Validation (lines 25-33)**

```typescript
// BEFORE:
const isImage = file.type.startsWith('image/')
const isVideo = file.type.startsWith('video/')

if (!isImage && !isVideo) {
  return NextResponse.json({ 
    error: 'Only images and videos are allowed for messages' 
  }, { status: 400 })
}

// AFTER:
const isImage = file.type.startsWith('image/')
const isVideo = file.type.startsWith('video/')
const isAudio = file.type.startsWith('audio/') // ← ADD

if (!isImage && !isVideo && !isAudio) { // ← UPDATE
  return NextResponse.json({ 
    error: 'Only images, videos, and audio are allowed for messages' 
  }, { status: 400 })
}
```

---

**2. Update Max Size Validation (line 36)**

```typescript
// BEFORE:
const maxSize = isImage ? 20 * 1024 * 1024 : 100 * 1024 * 1024

// AFTER:
const maxSize = isImage ? 20 * 1024 * 1024 
  : isVideo ? 100 * 1024 * 1024 
  : 10 * 1024 * 1024 // ← ADD: 10MB for audio (5min @ 128kbps ≈ 4.8MB)

if (file.size > maxSize) {
  const maxSizeMB = isImage ? '20MB' : isVideo ? '100MB' : '10MB' // ← UPDATE
  return NextResponse.json({ 
    error: `File too large. Max size: ${maxSizeMB} for ${isImage ? 'images' : isVideo ? 'videos' : 'audio'}` 
  }, { status: 400 })
}
```

---

**3. Update Upload Logic (around line 50-80)**

```typescript
// Check if audio conversion is needed (existing code handles this via bunny-upload)
// Audio files will be uploaded as-is to BunnyStorage under messages/audio/

if (isAudio) {
  console.log('Audio upload attempt:', {
    name: file.name,
    type: file.type,
    size: file.size
  })
  
  // Upload audio to BunnyStorage (messages/audio/)
  const result = await uploadToBunnyStorage(file, 'messages')
  
  if (!result.success || !result.fileUrl) {
    return NextResponse.json({ 
      error: 'Failed to upload audio to BunnyStorage' 
    }, { status: 500 })
  }
  
  return NextResponse.json({ 
    url: result.fileUrl,
    type: 'audio'
  })
}

// ... existing image/video logic remains unchanged
```

**Effort:** 🟢 15 минут  
**Risk:** 🟢 Low (isolated changes)

---

### File 2: `components/MessagesPageClient.tsx`

**Location:** `components/MessagesPageClient.tsx`  
**Type:** Frontend Component Update  
**Difficulty:** 🟡 Medium  
**Priority:** 🔴 Critical

#### Section 1: Import Icons (after line 21)

```typescript
// ADD new icon import
import { MicrophoneIcon } from '@heroicons/react/24/outline'
```

---

#### Section 2: State Variables (after line 138)

```typescript
// Voice recording states
const [isRecording, setIsRecording] = useState(false)
const [recordingDuration, setRecordingDuration] = useState(0)
const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
const [recordingTimerRef, setRecordingTimerRef] = useState<NodeJS.Timeout | null>(null)

// Refs for media recording
const mediaRecorderRef = useRef<MediaRecorder | null>(null)
const audioStreamRef = useRef<MediaStream | null>(null)
const audioChunksRef = useRef<Blob[]>([])
```

---

#### Section 3: Recording Functions (after line 400)

```typescript
// 🎤 VOICE RECORDING FUNCTIONS

/**
 * Request microphone permission from user
 */
const requestMicPermission = async (): Promise<MediaStream | null> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })
    return stream
  } catch (error) {
    console.error('[Voice Recording] Microphone access error:', error)
    
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.')
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone.')
      } else {
        toast.error('Failed to access microphone')
      }
    } else {
      toast.error('Failed to access microphone')
    }
    
    return null
  }
}

/**
 * Start recording voice message
 */
const startRecording = async () => {
  try {
    console.log('[Voice Recording] Starting recording...')
    
    // Request microphone access
    const stream = await requestMicPermission()
    if (!stream) return
    
    audioStreamRef.current = stream
    
    // Determine MIME type support (prefer WebM/Opus, fallback to MP4/AAC for Safari)
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ]
    
    const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type))
    
    if (!supportedMimeType) {
      toast.error('Your browser does not support audio recording')
      stream.getTracks().forEach(track => track.stop())
      return
    }
    
    console.log('[Voice Recording] Using MIME type:', supportedMimeType)
    
    // Create MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: supportedMimeType,
      audioBitsPerSecond: 128000 // 128 kbps - good balance between quality and file size
    })
    
    // Reset chunks
    audioChunksRef.current = []
    
    // Collect audio data
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    }
    
    // Handle recording stop
    mediaRecorder.onstop = () => {
      console.log('[Voice Recording] Recording stopped, creating blob...')
      
      const blob = new Blob(audioChunksRef.current, { type: supportedMimeType })
      console.log('[Voice Recording] Blob created:', {
        size: blob.size,
        type: blob.type
      })
      
      setAudioBlob(blob)
      setAudioPreviewUrl(URL.createObjectURL(blob))
      
      // Stop all tracks
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
        audioStreamRef.current = null
      }
    }
    
    // Handle errors
    mediaRecorder.onerror = (event: any) => {
      console.error('[Voice Recording] MediaRecorder error:', event)
      toast.error('Recording error occurred')
      cancelRecording()
    }
    
    // Start recording
    mediaRecorder.start()
    mediaRecorderRef.current = mediaRecorder
    setIsRecording(true)
    setRecordingDuration(0)
    
    console.log('[Voice Recording] Recording started')
    
    // Start timer
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setRecordingDuration(elapsed)
      
      // Auto-stop after 5 minutes (300 seconds)
      if (elapsed >= 300) {
        console.log('[Voice Recording] Max duration reached, stopping...')
        stopRecording()
        toast('Maximum recording duration reached (5 minutes)', { icon: '⏱️' })
      }
    }, 1000)
    
    setRecordingTimerRef(timer)
    
  } catch (error) {
    console.error('[Voice Recording] Start recording error:', error)
    toast.error('Failed to start recording')
  }
}

/**
 * Stop recording (saves the recording)
 */
const stopRecording = () => {
  console.log('[Voice Recording] Stopping recording...')
  
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorderRef.current.stop()
  }
  
  if (recordingTimerRef) {
    clearInterval(recordingTimerRef)
    setRecordingTimerRef(null)
  }
  
  setIsRecording(false)
  
  console.log('[Voice Recording] Recording stopped')
}

/**
 * Cancel recording (discards the recording)
 */
const cancelRecording = () => {
  console.log('[Voice Recording] Cancelling recording...')
  
  // Stop recorder if active
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
    mediaRecorderRef.current.stop()
  }
  
  // Clear timer
  if (recordingTimerRef) {
    clearInterval(recordingTimerRef)
    setRecordingTimerRef(null)
  }
  
  // Stop stream
  if (audioStreamRef.current) {
    audioStreamRef.current.getTracks().forEach(track => track.stop())
    audioStreamRef.current = null
  }
  
  // Clear state
  setIsRecording(false)
  setRecordingDuration(0)
  setAudioBlob(null)
  
  if (audioPreviewUrl) {
    URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl(null)
  }
  
  audioChunksRef.current = []
  
  console.log('[Voice Recording] Recording cancelled')
}

/**
 * Send voice message
 */
const sendVoiceMessage = async () => {
  if (!audioBlob || !selectedConversationId || isSending) return
  
  console.log('[Voice Recording] Sending voice message...')
  
  setIsSending(true)
  
  try {
    // Determine file extension based on MIME type
    const extension = audioBlob.type.includes('webm') ? 'webm' 
      : audioBlob.type.includes('mp4') ? 'm4a'
      : audioBlob.type.includes('ogg') ? 'ogg'
      : 'webm'
      
    const audioFile = new File(
      [audioBlob], 
      `voice-${Date.now()}.${extension}`, 
      { type: audioBlob.type }
    )
    
    console.log('[Voice Recording] Uploading audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })
    
    // Upload audio file
    const mediaUrl = await uploadMedia(audioFile)
    
    if (!mediaUrl) {
      throw new Error('Failed to upload audio file')
    }
    
    console.log('[Voice Recording] Audio uploaded successfully:', mediaUrl)
    
    // Get JWT token
    const token = await jwtManager.getToken()
    if (!token) {
      throw new Error('No authentication token')
    }
    
    // Send message
    const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: null, // Voice messages don't have text content
        mediaUrl,
        mediaType: 'audio',
        isPaid: false,
        price: null
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      setMessages(prev => [...prev, data.message])
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      
      toast.success('Voice message sent!')
      console.log('[Voice Recording] Voice message sent successfully')
    } else {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send message')
    }
    
  } catch (error) {
    console.error('[Voice Recording] Send voice message error:', error)
    toast.error('Failed to send voice message')
  } finally {
    setIsSending(false)
    
    // Cleanup
    cancelRecording()
  }
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (recordingTimerRef) {
      clearInterval(recordingTimerRef)
    }
  }
}, [])
```

**Effort:** 🟡 1-1.5 hours  
**Risk:** 🟢 Low (isolated logic, no dependencies)

---

#### Section 4: Update `uploadMedia` Function (lines 356-382)

```typescript
const uploadMedia = async (file: File): Promise<string | null> => {
  setIsUploadingMedia(true)
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    // ← UPDATE: Add audio detection
    const type = file.type.startsWith('image/') ? 'image' 
      : file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('audio/') ? 'audio' // ← NEW
      : 'image' // fallback
      
    formData.append('type', type)

    console.log(`[Upload Media] Uploading ${type}:`, {
      name: file.name,
      size: file.size,
      type: file.type
    })

    const response = await fetch('/api/upload/message', {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      const data = await response.json()
      console.log('[Upload Media] Upload successful:', data)
      return data.url
    } else {
      const errorData = await response.json()
      console.error('[Upload Media] Upload failed:', errorData)
      toast.error(errorData.error || 'Failed to upload media')
      return null
    }
  } catch (error) {
    console.error('[Upload Media] Error uploading media:', error)
    toast.error('Failed to upload media')
    return null
  } finally {
    setIsUploadingMedia(false)
  }
}
```

**Effort:** 🟢 5 минут  
**Risk:** 🟢 Low

---

#### Section 5: Update Message Display (lines 1217-1232)

```typescript
{message.mediaUrl && !message.isDeleted && (
  <div className="mb-2">
    {message.mediaType === 'image' ? (
      <img
        src={message.mediaUrl}
        alt="Message media"
        className="rounded-xl max-w-xs w-full h-auto object-cover"
      />
    ) : message.mediaType === 'video' ? (
      <video
        src={message.mediaUrl}
        controls
        className="rounded-xl max-w-xs w-full h-auto"
      />
    ) : message.mediaType === 'audio' ? ( // ← ADD
      <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <MicrophoneIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            Voice Message
          </span>
        </div>
        <audio 
          src={message.mediaUrl} 
          controls 
          className="w-full"
          style={{ height: '32px' }}
        />
      </div>
    ) : null}
  </div>
)}
```

**Effort:** 🟢 10 минут  
**Risk:** 🟢 Low

---

#### Section 6: Add Recording Button (after line 1386)

```tsx
{/* Voice Message Button */}
<button
  onClick={isRecording ? stopRecording : startRecording}
  disabled={isSending || isUploadingMedia}
  className={`p-2 rounded-full transition-all ${
    isRecording 
      ? 'bg-red-500 text-white animate-pulse' 
      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700'
  } disabled:opacity-50 disabled:cursor-not-allowed`}
  title={isRecording ? 'Stop recording' : 'Record voice message'}
>
  <MicrophoneIcon className="w-5 h-5" />
</button>
```

**Effort:** 🟢 5 минут  
**Risk:** 🟢 Low

---

#### Section 7: Add Recording Modal (before closing `</div>` around line 1700)

```tsx
{/* Voice Recording Modal */}
{isRecording && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl">
      <div className="text-center">
        {/* Animated recording indicator */}
        <div className="w-28 h-28 mx-auto mb-6 relative">
          {/* Outer pulse ring */}
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
          {/* Middle pulse ring */}
          <div className="absolute inset-2 bg-red-500 rounded-full animate-ping opacity-30 animation-delay-150"></div>
          {/* Inner solid circle */}
          <div className="relative w-full h-full bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <MicrophoneIcon className="w-14 h-14 text-white" />
          </div>
        </div>
        
        {/* Duration Display */}
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 font-mono">
          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Recording voice message...
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-8">
          Maximum duration: 5 minutes
        </p>
        
        {/* Progress bar (optional visual feedback) */}
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1 mb-6">
          <div 
            className="bg-red-500 h-1 rounded-full transition-all duration-1000"
            style={{ width: `${(recordingDuration / 300) * 100}%` }}
          ></div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={cancelRecording}
            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-all transform hover:scale-105"
          >
            <span className="flex items-center justify-center gap-2">
              <XMarkIcon className="w-5 h-5" />
              Cancel
            </span>
          </button>
          <button
            onClick={stopRecording}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg"
          >
            <span className="flex items-center justify-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              Stop
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

**Effort:** 🟢 15 минут  
**Risk:** 🟢 Low

---

#### Section 8: Add Audio Preview Modal (after Recording Modal)

```tsx
{/* Audio Preview Modal */}
{audioPreviewUrl && !isRecording && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Voice Message Preview
        </h2>
        <button 
          onClick={cancelRecording}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      
      {/* Audio Player */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <MicrophoneIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Voice Message
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Duration: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>
        <audio 
          src={audioPreviewUrl} 
          controls 
          className="w-full"
        />
      </div>
      
      {/* Info */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-purple-700 dark:text-purple-300">
          💡 Listen to your voice message before sending
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={cancelRecording}
          className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
        >
          Re-record
        </button>
        <button
          onClick={sendVoiceMessage}
          disabled={isSending}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {isSending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="w-5 h-5" />
              Send
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
```

**Effort:** 🟢 15 минут  
**Risk:** 🟢 Low

---

## 🧪 TESTING PLAN

### Unit Testing

| Test Case | Expected Result | Priority |
|-----------|-----------------|----------|
| **Microphone Permission Granted** | Recording starts successfully | 🔴 Critical |
| **Microphone Permission Denied** | Show error toast, graceful fallback | 🔴 Critical |
| **No Microphone Available** | Show error toast | 🟡 High |
| **Recording < 5 seconds** | Can stop and send | 🟡 High |
| **Recording > 5 minutes** | Auto-stop at 5:00 | 🔴 Critical |
| **Cancel Recording** | Cleanup state, stop stream | 🟡 High |
| **Upload Failure** | Show error toast, don't send message | 🔴 Critical |
| **File Size > 10MB** | Backend rejects with error | 🟡 High |

---

### Browser Compatibility Testing

| Browser | Version | MIME Type | Status |
|---------|---------|-----------|--------|
| **Chrome** | 96+ | `audio/webm;codecs=opus` | ✅ Primary |
| **Firefox** | 94+ | `audio/webm;codecs=opus` | ✅ Primary |
| **Safari** | 14+ | `audio/mp4` | ⚠️ Fallback |
| **Edge** | 96+ | `audio/webm;codecs=opus` | ✅ Primary |
| **Mobile Chrome** | Latest | `audio/webm;codecs=opus` | ✅ Primary |
| **Mobile Safari** | iOS 14+ | `audio/mp4` | ⚠️ Fallback |

**Testing Checklist:**
1. ✅ Record 10s voice message on Chrome
2. ✅ Record 10s voice message on Firefox
3. ✅ Record 10s voice message on Safari (MP4 fallback)
4. ✅ Record 10s voice message on Mobile Chrome
5. ✅ Record 10s voice message on Mobile Safari
6. ✅ Verify playback in all browsers
7. ✅ Test cancel during recording
8. ✅ Test max duration (5 minutes)
9. ✅ Test permission denied error
10. ✅ Test upload failure error

---

### Integration Testing

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| **Send Voice Message** | Record → Stop → Send | Message appears in chat with audio player |
| **Receive Voice Message** | Another user sends voice | Audio player appears, can play |
| **Audio Playback** | Click play on voice message | Audio plays correctly |
| **Multiple Voice Messages** | Send 3 voice messages | All display correctly in order |
| **Voice + Text Messages** | Mix voice and text messages | Both types display correctly |
| **Paid Voice Message** | Send paid voice message | Works with PPV system |

---

## 🚀 DEPLOYMENT STRATEGY

### Pre-Deployment Checklist

- [ ] All code changes committed
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile compatibility tested (iOS, Android)
- [ ] Error handling verified
- [ ] Permission flow tested
- [ ] Upload limits verified (10MB max)
- [ ] Duration limits verified (5 min max)
- [ ] Linter clean (`npm run lint`)
- [ ] TypeScript check (`npm run type-check`)
- [ ] Build successful (`npm run build`)

---

### Rollout Plan

#### **Phase 1: Staging Deployment** (Day 1)
- Deploy to staging environment
- Internal testing with team
- Fix any critical bugs

#### **Phase 2: Beta Release** (Day 2)
- Deploy to 10% of users (feature flag)
- Monitor error logs
- Collect user feedback

#### **Phase 3: Full Release** (Day 3-4)
- Gradual rollout to 50% → 100%
- Monitor Sentry for errors
- Monitor server logs for upload issues

---

### Monitoring

**Metrics to Track:**
1. **Usage:**
   - Voice messages sent per day
   - Average recording duration
   - Cancel rate (cancelled vs sent)

2. **Errors:**
   - Permission denied rate
   - Upload failure rate
   - Browser compatibility issues

3. **Performance:**
   - Upload time (audio files)
   - API response time (`/api/upload/message`)
   - CDN delivery speed

**Tools:**
- Sentry (error tracking)
- Google Analytics (usage metrics)
- Server logs (upload monitoring)

---

## ⏱️ TIMELINE

### Development Schedule

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| **Day 1** | Backend changes (`/api/upload/message`) | 1 hour | ⏳ Pending |
| **Day 1** | Frontend recording logic | 2 hours | ⏳ Pending |
| **Day 1** | Recording UI (button, modal) | 1.5 hours | ⏳ Pending |
| **Day 1** | Audio display in messages | 0.5 hours | ⏳ Pending |
| **Day 1** | Unit testing | 1 hour | ⏳ Pending |
| **Day 2** | Browser compatibility testing | 2 hours | ⏳ Pending |
| **Day 2** | Mobile testing | 2 hours | ⏳ Pending |
| **Day 2** | Bug fixes | 2 hours | ⏳ Pending |
| **Day 2** | Staging deployment | 1 hour | ⏳ Pending |
| **Day 3** | Beta release (10% users) | - | ⏳ Pending |
| **Day 3** | Monitor + fix issues | 4 hours | ⏳ Pending |
| **Day 4** | Full release (100% users) | - | ⏳ Pending |

**Total Development Time:** 13-14 hours  
**Total Calendar Time:** 4 days (with testing + deployment)

---

## 📊 SUCCESS CRITERIA

### Must Have (MVP)
- ✅ Users can record voice messages up to 5 minutes
- ✅ Voice messages upload to BunnyStorage successfully
- ✅ Voice messages display with audio player
- ✅ Works on Chrome, Firefox, Safari, Edge
- ✅ Works on mobile (iOS Safari, Chrome Android)
- ✅ Graceful error handling for permissions

### Nice to Have (Phase 2+)
- ⏳ Waveform visualization during recording
- ⏳ Waveform visualization during playback
- ⏳ Pause/Resume recording
- ⏳ Playback speed control (1x, 1.5x, 2x)
- ⏳ Audio trimming
- ⏳ Noise reduction

---

## 🎯 NEXT STEPS

1. ✅ **User Approval:** Получить подтверждение от пользователя
2. ⏳ **Implementation:** Start coding Phase 1
3. ⏳ **Testing:** Browser + mobile compatibility
4. ⏳ **Deployment:** Staging → Beta → Production
5. ⏳ **Documentation:** Update user guides

---

**Дата создания:** 2026-01-29  
**M7 Session:** Voice Messages Solution Plan  
**Status:** ✅ **PLAN COMPLETE** - Ready for Implementation  
**Estimated Time:** 1-2 days (13-14 hours development)
