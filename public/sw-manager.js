// Service Worker Manager для Fonana
class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      console.log('[SW Manager] Service Worker not supported');
      return;
    }

    try {
      // Регистрируем Service Worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('[SW Manager] Service Worker registered');

      // Проверяем обновления
      this.checkForUpdates();
      
      // Слушаем события обновления
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Проверяем состояние
      if (this.registration.waiting) {
        this.promptUpdate();
      }

      // Слушаем изменения состояния
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW Manager] Controller changed, reloading...');
        window.location.reload();
      });

    } catch (error) {
      console.error('[SW Manager] Registration failed:', error);
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
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        this.updateAvailable = true;
        this.promptUpdate();
      }
    });
  }

  promptUpdate() {
    console.log('[SW Manager] Update available');
    
    // Показываем уведомление пользователю
    if (confirm('Доступно обновление сайта. Обновить сейчас?')) {
      this.skipWaiting();
    }
  }

  skipWaiting() {
    if (!this.registration || !this.registration.waiting) return;

    // Отправляем сообщение Service Worker
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
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