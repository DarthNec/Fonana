// Force refresh script for cached browsers
(function() {
  // Версия приложения (обновляется при каждом деплое)
  var currentVersion = 'v-1750960227000';
  var storageKey = 'fonana-app-version';
  
  try {
    var storedVersion = localStorage.getItem(storageKey);
    
    // Если версия отличается или отсутствует - принудительно обновляем
    if (!storedVersion || storedVersion !== currentVersion) {
      localStorage.setItem(storageKey, currentVersion);
      
      // Очищаем весь кеш
      if ('caches' in window) {
        caches.keys().then(function(names) {
          names.forEach(function(name) {
            caches.delete(name);
          });
        });
      }
      
      // Принудительная перезагрузка с сервера
      window.location.reload(true);
    }
  } catch (e) {
    // Если localStorage недоступен, просто перезагружаем
    window.location.reload(true);
  }
})(); 