/**
 * DogWater ATA Initialization - Примеры использования
 * 
 * Этот файл содержит примеры работы с API инициализации ATA для DogWater токена
 */

import { useState } from 'react';

// ============================================================================
// ПРИМЕР 1: Базовое использование - создание ATA для пользователя
// ============================================================================

async function createATAForUser(userWallet: string) {
  try {
    const response = await fetch('/api/dogWater/initwallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userWallet: userWallet
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ ATA создан успешно!');
      console.log('📍 ATA адрес:', result.ata);
      
      if (result.alreadyExists) {
        console.log('ℹ️ ATA уже существовал');
      } else {
        console.log('🔗 Транзакция:', result.signature);
        console.log('🔍 Solscan:', result.solscan);
      }
      
      return result.ata;
    } else {
      console.error('❌ Ошибка создания ATA:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error);
    return null;
  }
}

// Использование:
// const ata = await createATAForUser('E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C');


// ============================================================================
// ПРИМЕР 2: Создание ATA для массива пользователей
// ============================================================================

async function createATAsForUsers(userWallets: string[]) {
  const results = [];

  for (const wallet of userWallets) {
    console.log(`\n🔄 Обработка кошелька: ${wallet}`);
    
    const ata = await createATAForUser(wallet);
    
    results.push({
      wallet,
      ata,
      success: ata !== null
    });
    
    // Задержка между запросами (чтобы не перегрузить RPC)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

// Использование:
// const wallets = [
//   'E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C',
//   'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
// ];
// const results = await createATAsForUsers(wallets);
// console.table(results);


// ============================================================================
// ПРИМЕР 3: Проверка существования ATA перед созданием (клиентская логика)
// ============================================================================

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const DOGWATER_MINT = new PublicKey('99smS99MkGP8WFggmUZWaVbe18Y8iWuC3YhGtUMMBray');

async function checkAndCreateATA(userWallet: string) {
  try {
    const connection = new Connection('https://rpc.helius.xyz/?api-key=YOUR_API_KEY', 'confirmed');
    const userPublicKey = new PublicKey(userWallet);
    
    // Получаем адрес ATA
    const ata = await getAssociatedTokenAddress(
      DOGWATER_MINT,
      userPublicKey,
      false
    );
    
    console.log('📍 Расчетный адрес ATA:', ata.toBase58());
    
    // Проверяем, существует ли ATA
    let ataExists = false;
    try {
      await getAccount(connection, ata);
      ataExists = true;
      console.log('✅ ATA уже существует');
    } catch (error) {
      console.log('ℹ️ ATA не существует, создаем...');
    }
    
    if (!ataExists) {
      // Вызываем API для создания ATA
      return await createATAForUser(userWallet);
    }
    
    return ata.toBase58();
    
  } catch (error) {
    console.error('❌ Ошибка проверки ATA:', error);
    return null;
  }
}

// Использование:
// const ata = await checkAndCreateATA('E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C');


// ============================================================================
// ПРИМЕР 4: Интеграция в процесс регистрации (серверная логика)
// ============================================================================

/**
 * Этот пример показывает, как интегрировать создание ATA в процесс регистрации
 * (уже реализовано в /app/api/user/route.ts, показано для справки)
 */
async function registerUserWithDogWater(userWallet: string) {
  try {
    // 1. Создаем пользователя в БД (если не существует)
    // const user = await createUser(userWallet);
    
    // 2. Отправляем регистрационную награду в SOL
    // await sendRegistrationReward(userWallet);
    
    // 3. Создаем ATA для DogWater
    const ataResponse = await fetch('/api/dogWater/initwallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userWallet })
    });
    
    const ataResult = await ataResponse.json();
    
    if (ataResult.success) {
      console.log('🎉 Пользователь зарегистрирован и готов получать DogWater!');
      return {
        success: true,
        ata: ataResult.ata
      };
    }
    
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    return {
      success: false,
      error: error
    };
  }
}


// ============================================================================
// ПРИМЕР 5: React Hook для инициализации ATA
// ============================================================================

/**
 * React Hook для работы с DogWater ATA
 */
function useDogWaterATA() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [ata, setAta] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initializeATA = async (userWallet: string) => {
    setIsInitializing(true);
    setError(null);

    try {
      const response = await fetch('/api/dogWater/initwallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userWallet })
      });

      const result = await response.json();

      if (result.success) {
        setAta(result.ata);
        return result;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setIsInitializing(false);
    }
  };

  return {
    initializeATA,
    ata,
    isInitializing,
    error
  };
}

// Использование в компоненте:
// function MyComponent() {
//   const { initializeATA, ata, isInitializing, error } = useDogWaterATA();
//   const { publicKey } = useWallet();
//
//   const handleInitialize = async () => {
//     if (publicKey) {
//       await initializeATA(publicKey.toBase58());
//     }
//   };
//
//   return (
//     <button onClick={handleInitialize} disabled={isInitializing}>
//       {isInitializing ? 'Инициализация...' : 'Инициализировать ATA'}
//     </button>
//   );
// }


// ============================================================================
// ПРИМЕР 6: CLI скрипт для массовой инициализации
// ============================================================================

/**
 * Скрипт для массовой инициализации ATA для списка пользователей
 * Запуск: node initializeATAs.js wallets.txt
 */
async function massInitializeATAs(walletsFile: string) {
  const fs = require('fs');
  
  // Читаем файл с кошельками (один на строку)
  const wallets = fs.readFileSync(walletsFile, 'utf-8')
    .split('\n')
    .map((w: string) => w.trim())
    .filter((w: string) => w.length > 0);

  console.log(`📋 Найдено ${wallets.length} кошельков`);
  
  const results = await createATAsForUsers(wallets);
  
  // Статистика
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n📊 Статистика:');
  console.log(`✅ Успешно: ${successful}`);
  console.log(`❌ Ошибки: ${failed}`);
  
  // Сохраняем результаты
  fs.writeFileSync(
    'ata-results.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n💾 Результаты сохранены в ata-results.json');
}

// Использование:
// await massInitializeATAs('wallets.txt');


// ============================================================================
// ПРИМЕР 7: Тестирование API
// ============================================================================

async function testDogWaterATAAPI() {
  console.log('🧪 Начинаем тестирование API...\n');
  
  const testWallet = 'E1iu9ZfNM7v6zQBX5EaLqHwPBMu8F6Vo7iv2hYbNCu6C';
  
  // Тест 1: Создание ATA
  console.log('🧪 Тест 1: Создание ATA');
  const result1 = await createATAForUser(testWallet);
  console.log('Результат:', result1 ? '✅ PASS' : '❌ FAIL');
  
  // Тест 2: Повторный запрос (должен вернуть alreadyExists: true)
  console.log('\n🧪 Тест 2: Повторный запрос');
  const response2 = await fetch('/api/dogWater/initwallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userWallet: testWallet })
  });
  const result2 = await response2.json();
  console.log('Результат:', result2.alreadyExists ? '✅ PASS' : '❌ FAIL');
  
  // Тест 3: Невалидный кошелек
  console.log('\n🧪 Тест 3: Невалидный кошелек');
  const response3 = await fetch('/api/dogWater/initwallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userWallet: 'invalid' })
  });
  const result3 = await response3.json();
  console.log('Результат:', result3.error ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n🎉 Тестирование завершено!');
}

// Использование:
// await testDogWaterATAAPI();


// ============================================================================
// EXPORT
// ============================================================================

export {
  createATAForUser,
  createATAsForUsers,
  checkAndCreateATA,
  registerUserWithDogWater,
  useDogWaterATA,
  massInitializeATAs,
  testDogWaterATAAPI
};

