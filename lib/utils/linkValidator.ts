/**
 * Link Validator - защита от спама ссылками в комментариях
 * 
 * Блокирует все виды ссылок:
 * - http://example.com
 * - https://example.com
 * - www.example.com
 * - example.com
 * - bit.ly/abc
 * - Ссылки с пробелами (h t t p : / / example . com)
 * - Замаскированные (hxxp, h[t]tp, etc)
 */

/**
 * Проверяет текст на наличие ссылок в любом формате
 * @param text - текст для проверки
 * @returns true если ссылки найдены, false если текст чистый
 */
export function containsLinks(text: string): boolean {
  if (!text) return false
  
  // Убираем пробелы для проверки замаскированных ссылок
  const textWithoutSpaces = text.replace(/\s+/g, '')
  
  // Паттерны для поиска ссылок
  const patterns = [
    // 1. Стандартные протоколы
    /https?:\/\//i,
    
    // 2. Замаскированные протоколы (hxxp, h[t]tp, h_t_tp, etc)
    /h[tx_\[][\]tx_]*p[sx]?:\/\//i,
    
    // 3. www.
    /\bwww\./i,
    
    // 4. Домены с TLD (example.com, test.io, etc)
    // Проверяет слова с точкой и популярными доменами
    /\b[a-z0-9][-a-z0-9]{0,61}[a-z0-9]?\.(com|net|org|io|co|ru|me|xyz|app|dev|tech|ai|gg|tv|fm|cc|to|link|site|online|store|shop|blog|info|biz|name|pro|mobi|asia|tel|travel|jobs|cat|aero|museum|coop|edu|gov|mil|int|arpa|uk|de|fr|jp|cn|in|br|au|ca|it|nl|es|se|no|dk|fi|pl|be|at|ch|cz|gr|pt|ro|hu|sk|bg|hr|si|lt|lv|ee|cy|mt|lu|is|ie|nz|za|mx|ar|cl|pe|ve|ec|uy|py|bo|gt|hn|sv|ni|cr|pa|do|cu|jm|tt|bs|bb|gd|lc|vc|ag|kn|dm|ht|bz|gy|sr|gf|fk|gl|pm|mq|gp|aw|cw|sx|bq|tc|vg|ky|bm|pr|vi|as|gu|mp|pw|mh|fm|ki|nr|tv|tk|ws|to|nu|pf|nc|vu|sb|fj|pg|nf|ck)\b/i,
    
    // 5. Короткие ссылки (bit.ly/abc, t.co/xyz)
    /\b(bit\.ly|t\.co|tinyurl\.com|goo\.gl|ow\.ly|short\.link|cutt\.ly|rebrand\.ly|tiny\.cc)\b/i,
    
    // 6. IP адреса
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    
    // 7. Слова типа "dotcom", "dot com" (замаскированные домены)
    /\b(dot\s*com|dot\s*net|dot\s*org|точка\s*ком|точка\s*ру)\b/i,
  ]
  
  // Проверяем оригинальный текст и текст без пробелов
  for (const pattern of patterns) {
    if (pattern.test(text) || pattern.test(textWithoutSpaces)) {
      return true
    }
  }
  
  return false
}

/**
 * Очищает текст от ссылок (заменяет на [link removed])
 * @param text - текст для очистки
 * @returns очищенный текст
 */
export function removeLinks(text: string): string {
  if (!text) return text
  
  let cleaned = text
  
  // Удаляем стандартные ссылки
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '[link removed]')
  
  // Удаляем www.
  cleaned = cleaned.replace(/www\.[^\s]+/gi, '[link removed]')
  
  // Удаляем домены
  cleaned = cleaned.replace(
    /\b[a-z0-9][-a-z0-9]{0,61}[a-z0-9]?\.(com|net|org|io|co|ru|me|xyz|app|dev|tech|ai|gg|tv)\b[^\s]*/gi, 
    '[link removed]'
  )
  
  return cleaned.trim()
}

/**
 * Проверяет и блокирует ссылки
 * @param text - текст комментария
 * @returns { isValid: boolean, message?: string }
 */
export function validateCommentForLinks(text: string): { 
  isValid: boolean
  message?: string 
} {
  if (containsLinks(text)) {
    return {
      isValid: false,
      message: 'Links are not allowed in comments. Please remove all URLs.'
    }
  }
  
  return { isValid: true }
}
