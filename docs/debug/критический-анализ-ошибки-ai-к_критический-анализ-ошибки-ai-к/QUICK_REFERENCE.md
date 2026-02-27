# ⚡ КРИТИЧЕСКАЯ ОШИБКА AI - QUICK REFERENCE

**3-минутное резюме для быстрого понимания**

---

## 🔴 **ЧТО ПРОИЗОШЛО**

**User запросил (2 раза):**
> "указывать, что это **автоперевод**"
> "(имеется ввиду, что **перевод на их язык**)"

**AI сделал:**
```tsx
автоответ  // ← НЕПРАВИЛЬНО
```

**Должно было быть:**
```tsx
автоперевод  // ← ПРАВИЛЬНО
```

**Результат:** User исправил руками на `auto translate`

---

## 🧠 **ROOT CAUSE (1 предложение)**

AI заменил "**автоперевод**" на семантически близкое "**автоответ**" из-за сильного влияния backend контекста (`isAIanswer`) и отсутствия explicit term validation.

---

## 📊 **ПОЧЕМУ ЭТО КРИТИЧНО**

| Параметр | Значение |
|----------|----------|
| **Повторений запроса** | 2x |
| **Explanation given** | Да ("перевод на их язык") |
| **User fix required** | Да (руками) |
| **Trust impact** | Высокий |
| **Severity** | 🔴 CRITICAL |

---

## 💡 **TOP-3 ПРИЧИНЫ**

### 1️⃣ **Context Bias**
Backend: `isAIanswer: true` → AI thought "автоответ" логичнее

### 2️⃣ **Semantic Substitution**
"автоперевод" ≈ "автоответ" (оба "авто-") → AI заменил

### 3️⃣ **No Validation**
AI не сверил итоговое слово с user request

---

## 🛡️ **PREVENTION (3 правила)**

### ✅ Rule #1: Extract Explicit Terms
```python
user_request = "автоперевод"
if "автоперевод" not in implementation:
    raise Error("Missing user term")
```

### ✅ Rule #2: User Request > Context
```python
if user_provides_explicit_term:
    priority = USER_REQUEST  # Не backend naming
```

### ✅ Rule #3: Validate Before Submit
```python
ai_term = "автоответ"
user_term = "автоперевод"
if ai_term != user_term:
    ask_confirmation()  # Должно было спросить
```

---

## 🎯 **IMPACT**

- ⏱️ **Time wasted:** 5 min (user manual fix)
- 🔥 **Frustration:** Максимальная
- 💔 **Trust damage:** Значительная
- ⚠️ **Pattern risk:** Может повториться

---

## 📝 **KEY LEARNING (1 sentence)**

**Explicit user terms ALWAYS > backend context**, и нужен validation layer перед финализацией изменений.

---

**Full Report:** [DISCOVERY_REPORT.md](./DISCOVERY_REPORT.md)
