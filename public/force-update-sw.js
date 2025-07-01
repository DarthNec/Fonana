// Принудительное обновление Service Worker
// Запускается при загрузке страницы для обновления кеша

console.log('[Force Update] Checking for Service Worker updates...');

if ('serviceWorker' in navigator) {
  let updatePromptShown = false; // Флаг для предотвращения повторных уведомлений
  let sessionPromptShown = false; // Флаг для текущей сессии
  
  // Проверяем, не показывали ли уже уведомление в этой сессии
  if (sessionStorage.getItem('updatePromptShown')) {
    sessionPromptShown = true;
    console.log('[Force Update] Update prompt already shown in this session');
  }
  
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
      
      // Слушаем обновления с правильной логикой
      registration.addEventListener('updatefound', () => {
        console.log('[Force Update] Service Worker update found');
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          console.log('[Force Update] Service Worker state changed to:', newWorker.state);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[Force Update] New Service Worker installed');
            
            // Показываем уведомление только один раз в сессии
            if (!updatePromptShown && !sessionPromptShown) {
              updatePromptShown = true;
              sessionPromptShown = true;
              sessionStorage.setItem('updatePromptShown', 'true');
              
              // Добавляем небольшую задержку для стабильности
              setTimeout(() => {
                if (confirm('Доступно обновление сайта. Обновить сейчас?')) {
                  console.log('[Force Update] User confirmed update, skipping waiting');
                  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                } else {
                  console.log('[Force Update] User declined update');
                  // Сбрасываем флаг через минуту для возможности показать позже
                  setTimeout(() => {
                    updatePromptShown = false;
                  }, 60000);
                }
              }, 1000);
            }
          }
        });
      });
      
      // Слушаем изменение контроллера
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[Force Update] Controller changed, reloading page...');
        // Очищаем флаг сессии при перезагрузке
        sessionStorage.removeItem('updatePromptShown');
        window.location.reload();
      });
    })
    .catch(function(error) {
      console.error('[Force Update] Service Worker registration failed:', error);
    });
} else {
  console.log('[Force Update] Service Worker not supported');
} 