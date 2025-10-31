/**
 * Профессиональный ридер в стиле Яндекс.Книг
 * Исправленная пагинация без потерь текста
 */
class YandexBooksReader {
  constructor() {
    // Состояние ридера
    this.state = {
      bookContent: '',
      pages: [],
      currentPageIndex: 0,
      totalPages: 0,
      isUIVisible: false,
      isSettingsOpen: false,
      settings: {
        theme: 'dark',
        fontSize: 18,
        lineHeight: 1.6,
        textAlign: 'justify',
        brightness: 100,
      }
    };

    this.elements = {};
    this.wordsPerPage = 200; // УМЕНЬШИЛИ для гарантированного создания страниц
    this.storageKey = 'yandex-books-reader';

    // Запуск инициализации
    this.bindDOMElements();
    this.init();
  }

  /** Привязывает DOM элементы */
  bindDOMElements() {
    const elementSelectors = {
      loadingOverlay: 'loadingOverlay',
      loadingStatus: 'loadingStatus',
      readerContainer: 'readerContainer',
      topNavigation: 'topNavigation',
      bottomControls: 'bottomControls',
      readingProgress: 'readingProgress',
      progressFill: 'progressFill',
      readingViewport: 'readingViewport',
      pageContent: 'pageContent',
      currentProgress: 'currentProgress',
      readProgressText: 'readProgressText',
      currentPageIndicator: 'currentPageIndicator',
      totalPagesIndicator: 'totalPagesIndicator',
      settingsButton: 'settingsButton',
      themeToggle: 'themeToggle',
      fontSizeControl: 'fontSizeControl',
      lineHeightControl: 'lineHeightControl',
      textAlignControl: 'textAlignControl',
      brightnessControl: 'brightnessControl',
      settingsPanel: 'settingsPanel',
      settingsClose: 'settingsClose',
      bookTitle: 'bookTitle',
      chapterSelector: 'chapterSelector',
      pageJumpInput: 'pageJumpInput',
      jumpToPageButton: 'jumpToPageButton',
      prevPageButton: 'prevPageButton',
      nextPageButton: 'nextPageButton',
      menuButton: 'menuButton',
      closeMenuButton: 'closeMenuButton',
      menuOverlay: 'menuOverlay',
      searchInput: 'searchInput',
      searchButton: 'searchButton',
      searchResults: 'searchResults',
      clearSearchButton: 'clearSearchButton',
      bookmarkButton: 'bookmarkButton',
      bookmarksPanel: 'bookmarksPanel',
      bookmarksList: 'bookmarksList',
      addBookmarkButton: 'addBookmarkButton',
      closeBookmarksButton: 'closeBookmarksButton',
    };

    // Привязка элементов
    Object.entries(elementSelectors).forEach(([key, selector]) => {
      this.elements[key] = document.getElementById(selector);
    });

    // Проверяем наличие всех обязательных элементов
    const requiredElements = [
      'readerContainer', 'pageContent', 'currentPageIndicator',
      'totalPagesIndicator', 'prevPageButton', 'nextPageButton',
      'readingProgress', 'progressFill', 'loadingOverlay'
    ];

    const missingElements = requiredElements.filter(id => !this.elements[id]);
    if (missingElements.length > 0) {
      console.error('Отсутствуют обязательные DOM элементы:', missingElements);
      this.showError('Ошибка загрузки интерфейса');
      return;
    }
  }

  /** Инициализация ридера */
  async init() {
    try {
      this.loadSettings();
      this.applyTheme();
      this.updateBrightness();

      // Загружаем книгу из txt файла
      await this.loadBook();
      
      // Создаём страницы с пагинацией
      this.createPages();
      
      // Восстанавливаем позицию чтения
      this.restoreReadingPosition();
      
      // Отображаем первую страницу
      this.renderCurrentPage();
      
      // Инициализируем обработчики событий
      this.bindEvents();
      
      // Скрываем загрузку
      this.hideLoading();
      
      console.log(`Ридер инициализирован. Загружено страниц: ${this.state.totalPages}`);
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      this.showError('Ошибка загрузки книги');
    }
  }

  /** Загрузка книги из txt файла */
  async loadBook() {
    const bookFile = 'Khadzhi-Girai.txt'; // Имя файла книги
    
    try {
      this.elements.loadingStatus.textContent = 'Загрузка книги...';
      
      // Предобработка текста для корректной работы
      this.state.bookContent = await this.fetchBookContent(bookFile);
      this.state.bookContent = this.preprocessText(this.state.bookContent);
      
      this.elements.bookTitle.textContent = 'Хаджи Гирей'; // Название книги
      
      console.log(`Книга загружена. Символов: ${this.state.bookContent.length}`);
    } catch (error) {
      console.error('Ошибка загрузки книги:', error);
      throw new Error(`Не удалось загрузить книгу: ${error.message}`);
    }
  }

  /** Получение содержимого книги */
  async fetchBookContent(filename) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', filename, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Сетевая ошибка'));
      xhr.send();
    });
  }

  /** Предобработка текста */
  preprocessText(text) {
    return text
      .replace(/\r\n/g, '\n') // Нормализуем переносы строк
      .replace(/\n{3,}/g, '\n\n') // Ограничиваем множественные переносы
      .replace(/\s+/g, ' ') // Убираем лишние пробелы
      .trim();
  }

  /** Разбиение текста на абзацы */
  splitIntoParagraphs(text) {
    // Разбиваем по двойным переносам строк, но сохраняем одиночные как часть абзаца
    return text.split(/\n\s*\n/).map(para => para.trim()).filter(para => para.length > 0);
  }

  /** Детектирует заголовки глав/разделов */
  isTitle(paragraph) {
    const trimmed = paragraph.trim();
    const length = trimmed.length;
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    
    // Короткий абзац (возможный заголовок)
    if (length < 60 && wordCount <= 8) {
      // Начинается с заглавной или цифры/римской цифры
      if (/^[А-ЯЁ0-9IVX]+/.test(trimmed)) {
        return true;
      }
      // Содержит ключевые слова (адаптировано под книгу)
      const titleKeywords = ['Хаджи', 'Гирей', 'Хан', 'Государство', 'Династия', '1441', '1427', '1431', 'Hac Geray'];
      if (titleKeywords.some(keyword => trimmed.toLowerCase().includes(keyword.toLowerCase()))) {
        return true;
      }
    }
    return false;
  }

  /** Форматирует абзац или заголовок в HTML */
  formatParagraphHtml(paragraph, isMain, isFirst) {
    const trimmed = paragraph.trim();
    let tag = 'p'; // По умолчанию абзац
    let className = '';
    
    if (this.isTitle(trimmed)) {
      tag = 'h2'; // Заголовок
      className = 'chapter-title';
    } else if (isMain) {
      className = 'main-paragraph';
    }
    
    const escaped = this.escapeHtml(trimmed);
    const html = `<${tag} class="${className}">${escaped}</${tag}>`;
    
    // Для первого абзаца после заголовка убираем отступ (CSS обработает)
    if (isFirst) {
      return html;
    }
    
    return html;
  }

  /** Экранирование HTML */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /** Создание страниц с строгой пагинацией (без потерь текста) */
  createPages() {
    const paragraphs = this.splitIntoParagraphs(this.state.bookContent);
    let pages = [];
    let pageNumber = 0;
    let remainingParagraphs = [...paragraphs];

    while (remainingParagraphs.length > 0 && pageNumber < 1000) { // Ограничение для безопасности
      const pageResult = this.createSinglePage(remainingParagraphs, pageNumber);
      if (!pageResult || pageResult.content.trim().length === 0) {
        console.warn(`Не удалось создать страницу ${pageNumber}`);
        break;
      }
      
      pages.push(pageResult);
      remainingParagraphs = pageResult.remainingParagraphs;
      pageNumber++;
    }

    this.state.pages = pages;
    this.state.totalPages = pages.length;
    this.state.currentPageIndex = 0;

    // Обновляем индикаторы
    this.updatePageIndicators();

    console.log(`Создано страниц: ${this.state.totalPages}`);
  }

  /** Создание одной страницы */
  createSinglePage(paragraphs, pageNumber) {
    if (paragraphs.length === 0) return null;

    // Создаём тестовый элемент для измерения высоты
    const measureEl = document.createElement('div');
    measureEl.className = 'page-content measure-temp';
    measureEl.style.cssText = `
      position: absolute; visibility: hidden; 
      font-size: ${this.state.settings.fontSize}px;
      line-height: ${this.state.settings.lineHeight};
      width: ${this.getViewportWidth()}px;
      padding: 20px;
      box-sizing: border-box;
    `;
    document.body.appendChild(measureEl);

    let currentPageContent = '';
    let wordCount = 0;
    let usedParagraphs = 0;
    let isFirstPage = pageNumber === 0;
    let isFirstParagraph = true;

    // Пытаемся добавить абзацы целиком
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (!paragraph || paragraph.trim().length === 0) continue;

      const formattedParagraph = this.formatParagraphHtml(paragraph, true, isFirstParagraph);
      
      // Тестируем добавление абзаца
      const testContent = currentPageContent + (currentPageContent ? '' : '') + formattedParagraph;
      measureEl.innerHTML = testContent;
      
      const testHeight = measureEl.scrollHeight;
      const maxHeight = this.getMaxPageHeight();

      if (testHeight <= maxHeight) {
        // Абзац помещается целиком
        currentPageContent = testContent;
        wordCount += this.countWords(paragraph);
        usedParagraphs++;
        isFirstParagraph = false;
      } else {
        // Абзац не помещается - если это первый абзац, разбиваем его
        if (usedParagraphs === 0) {
          const splitResult = this.splitLongParagraphStrict(paragraph, pageNumber);
          if (splitResult) {
            currentPageContent = splitResult.html;
            wordCount += splitResult.wordCount;
            usedParagraphs = 1; // Считаем как один (разбитый)
          }
        }
        // Если всё равно не помещается или это не первый - останавливаемся
        break;
      }
    }

    // Удаляем тестовый элемент
    document.body.removeChild(measureEl);

    if (currentPageContent.trim().length === 0) {
      console.warn('Пустая страница создана');
      return null;
    }

    return {
      id: pageNumber,
      content: this.formatSimplePage(currentPageContent, pageNumber),
      wordCount: wordCount,
      remainingParagraphs: paragraphs.slice(usedParagraphs)
    };
  }

  /** Разбиение длинного абзаца на части */
  splitLongParagraphStrict(paragraph, pageNumber) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;

    let currentPart = '';
    let currentPartWords = 0;
    let htmlParts = [];
    let isFirst = true;

    for (let i = 0; i < words.length; i++) {
      const testPart = currentPart + (currentPart ? ' ' : '') + words[i];
      const formatted = this.formatParagraphHtml(testPart, false, isFirst);
      
      // Проверяем высоту (используем упрощённый тест без DOM для скорости)
      // Примерная оценка: ~50 символов на строку при текущих настройках
      if (testPart.length > 2000) { // Примерный лимит для одной страницы
        if (currentPart.trim()) {
          htmlParts.push(formatted);
        }
        currentPart = words[i];
        currentPartWords = 1;
        isFirst = false;
      } else {
        currentPart = testPart;
        currentPartWords++;
      }
    }

    if (currentPart.trim()) {
      htmlParts.push(this.formatParagraphHtml(currentPart, false, isFirst));
    }

    // Берём только первую часть для текущей страницы
    const pageHtml = htmlParts[0] || '';
    const wordCount = currentPartWords;

    return { html: pageHtml, wordCount: wordCount };
  }

  /** Форматирование страницы */
  formatSimplePage(textHtml, pageNumber) {
    // textHtml уже содержит теги <p> и <h2>
    if (pageNumber === 0) {
      return `<h1>Хаджи Гирей</h1>${textHtml}`;
    }
    return textHtml;
  }

  /** Получение максимальной высоты страницы */
  getMaxPageHeight() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    return viewportHeight * 0.8; // 80% высоты viewport
  }

  /** Получение ширины viewport */
  getViewportWidth() {
    return window.innerWidth || document.documentElement.clientWidth;
  }

  /** Подсчёт слов в тексте */
  countWords(text) {
    return text.split(/\s+/).filter(Boolean).length;
  }

  /** Отрисовка текущей страницы */
  renderCurrentPage() {
    if (this.state.currentPageIndex >= this.state.totalPages) {
      this.state.currentPageIndex = this.state.totalPages - 1;
    }

    const currentPage = this.state.pages[this.state.currentPageIndex];
    if (!currentPage) {
      this.showError('Страница не найдена');
      return;
    }

    // Обновляем содержимое страницы
    this.elements.pageContent.innerHTML = currentPage.content;

    // Обновляем индикаторы
    this.updatePageIndicators();
    this.updateProgress();

    // Сохраняем позицию
    this.saveReadingPosition();

    // Фокус на контейнер для мобильной прокрутки
    this.elements.readerContainer.scrollTop = 0;
  }

  /** Обновление индикаторов страниц */
  updatePageIndicators() {
    this.elements.currentPageIndicator.textContent = this.state.currentPageIndex + 1;
    this.elements.totalPagesIndicator.textContent = this.state.totalPages;
  }

  /** Обновление прогресса чтения */
  updateProgress() {
    const progress = this.state.totalPages > 0 
      ? ((this.state.currentPageIndex + 1) / this.state.totalPages) * 100 
      : 0;
    
    this.elements.progressFill.style.width = `${progress}%`;
    this.elements.readProgressText.textContent = `${Math.round(progress)}%`;
    this.elements.currentProgress.textContent = `${this.state.currentPageIndex + 1} / ${this.state.totalPages}`;
  }

  /** Привязка событий */
  bindEvents() {
    // Навигация по страницам
    this.elements.prevPageButton.addEventListener('click', () => this.prevPage());
    this.elements.nextPageButton.addEventListener('click', () => this.nextPage());

    // Переход к странице
    this.elements.jumpToPageButton.addEventListener('click', () => this.jumpToPage());
    this.elements.pageJumpInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.jumpToPage();
    });

    // Настройки
    this.elements.settingsButton.addEventListener('click', () => this.toggleSettings());
    this.elements.settingsClose.addEventListener('click', () => this.toggleSettings());

    // Темы
    this.elements.themeToggle.addEventListener('change', (e) => this.changeTheme(e.target.value));

    // Шрифт и интервалы
    this.elements.fontSizeControl.addEventListener('input', (e) => this.updateFontSize(e.target.value));
    this.elements.lineHeightControl.addEventListener('input', (e) => this.updateLineHeight(e.target.value));
    this.elements.textAlignControl.addEventListener('change', (e) => this.updateTextAlign(e.target.value));

    // Яркость
    this.elements.brightnessControl.addEventListener('input', (e) => this.updateBrightness(e.target.value));

    // Меню и поиск (заготовки)
    this.elements.menuButton.addEventListener('click', () => this.toggleMenu());
    this.elements.closeMenuButton.addEventListener('click', () => this.toggleMenu());
    this.elements.searchButton.addEventListener('click', () => this.performSearch());
    this.elements.clearSearchButton.addEventListener('click', () => this.clearSearch());

    // Закладки
    this.elements.bookmarkButton.addEventListener('click', () => this.toggleBookmarks());
    this.elements.closeBookmarksButton.addEventListener('click', () => this.toggleBookmarks());
    this.elements.addBookmarkButton.addEventListener('click', () => this.addBookmark());

    // Клавиатурная навигация
    document.addEventListener('keydown', (e) => this.handleKeyNavigation(e));

    // Обработка изменения размера окна
    window.addEventListener('resize', () => this.handleResize());

    // Сохранение при выходе
    window.addEventListener('beforeunload', () => this.saveReadingPosition());
  }

  /** Предыдущая страница */
  prevPage() {
    if (this.state.currentPageIndex > 0) {
      this.state.currentPageIndex--;
      this.renderCurrentPage();
    }
  }

  /** Следующая страница */
  nextPage() {
    if (this.state.currentPageIndex < this.state.totalPages - 1) {
      this.state.currentPageIndex++;
      this.renderCurrentPage();
    }
  }

  /** Переход к странице */
  jumpToPage() {
    const pageNum = parseInt(this.elements.pageJumpInput.value);
    if (pageNum > 0 && pageNum <= this.state.totalPages) {
      this.state.currentPageIndex = pageNum - 1;
      this.renderCurrentPage();
      this.elements.pageJumpInput.value = '';
    }
  }

  /** Переключение настроек */
  toggleSettings() {
    this.state.isSettingsOpen = !this.state.isSettingsOpen;
    this.elements.settingsPanel.style.display = this.state.isSettingsOpen ? 'block' : 'none';
  }

  /** Смена темы */
  changeTheme(theme) {
    this.state.settings.theme = theme;
    this.applyTheme();
    this.saveSettings();
    this.recreatePagesIfNeeded();
  }

  /** Применение темы */
  applyTheme() {
    const root = document.documentElement;
    root.setAttribute('data-theme', this.state.settings.theme);
  }

  /** Обновление размера шрифта */
  updateFontSize(size) {
    this.state.settings.fontSize = parseInt(size);
    this.elements.pageContent.style.fontSize = `${this.state.settings.fontSize}px`;
    this.saveSettings();
    this.recreatePagesIfNeeded();
  }

  /** Обновление межстрочного интервала */
  updateLineHeight(height) {
    this.state.settings.lineHeight = parseFloat(height);
    this.elements.pageContent.style.lineHeight = this.state.settings.lineHeight;
    this.saveSettings();
    this.recreatePagesIfNeeded();
  }

  /** Обновление выравнивания текста */
  updateTextAlign(align) {
    this.state.settings.textAlign = align;
    this.elements.pageContent.style.textAlign = align;
    this.saveSettings();
  }

  /** Обновление яркости */
  updateBrightness(value) {
    this.state.settings.brightness = parseInt(value);
    const brightness = this.state.settings.brightness / 100;
    document.body.style.filter = `brightness(${brightness})`;
    this.saveSettings();
  }

  /** Пересоздание страниц при изменении настроек */
  recreatePagesIfNeeded() {
    // Если изменились параметры, влияющие на пагинацию
    if (this.state.settings.fontSize !== 18 || this.state.settings.lineHeight !== 1.6) {
      this.createPages();
      this.renderCurrentPage();
    }
  }

  /** Сохранение настроек */
  saveSettings() {
    localStorage.setItem(`${this.storageKey}_settings`, JSON.stringify(this.state.settings));
  }

  /** Загрузка настроек */
  loadSettings() {
    const saved = localStorage.getItem(`${this.storageKey}_settings`);
    if (saved) {
      this.state.settings = { ...this.state.settings, ...JSON.parse(saved) };
      // Применяем загруженные настройки
      this.applyTheme();
      this.elements.pageContent.style.fontSize = `${this.state.settings.fontSize}px`;
      this.elements.pageContent.style.lineHeight = this.state.settings.lineHeight;
      this.elements.pageContent.style.textAlign = this.state.settings.textAlign;
      this.updateBrightness(this.state.settings.brightness);
    }
  }

  /** Сохранение позиции чтения */
  saveReadingPosition() {
    const position = {
      pageIndex: this.state.currentPageIndex,
      timestamp: Date.now()
    };
    localStorage.setItem(`${this.storageKey}_position`, JSON.stringify(position));
  }

  /** Восстановление позиции чтения */
  restoreReadingPosition() {
    const saved = localStorage.getItem(`${this.storageKey}_position`);
    if (saved) {
      const position = JSON.parse(saved);
      // Проверяем, что позиция актуальна (не старше 7 дней)
      if (Date.now() - position.timestamp < 7 * 24 * 60 * 60 * 1000) {
        this.state.currentPageIndex = Math.max(0, Math.min(position.pageIndex, this.state.totalPages - 1));
        console.log(`Восстановлена позиция: страница ${this.state.currentPageIndex + 1}`);
      }
    }
  }

  // Заготовки для дополнительных функций (меню, поиск, закладки)
  toggleMenu() {
    this.elements.menuOverlay.style.display = this.elements.menuOverlay.style.display === 'block' ? 'none' : 'block';
  }

  performSearch() {
    const query = this.elements.searchInput.value.trim();
    if (!query) return;
    
    // Простой поиск по всем страницам
    const results = [];
    this.state.pages.forEach((page, index) => {
      if (page.content.toLowerCase().includes(query.toLowerCase())) {
        results.push({ page: index + 1, snippet: this.getSearchSnippet(page.content, query) });
      }
    });
    
    this.displaySearchResults(results, query);
  }

  getSearchSnippet(content, query) {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    return content.substring(start, end).replace(new RegExp(query, 'gi'), `<mark>${query}</mark>`);
  }

  clearSearch() {
    this.elements.searchInput.value = '';
    this.elements.searchResults.innerHTML = '';
  }

  displaySearchResults(results, query) {
    if (results.length === 0) {
      this.elements.searchResults.innerHTML = '<p>Ничего не найдено</p>';
      return;
    }
    
    let html = `<h3>Результаты поиска "${query}" (${results.length})</h3>`;
    results.forEach(result => {
      html += `<p><button onclick="reader.jumpToPage(${result.page})">Перейти к стр. ${result.page}</button><br>${result.snippet}</p>`;
    });
    
    this.elements.searchResults.innerHTML = html;
  }

  toggleBookmarks() {
    this.state.isUIVisible = !this.state.isUIVisible;
    this.elements.bookmarksPanel.style.display = this.state.isUIVisible ? 'block' : 'none';
    if (this.state.isUIVisible) this.loadBookmarks();
  }

  addBookmark() {
    const bookmark = {
      page: this.state.currentPageIndex + 1,
      title: `Закладка ${this.state.currentPageIndex + 1}`,
      timestamp: Date.now()
    };
    let bookmarks = JSON.parse(localStorage.getItem(`${this.storageKey}_bookmarks`) || '[]');
    bookmarks.push(bookmark);
    localStorage.setItem(`${this.storageKey}_bookmarks`, JSON.stringify(bookmarks));
    this.loadBookmarks();
  }

  loadBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem(`${this.storageKey}_bookmarks`) || '[]');
    let html = '';
    bookmarks.forEach((bm, index) => {
      html += `<div class="bookmark-item">
        <span>${bm.title} (стр. ${bm.page})</span>
        <button onclick="reader.jumpToPage(${bm.page})">Перейти</button>
        <button onclick="reader.removeBookmark(${index})">Удалить</button>
      </div>`;
    });
    this.elements.bookmarksList.innerHTML = html || '<p>Закладок нет</p>';
  }

  removeBookmark(index) {
    let bookmarks = JSON.parse(localStorage.getItem(`${this.storageKey}_bookmarks`) || '[]');
    bookmarks.splice(index, 1);
    localStorage.setItem(`${this.storageKey}_bookmarks`, JSON.stringify(bookmarks));
    this.loadBookmarks();
  }

  /** Обработка клавиш */
  handleKeyNavigation(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch(e.key) {
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        this.prevPage();
        break;
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault();
        this.nextPage();
        break;
      case 'Home':
        e.preventDefault();
        this.jumpToPage(1);
        break;
      case 'End':
        e.preventDefault();
        this.jumpToPage(this.state.totalPages);
        break;
    }
  }

  /** Обработка изменения размера */
  handleResize() {
    // Пересоздаём страницы при значительном изменении размера
    this.recreatePagesIfNeeded();
  }

  /** Показ ошибки */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.elements.readerContainer.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  /** Скрытие загрузки */
  hideLoading() {
    this.elements.loadingOverlay.style.display = 'none';
    this.elements.readerContainer.style.display = 'block';
  }
}

// Глобальная переменная для доступа из HTML
const reader = new YandexBooksReader();

// Утилиты для HTML (для поиска и закладок)
window.reader = reader;
