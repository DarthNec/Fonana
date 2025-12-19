# 📐 ДЕТАЛЬНЫЙ UX BREAKDOWN: CreatePostModal

**Компонент**: `components/CreatePostModal.tsx`  
**Дата анализа**: 16 декабря 2025  
**Метод**: Построчный анализ UX patterns

---

## 🧩 КОМПОНЕНТНАЯ СТРУКТУРА

### Общая архитектура

```
CreatePostModal (2113 lines)
├── State Management (24 useState hooks)
├── Business Logic (11 useEffect hooks)
├── Handlers (8 functions)
├── UI Sections
│   ├── Video Compression Overlay
│   ├── Main Modal
│   │   ├── Header
│   │   ├── Left Column
│   │   │   ├── Content Type Selection
│   │   │   ├── File Upload / Sora-2
│   │   │   ├── Category
│   │   │   └── Tags
│   │   └── Right Column
│   │       ├── Title
│   │       ├── Description
│   │       ├── Access Type
│   │       └── Price Settings
│   ├── Image Crop Modal
│   └── Prompt Warning Modal
```

---

## 📊 ДЕТАЛЬНЫЙ АНАЛИЗ ПО СЕКЦИЯМ

---

## 1️⃣ HEADER SECTION

### Текущая реализация (Строки 1350-1369)

```tsx
<div className="flex items-center justify-between mb-4 sm:mb-6">
  <div className="flex items-center gap-3">
    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600">
      {mode === 'edit' ? 'Edit post' : 'Create new post'}
    </h2>
    {mode === 'edit' && isLoadingPost && (
      <div className="text-sm text-gray-500">Loading...</div>
    )}
  </div>
  <button onClick={onClose}>
    <XMarkIcon className="w-5 sm:w-6 h-5 sm:h-6" />
  </button>
</div>
```

### UX Анализ

**✅ Хорошо**:
- Clear title показывает mode (Create vs Edit)
- Close button в ожидаемом месте (top-right)
- Responsive размеры (sm:text-2xl)
- Loading indicator для edit mode

**🟡 Можно улучшить**:
1. **No progress indicator** - пользователь не знает сколько шагов осталось
2. **No breadcrumbs** - где я сейчас в процессе?
3. **No unsaved changes warning** - закрытие теряет все данные

### Рекомендации

```tsx
<div className="flex items-center justify-between">
  {/* Left: Title + Progress */}
  <div>
    <h2>Create new post</h2>
    {showProgress && (
      <div className="flex items-center gap-2 mt-1">
        <span className="text-sm text-gray-500">Step 2 of 4</span>
        <div className="h-1 w-32 bg-gray-200 rounded">
          <div className="h-full w-1/2 bg-purple-500 rounded" />
        </div>
      </div>
    )}
  </div>
  
  {/* Right: Actions */}
  <div className="flex gap-2">
    <button onClick={handleSaveDraft} className="text-sm">
      Save Draft
    </button>
    <button onClick={handleClose}>
      <XMarkIcon />
    </button>
  </div>
</div>

{/* Breadcrumbs */}
<div className="flex gap-2 text-xs text-gray-500">
  <span className="text-purple-600">Content Type</span>
  <span>→</span>
  <span>Details</span>
  <span>→</span>
  <span>Access</span>
  <span>→</span>
  <span>Publish</span>
</div>
```

**Score**: 7/10 → можно 9/10

---

## 2️⃣ CONTENT TYPE SELECTION

### Текущая реализация (Строки 1374-1432)

```tsx
<label>What do you want to create?</label>
<div className="grid grid-cols-4 gap-2">
  <button onClick={() => setFormData({...prev, type: 'text'})}>
    <DocumentTextIcon />
    <div>Text</div>
  </button>
  <button onClick={() => setFormData({...prev, type: 'image'})}>
    <PhotoIcon />
    <div>Image</div>
  </button>
  <button onClick={() => setFormData({...prev, type: 'video'})}>
    <VideoCameraIcon />
    <div>Video</div>
  </button>
  <button onClick={() => setFormData({...prev, contentSource: 'sora2'})}>
    <SparklesIcon />
    <div>Sora-2</div>
  </button>
</div>
```

### UX Анализ

**✅ Хорошо**:
- Visual icons помогают идентификации
- Grid layout компактный
- Active state styling
- Touch-friendly на мобильных

**❌ Проблемы**:

1. **Inconsistent logic**:
   - Text, Image, Video → устанавливают `type`
   - Sora-2 → устанавливает `contentSource`
   - Это путает пользователя и код!

2. **No explanations**:
   - Что такое Sora-2? (новые пользователи не знают)
   - Чем Video отличается от Sora-2? (оба video!)

3. **No disabled states**:
   - Если 0 generations → Sora-2 все равно кликабелен
   - Только после клика пользователь узнает что нельзя

4. **Missing content types**:
   - Audio есть в коде, но нет кнопки!
   - `'audio' | 'text' | 'image' | 'video'` vs 4 кнопки

### Рекомендации

**Option A: Separate Upload vs Generate**

```tsx
<div>
  <h3>What do you want to create?</h3>
  
  {/* Content Type */}
  <div className="grid grid-cols-3 gap-3 mb-4">
    <TypeCard
      icon={<DocumentTextIcon />}
      title="Text"
      description="Write a post"
      onClick={() => selectType('text')}
      active={type === 'text'}
    />
    <TypeCard
      icon={<PhotoIcon />}
      title="Media"
      description="Upload image/video/audio"
      onClick={() => selectType('media')}
      active={type === 'media'}
    />
    <TypeCard
      icon={<SparklesIcon />}
      title="AI Video"
      description="Generate with Sora-2"
      badge={`${availableGenerations} left`}
      onClick={() => selectType('ai-video')}
      active={type === 'ai-video'}
      disabled={availableGenerations === 0}
      tooltip="Sora-2 AI generates videos from text"
    />
  </div>
  
  {/* Sub-options for Media */}
  {type === 'media' && (
    <div className="grid grid-cols-3 gap-2">
      <SubTypeButton icon={<PhotoIcon />} label="Image" />
      <SubTypeButton icon={<VideoCameraIcon />} label="Video" />
      <SubTypeButton icon={<MusicalNoteIcon />} label="Audio" />
    </div>
  )}
</div>
```

**Option B: Two-stage selection**

```tsx
<div>
  <h3>Step 1: Choose source</h3>
  <RadioGroup>
    <Radio value="upload">📤 Upload from device</Radio>
    <Radio value="ai">🤖 Generate with AI (Sora-2)</Radio>
  </RadioGroup>
  
  {source === 'upload' && (
    <>
      <h3>Step 2: Choose type</h3>
      <div className="grid grid-cols-4 gap-2">
        <Button>Text</Button>
        <Button>Image</Button>
        <Button>Video</Button>
        <Button>Audio</Button>
      </div>
    </>
  )}
  
  {source === 'ai' && (
    <div className="bg-purple-50 p-4 rounded-lg">
      <SparklesIcon className="w-8 h-8 mb-2" />
      <h4>AI Video Generation</h4>
      <p>Create videos from text using Sora-2</p>
      <Badge>2 generations available today</Badge>
    </div>
  )}
</div>
```

**Score**: 6/10 → можно 9/10

---

## 3️⃣ FILE UPLOAD SECTION

### Текущая реализация (Строки 1454-1521)

```tsx
<div
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
  onClick={() => fileInputRef.current?.click()}
  className="border-2 border-dashed..."
>
  {formData.preview ? (
    <div className="relative">
      {formData.type === 'image' && <img src={formData.preview} />}
      {formData.type === 'video' && <video src={formData.preview} controls />}
      {formData.type === 'audio' && <audio src={formData.preview} controls />}
      <button onClick={remove}>
        <XMarkIcon />
      </button>
    </div>
  ) : (
    <div>
      <PhotoIcon />
      <p>Drag file or click</p>
      <p>Max: {maxSize}MB</p>
    </div>
  )}
  <input ref={fileInputRef} type="file" className="hidden" />
</div>
```

### UX Анализ

**✅ Хорошо**:
- Drag & drop support
- Click to upload fallback
- Preview после загрузки
- Max size указан
- Remove button

**🟡 Можно улучшить**:

1. **No upload progress**:
   - File загружается
   - Пользователь не видит прогресс
   - Для больших файлов → кажется что зависло

2. **No file validation feedback**:
   - Wrong format → error только после try
   - Too large → error только после try
   - Лучше показывать ДО попытки загрузки

3. **Preview too small**:
   - Image preview = 40px height (h-40)
   - Hard to see quality
   - No zoom option

4. **No metadata shown**:
   - Filename не показан
   - File size не показан
   - Duration для video не показан

5. **No multiple files**:
   - Только 1 файл за раз
   - Нельзя загрузить carousel (multiple images)

### Рекомендации

```tsx
<div className="space-y-4">
  {/* Upload Zone */}
  {!file && (
    <DragDropZone
      onDrop={handleDrop}
      accept={acceptedTypes}
      maxSize={maxSize}
      onError={(error) => toast.error(error)}
    >
      <div className="text-center p-8">
        <UploadIcon className="w-12 h-12 mx-auto mb-3" />
        <p className="text-lg font-medium">Drop file here or click to browse</p>
        <p className="text-sm text-gray-500 mt-1">
          Supported: JPG, PNG, MP4, MOV (max {maxSize}MB)
        </p>
      </div>
    </DragDropZone>
  )}
  
  {/* Uploading */}
  {isUploading && (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <Spinner />
        <span>Uploading {file.name}...</span>
      </div>
      <ProgressBar value={uploadProgress} />
      <p className="text-xs text-gray-500 mt-1">
        {uploadProgress}% • {estimatedTime} remaining
      </p>
    </div>
  )}
  
  {/* Preview */}
  {file && !isUploading && (
    <MediaPreview
      file={file}
      onRemove={handleRemove}
      onReplace={handleReplace}
      onZoom={handleZoom}
      metadata={{
        name: file.name,
        size: formatSize(file.size),
        duration: videoDuration,
        dimensions: imageDimensions
      }}
    />
  )}
</div>
```

**Score**: 7/10 → можно 9/10

---

## 4️⃣ SORA-2 GENERATION SECTION

### Текущая реализация (Строки 1523-1688)

```tsx
{formData.contentSource === 'sora2' && (
  <div className="space-y-4">
    {/* Generations Counter */}
    <div className="bg-gradient-to-r from-pink-50...">
      <span>Available generations:</span>
      <span>{availableGenerations ?? 0}</span>
      <QuestionMarkCircleIcon onHover={showTooltip} />
    </div>
    
    {/* Prompt */}
    <textarea
      value={formData.soraPrompt}
      placeholder="Describe the video you want to create..."
    />
    
    {/* Duration */}
    <div className="grid grid-cols-3 gap-2">
      {['4', '8', '12'].map(sec => <button>{sec}s</button>)}
    </div>
    
    {/* Resolution - BROKEN! */}
    <div className="grid grid-cols-2 gap-2">
      {sizeOptions.map(size => <div></div>)}  {/* Empty divs! */}
    </div>
    
    {/* Reference Image */}
    <div onClick={() => uploadRef.click()}>
      {preview ? <img /> : <PhotoIcon />}
    </div>
  </div>
)}
```

### UX Анализ

**✅ Хорошо**:
- Clear generations counter с tooltip
- Prompt textarea большой
- Duration выбор простой
- Reference image опциональный

**❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ**:

1. **Resolution selector НЕ РАБОТАЕТ** 🚨:
```tsx
// Строки 1620-1621 - просто пустые div'ы!
{sizeOptions.map((sizeOption) => (
  <div></div>  // ← ЧТО???
```

2. **No prompt help**:
   - Пользователь не знает что писать
   - Нет examples
   - Нет suggestions
   - Нет tips для лучших результатов

3. **No estimation**:
   - Сколько времени займет генерация?
   - Какая будет цена (если платно)?
   - Когда видео будет готово?

4. **Generations counter hidden until click**:
   - User clicks Sora-2
   - Sees "0 generations"
   - 🤷 "Why didn't you tell me?"

5. **Reference image не объяснен**:
   - Что делает reference image?
   - Как это влияет на результат?
   - Optional или recommended?

### Рекомендации

```tsx
<div className="space-y-6">
  {/* Header with Info */}
  <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-xl">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <SparklesIcon className="w-6 h-6 text-pink-600" />
        <h3 className="font-semibold">AI Video Generation (Sora-2)</h3>
      </div>
      <Badge variant={generations > 0 ? 'success' : 'error'}>
        {generations} generations left today
      </Badge>
    </div>
    <p className="text-sm text-gray-600">
      Create amazing videos from text descriptions. 
      Generations refresh every 24 hours.
    </p>
  </div>
  
  {/* Prompt with Smart Help */}
  <div>
    <label className="flex items-center justify-between mb-2">
      <span>Describe your video</span>
      <button 
        onClick={showPromptTips}
        className="text-xs text-purple-600"
      >
        💡 Tips for better results
      </button>
    </label>
    
    <PromptEditor
      value={prompt}
      onChange={setPrompt}
      placeholder="A cinematic shot of a sunset over mountains..."
      suggestions={promptSuggestions}
      maxLength={500}
      showCounter={true}
      onOptimize={handleOptimizePrompt}
    />
    
    {showTips && (
      <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
        <p className="font-medium mb-1">💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Be specific about camera angles and movements</li>
          <li>Describe lighting and mood</li>
          <li>Include action or story elements</li>
          <li>Mention style (cinematic, documentary, etc.)</li>
        </ul>
      </div>
    )}
  </div>
  
  {/* Settings Grid */}
  <div className="grid grid-cols-2 gap-4">
    {/* Duration */}
    <div>
      <label>Duration</label>
      <RadioGroup value={duration} onChange={setDuration}>
        <Radio value="4">4 seconds</Radio>
        <Radio value="8">8 seconds (recommended)</Radio>
        <Radio value="12">12 seconds</Radio>
      </RadioGroup>
    </div>
    
    {/* Resolution - FIXED! */}
    <div>
      <label>Resolution</label>
      <Select value={resolution} onChange={setResolution}>
        <Option value="720x1280">
          <div>
            <div className="font-medium">720x1280</div>
            <div className="text-xs text-gray-500">Portrait (Instagram)</div>
          </div>
        </Option>
        <Option value="1280x720">
          <div>
            <div className="font-medium">1280x720</div>
            <div className="text-xs text-gray-500">Landscape (YouTube)</div>
          </div>
        </Option>
        <Option value="1080x1920">
          <div>
            <div className="font-medium">1080x1920</div>
            <div className="text-xs text-gray-500">Full HD Portrait</div>
          </div>
        </Option>
        <Option value="1920x1080">
          <div>
            <div className="font-medium">1920x1080</div>
            <div className="text-xs text-gray-500">Full HD Landscape</div>
          </div>
        </Option>
      </Select>
    </div>
  </div>
  
  {/* Reference Image (Optional) */}
  <div>
    <label className="flex items-center gap-2 mb-2">
      <span>Reference Image</span>
      <Badge variant="secondary">Optional</Badge>
      <Tooltip text="Upload an image to guide the style and composition" />
    </label>
    
    <ImageUploader
      value={referenceImage}
      onChange={setReferenceImage}
      placeholder="Click to add reference image"
      preview={referencePreview}
      maxSize={10}
    />
  </div>
  
  {/* Estimation */}
  {prompt && duration && (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium mb-2">Generation estimate</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Processing time:</span>
          <span className="font-medium ml-2">~2-3 minutes</span>
        </div>
        <div>
          <span className="text-gray-600">Video length:</span>
          <span className="font-medium ml-2">{duration} seconds</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        ⚡ You'll be notified when the video is ready
      </p>
    </div>
  )}
</div>
```

**Score**: 5/10 → можно 9/10 (после фикса resolution!)

---

## 5️⃣ CATEGORY SELECTION

### Текущая реализация (Строки 1708-1728)

```tsx
<label>Category</label>
<select
  value={formData.category}
  onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}
  required
>
  <option value="">Select category</option>
  {categories.map(category => (
    <option key={category} value={category}>{category}</option>
  ))}
</select>
```

### UX Анализ

**✅ Хорошо**:
- Required field
- Auto-selected по типу контента (smart!)
- 21 категория - good coverage

**🟡 Проблемы**:

1. **Plain `<select>` dropdown**:
   - Не выделяется визуально
   - Нет иконок для категорий
   - Нет описаний что включает категория

2. **No search/filter** для 21 категории:
   - Long scroll
   - Hard to find нужную

3. **No popular/trending indicators**:
   - Какие категории популярны?
   - В какой категории больше views?

4. **Smart category не объяснен**:
   - Категория auto-selected
   - User не понимает почему именно эта
   - Может захотеть изменить но не знает об этом

### Рекомендации

```tsx
<div>
  <label className="flex items-center justify-between mb-2">
    <span>Category</span>
    {isAutoSelected && (
      <Badge variant="info">
        Auto-selected based on content type
      </Badge>
    )}
  </label>
  
  <CategorySelector
    value={category}
    onChange={setCategory}
    categories={categories}
    searchable={true}
    showIcons={true}
    showStats={true}
    autoSelected={isAutoSelected}
  />
</div>

// CategorySelector component:
<div>
  {/* Search */}
  <input
    type="text"
    placeholder="Search categories..."
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
  
  {/* Popular Categories */}
  <div className="mb-3">
    <h4 className="text-xs font-medium text-gray-500 mb-2">POPULAR</h4>
    <div className="grid grid-cols-3 gap-2">
      {popularCategories.map(cat => (
        <CategoryCard
          key={cat.id}
          icon={cat.icon}
          name={cat.name}
          count={cat.postCount}
          active={category === cat.name}
          onClick={() => setCategory(cat.name)}
        />
      ))}
    </div>
  </div>
  
  {/* All Categories */}
  <div>
    <h4 className="text-xs font-medium text-gray-500 mb-2">ALL CATEGORIES</h4>
    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
      {filteredCategories.map(cat => (
        <CategoryCard ... />
      ))}
    </div>
  </div>
</div>
```

**Score**: 7/10 → можно 9/10

---

## 6️⃣ TAGS SECTION

### Текущая реализация (Строки 1730-1771)

```tsx
<label>Tags (max. 5)</label>

{/* Current tags */}
<div className="flex flex-wrap gap-2">
  {formData.tags.map(tag => (
    <span className="px-3 py-1 bg-purple-500/20 rounded-full">
      #{tag}
      <button onClick={() => removeTag(tag)}>
        <XMarkIcon />
      </button>
    </span>
  ))}
</div>

{/* Add tag */}
{formData.tags.length < 5 && (
  <div className="flex gap-2">
    <input
      value={formData.currentTag}
      onChange={e => setFormData({...prev, currentTag: e.target.value})}
      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
      placeholder="Add tag..."
    />
    <button onClick={addTag}>
      <PlusIcon />
    </button>
  </div>
)}
```

### UX Анализ

**✅ Хорошо**:
- Max 5 limit clearly stated
- Visual tag chips
- Easy removal
- Enter key support

**🟡 Проблемы**:

1. **No suggestions**:
   - User не знает какие теги популярны
   - Нет автокомплита
   - Нет trending tags

2. **No validation**:
   - Можно добавить пустой tag
   - Можно добавить очень длинный tag
   - Можно добавить дубликат (code prevents, но UI не показывает)

3. **No benefits shown**:
   - Зачем добавлять теги?
   - Как теги помогут?
   - Сколько постов с этим тегом?

4. **Input styling inconsistent**:
   - Маленький input
   - Не выделяется
   - Placeholder не достаточно informative

### Рекомендации

```tsx
<div>
  <label className="flex items-center justify-between mb-2">
    <span>Tags</span>
    <span className="text-xs text-gray-500">
      {tags.length}/5 used
    </span>
  </label>
  
  {/* Info */}
  {tags.length === 0 && (
    <div className="bg-blue-50 p-3 rounded-lg mb-3 text-sm">
      <p className="text-blue-900">
        💡 Add tags to help people discover your post. 
        Tagged posts get 2x more views on average!
      </p>
    </div>
  )}
  
  {/* Current Tags */}
  {tags.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-3">
      {tags.map(tag => (
        <TagChip
          key={tag}
          tag={tag}
          onRemove={() => removeTag(tag)}
          stats={getTagStats(tag)}
        />
      ))}
    </div>
  )}
  
  {/* Add Tag with Autocomplete */}
  {tags.length < 5 && (
    <TagAutocomplete
      value={currentTag}
      onChange={setCurrentTag}
      onAdd={addTag}
      suggestions={getSuggestions(currentTag, category)}
      trending={trendingTags}
      maxLength={30}
      placeholder="Type to search or add custom tag..."
    />
  )}
  
  {/* Trending Tags for this Category */}
  {tags.length < 5 && trendingForCategory.length > 0 && (
    <div className="mt-3">
      <h4 className="text-xs font-medium text-gray-500 mb-2">
        TRENDING IN {category.toUpperCase()}
      </h4>
      <div className="flex flex-wrap gap-2">
        {trendingForCategory.map(tag => (
          <button
            key={tag}
            onClick={() => addTag(tag)}
            className="px-2 py-1 bg-gray-100 hover:bg-purple-100 rounded-full text-sm"
          >
            #{tag} ({tag.count}K)
          </button>
        ))}
      </div>
    </div>
  )}
</div>
```

**Score**: 6/10 → можно 9/10

---

## 7️⃣ TITLE & DESCRIPTION

### Текущая реализация (Строки 1776-1809)

```tsx
{/* Title */}
<label>Title {formData.type === 'text' ? '*' : '(optional)'}</label>
<input
  type="text"
  value={formData.title}
  onChange={e => setFormData({...prev, title: e.target.value})}
  placeholder={formData.type === 'text' 
    ? "Enter post title" 
    : "Add a catchy title (optional)"}
  maxLength={100}
  required={formData.type === 'text'}
/>

{/* Description */}
<label>Description {formData.type === 'text' ? '*' : '(optional)'}</label>
<textarea
  value={formData.content}
  onChange={e => setFormData({...prev, content: e.target.value})}
  rows={4}
  placeholder={formData.type === 'text' 
    ? "Share your thoughts..." 
    : "Add description (optional)"}
  maxLength={2000}
  required={formData.type === 'text'}
/>
<p className="text-xs text-gray-500">
  {formData.content.length}/2000 characters
</p>
```

### UX Анализ

**✅ Хорошо**:
- Character counter
- Max length enforced
- Different placeholders по типу
- Required/optional clearly marked
- Responsive текст

**🟡 Проблемы**:

1. **Character counter только для description**:
   - Title тоже имеет limit (100)
   - Но counter не показан
   - Пользователь может не знать о лимите

2. **No formatting options**:
   - Plain text only
   - Нельзя добавить bold, italic, links
   - Нет emoji picker
   - Нет markdown support

3. **No AI writing assistance**:
   - Можно было бы предложить "Improve with AI"
   - Generate title from description
   - Suggest hashtags

4. **No preview как выглядит**:
   - User пишет текст
   - Не видит как он будет отображаться
   - Может быть слишком длинный или короткий

5. **Textarea auto-resize отсутствует**:
   - Фиксированные 4 rows
   - Если текст длинный → scroll внутри
   - Лучше бы auto-grow

### Рекомендации

```tsx
<div className="space-y-4">
  {/* Title */}
  <div>
    <label className="flex items-center justify-between mb-2">
      <span>
        Title {required ? '*' : <Badge variant="secondary">Optional</Badge>}
      </span>
      <span className="text-xs text-gray-500">
        {title.length}/100
      </span>
    </label>
    
    <input
      type="text"
      value={title}
      onChange={handleTitleChange}
      placeholder="Give your post a catchy title..."
      maxLength={100}
      aria-label="Post title"
      aria-required={required}
      className={cn(
        "w-full px-4 py-3 rounded-xl border",
        titleError && "border-red-500"
      )}
    />
    
    {titleError && (
      <p className="text-xs text-red-600 mt-1">{titleError}</p>
    )}
    
    {!title && type === 'media' && (
      <button
        onClick={generateTitleFromMedia}
        className="text-xs text-purple-600 mt-1"
      >
        ✨ Generate title with AI
      </button>
    )}
  </div>
  
  {/* Description with Rich Editor */}
  <div>
    <label className="flex items-center justify-between mb-2">
      <span>
        Description {required ? '*' : <Badge>Optional</Badge>}
      </span>
      <span className="text-xs text-gray-500">
        {content.length}/2000
      </span>
    </label>
    
    <RichTextEditor
      value={content}
      onChange={handleContentChange}
      placeholder="Tell your story..."
      maxLength={2000}
      features={{
        bold: true,
        italic: true,
        emoji: true,
        mentions: true,
        hashtags: true,
        links: type === 'text'  // Only for text posts
      }}
      autoResize={true}
      minHeight={100}
      maxHeight={400}
    />
    
    {contentError && (
      <p className="text-xs text-red-600 mt-1">{contentError}</p>
    )}
    
    {/* AI Tools */}
    <div className="flex gap-2 mt-2">
      <button
        onClick={improveWithAI}
        className="text-xs text-purple-600"
        disabled={!content}
      >
        ✨ Improve with AI
      </button>
      <button
        onClick={fixGrammar}
        className="text-xs text-purple-600"
        disabled={!content}
      >
        📝 Check grammar
      </button>
      <button
        onClick={suggestHashtags}
        className="text-xs text-purple-600"
        disabled={!content}
      >
        🏷️ Suggest hashtags
      </button>
    </div>
  </div>
  
  {/* Preview Toggle */}
  <button
    onClick={() => setShowPreview(!showPreview)}
    className="text-sm text-gray-600"
  >
    {showPreview ? '✏️ Edit' : '👁️ Preview'}
  </button>
  
  {showPreview && (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-semibold mb-2">Preview</h4>
      <PostPreview title={title} content={content} type={type} />
    </div>
  )}
</div>
```

**Score**: 7/10 → можно 9/10

---

## 8️⃣ ACCESS CONTROL

### Текущая реализация (Строки 1811-1884)

```tsx
<label>Content access</label>
<div className="grid grid-cols-2 gap-3">
  {accessTypes.map(access => (
    <button
      onClick={() => setFormData({
        ...prev, 
        accessType: access.value,
        price: access.value === 'paid' ? prev.price : 0
      })}
      className={accessType === access.value ? 'border-purple-500' : ''}
    >
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded-lg bg-gradient-to-r ${access.color}`}>
          <access.icon />
        </div>
        <div>{access.label}</div>
      </div>
      <div className="text-xs">{access.desc}</div>
    </button>
  ))}
</div>

{/* Price for Paid */}
{formData.accessType === 'paid' && (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label>Price</label>
      <input
        type="number"
        step="0.01"
        min="0.01"
        max="1000"
        value={formData.price}
      />
      {price > 0 && (
        <span className="text-xs">
          Курс SOL/USD: ${solToUsdRate}
        </span>
      )}
    </div>
    <div>
      <label>Currency</label>
      <select value={formData.currency}>
        <option value="SOL">SOL</option>
        <option value="USDC">USDC</option>
      </select>
    </div>
  </div>
)}
```

### UX Анализ

**✅ Хорошо**:
- 5 типов доступа - flexible!
- Visual icons и colors
- Clear descriptions
- Real-time SOL/USD rate
- Two currencies (SOL/USDC)

**🟡 Проблемы**:

1. **No explanation of tiers**:
   - Что значит "Basic and above"?
   - Сколько стоит каждый tier для подписчика?
   - Какой % creators выбирает этот тип?

2. **No revenue estimation**:
   - User устанавливает price = 1 SOL
   - Но не видит:
     - Platform fee (%)
     - Net revenue
     - Estimated monthly income

3. **No A/B testing suggestions**:
   - "Try 0.5 SOL - 80% of posts sell at this price"
   - "Posts under 1 SOL sell 3x faster"

4. **Paid vs Subscribers confusion**:
   - В чем разница?
   - Paid = one-time purchase
   - Subscribers = recurring subscription
   - Но это не объяснено!

5. **VIP vs Premium не ясна разница**:
   - Premium: "Premium and VIP"
   - VIP: "Only VIP"
   - Но пользователь может не знать иерархию

### Рекомендации

```tsx
<div className="space-y-4">
  {/* Header with Info */}
  <div className="flex items-center justify-between">
    <label className="font-medium">Who can access this post?</label>
    <button
      onClick={showAccessGuide}
      className="text-xs text-purple-600"
    >
      💡 Access Guide
    </button>
  </div>
  
  {/* Access Types */}
  <div className="space-y-2">
    {accessTypes.map(access => (
      <AccessTypeCard
        key={access.value}
        {...access}
        active={accessType === access.value}
        onClick={() => selectAccess(access.value)}
        stats={getAccessStats(access.value)}
        recommendation={getRecommendation(access.value, category)}
      />
    ))}
  </div>
  
  {/* Pricing (if paid) */}
  {accessType === 'paid' && (
    <div className="bg-gray-50 p-4 rounded-xl space-y-4">
      <h4 className="font-medium">Set your price</h4>
      
      {/* Price Input with Smart Suggestions */}
      <div>
        <label>Price</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={price}
            onChange={handlePriceChange}
            min="0.01"
            step="0.01"
          />
          <select value={currency} onChange={setCurrency}>
            <option value="SOL">SOL</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
        
        {/* USD Conversion */}
        <p className="text-sm text-gray-600 mt-1">
          ≈ ${(price * solRate).toFixed(2)} USD
          {isRateLoading && <Spinner />}
        </p>
        
        {/* Smart Suggestions */}
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">POPULAR PRICES:</p>
          <div className="flex gap-2">
            {suggestedPrices.map(suggested => (
              <button
                key={suggested.value}
                onClick={() => setPrice(suggested.value)}
                className="px-3 py-1 bg-white rounded-lg border text-sm"
              >
                {suggested.value} SOL
                <span className="text-xs text-gray-500 ml-1">
                  ({suggested.percentage}% of posts)
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Revenue Calculator */}
      {price > 0 && (
        <div className="bg-white p-3 rounded-lg">
          <h5 className="text-sm font-medium mb-2">Estimated Revenue</h5>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Post price:</span>
              <span className="font-medium">{price} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform fee (5%):</span>
              <span className="text-red-600">-{(price * 0.05).toFixed(3)} SOL</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="font-medium">You receive:</span>
              <span className="font-bold text-green-600">
                {(price * 0.95).toFixed(3)} SOL
              </span>
            </div>
          </div>
          
          {/* Estimated Sales */}
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500 mb-1">
              Based on your audience and similar posts:
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Est. sales in first week:</span>
              <span className="font-medium">{estimatedSales} sales</span>
            </div>
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm">Est. revenue:</span>
              <span className="font-bold">
                ${((price * 0.95) * estimatedSales * solRate).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
  
  {/* Access Guide Modal */}
  {showGuide && (
    <AccessGuideModal onClose={() => setShowGuide(false)} />
  )}
</div>
```

**Score**: 7/10 → можно 9.5/10

---

## 9️⃣ SUBMIT BUTTONS

### Текущая реализация (Строки 1890-1978)

```tsx
<div className="flex gap-3 pt-4 border-t">
  <button
    type="submit"
    disabled={isUploading || !connected || ...}
    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500"
  >
    {isCompressing ? (
      <>
        <Spinner />
        Compressing video... {compressionProgress}%
      </>
    ) : isUploading ? (
      <>
        <Spinner />
        {mode === 'edit' ? 'Saving...' : 'Publishing...'}
      </>
    ) : (
      <>
        <LockClosedIcon />
        {mode === 'edit' ? 'Save Changes' : 'Publish'}
      </>
    )}
  </button>
  <button
    type="button"
    onClick={onClose}
    className="px-6 py-3 bg-gray-100"
  >
    Cancel
  </button>
</div>
```

### UX Анализ

**✅ Хорошо**:
- Primary action выделен цветом
- Loading states с spinners
- Disabled state когда нельзя submit
- Compression progress показан
- Different labels для create vs edit

**🟡 Проблемы**:

1. **No Preview button**:
   - Publish сразу
   - Нет возможности проверить перед публикацией

2. **Disabled state не объяснен**:
   - Button disabled
   - User не знает ПОЧЕМУ
   - Нет tooltip или message

3. **Cancel без предупреждения**:
   - Вся работа потеряна
   - Нет "Save Draft?"
   - Нет confirmation

4. **No keyboard shortcut hints**:
   - Ctrl+Enter to publish
   - Esc to cancel
   - Не показаны

5. **Debug logs в production**:
   - Строки 1899-1948 - огромный debug block
   - `console.log` visible в prod
   - Замедляет render

### Рекомендации

```tsx
<div className="flex gap-3 pt-4 border-t">
  {/* Secondary: Preview */}
  <button
    type="button"
    onClick={handlePreview}
    disabled={!canPreview}
    className="px-6 py-3 bg-gray-100"
  >
    <EyeIcon className="w-5 h-5 mr-2" />
    Preview
    <kbd className="ml-2 text-xs">⌘P</kbd>
  </button>
  
  {/* Secondary: Save Draft */}
  {mode === 'create' && hasChanges && (
    <button
      type="button"
      onClick={handleSaveDraft}
      className="px-6 py-3 bg-gray-100"
    >
      <DocumentIcon className="w-5 h-5 mr-2" />
      Save Draft
    </button>
  )}
  
  {/* Primary: Publish */}
  <Tooltip
    content={getDisabledReason()}
    disabled={!isDisabled}
  >
    <button
      type="submit"
      disabled={isDisabled}
      className={cn(
        "flex-1 px-6 py-3",
        "bg-gradient-to-r from-purple-500 to-pink-500",
        "text-white font-medium rounded-xl",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {isCompressing && (
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span>Compressing... {compressionProgress}%</span>
        </div>
      )}
      
      {!isCompressing && isUploading && (
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span>{mode === 'edit' ? 'Saving' : 'Publishing'}...</span>
        </div>
      )}
      
      {!isCompressing && !isUploading && (
        <div className="flex items-center justify-center gap-2">
          <RocketIcon className="w-5 h-5" />
          <span>{mode === 'edit' ? 'Save Changes' : 'Publish'}</span>
          <kbd className="ml-2 text-xs opacity-70">⌘⏎</kbd>
        </div>
      )}
    </button>
  </Tooltip>
  
  {/* Tertiary: Cancel */}
  <button
    type="button"
    onClick={handleCancel}
    className="px-6 py-3 bg-gray-100 hover:bg-gray-200"
  >
    Cancel
    <kbd className="ml-2 text-xs">Esc</kbd>
  </button>
</div>

{/* Cancel Confirmation Dialog */}
{showCancelConfirm && hasUnsavedChanges && (
  <ConfirmDialog
    title="Unsaved changes"
    message="You have unsaved changes. Do you want to save a draft before leaving?"
    actions={[
      { label: 'Save Draft', onClick: handleSaveDraft, variant: 'primary' },
      { label: 'Discard', onClick: handleDiscard, variant: 'danger' },
      { label: 'Keep Editing', onClick: () => setShowCancelConfirm(false) }
    ]}
  />
)}
```

**Score**: 7/10 → можно 9/10

---

## 🔟 IMAGE CROP MODAL

### Текущая реализация (Строки 1983-1997)

```tsx
{showCropModal && originalImage && (
  <ImageCropModal
    image={originalImage}
    onCropComplete={handleCropComplete}
    onCancel={() => {
      setShowCropModal(false)
      setOriginalImage('')
      if (!formData.preview) {
        setFormData(prev => ({ ...prev, file: null }))
      }
    }}
  />
)}
```

### UX Анализ

**✅ Хорошо**:
- Separate modal для cropping
- Cancel option
- Preserves original если уже был preview
- Auto-opens после upload

**🟡 Проблемы**:

1. **No aspect ratio presets visible**:
   - User не видит варианты
   - 1:1, 16:9, 4:5, 9:16 не показаны
   - Нужно разбираться самому

2. **No "Skip Crop" option**:
   - Если image уже правильного размера
   - Пользователь forced to crop
   - Нужна кнопка "Use Original"

3. **Modal blocks main form**:
   - Не видно что происходит за modal
   - Может забыть что делал

### Рекомендации

```tsx
{showCropModal && originalImage && (
  <ImageCropModal
    image={originalImage}
    onCropComplete={handleCropComplete}
    onSkip={() => {
      // Use original without crop
      handleCropComplete(originalImage, null)
    }}
    onCancel={handleCancelCrop}
    presets={[
      { name: 'Square (1:1)', ratio: 1/1, icon: <SquareIcon /> },
      { name: 'Portrait (4:5)', ratio: 4/5, icon: <PortraitIcon /> },
      { name: 'Landscape (16:9)', ratio: 16/9, icon: <LandscapeIcon /> },
      { name: 'Story (9:16)', ratio: 9/16, icon: <StoryIcon /> },
      { name: 'Free', ratio: null, icon: <FreeIcon /> }
    ]}
    defaultPreset="Square (1:1)"
    showOriginalSize={true}
  />
)}
```

**Score**: 7/10 → можно 9/10

---

## 1️⃣1️⃣ PROMPT WARNING MODAL (Sora-2)

### Текущая реализация (Строки 1999-2109)

```tsx
{showPromptWarning && optimizedPromptData && (
  <div className="fixed inset-0 bg-black/85 z-[150]">
    <div className="bg-white rounded-3xl max-w-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full">
            <span>⚠️</span>
          </div>
          <div>
            <h3>Prompt Content Warning</h3>
            <p>Your prompt was modified to comply with our guidelines</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Warning Message */}
        <div className="bg-red-50 p-4">
          <p>{optimizedPromptData.warningMessage}</p>
        </div>
        
        {/* Modified Content Tags */}
        {optimizedPromptData.modifiedContent.map(item => (
          <span className="px-3 py-1 bg-red-100">{item}</span>
        ))}
        
        {/* Original Prompt */}
        <div>
          <p>❌ Ваш оригинальный промпт:</p>
          <div className="bg-gray-100 p-4">
            {optimizedPromptData.originalPrompt}
          </div>
        </div>
        
        {/* Optimized Prompt */}
        <div>
          <p>✅ Исправленный промпт:</p>
          <div className="bg-green-50 p-4">
            {optimizedPromptData.optimizedPrompt}
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-6 bg-gray-50 flex gap-3">
        <button onClick={handleAcceptOptimizedPrompt}>
          Оставить исправленный
        </button>
        <button onClick={handleRejectOptimizedPrompt}>
          Отказаться
        </button>
      </div>
    </div>
  </div>
)}
```

### UX Анализ

**✅ Хорошо**:
- Attention-grabbing design (orange/red)
- Clear explanation что изменено
- Shows both original and optimized
- Two clear actions
- Modified content tags visible

**🟡 Проблемы**:

1. **Appears unexpectedly**:
   - User clicks Publish
   - Suddenly popup
   - Surprising UX

2. **No "Edit" option**:
   - Accept или Reject
   - Но что если хочу сам отредактировать?
   - Need third option: "Let me edit"

3. **Diff not clear**:
   - Original и optimized shown separately
   - Hard to see exact changes
   - Better: side-by-side diff with highlights

4. **Optimization happens too late**:
   - After user clicked Publish
   - Better: check as they type
   - Show warnings earlier

### Рекомендации

**Better Flow**:

```tsx
// Real-time validation during typing
<div className="space-y-2">
  <textarea
    value={soraPrompt}
    onChange={handlePromptChange}
    onBlur={validatePrompt}
  />
  
  {/* Real-time warnings */}
  {promptIssues.length > 0 && (
    <div className="bg-yellow-50 p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <WarningIcon />
        <span className="font-medium">Prompt Issues Detected</span>
      </div>
      <ul className="text-sm space-y-1">
        {promptIssues.map(issue => (
          <li key={issue.id}>
            ⚠️ {issue.message}
            <button onClick={() => fixIssue(issue)}>
              Fix
            </button>
          </li>
        ))}
      </ul>
    </div>
  )}
  
  {/* Optional: Optimize button */}
  <button
    onClick={optimizePrompt}
    disabled={!soraPrompt || hasIssues}
    className="text-sm text-purple-600"
  >
    ✨ Optimize prompt for better results
  </button>
</div>

// If issues found on submit, show better modal:
{showPromptIssues && (
  <Modal>
    <div>
      <h3>🔍 Prompt Issues Found</h3>
      <p>We found some issues that might violate our guidelines or reduce quality:</p>
      
      {/* Side-by-side diff */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4>Original</h4>
          <PromptDiff
            text={originalPrompt}
            highlights={issues}
            variant="original"
          />
        </div>
        <div>
          <h4>Suggested</h4>
          <PromptDiff
            text={optimizedPrompt}
            highlights={fixes}
            variant="optimized"
          />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleUseOptimized} variant="primary">
          ✅ Use Suggested Version
        </button>
        <button onClick={handleEditManually} variant="secondary">
          ✏️ Let Me Edit
        </button>
        <button onClick={handleContinueAnyway} variant="danger">
          ⚠️ Continue Anyway
        </button>
      </div>
    </div>
  </Modal>
)}
```

**Score**: 6/10 → можно 9/10

---

## 📱 MOBILE EXPERIENCE

### Текущие Mobile-specific Classnames

```tsx
// Header
"text-xl sm:text-2xl"  // Smaller on mobile
"w-5 sm:w-6 h-5 sm:h-6"  // Smaller icons

// Modal
"p-0 sm:p-4"  // No padding on mobile
"w-full h-full sm:h-auto sm:max-w-4xl"  // Fullscreen on mobile
"rounded-none sm:rounded-3xl"  // No rounded on mobile
"my-0 sm:my-8"  // No margin on mobile

// Form
"p-3 sm:p-6 lg:p-8"  // Progressive padding
"space-y-4 sm:space-y-6"  // Less spacing on mobile
"mb-4 sm:mb-6"  // Responsive margins

// Grid
"grid grid-cols-1 lg:grid-cols-2"  // Single column on mobile
```

### Mobile UX Issues

**❌ Проблемы**:

1. **Fullscreen takeover**:
   - Modal занимает весь экран
   - No way to dismiss easily
   - Feels trapped

2. **Long scroll**:
   - 2-column → 1 column
   - Очень длинная форма
   - Hard to navigate

3. **Keyboard issues**:
   - Input focused
   - Keyboard appears
   - Blocks half of screen
   - No auto-scroll to field

4. **Touch targets too small**:
   - Некоторые кнопки < 44px
   - Hard to tap accurately
   - Especially tags remove button

5. **No mobile gestures**:
   - Can't swipe to dismiss
   - Can't pull to close
   - No pinch to zoom на image preview

### Mobile UX Recommendations

```tsx
// Use Bottom Sheet instead of Modal on mobile
{isMobile ? (
  <BottomSheet
    isOpen={showCreateModal}
    onClose={onClose}
    snapPoints={[0.9, 0.5]}  // 90% or 50% height
    swipeToClose={true}
  >
    <CreatePostForm ... />
  </BottomSheet>
) : (
  <Modal>
    <CreatePostForm ... />
  </Modal>
)}

// Sticky header on mobile
<div className="sticky top-0 z-10 bg-white border-b">
  <div className="flex items-center justify-between p-4">
    <button onClick={onClose}>
      <ChevronLeftIcon />
      <span>Back</span>
    </button>
    <h2>Create Post</h2>
    <button onClick={handleSaveDraft}>
      Save
    </button>
  </div>
</div>

// Progressive disclosure on mobile
<Accordion defaultOpen={['content']}>
  <AccordionItem value="content" title="Content">
    {/* Type, Upload, Title, Description */}
  </AccordionItem>
  <AccordionItem value="details" title="Details">
    {/* Category, Tags */}
  </AccordionItem>
  <AccordionItem value="access" title="Access & Pricing">
    {/* Access type, Price */}
  </AccordionItem>
</Accordion>

// Touch-friendly sizes
<button className="min-h-[44px] min-w-[44px]">  // Apple HIG
  <XMarkIcon />
</button>

// Auto-scroll when keyboard appears
useEffect(() => {
  if (isMobile && focusedField) {
    scrollToField(focusedField)
  }
}, [focusedField])
```

---

## 🎯 ФИНАЛЬНАЯ ОЦЕНКА ПО СЕКЦИЯМ

| Секция | Текущий | Потенциал | Приоритет |
|--------|---------|-----------|-----------|
| Header | 7/10 | 9/10 | Medium |
| Content Type Selection | 6/10 | 9/10 | 🔴 High |
| File Upload | 7/10 | 9/10 | Medium |
| Sora-2 Generation | 5/10 | 9/10 | 🔴 Critical |
| Category | 7/10 | 9/10 | Low |
| Tags | 6/10 | 9/10 | Medium |
| Title/Description | 7/10 | 9/10 | Medium |
| Access Control | 7/10 | 9.5/10 | 🟡 High |
| Submit Buttons | 7/10 | 9/10 | Medium |
| Image Crop Modal | 7/10 | 9/10 | Low |
| Prompt Warning Modal | 6/10 | 9/10 | Medium |
| Mobile Experience | 6/10 | 9/10 | 🟡 High |

**Средний Score**: **6.6/10**  
**Потенциал**: **9.1/10**  
**Gap**: **+2.5 points**

---

## 🚀 TOP PRIORITY IMPROVEMENTS

### CRITICAL (fix immediately)

1. **Fix Sora-2 Resolution Selector** (30 min)
   - Раскомментировать код
   - Добавить descriptions
   - Current: BROKEN ❌

2. **Add Generations Badge to Sora-2 Button** (1 hour)
   - Show count before click
   - Prevent disappointment
   - Current: Hidden until selected

3. **Multi-step Wizard** (3-4 days)
   - Split into 4 steps
   - Progress indicator
   - Current: Overwhelming

### HIGH PRIORITY

4. **Preview Mode** (1-2 days)
   - Before publish
   - Exact post appearance
   - Current: None

5. **Real-time Validation** (2 days)
   - As user types
   - Inline errors
   - Current: Only on submit

6. **Mobile Bottom Sheet** (2 days)
   - Better mobile UX
   - Swipe to dismiss
   - Current: Fullscreen modal

7. **Access Control Improvements** (1-2 days)
   - Revenue calculator
   - Smart pricing suggestions
   - Tier explanations

---

**Дата анализа**: 16 декабря 2025  
**Аналитик**: AI (Claude Sonnet 4.5)  
**Методология**: M7 Line-by-Line UX Audit  
**Статус**: ✅ Детальный breakdown завершен

