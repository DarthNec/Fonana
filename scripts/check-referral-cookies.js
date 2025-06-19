// Этот скрипт нужно запустить в браузере на fonana.me

function checkReferralData() {
  console.log('=== Проверка реферальных данных ===\n');
  
  // 1. Проверяем cookies
  console.log('1. Cookies:');
  const cookies = document.cookie.split(';');
  const referrerCookie = cookies.find(c => c.trim().startsWith('fonana_referrer='));
  if (referrerCookie) {
    console.log('  ✅ Найдена cookie:', referrerCookie.trim());
  } else {
    console.log('  ❌ Cookie fonana_referrer не найдена');
  }
  
  // 2. Проверяем localStorage
  console.log('\n2. LocalStorage:');
  const storedReferrer = localStorage.getItem('fonana_referrer');
  const storedTimestamp = localStorage.getItem('fonana_referrer_timestamp');
  
  if (storedReferrer) {
    console.log('  ✅ Реферер в localStorage:', storedReferrer);
    if (storedTimestamp) {
      const date = new Date(parseInt(storedTimestamp));
      console.log('  📅 Установлен:', date.toLocaleString());
      
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const isExpired = Date.now() - parseInt(storedTimestamp) > sevenDays;
      console.log('  ⏰ Истек:', isExpired ? 'ДА' : 'НЕТ');
    }
  } else {
    console.log('  ❌ Реферер в localStorage не найден');
  }
  
  // 3. Проверяем meta тег
  console.log('\n3. Meta тег:');
  const metaTag = document.querySelector('meta[name="x-fonana-referrer"]');
  if (metaTag) {
    console.log('  ✅ Meta тег найден:', metaTag.getAttribute('content'));
  } else {
    console.log('  ❌ Meta тег не найден');
  }
  
  // 4. Текущий URL
  console.log('\n4. Текущий URL:', window.location.href);
  console.log('   Pathname:', window.location.pathname);
}

function clearReferralData() {
  console.log('\n=== Очистка реферальных данных ===');
  
  // Очищаем localStorage
  localStorage.removeItem('fonana_referrer');
  localStorage.removeItem('fonana_referrer_timestamp');
  console.log('✅ LocalStorage очищен');
  
  // Для очистки cookie нужно установить её с истекшим сроком
  document.cookie = 'fonana_referrer=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  console.log('✅ Cookie очищена');
  
  console.log('\nТеперь обновите страницу и перейдите по реферальной ссылке заново.');
}

// Запускаем проверку
checkReferralData();

// Для очистки раскомментируйте:
// clearReferralData(); 