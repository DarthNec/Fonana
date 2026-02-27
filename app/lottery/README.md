# 🎰 Lottery Wheel - UI Demo (@mertercelik/react-prize-wheel)

## 📦 Пакет установлен

Используется: **@mertercelik/react-prize-wheel**

---

## Доступ к демо

Страница доступна по адресу: **http://localhost:3000/lottery**

---

## Что реализовано

### ✅ Использован пакет `@mertercelik/react-prize-wheel`
- **Профессиональное колесо** из npm библиотеки
- **8 секторов** с разными призами
- **Плавная анимация** вращения (5 секунд)
- **Настраиваемые цвета** рамки, центра, индикатора
- **Ref API** для программного управления спином
- **Адаптивный дизайн** (mobile + desktop)

### ✅ Конфигурация призов
```typescript
const PRIZES: Sector[] = [
  { id: 1, label: '0.01 SOL', text: '0.01 SOL' },
  { id: 2, label: '100 Tokens', text: '100 Tokens' },
  { id: 3, label: 'Premium Post', text: 'Premium Post' },
  { id: 4, label: '0.005 SOL', text: '0.005 SOL' },
  { id: 5, label: '50 Tokens', text: '50 Tokens' },
  { id: 6, label: 'Exclusive Content', text: 'Exclusive Content' },
  { id: 7, label: '10 Tokens', text: '10 Tokens' },
  { id: 8, label: '0.002 SOL', text: '0.002 SOL' },
]
```

### ✅ UI Features
- **Spin counter** (5 спинов доступно)
- **Prize reveal** при победе с анимацией
- **Responsive design**
- **Custom spin button** по центру колеса
- **Prize legend** внизу страницы
- **Gradient colors** для призов

---

## Параметры колеса

```typescript
<PrizeWheel
  ref={wheelRef}                    // Ref для программного спина
  sectors={PRIZES}                  // Массив призов
  onSpinEnd={handleSpinEnd}         // Callback после остановки
  onSpinStart={() => setIsSpinning(true)} // Callback при старте
  duration={5000}                   // Длительность спина (ms)
  minSpins={5}                      // Минимум оборотов
  maxSpins={8}                      // Максимум оборотов
  wheelColors={['#f59e0b', '#fbbf24']} // Градиент колеса
  frameColor="#fbbf24"              // Цвет рамки
  middleColor="#fb923c"             // Цвет центра
  winIndicatorColor="#ef4444"       // Цвет указателя
  borderWidth={8}                   // Толщина границы
  textColor="#ffffff"               // Цвет текста
  textFontSize={14}                 // Размер шрифта
/>
```

---

## Как тестировать

1. Открой в браузере: `http://localhost:3000/lottery`
2. Жми кнопку **"SPIN"** в центре колеса
3. Колесо крутится 5-8 оборотов → останавливается на призе
4. Результат показывается с анимацией confetti
5. Доступно 5 спинов (потом блокируется)
6. Кнопка "Awesome!" закрывает результат

---

## Технологии

- **@mertercelik/react-prize-wheel** - библиотека для колеса фортуны
- **React** (Next.js 14)
- **TypeScript** (с полной типизацией)
- **TailwindCSS** (стили)
- **Heroicons** (иконки)
- **useRef** для программного управления

---

## API Reference

### PrizeWheelRef
```typescript
interface PrizeWheelRef {
  spin: () => void;          // Программно запустить спин
  isSpinning: boolean;       // Статус вращения
}
```

### Sector
```typescript
interface Sector {
  id: number | string;       // Уникальный ID
  label: string;             // Текст на колесе
  probability?: number;      // Вероятность (опционально)
  text?: string;             // Доп. текст (опционально)
}
```

---

## Настройки цветов

Можно кастомизировать:
- `frameColor` - внешняя рамка
- `middleColor` - центральная кнопка
- `middleDotColor` - точка в центре
- `winIndicatorColor` - стрелка-указатель
- `winIndicatorDotColor` - точка на указателе
- `sticksColor` - разделители секторов
- `borderColor` - граница колеса
- `wheelColors` - градиент фона колеса
- `textColor` - цвет текста призов

---

## Следующие шаги

Если колесо устраивает, можно добавить:
1. ✅ Backend API (`/api/lottery/spin`)
2. ✅ Database integration (Prisma)
3. ✅ Real prize distribution (SOL, Tokens, Posts)
4. ✅ User limits & validation
5. ✅ Sound effects (опционально)
6. ✅ История выигрышей
7. ✅ Leaderboard

---

**Status:** 🟢 Demo Ready (с @mertercelik/react-prize-wheel)  
**Created:** 2026-02-19  
**Package:** [@mertercelik/react-prize-wheel](https://www.npmjs.com/package/@mertercelik/react-prize-wheel)
