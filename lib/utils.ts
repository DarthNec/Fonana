/**
 * Функция для объединения классов CSS
 * Простая реализация без внешних зависимостей
 */
export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ')
} 