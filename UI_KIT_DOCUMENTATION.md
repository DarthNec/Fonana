# 🎨 Fonana UI Kit Documentation

## Обзор

Новая система UI компонентов для Fonana построена на принципах:
- **Консистентность**: Единый стиль во всем приложении
- **Доступность**: Полная поддержка A11y
- **Производительность**: Оптимизированные компоненты
- **Гибкость**: Легкая кастомизация через props

## Компоненты

### Button

Универсальная кнопка с поддержкой различных вариантов и состояний.

```tsx
import { Button } from '@/components/ui'

// Основное использование
<Button>Click me</Button>

// Варианты
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>

// Размеры
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// С иконками
<Button icon={<PlusIcon />}>Create</Button>
<Button icon={<TrashIcon />} iconPosition="right">Delete</Button>

// Состояния
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'success'` | `'primary'` | Стиль кнопки |
| size | `'sm' \| 'md' \| 'lg'` | `'md'` | Размер кнопки |
| fullWidth | `boolean` | `false` | Растянуть на всю ширину |
| loading | `boolean` | `false` | Показать индикатор загрузки |
| icon | `ReactNode` | - | Иконка кнопки |
| iconPosition | `'left' \| 'right'` | `'left'` | Позиция иконки |

### Input

Поле ввода с поддержкой лейблов, иконок и валидации.

```tsx
import { Input } from '@/components/ui'

// Основное использование
<Input
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// С иконкой
<Input
  label="Search"
  icon={<MagnifyingGlassIcon />}
  placeholder="Search..."
/>

// С ошибкой
<Input
  label="Password"
  type="password"
  error="Password is too short"
/>

// С подсказкой
<Input
  label="Username"
  helperText="Choose a unique username"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | `string` | - | Лейбл поля |
| error | `string` | - | Сообщение об ошибке |
| helperText | `string` | - | Вспомогательный текст |
| icon | `ReactNode` | - | Иконка в поле |
| iconPosition | `'left' \| 'right'` | `'left'` | Позиция иконки |
| fullWidth | `boolean` | `false` | Растянуть на всю ширину |

### Textarea

Многострочное поле ввода с автоматическим ресайзом.

```tsx
import { Textarea } from '@/components/ui'

// Основное использование
<Textarea
  label="Description"
  placeholder="Write your description..."
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>

// С автоматическим ресайзом
<Textarea
  label="Content"
  autoResize
  rows={4}
/>

// С счетчиком символов
<Textarea
  label="Bio"
  showCharCount
  maxLength={200}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | `string` | - | Лейбл поля |
| error | `string` | - | Сообщение об ошибке |
| helperText | `string` | - | Вспомогательный текст |
| fullWidth | `boolean` | `false` | Растянуть на всю ширину |
| autoResize | `boolean` | `false` | Автоматический ресайз |
| showCharCount | `boolean` | `false` | Показать счетчик символов |
| maxLength | `number` | - | Максимальная длина |

### Modal

Модальное окно с поддержкой разных размеров и управлением фокусом.

```tsx
import { Modal } from '@/components/ui'

// Основное использование
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
>
  <p>Modal content goes here</p>
</Modal>

// С футером
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={
    <div className="flex gap-3 justify-end">
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>
        Confirm
      </Button>
    </div>
  }
>
  <p>Are you sure you want to continue?</p>
</Modal>

// Разные размеры
<Modal size="sm">Small modal</Modal>
<Modal size="lg">Large modal</Modal>
<Modal size="full">Fullscreen modal</Modal>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | `boolean` | - | Открыто ли модальное окно |
| onClose | `() => void` | - | Callback при закрытии |
| title | `string` | - | Заголовок модалки |
| description | `string` | - | Описание под заголовком |
| size | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Размер модалки |
| closeOnOverlayClick | `boolean` | `true` | Закрывать при клике на фон |
| closeOnEscape | `boolean` | `true` | Закрывать по Escape |
| showCloseButton | `boolean` | `true` | Показывать кнопку закрытия |
| footer | `ReactNode` | - | Контент футера |

### Card

Карточка с различными вариантами стилизации.

```tsx
import { Card } from '@/components/ui'

// Основное использование
<Card>
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>

// Варианты
<Card variant="glass">Glass effect</Card>
<Card variant="bordered">Bordered card</Card>
<Card variant="elevated">With shadow</Card>

// Интерактивная карточка
<Card hoverable clickable onClick={handleClick}>
  Interactive card
</Card>

// Размеры отступов
<Card padding="sm">Small padding</Card>
<Card padding="lg">Large padding</Card>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'default' \| 'glass' \| 'bordered' \| 'elevated'` | `'default'` | Стиль карточки |
| padding | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Размер внутренних отступов |
| hoverable | `boolean` | `false` | Эффект при наведении |
| clickable | `boolean` | `false` | Курсор pointer и анимация клика |
| fullHeight | `boolean` | `false` | Растянуть на всю высоту |

## Использование в проекте

### Импорт компонентов

```tsx
// Импорт отдельных компонентов
import { Button, Input, Card } from '@/components/ui'

// Импорт с типами
import { Button, type ButtonProps } from '@/components/ui'
```

### Кастомизация стилей

Все компоненты поддерживают передачу дополнительных классов через `className`:

```tsx
<Button className="mt-4 shadow-lg">Custom styled button</Button>
```

### Темизация

Компоненты автоматически адаптируются под темную тему благодаря использованию Tailwind CSS классов с префиксом `dark:`.

## Best Practices

### 1. Используйте семантические варианты

```tsx
// ✅ Хорошо
<Button variant="danger" onClick={handleDelete}>Delete</Button>

// ❌ Плохо
<Button className="bg-red-500" onClick={handleDelete}>Delete</Button>
```

### 2. Предоставляйте обратную связь

```tsx
// ✅ Хорошо
<Button loading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>

// ❌ Плохо
<Button onClick={handleSubmit}>Save</Button>
```

### 3. Используйте правильные размеры

```tsx
// ✅ Хорошо - mobile-first
<Button size="md" className="sm:size-lg">Action</Button>

// ❌ Плохо - слишком мелко на мобильных
<Button size="sm">Action</Button>
```

### 4. Обеспечивайте доступность

```tsx
// ✅ Хорошо
<Button aria-label="Delete post" icon={<TrashIcon />} />

// ❌ Плохо
<Button icon={<TrashIcon />} />
```

## Миграция

### Замена старых компонентов

#### Кнопки

```tsx
// Старый код
<button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl">
  Click me
</button>

// Новый код
<Button>Click me</Button>
```

#### Модальные окна

```tsx
// Старый код
<div className="fixed inset-0 bg-black/60">
  <div className="bg-white rounded-xl p-6">
    {/* content */}
  </div>
</div>

// Новый код
<Modal isOpen={isOpen} onClose={onClose} title="Modal">
  {/* content */}
</Modal>
```

## Демо

Посмотреть все компоненты в действии можно на странице:
[/test/ui-kit](/test/ui-kit)

---

*Документация будет обновляться по мере добавления новых компонентов* 