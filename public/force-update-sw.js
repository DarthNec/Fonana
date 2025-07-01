// Принудительное обновление Service Worker
// Запускается при загрузке страницы для обновления кеша

console.log('[Force Update] Checking for Service Worker updates...');

if ('serviceWorker' in navigator) {
  // Принудительно обновляем Service Worker
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.update();
      console.log('[Force Update] Service Worker update triggered');
    }
  });
  
  // Регистрируем новый Service Worker с принудительным обновлением
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then(function(registration) {
      console.log('[Force Update] Service Worker registered:', registration);
      
      // Принудительно обновляем
      registration.update();
      
      // Слушаем обновления
      registration.addEventListener('updatefound', () => {
        console.log('[Force Update] Service Worker update found');
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[Force Update] New Service Worker installed, reloading...');
            window.location.reload();
          }
        });
      });
    })
    .catch(function(error) {
      console.error('[Force Update] Service Worker registration failed:', error);
    });
} else {
  console.log('[Force Update] Service Worker not supported');
} 