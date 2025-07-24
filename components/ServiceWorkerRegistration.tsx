'use client'

import { useEffect, useRef } from 'react'

export default function ServiceWorkerRegistration() {
  const hasRegisteredRef = useRef(false)
  const registrationAttemptRef = useRef(0)
  
  useEffect(() => {
    // 🔥 M7 PHASE 2: Prevent multiple registration attempts
    if (hasRegisteredRef.current) {
      console.log('[SW] Already attempted registration in this session, skipping')
      return
    }
    
    // 🔥 M7 CIRCUIT BREAKER: Limit registration attempts
    if (registrationAttemptRef.current >= 3) {
      console.error('[SW] Circuit breaker: Too many registration attempts, stopping')
      return
    }
    
    registrationAttemptRef.current++
    
    // Проверяем поддержку Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Для разработки - пропускаем регистрацию SW
      if (process.env.NODE_ENV === 'development') {
        console.log('[SW] Skipping registration in development');
        hasRegisteredRef.current = true
        return;
      }

      // 🔥 M7 SESSION THROTTLING: Check if we already processed SW in this session
      const sessionKey = 'fonana_sw_processed'
      let lastProcessed = null
      
      // 🛡️ SAFE STORAGE: Handle private browsing and quota limits
      try {
        lastProcessed = sessionStorage.getItem(sessionKey)
      } catch (error) {
        console.warn('[SW] SessionStorage not available (private browsing?), continuing without throttling:', error.message)
      }
      
      const now = Date.now()
      
      if (lastProcessed && (now - parseInt(lastProcessed)) < 300000) { // 5 minutes
        console.log('[SW] Service Worker processed recently, skipping force update')
        hasRegisteredRef.current = true
        return
      }

      // 🔥 M7 CONTROLLED SERVICE WORKER UPDATE
      const controlledUpdateSW = async () => {
        try {
          console.log('[SW] Starting controlled update process...');
          hasRegisteredRef.current = true
          
          // 🛡️ SAFE STORAGE: Mark session to prevent repeated attempts
          try {
            sessionStorage.setItem(sessionKey, now.toString())
          } catch (error) {
            console.warn('[SW] Unable to store session throttling (private browsing?), continuing:', error.message)
          }
          
          // Получаем текущую регистрацию
          const registration = await navigator.serviceWorker.getRegistration();
          
          if (registration) {
            console.log('[SW] Found existing registration, checking status...');
            
            // 🔥 M7 GENTLE UPDATE: Only update if really necessary
            if (registration.waiting) {
              console.log('[SW] Update available, but NOT forcing page reload');
              // Just activate the waiting SW without page reload
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (registration.installing) {
              console.log('[SW] SW installing, waiting for completion');
            } else {
              console.log('[SW] Already on latest version, no action needed');
            }
          } else {
            console.log('[SW] No registration found, registering new SW...');
            // 🔥 M7 SAFE REGISTRATION: Non-intrusive registration
            const newRegistration = await navigator.serviceWorker.register('/sw.js', {
              scope: '/',
              updateViaCache: 'none'
            });
            console.log('[SW] Service Worker registered successfully:', !!newRegistration);
          }
        } catch (error) {
          console.error('[SW] Controlled update failed:', error);
          
          // 🔥 M7 FALLBACK: Minimal registration only if critical
          if (!navigator.serviceWorker.controller) {
            try {
              console.log('[SW] Attempting minimal fallback registration...')
              const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none'
              });
              console.log('[SW] Fallback registration successful:', !!registration);
            } catch (fallbackError) {
              console.error('[SW] Fallback registration failed:', fallbackError);
              
              // 🛡️ SAFE STORAGE: Clear session flag to allow retry later
              try {
                sessionStorage.removeItem(sessionKey)
              } catch (storageError) {
                console.warn('[SW] Unable to clear session storage (private browsing?), ignoring:', storageError.message)
              }
            }
          }
        }
      };

      // 🔥 M7 DELAYED EXECUTION: Wait for app stabilization
      const delay = registrationAttemptRef.current * 2000 // Incremental delay
      setTimeout(() => {
        controlledUpdateSW();
      }, delay);
    }
  }, []) // No dependencies - only run once per component lifecycle

  return null;
} 