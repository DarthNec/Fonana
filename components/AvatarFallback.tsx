'use client'

interface AvatarFallbackProps {
  seed: string
  size: number
  className?: string
}

export default function AvatarFallback({ seed, size, className = '' }: AvatarFallbackProps) {
  // Получаем инициалы
  const initials = getInitials(seed)
  
  // Генерируем цвет фона
  const backgroundColor = generateBackgroundColor(seed)
  
  // Выбираем контрастный цвет текста
  const textColor = getContrastColor(backgroundColor)
  
  return (
    <div 
      className={`relative flex items-center justify-center font-bold ${className}`}
      style={{ 
        width: size, 
        height: size,
        backgroundColor: `#${backgroundColor}`,
        color: textColor,
        fontSize: size * 0.4
      }}
    >
      {initials}
    </div>
  )
}

// Получение инициалов из строки
function getInitials(str: string): string {
  // Если пустая строка
  if (!str) return '??'
  
  // Если это кошелек (начинается с цифры или длинная строка), берем первые 2 символа
  if (/^\d/.test(str) || str.length > 20) {
    return str.substring(0, 2).toUpperCase()
  }
  
  // Разбиваем по пробелам, дефисам, подчеркиваниям
  const words = str.split(/[\s_-]+/).filter(word => word.length > 0)
  
  if (words.length >= 2) {
    // Берем первые буквы первых двух слов
    return (words[0][0] + words[1][0]).toUpperCase()
  } else if (words.length === 1) {
    // Если одно слово и оно длинное, ищем заглавные буквы (camelCase)
    const word = words[0]
    const capitals = word.match(/[A-Z]/g)
    if (capitals && capitals.length >= 2) {
      return (capitals[0] + capitals[1]).toUpperCase()
    }
    // Иначе берем первые две буквы
    return word.substring(0, Math.min(2, word.length)).toUpperCase()
  }
  
  // Fallback - первые два символа
  return str.substring(0, 2).toUpperCase()
}

// Генерация цвета фона
function generateBackgroundColor(str: string): string {
  const colors = [
    '667eea', // Purple
    '764ba2', // Dark Purple
    'f093fb', // Pink
    '4facfe', // Light Blue
    '00f2fe', // Cyan
    '43e97b', // Green
    '38f9d7', // Teal
    'fa709a', // Rose
    'fee140', // Yellow
    '30cfd0', // Turquoise
    '5f72bd', // Blue
    '9890e3', // Lavender
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// Определение контрастного цвета для текста
function getContrastColor(hexColor: string): string {
  // Конвертируем hex в RGB
  const r = parseInt(hexColor.substr(0, 2), 16)
  const g = parseInt(hexColor.substr(2, 2), 16)
  const b = parseInt(hexColor.substr(4, 2), 16)
  
  // Вычисляем яркость по формуле
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  
  // Возвращаем белый или черный в зависимости от яркости фона
  return brightness > 128 ? '#1a202c' : '#ffffff'
} 