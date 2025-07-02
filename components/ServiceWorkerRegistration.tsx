'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Проверяем поддержку Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Для разработки - пропускаем регистрацию SW
      if (process.env.NODE_ENV === 'development') {
        console.log('[SW] Skipping registration in development');
        return;
      }

      // Принудительное обновление Service Worker
      const forceUpdateSW = async () => {
        try {
          console.log('[SW] Starting force update process...');
          
          // Получаем текущую регистрацию
          const registration = await navigator.serviceWorker.getRegistration();
          
          if (registration) {
            console.log('[SW] Found existing registration, checking for updates...');
            
            // Принудительно проверяем обновления
            await registration.update();
            
            // Если есть ожидающая версия, активируем её
            if (registration.waiting) {
              console.log('[SW] New version available, activating...');
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              
              // Перезагружаем страницу после активации
              registration.waiting.addEventListener('statechange', (event) => {
                if ((event.target as ServiceWorker).state === 'activated') {
                  console.log('[SW] New version activated, reloading page...');
                  window.location.reload();
                }
              });
            } else {
              console.log('[SW] Already on latest version');
            }
          } else {
            console.log('[SW] No registration found, registering new SW...');
            // Регистрируем новый Service Worker
            const newRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('[SW] Service Worker registered successfully:', newRegistration);
          }
        } catch (error) {
          console.error('[SW] Force update failed:', error);
          
          // Fallback: простая регистрация
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[SW] Fallback registration successful:', registration);
          } catch (fallbackError) {
            console.error('[SW] Fallback registration failed:', fallbackError);
          }
        }
      };

      // Запускаем принудительное обновление
      forceUpdateSW();
    }
  }, [])

  return null;
} 