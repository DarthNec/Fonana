// Service Worker Manager для Fonana
class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
    this.updatePromptShown = false; // Флаг для отслеживания показанных уведомлений
    this.refreshing = false; // Флаг для предотвращения множественных перезагрузок
    this.sessionPromptShown = false; // Флаг для текущей сессии
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      console.log('[SW Manager] Service Worker not supported');
      return;
    }

    try {
      // Сначала проверяем существующую регистрацию
      const existingReg = await navigator.serviceWorker.getRegistration();
      
      // Если есть старая версия, удаляем её
      if (existingReg && existingReg.active) {
        const activeWorker = existingReg.active;
        if (activeWorker.scriptURL.includes('sw.js')) {
          console.log('[SW Manager] Found existing registration, checking version...');
          // Проверяем версию через кеш
          const cacheNames = await caches.keys();
          const hasOldVersion = cacheNames.some(name => 
            name.includes('fonana-v1') || name.includes('fonana-v2')
          );
          
          if (hasOldVersion) {
            console.log('[SW Manager] Old version detected, clearing...');
            await this.clearCache();
          }
        }
      }
      
      // Получаем версию приложения
      const versionResponse = await fetch('/api/version');
      const { version } = await versionResponse.json();
      
      // Регистрируем Service Worker с версией
      this.registration = await navigator.serviceWorker.register(`/sw.js?v=${version}`, {
        scope: '/',
        updateViaCache: 'none' // Всегда проверять обновления
      });
      
      console.log('[SW Manager] Service Worker registered');

      // Проверяем обновления
      this.checkForUpdates();
      
      // Слушаем события обновления
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Проверяем состояние - НЕ показываем уведомление сразу
      if (this.registration.waiting) {
        console.log('[SW Manager] Found waiting service worker, but not prompting immediately');
        // Уведомление будет показано только при statechange
      }

      // Обработка обновлений с правильной логикой
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!this.refreshing) {
          console.log('[SW Manager] New service worker activated, reloading page...');
          this.refreshing = true;
          window.location.reload();
        }
      });

      // Слушаем сообщения от Service Worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('[SW Manager] Service Worker updated to version:', event.data.version);
          // Показываем уведомление пользователю
          if (window.showToast) {
            window.showToast('Приложение обновлено до последней версии', 'success');
          }
        }
      });

      // Проверка обновлений каждые 30 секунд
      setInterval(() => {
        if (this.registration && this.registration.update) {
          this.checkForUpdates().catch(err => {
            console.warn('[SW Manager] Update check failed:', err);
          });
        }
      }, 30000);

    } catch (error) {
      console.error('[SW Manager] Registration failed:', error);
      // В случае критической ошибки пытаемся очистить всё
      if (error.name === 'SecurityError' || error.name === 'TypeError') {
        console.log('[SW Manager] Attempting recovery...');
        try {
          await this.unregister();
        } catch (e) {
          console.error('[SW Manager] Recovery failed:', e);
        }
      }
    }
  }

  async checkForUpdates() {
    if (!this.registration) return;
    
    try {
      await this.registration.update();
      console.log('[SW Manager] Checked for updates');
    } catch (error) {
      console.error('[SW Manager] Update check failed:', error);
    }
  }

  handleUpdateFound() {
    const newWorker = this.registration.installing;
    console.log('[SW Manager] New Service Worker found');

    newWorker.addEventListener('statechange', () => {
      console.log('[SW Manager] Service Worker state changed to:', newWorker.state);
      
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        this.updateAvailable = true;
        // Показываем уведомление только если еще не показывали в этой сессии
        if (!this.updatePromptShown && !this.sessionPromptShown) {
          this.promptUpdate();
        }
      }
    });
  }

  promptUpdate() {
    // Проверяем, не показывали ли уже уведомление
    if (this.updatePromptShown || this.sessionPromptShown) {
      console.log('[SW Manager] Update prompt already shown, skipping');
      return;
    }

    // Проверяем, есть ли waiting service worker
    if (!this.registration || !this.registration.waiting) {
      console.log('[SW Manager] No waiting service worker, skipping prompt');
      return;
    }

    console.log('[SW Manager] Update available, showing prompt');
    this.updatePromptShown = true; // Устанавливаем флаг ДО показа уведомления
    this.sessionPromptShown = true; // Флаг для текущей сессии
    
    // Показываем уведомление пользователю
    if (confirm('Доступно обновление сайта. Обновить сейчас?')) {
      this.skipWaiting();
    } else {
      // Если пользователь отказался, сбрасываем флаг через некоторое время
      // чтобы можно было показать уведомление позже
      setTimeout(() => {
        this.updatePromptShown = false;
        console.log('[SW Manager] Update prompt flag reset');
      }, 60000); // 1 минута
      
      // Сессионный флаг сбрасываем только при перезагрузке страницы
      // или через более длительное время
      setTimeout(() => {
        this.sessionPromptShown = false;
        console.log('[SW Manager] Session prompt flag reset');
      }, 300000); // 5 минут
    }
  }

  skipWaiting() {
    if (!this.registration || !this.registration.waiting) {
      console.log('[SW Manager] No waiting service worker to skip');
      return;
    }

    console.log('[SW Manager] Sending SKIP_WAITING message');
    
    // Отправляем сообщение Service Worker
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Слушаем изменение состояния waiting service worker
    this.registration.waiting.addEventListener('statechange', (event) => {
      console.log('[SW Manager] Waiting SW state changed to:', event.target.state);
      
      if (event.target.state === 'activated') {
        console.log('[SW Manager] Waiting SW activated, page will reload');
        // Страница перезагрузится автоматически через controllerchange
      }
    });
  }

  async clearCache() {
    try {
      // Отправляем сообщение Service Worker для очистки кеша
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Также очищаем кеш напрямую
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('[SW Manager] Cache cleared');
      }
    } catch (error) {
      console.error('[SW Manager] Failed to clear cache:', error);
    }
  }

  async unregister() {
    if (!this.registration) return;

    try {
      await this.registration.unregister();
      console.log('[SW Manager] Service Worker unregistered');
      
      // Очищаем весь кеш
      await this.clearCache();
      
      // Перезагружаем страницу
      window.location.reload();
    } catch (error) {
      console.error('[SW Manager] Unregister failed:', error);
    }
  }

  // Проверка статуса
  getStatus() {
    if (!this.registration) {
      return 'Not registered';
    }

    if (this.registration.installing) {
      return 'Installing';
    }

    if (this.registration.waiting) {
      return 'Waiting';
    }

    if (this.registration.active) {
      return 'Active';
    }

    return 'Unknown';
  }
}

// Инициализируем менеджер при загрузке страницы
const swManager = new ServiceWorkerManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => swManager.init());
} else {
  swManager.init();
}

// Экспортируем для использования в других скриптах
window.swManager = swManager; 