# API Integration Guide for WebSocket Server

Этот документ описывает, как интегрировать существующие API endpoints с WebSocket сервером для отправки real-time событий.

## Быстрый старт

### 1. Импорт функций событий

```typescript
// В начале API файла
import { sendNotification } from '@/websocket-server/src/events/notifications';
import { updatePostLikes, notifyNewPost } from '@/websocket-server/src/events/posts';
import { notifyCreatorUpdate } from '@/websocket-server/src/events/creators';
```

### 2. Отправка событий

После успешного выполнения операции в API, вызовите соответствующую функцию события.

## Примеры интеграции

### Создание поста
```typescript
// app/api/posts/route.ts
export async function POST(request: NextRequest) {
  // ... создание поста ...
  
  const post = await prisma.post.create({
    data: { /* ... */ }
  });
  
  // Отправляем real-time событие
  await notifyNewPost(post);
  
  // Отправляем уведомления подписчикам
  const subscribers = await prisma.subscription.findMany({
    where: {
      creatorId: post.creatorId,
      isActive: true,
      paymentStatus: 'COMPLETED'
    }
  });
  
  for (const sub of subscribers) {
    await sendNotification(sub.userId, {
      type: 'NEW_POST_FROM_SUBSCRIPTION',
      title: 'Новый пост',
      message: `${creator.nickname} опубликовал новый пост`,
      metadata: { postId: post.id, creatorId: post.creatorId }
    });
  }
  
  return NextResponse.json(post);
}
```

### Лайк поста
```typescript
// app/api/posts/[id]/like/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // ... логика лайка ...
  
  const like = await prisma.like.create({
    data: { postId, userId }
  });
  
  // Обновляем счетчик лайков
  const post = await prisma.post.update({
    where: { id: postId },
    data: { likesCount: { increment: 1 } }
  });
  
  // Отправляем real-time событие
  await updatePostLikes(postId, userId, true);
  
  // Уведомление автору
  if (post.creatorId !== userId) {
    await sendNotification(post.creatorId, {
      type: 'LIKE_POST',
      title: 'Новый лайк',
      message: `${user.nickname} поставил лайк вашему посту`,
      metadata: { postId, userId }
    });
  }
  
  return NextResponse.json({ liked: true });
}
```

### Новый комментарий
```typescript
// app/api/posts/[id]/comments/route.ts
import { notifyNewComment } from '@/websocket-server/src/events/posts';

export async function POST(request: NextRequest) {
  // ... создание комментария ...
  
  const comment = await prisma.comment.create({
    data: { /* ... */ }
  });
  
  // Real-time событие
  await notifyNewComment(postId, comment);
  
  // Уведомление автору поста
  if (post.creatorId !== userId) {
    await sendNotification(post.creatorId, {
      type: 'COMMENT_POST',
      title: 'Новый комментарий',
      message: `${user.nickname} прокомментировал ваш пост`,
      metadata: { postId, commentId: comment.id }
    });
  }
  
  return NextResponse.json(comment);
}
```

### Новая подписка
```typescript
// app/api/subscriptions/process-payment/route.ts
import { notifyNewSubscription } from '@/websocket-server/src/events/creators';

export async function POST(request: NextRequest) {
  // ... обработка платежа ...
  
  const subscription = await prisma.subscription.create({
    data: { /* ... */ }
  });
  
  // Real-time событие создателю
  await notifyNewSubscription(creatorId, userId);
  
  // Уведомление создателю
  await sendNotification(creatorId, {
    type: 'NEW_SUBSCRIBER',
    title: 'Новый подписчик',
    message: `${user.nickname} подписался на ваш профиль`,
    metadata: { userId, subscriptionId: subscription.id }
  });
  
  return NextResponse.json(subscription);
}
```

### Обновление профиля
```typescript
// app/api/user/settings/route.ts
export async function PATCH(request: NextRequest) {
  // ... обновление профиля ...
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: updates
  });
  
  // Если это создатель, отправляем событие подписчикам
  if (user.isCreator) {
    await notifyCreatorUpdate(userId, {
      nickname: user.nickname,
      bio: user.bio,
      avatar: user.avatar
    });
  }
  
  return NextResponse.json(user);
}
```

### Прочтение уведомления
```typescript
// app/api/user/notifications/route.ts
import { markNotificationAsRead } from '@/websocket-server/src/events/notifications';

export async function PATCH(request: NextRequest) {
  const { notificationId } = await request.json();
  
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true }
  });
  
  // Real-time событие
  await markNotificationAsRead(userId, notificationId);
  
  return NextResponse.json({ success: true });
}
```

## Типы уведомлений

При создании уведомлений используйте следующие типы:

```typescript
enum NotificationType {
  LIKE_POST = 'LIKE_POST',
  LIKE_COMMENT = 'LIKE_COMMENT',
  COMMENT_POST = 'COMMENT_POST',
  REPLY_COMMENT = 'REPLY_COMMENT',
  NEW_SUBSCRIBER = 'NEW_SUBSCRIBER',
  POST_PURCHASE = 'POST_PURCHASE',
  NEW_POST_FROM_SUBSCRIPTION = 'NEW_POST_FROM_SUBSCRIPTION',
  AUCTION_NEW_BID = 'AUCTION_NEW_BID',
  AUCTION_WON = 'AUCTION_WON',
  AUCTION_PAYMENT_REMINDER = 'AUCTION_PAYMENT_REMINDER',
  AUCTION_DEPOSIT_REFUNDED = 'AUCTION_DEPOSIT_REFUNDED',
  TIP_RECEIVED = 'TIP_RECEIVED',
  NEW_MESSAGE = 'NEW_MESSAGE'
}
```

## Важные моменты

1. **Асинхронность**: Все функции событий асинхронные. Используйте `await` или `.catch()` для обработки ошибок.

2. **Graceful degradation**: Если WebSocket сервер недоступен, это не должно ломать API:
   ```typescript
   try {
     await notifyNewPost(post);
   } catch (error) {
     console.error('WebSocket notification failed:', error);
     // API продолжает работать
   }
   ```

3. **Проверка окружения**: В development WebSocket может быть не запущен:
   ```typescript
   if (process.env.NODE_ENV === 'production') {
     await sendNotification(userId, notification);
   }
   ```

4. **Batch операции**: Для массовых уведомлений используйте Promise.all:
   ```typescript
   await Promise.all(
     subscribers.map(sub => 
       sendNotification(sub.userId, notification)
     )
   );
   ```

## Тестирование

1. Запустите WebSocket сервер локально
2. Используйте test-client.js для проверки событий
3. Проверьте в браузере через DevTools → Network → WS

## Checklist интеграции

- [ ] `/api/posts` - создание постов
- [ ] `/api/posts/[id]/like` - лайки
- [ ] `/api/posts/[id]/comments` - комментарии
- [ ] `/api/subscriptions/process-payment` - подписки
- [ ] `/api/user/notifications` - уведомления
- [ ] `/api/user/settings` - профиль
- [ ] `/api/messages` - сообщения
- [ ] `/api/tips` - чаевые
- [ ] `/api/flash-sales` - flash sales

После интеграции всех endpoints, пользователи будут получать мгновенные обновления через WebSocket! 