// Force refresh script for cached browsers
(async function() {
  console.log('[Force Refresh] Checking version...');
  
  try {
    // Получаем текущую версию с сервера
    const response = await fetch('/api/version', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('[Force Refresh] Failed to fetch version');
      return;
    }
    
    const { version } = await response.json();
    const storedVersion = localStorage.getItem('fonana-version');
    
    console.log('[Force Refresh] Server version:', version);
    console.log('[Force Refresh] Stored version:', storedVersion);
    
    // Если версия изменилась
    if (storedVersion && storedVersion !== version) {
      console.log('[Force Refresh] Version mismatch, clearing caches...');
      
      // Очищаем все кеши
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => {
          console.log('[Force Refresh] Deleting cache:', name);
          return caches.delete(name);
        }));
      }
      
      // Отменяем регистрацию SW
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('[Force Refresh] Unregistering service worker...');
          await registration.unregister();
        }
      }
      
      // Сохраняем новую версию
      localStorage.setItem('fonana-version', version);
      
      // Перезагружаем страницу
      console.log('[Force Refresh] Reloading page...');
      window.location.reload(true);
    } else {
      // Сохраняем версию если её не было
      localStorage.setItem('fonana-version', version);
      console.log('[Force Refresh] Version is up to date');
    }
  } catch (e) {
    console.error('[Force Refresh] Error:', e);
  }
})(); 