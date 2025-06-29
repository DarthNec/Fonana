'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Проверяем поддержку Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Для разработки - пропускаем регистрацию SW
      if (process.env.NODE_ENV === 'development') {
        console.log('[SW] Skipping registration in development');
        return;
      }

      // Инициализация произойдет автоматически через sw-manager.js
      console.log('[SW] Service Worker support detected');
      
      // Добавляем глобальную функцию для ручной очистки кеша (для отладки)
      if (typeof window !== 'undefined') {
        (window as any).clearServiceWorkerCache = async () => {
          if ((window as any).swManager) {
            await (window as any).swManager.clearCache();
            console.log('[SW] Cache cleared via debug function');
          }
        };
        
        (window as any).unregisterServiceWorker = async () => {
          if ((window as any).swManager) {
            await (window as any).swManager.unregister();
            console.log('[SW] Service Worker unregistered via debug function');
          }
        };
      }
    }
  }, [])

  // Загружаем Service Worker Manager только в production
  if (process.env.NODE_ENV === 'production') {
    return (
      <Script 
        src="/sw-manager.js" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[SW] Manager loaded');
        }}
        onError={(e) => {
          console.error('[SW] Manager failed to load:', e);
        }}
      />
    );
  }

  return null;
} 