# 📚 ИДЕАЛЬНАЯ МЕТОДОЛОГИЯ ПРОЕКТА FONANA

## 🎯 Назначение
Эта методология обеспечивает системный, архитектурно-ориентированный подход к имплементации фич и дебаггингу. Она предотвращает хаотичные исправления, фокусируясь на корневых причинах, общей архитектуре и предотвращении новых багов. Все процессы строятся вокруг **Context7 MCP** (обязательная проверка документации библиотек), **Playwright MCP** (автоматизация браузера для валидации гипотез) и **Системы 7 Файлов**. Методология консолидирована в один файл для простоты использования.

**Ключевые принципы:**
- **Discovery прежде всего:** Глубокое исследование перед любым планированием.
- **Архитектура прежде всего:** Любое изменение начинается с анализа связей и влияния.
- **Нет случайным фиксам:** Запрещены "быстрые хаки" без полного анализа.
- **Enterprise-ready с первого шага:** Каждое решение должно быть масштабируемым, типобезопасным и тестовым.
- **Полнота диагностики:** Проверять ВСЕ уровни (данные, код, зависимости, интеграции).
- **Метрики успеха:** Каждая задача завершается с quantifiable улучшениями (e.g., -50% ошибок, +30% производительности).
- **Zero Critical Risks:** Невозможно продолжать с критическими неустраненными рисками.
- **Continuous Context7 Sync:** Постоянная синхронизация с актуальной документацией.
- **Real-World Validation:** Использование Playwright MCP для проверки гипотез в реальном браузере.

**Когда использовать:** Для ВСЕХ задач (фичи, баги, рефакторинг). Начинать каждую сессию с чтения этого файла.

---

## ⚠️ КРИТИЧЕСКИЕ ТРЕБОВАНИЯ

### 🔌 **Context7 MCP: Обязательная проверка библиотек**
- **Для КАЖДОЙ библиотеки/зависимости:**
  1. Проверить актуальную документацию (web_search или mcp_context7_get-library-docs).
  2. Проверить breaking changes между версиями (fetch_pull_request или grep_search).
  3. Картировать ВСЕ точки входа, требования запуска, комбинации состояний.
  4. Изолировать и протестировать КАЖДУЮ подсистему.
  5. Версионировать ВСЕ зависимости в плане.
- **Continuous Sync:** На КАЖДОМ этапе проверять, не изменилась ли документация.
- **Правило:** НЕ использовать библиотеку без Context7 - это приводит к скрытым багам.

### 🎭 **Playwright MCP: Автоматизация браузера для валидации** 🆕
**Назначение:** Playwright MCP позволяет программно управлять браузером для проверки гипотез, воспроизведения багов и валидации решений в реальном окружении.

**Когда использовать:**
- **Discovery Phase:** Навигация по приложению для понимания текущего поведения.
- **Воспроизведение багов:** Автоматизация шагов для стабильного воспроизведения проблемы.
- **Валидация гипотез:** Проверка предположений о поведении UI в реальном браузере.
- **Тестирование интеграций:** Проверка взаимодействия frontend с backend.
- **Сбор диагностики:** Снимки экрана, сетевые логи, консольные ошибки.

**Ключевые инструменты Playwright MCP:**
- `browser_navigate` - навигация по URL
- `browser_snapshot` - accessibility snapshot страницы (лучше чем screenshot для понимания структуры)
- `browser_click`, `browser_type` - взаимодействие с элементами
- `browser_network_requests` - анализ сетевых запросов
- `browser_console_messages` - сбор консольных логов
- `browser_wait_for` - ожидание состояний
- `browser_take_screenshot` - визуальная валидация

**Правила использования:**
1. ВСЕГДА начинать с `browser_snapshot` для понимания структуры страницы.
2. Использовать `ref` из snapshot для точного таргетирования элементов.
3. Собирать `browser_console_messages` и `browser_network_requests` при дебаге.
4. Делать скриншоты ДО и ПОСЛЕ изменений для визуального сравнения.
5. Использовать `browser_wait_for` для стабильности автоматизации.

### 📁 **СИСТЕМА 7 ФАЙЛОВ: Обязательна для каждой задачи**
Создавать в `docs/features/[TASK_NAME]/` (для фич) или `docs/debug/[ISSUE_NAME]/` (для багов).

**Новая структура файлов:**

1. **DISCOVERY_REPORT.md** 🆕 - Предварительное исследование
   - Анализ существующих решений (internal и external).
   - Best practices из Context7 для используемых технологий.
   - **Playwright MCP исследование:** навигация по приложению, сбор текущего поведения. 🆕
   - Потенциальные подходы (минимум 3 варианта).
   - Прототипы и эксперименты (код в isolated sandbox).
   - **Browser automation findings:** скриншоты, network logs, console errors. 🆕
   - Чеклист: "Изучены ли все альтернативы? Есть ли precedents? Проверено ли в браузере?" 🆕

2. **ARCHITECTURE_CONTEXT.md** - Анализ текущей среды
   - Компоненты, поток данных, паттерны.
   - Зависимости, версии, точки интеграции.
   - Чеклист: "Все ли связи учтены? Есть ли скрытые зависимости?"

3. **SOLUTION_PLAN.md** - Детальный план (v1, v2, v3...)
   - Изменения по этапам, новые компоненты.
   - Интеграция с Context7 (e.g., "Проверить docs библиотеки X").
   - Версионируется при каждой итерации после Impact Analysis.
   - Чеклист: "План линейный? Нет ли пропущенных шагов?"

4. **IMPACT_ANALYSIS.md** - Анализ влияния (v1, v2, v3...)
   - Конфликты, риски, производительность, безопасность.
   - **Классификация рисков:**
     - 🔴 **Critical** - блокирующие (MUST fix)
     - 🟡 **Major** - серьезные (SHOULD fix)
     - 🟢 **Minor** - приемлемые (CAN accept)
   - Обратная совместимость, метрики (e.g., "Ожидаемое снижение latency на 20%").
   - Чеклист: "Все риски mitigated? Нет ли chain reactions?"

5. **IMPLEMENTATION_SIMULATION.md** 🆕 - Симуляция имплементации
   - Псевдокод ключевых изменений.
   - Моделирование всех edge cases.
   - Симуляция конфликтов и race conditions.
   - **Playwright MCP сценарии:** автоматизация для проверки каждого edge case. 🆕
   - Проверка всех integration points.
   - Bottleneck analysis с конкретными метриками.
   - Чеклист: "Все сценарии промоделированы? Нет ли deadlocks? Есть ли browser automation для каждого case?" 🆕

6. **RISK_MITIGATION.md** - План устранения рисков
   - Для КАЖДОГО Critical и Major риска - конкретный план устранения.
   - Альтернативные подходы если риск неустраним.
   - Proof of mitigation - как проверить что риск устранен.
   - Чеклист: "Все Critical риски имеют решение? Все решения проверяемы?"

7. **IMPLEMENTATION_REPORT.md** - Отчет
   - Факт vs план, проблемы, метрики (e.g., "Снижение ошибок на 40%").
   - Уроки, обновления в memory-bank.
   - Чеклист: "Все метрики measured? Готово к production?"

### 🔄 **РАСШИРЕННЫЙ ИТЕРАТИВНЫЙ ЦИКЛ (ОБЯЗАТЕЛЬНЫЙ):**

```
┌─────────────────────┐
│ 0. DISCOVERY_REPORT │ (Context7 sync + Playwright MCP exploration) 🆕
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 1. SOLUTION_PLAN v1 │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 2. IMPACT_ANALYSIS  │
│    v1               │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 3. IMPLEMENTATION   │
│    SIMULATION v1    │ (включая Playwright сценарии) 🆕
└──────────┬──────────┘
           ▼
    ┌──────────────┐
    │ Conflicts or │ YES
    │ Bottlenecks? ├────┐
    └──────┬───────┘    │
           │ NO         ▼
           ▼      ┌─────────────────┐
    ┌──────────┐  │ Context7 Check  │
    │ Check    │  │ Update Docs?    │
    │ Risks    │  └────────┬────────┘
    └─────┬────┘           ▼
          ▼       ┌─────────────────┐
    ┌──────────┐  │ 4. SOLUTION_PLAN│
    │ Critical │  │    v2 (updated) │
    │ Risks?   │  └────────┬────────┘
    └─────┬────┘           ▼
          │ YES   ┌─────────────────┐
          ├──────►│ 5. RISK         │
          │       │ MITIGATION v1   │
          │ NO    └────────┬────────┘
          ▼                ▼
    ┌──────────┐  ┌─────────────────┐
    │ VALIDATE │  │ 6. IMPACT       │
    │ IN BROWSER│ │ ANALYSIS v2     │ 🆕
    └──────────┘  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │ 7. IMPLEMENTATION│
                  │ SIMULATION v2    │
                  └────────┬────────┘
                           ▼
                     [REPEAT UNTIL]
              [NO CONFLICTS/BOTTLENECKS]
              [AND NO CRITICAL RISKS]
              [AND BROWSER VALIDATION PASSED] 🆕
```

**ПРАВИЛО ПРОГРЕССА:** 
- 🔴 Без файлов 0-6 = НЕ кодировать
- 🔴 С нерешенными конфликтами/bottlenecks = НЕ кодировать
- 🔴 С Critical рисками = НЕ кодировать
- 🟡 С Major рисками = требуется явное одобрение
- 🟢 Только Minor риски + все конфликты решены = можно proceed
- 📊 Файл 7 создается ПОСЛЕ завершения работы
- 🔄 Context7 проверка на КАЖДОЙ итерации

---

## 🛠️ ПРОЦЕСС ИМПЛЕМЕНТАЦИИ ФИЧ

### Этапы (линейные, с блокировками):

1. **Discovery Phase (20-25% времени):** 🆕
   - Context7 исследование всех релевантных библиотек.
   - **Playwright MCP exploration:** 🆕
     - Навигация по существующему функционалу
     - Снимки текущего поведения (screenshots, snapshots)
     - Сбор network requests для понимания API
     - Анализ console messages для скрытых ошибок
   - Изучение существующих решений (internal patterns + external best practices).
   - Создание минимум 3 прототипов в изолированной среде.
   - Документирование в DISCOVERY_REPORT.md (включая browser findings). 🆕
   - Блок: Не переходить без полного research и browser exploration.

2. **Подготовка (10-15% времени):**
   - Читать memory-bank (projectbrief.md → activeContext.md → progress.md).
   - Анализ текущей архитектуры на основе Discovery.
   - Создать файл 2 (ARCHITECTURE_CONTEXT.md).
   - Блок: Не переходить без завершения анализа.

3. **Планирование и оптимизация (35-40% времени):**
   - Создать SOLUTION_PLAN.md v1 на основе Discovery.
   - Создать IMPACT_ANALYSIS.md v1.
   - Создать IMPLEMENTATION_SIMULATION.md v1.
   - **Расширенный итеративный цикл:**
     - Анализировать конфликты и bottlenecks в симуляции
     - Context7 sync - проверить не изменилась ли документация
     - Если конфликты → обновить SOLUTION_PLAN.md → v2, v3...
     - Если Critical риски → создать/обновить RISK_MITIGATION.md
     - Обновить IMPACT_ANALYSIS.md → v2, v3...
     - Обновить IMPLEMENTATION_SIMULATION.md → v2, v3...
     - Повторять пока ВСЕ конфликты не решены И все Critical риски не устранены
   - Документировать финальные версии.
   - Блок: Получить green light от пользователя.

4. **Имплементация (20-25% времени):**
   - Следовать финальной IMPLEMENTATION_SIMULATION.md.
   - Начинать с тестов (TDD подход).
   - Использовать edit_file для изменений, reapply если нужно.
   - Обеспечить type-safety (no any, 100% coverage).
   - Тестировать изолированно, затем интегрировать.
   - Context7 проверка при любых сомнениях.

5. **Валидация и завершение (5-10% времени):**
   - Run checks (npm run check:all).
   - Создать файл 7 (IMPLEMENTATION_REPORT.md).
   - Обновить memory-bank.
   - Финальная Context7 sync для документирования.
   - Метрики: test coverage >95%, no linter errors, все bottlenecks resolved.

**Предотвращение случайных путей:** Если возникает "побочный баг" - остановиться, создать отдельную задачу с 7 файлами.

---

## 🐛 ПРОЦЕСС ДЕБАГГИНГА

### Этапы (фокус на корневых причинах):

1. **Discovery Phase (15-20% времени):** 🆕
   - Context7 поиск известных issues для используемых библиотек.
   - **Playwright MCP bug reproduction:** 🆕
     - Автоматизация шагов для воспроизведения бага
     - Сбор screenshots на каждом шаге
     - Анализ network requests в момент ошибки
     - Сохранение console errors
     - Проверка различных браузеров/устройств
   - Поиск похожих багов в codebase (grep_search + codebase_search).
   - Анализ recent changes (fetch_pull_request).
   - Создать DISCOVERY_REPORT.md с findings и browser evidence. 🆕

2. **Диагностика (20-25% времени):**
   - Собирать данные (logs, run_terminal_cmd для debug).
   - **Playwright MCP diagnostics:** 🆕
     - Пошаговое воспроизведение с детальными snapshots
     - Анализ DOM состояний в момент ошибки
     - Сравнение network patterns (успешный vs неуспешный сценарий)
     - Проверка accessibility tree для UI багов
   - Context7 deep dive для suspect библиотек.
   - Создать файл 2 (ARCHITECTURE_CONTEXT.md) для mapping проблемы.

3. **Анализ корневой причины и планирование (35-40% времени):**
   - Проверять ВСЕ уровни: данные → код → зависимости → интеграции.
   - Создать SOLUTION_PLAN.md v1.
   - Создать IMPACT_ANALYSIS.md v1.
   - Создать IMPLEMENTATION_SIMULATION.md v1.
   - **Расширенный итеративный цикл** (как в имплементации).
   - Финальный RISK_MITIGATION.md если нужно.

4. **Решение (15-20% времени):**
   - Следовать финальной симуляции.
   - Нет хаков: только enterprise-ready fixes.
   - Тестировать на всех сценариях из симуляции.
   - Context7 валидация решения.

5. **Верификация (5-10% времени):**
   - Метрики: проблема resolved в 100% cases, no regression.
   - Создать файл 7, обновить .cursorrules с lessons learned.

**Предотвращение новых багов:** Implementation Simulation должна покрывать 5+ связанных систем.

---

## 📊 МЕТРИКИ И ЧЕКЛИСТЫ

### Критерии приемлемости Discovery:
- [ ] Context7 выполнен для всех технологий?
- [ ] Минимум 3 альтернативы исследованы?
- [ ] Прототипы созданы и протестированы?
- [ ] Best practices documented?
- [ ] Precedents analyzed?
- [ ] **Playwright MCP exploration completed?** 🆕
- [ ] **Browser screenshots/snapshots collected?** 🆕
- [ ] **Network/console logs analyzed?** 🆕

### Критерии приемлемости Implementation Simulation:
- [ ] Все edge cases промоделированы?
- [ ] Race conditions проверены?
- [ ] Bottlenecks identified с метриками?
- [ ] Integration points verified?
- [ ] Deadlock scenarios checked?
- [ ] Performance под нагрузкой estimated?
- [ ] **Playwright automation scenarios created?** 🆕
- [ ] **Browser validation scripts ready?** 🆕

### Критерии приемлемости Impact Analysis:
- [ ] Все системы проанализированы (min 5 связанных)?
- [ ] Риски классифицированы (Critical/Major/Minor)?
- [ ] Performance impact оценен количественно?
- [ ] Security implications проверены?
- [ ] Backward compatibility verified?
- [ ] NO unmitigated Critical risks?
- [ ] NO unresolved conflicts/bottlenecks?

### Общий чеклист для задач:
- [ ] Discovery phase completed?
- [ ] Context7 continuous sync активен?
- [ ] 7 файлов созданы и полны?
- [ ] Расширенный итеративный цикл завершен?
- [ ] Все конфликты и bottlenecks resolved?
- [ ] Архитектура проанализирована?
- [ ] Метрики успеха defined и measured?
- [ ] Нет новых багов introduced (run tests)?

### Enterprise критерии:
- Type coverage: 100%
- Test coverage: >95%
- Latency: p95 <200ms
- No any types, no globals
- Documentation updated
- Zero Critical risks in production
- Zero unresolved conflicts
- All bottlenecks optimized

### Примеры использования Playwright MCP: 🆕

**Discovery для новой фичи:**
```javascript
// 1. Навигация и понимание текущего состояния
await browser_navigate({ url: "http://localhost:3000/creators" });
const snapshot = await browser_snapshot();
// Анализируем структуру страницы

// 2. Сбор информации о сетевых запросах
const requests = await browser_network_requests();
// Понимаем какие API используются

// 3. Проверка консольных ошибок
const messages = await browser_console_messages();
// Находим скрытые проблемы
```

**Воспроизведение бага:**
```javascript
// 1. Навигация к проблемной странице
await browser_navigate({ url: "http://localhost:3000/feed" });

// 2. Ожидание загрузки
await browser_wait_for({ text: "Loading..." });

// 3. Скриншот состояния "до"
await browser_take_screenshot({ filename: "before-bug.png" });

// 4. Действие, вызывающее баг
await browser_click({ 
  element: "Subscribe button", 
  ref: "button[data-testid='subscribe']" 
});

// 5. Сбор ошибок
const errors = await browser_console_messages();
const failed_requests = await browser_network_requests();
```

**Валидация исправления:**
```javascript
// Автоматизированный сценарий для проверки фикса
async function validateFix() {
  await browser_navigate({ url: "http://localhost:3000/creators" });
  
  // Проверяем что страница загрузилась
  await browser_wait_for({ text: "Creators", time: 5 });
  
  // Проверяем отсутствие ошибок
  const console_logs = await browser_console_messages();
  const errors = console_logs.filter(m => m.type === 'error');
  
  if (errors.length > 0) {
    throw new Error("Console errors found: " + JSON.stringify(errors));
  }
  
  // Визуальная проверка
  await browser_take_screenshot({ filename: "after-fix.png" });
}
```

## 🔗 Интеграция с другими инструментами
- Memory Bank: Обновлять activeContext.md после задачи.
- .cursorrules: Добавить новые patterns из Discovery и Simulation.
- Context7: Continuous sync на всех этапах.
- **Playwright MCP:** Browser automation для discovery и validation. 🆕
- Tools: Предпочитать semantic search для flows, grep для exact.

Эта методология эволюционирует: обновлять при необходимости через edit_file. 