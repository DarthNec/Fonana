
**5-минутная инструкция для быстрой интеграции**
---

---

## ⚡ Минимальный код

### 1. Создай файл `auth/guestLogin.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const API_URL = 'https://your-server.com'; // ЗАМЕНИ!

export async function guestLogin(navigation: any, setUser: any) {
  try {
    // 1. Проверяем deviceId
    let deviceId = await AsyncStorage.getItem('fonana_device_id');
    
    // 2. Запрос на сервер
    const response = await fetch(`${API_URL}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceId || undefined })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }

    // 3. Сохраняем ВСЁ (КРИТИЧНО!)
    await AsyncStorage.multiSet([
      ['fonana_device_id', data.deviceId],
      ['fonana_user_wallet', data.user.wallet],
      ['fonana_guest_auth', 'true'],
      ['fonana_jwt_token', JSON.stringify({
        token: data.token,
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000),
        userId: data.user.id,
        wallet: data.user.wallet
      })],
      ['fonana_user_data', JSON.stringify(data.user)],
      ...(data.isNewUser ? [['fonana_is_new_user', 'true']] : [])
    ]);

    // 4. Получаем полные данные
    const userResponse = await fetch(
      `${API_URL}/api/auth/token?wallet=${data.user.wallet}`
    );
    const userData = await userResponse.json();

    // 5. Обновляем state
    setUser(userData.user);

    // 6. Toast
    Toast.show({
      type: 'success',
      text1: data.isNewUser 
        ? `Welcome, ${data.user.nickname}! 🎉`
        : `Welcome back, ${data.user.nickname}! 👋`,
      position: 'top'
    });

    // 7. Навигация
    navigation.replace('MainApp');

  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Login Failed',
      text2: error.message,
      position: 'top'
    });
    throw error;
  }
}
```

---

### 2. Используй в компоненте

```typescript
import { guestLogin } from './auth/guestLogin';

function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const { setUser } = useUserStore();

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await guestLogin(navigation, setUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      title={loading ? "Loading..." : "Continue as Guest"}
      onPress={handleGuestLogin}
      disabled={loading}
    />
  );
}
```

---

## 🎯 Что получаешь с сервера

```json
{
  "success": true,
  "token": "eyJhbG...",
  "isGuest": true,
  "deviceId": "device_a1b2c3d4...",
  "isNewUser": true,  // false если возвращается
  "user": {
    "id": "uuid",
    "nickname": "HappyFox123",
    "fullName": "Guest HappyFox123",
    "avatar": null,
    "wallet": "FK_3kR8mN9vL2..."
  }
}
```

---

## 💾 Что сохранять (ОБЯЗАТЕЛЬНО)

| Ключ | Значение |
|------|----------|
| `fonana_device_id` | Для повторного входа |
| `fonana_user_wallet` | FK_... адрес |
| `fonana_guest_auth` | Маркер "true" |
| `fonana_jwt_token` | JSON с token + metadata |
| `fonana_user_data` | JSON с user данными |
| `fonana_is_new_user` | "true" (если новый) |

---

## ⚠️ КРИТИЧНО

### ❌ НЕ ДЕЛАЙ ТАК:

```typescript
// При logout:
await AsyncStorage.clear(); // Удалит deviceId!

// В handleGuestLogin:
const deviceId = null; // Не отправляй null явно!
```

### ✅ ДЕЛАЙ ТАК:

```typescript
// При logout (сохрани deviceId):
const deviceId = await AsyncStorage.getItem('fonana_device_id');
await AsyncStorage.clear();
await AsyncStorage.setItem('fonana_device_id', deviceId);

// В handleGuestLogin:
const deviceId = await AsyncStorage.getItem('fonana_device_id');
// Если null, просто не отправляй в body
```

---

## 🔍 Debug

Если не работает:

```typescript
// Добавь логи:
console.log('[GUEST] Step 1: deviceId =', deviceId);
console.log('[GUEST] Step 2: Response =', data);
console.log('[GUEST] Step 3: Saved to storage');
console.log('[GUEST] Step 4: User data =', userData);
```

Проверь:
1. `API_URL` правильный?
2. Backend запущен?
3. `deviceId` сохраняется в AsyncStorage?
4. Response от сервера `success: true`?

---

## 📚 Полная документация

См. `GUEST_AUTH_API_DOCUMENTATION.md` для:
- Детальной последовательности шагов
- Структуры данных
- Обработки ошибок
- Миграции guest → real user
- Примеров кода

---

**Ready to go!** 🚀
