# Интеграция уведомлений AI-постов с Next.js

## Серверная часть (API Route)

Создайте или обновите ваш API для генерации постов с интеграцией уведомлений:

```typescript
// app/api/ai/generate-post/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Функция для отправки уведомления через Socket.IO
async function notifyUserViaSocket(userId: string, postId: string | null, status: string) {
  try {
    const socketUrl = process.env.SOCKETIO_URL || 'http://localhost:3004';
    
    const response = await fetch(`${socketUrl}/notify-ai-post/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        postId,
        status
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Notified user ${userId} via socket ${result.socketId}`);
    } else {
      console.log(`⚠️  User ${userId} not connected:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to send socket notification:', error);
    return { success: false, error: error.message };
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { prompt, type } = await req.json();

    // 1. Уведомление о начале генерации
    await notifyUserViaSocket(userId, null, 'started');

    // 2. Создаем пост в базе
    const post = await prisma.post.create({
      data: {
        creatorId: userId,
        content: prompt,
        mediaType: type,
        status: 'processing',
        // ... остальные поля
      }
    });

    // 3. Уведомление о создании поста
    await notifyUserViaSocket(userId, post.id, 'processing');

    // 4. Запуск AI генерации (асинхронно)
    generateAIContent(post.id, userId, prompt, type).catch(error => {
      console.error('AI generation failed:', error);
      notifyUserViaSocket(userId, post.id, 'error');
    });

    return NextResponse.json({ 
      success: true, 
      postId: post.id,
      message: 'Generation started' 
    });

  } catch (error) {
    console.error('Error in generate-post:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Асинхронная функция генерации
async function generateAIContent(
  postId: string, 
  userId: string, 
  prompt: string, 
  type: string
) {
  try {
    // Ваша логика AI генерации
    const result = await yourAIService.generate(prompt, type);

    // Обновляем пост
    await prisma.post.update({
      where: { id: postId },
      data: {
        mediaUrl: result.url,
        status: 'published',
      }
    });

    // Уведомление об успехе
    await notifyUserViaSocket(userId, postId, 'completed');

  } catch (error) {
    console.error('AI generation error:', error);
    
    // Обновляем статус поста
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'failed' }
    });

    // Уведомление об ошибке
    await notifyUserViaSocket(userId, postId, 'error');
  }
}
```

## Клиентская часть (React Component)

Создайте компонент для отображения статуса генерации:

```typescript
// components/AIPostGenerator.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

export function AIPostGenerator() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);

  // Подключение к Socket.IO
  useEffect(() => {
    if (!session?.user) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKETIO_URL || 'http://localhost:3004';
    
    const newSocket = io(socketUrl, {
      auth: {
        user: {
          id: session.user.id,
          nickname: session.user.name
        }
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connected', (data) => {
      console.log('✅ Connected to Socket.IO:', data);
    });

    // Слушаем события обновления AI-постов
    newSocket.on('ai-post-updated', (data) => {
      console.log('📨 AI Post Update:', data);
      
      setCurrentPostId(data.postId);
      setStatus(data.status);

      // Можно добавить уведомления
      if (data.status === 'completed') {
        // Показать успешное уведомление
        showNotification('Пост успешно сгенерирован!', 'success');
        
        // Обновить список постов
        refreshPosts();
      } else if (data.status === 'error') {
        showNotification('Ошибка генерации поста', 'error');
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [session?.user]);

  const generatePost = async (prompt: string, type: string) => {
    setStatus('requesting');
    
    try {
      const response = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type })
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentPostId(data.postId);
        // Статус обновится через Socket.IO
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
    }
  };

  return (
    <div>
      <h2>AI Post Generator</h2>
      
      {/* UI для генерации */}
      <button 
        onClick={() => generatePost('Test prompt', 'image')}
        disabled={status === 'processing' || status === 'started'}
      >
        Generate Post
      </button>

      {/* Индикатор статуса */}
      {status !== 'idle' && (
        <div className="status-indicator">
          {status === 'started' && '🚀 Начинаем генерацию...'}
          {status === 'processing' && '⚙️ Генерируем контент...'}
          {status === 'completed' && '✅ Готово!'}
          {status === 'error' && '❌ Ошибка генерации'}
        </div>
      )}

      {/* Прогресс-бар или спиннер */}
      {(status === 'started' || status === 'processing') && (
        <div className="loading-spinner">
          Loading...
        </div>
      )}
    </div>
  );
}

function showNotification(message: string, type: 'success' | 'error') {
  // Ваша система уведомлений
  console.log(`[${type}] ${message}`);
}

function refreshPosts() {
  // Обновление списка постов
  console.log('Refreshing posts...');
}
```

## Переменные окружения

Добавьте в `.env`:

```env
# Socket.IO Server
SOCKETIO_URL=http://localhost:3004
NEXT_PUBLIC_SOCKETIO_URL=http://localhost:3004

# Production
# SOCKETIO_URL=https://socket.fonana.me
# NEXT_PUBLIC_SOCKETIO_URL=https://socket.fonana.me
```

## Типы статусов

Рекомендуемые статусы для AI-генерации:

- `started` - Начало процесса генерации
- `processing` - Генерация в процессе
- `completed` - Успешная генерация
- `error` - Ошибка генерации
- `cancelled` - Генерация отменена пользователем

## Дополнительные возможности

### Передача прогресса

Можно расширить payload для передачи прогресса:

```typescript
await notifyUserViaSocket(userId, postId, 'processing', {
  progress: 45,
  stage: 'Rendering video...'
});
```

И обновить обработчик на клиенте:

```typescript
newSocket.on('ai-post-updated', (data) => {
  console.log(`Progress: ${data.progress}% - ${data.stage}`);
  setProgress(data.progress);
  setStage(data.stage);
});
```

### Multiple posts tracking

Для отслеживания нескольких постов одновременно:

```typescript
const [generatingPosts, setGeneratingPosts] = useState<Map<string, Status>>(new Map());

newSocket.on('ai-post-updated', (data) => {
  setGeneratingPosts(prev => {
    const next = new Map(prev);
    next.set(data.postId, data.status);
    return next;
  });
});
```


