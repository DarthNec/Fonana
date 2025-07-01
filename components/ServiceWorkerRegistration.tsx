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

      // Простая регистрация Service Worker без автоматических обновлений
      navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
          console.log('[SW] Service Worker registered successfully:', registration);
        })
        .catch(function(error) {
          console.error('[SW] Service Worker registration failed:', error);
        });
    }
  }, [])

  return null;
} 