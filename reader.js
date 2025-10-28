/**
 * TypeScript-подобные интерфейсы для типизации (в комментариях)
 * interface ReaderState {
 *   bookContent: string;
 *   pages: Page[];
 *   currentPageIndex: number;
 *   totalPages: number;
 *   isUIVisible: boolean;
 *   isSettingsOpen: boolean;
 *   settings: ReaderSettings;
 * }
 * 
 * interface Page {
 *   id: number;
 *   content: string;
 *   wordCount: number;
 * }
 * 
 * interface ReaderSettings {
 *   theme: 'sepia' | 'gray' | 'dark' | 'auto';
 *   fontSize: number;
 *   lineHeight: number;
 *   textAlign: 'left' | 'justify' | 'center';
 *   brightness: number;
 *   scrollMode: boolean;
 * }
 */

/**
 * Профессиональный ридер в стиле Яндекс.Книг
 * Использует TypeScript-подобную архитектуру и прямой DOM рендеринг
 */
class YandexBooksReader {
    /**
     * @type {ReaderState}
     */
    #state = {
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
            scrollMode: false
        }
    };

    /**
     * @type {Object<string, HTMLElement>}
     */
    #elements = {};

    /**
     * @type {number}
     */
    #wordsPerPage = 280;

    /**
     * @type {string}
     */
    #storageKey = 'yandex-books-reader';

    /**
     * Инициализирует ридер
     */
    constructor() {
        this.#bindDOMElements();
        this.#init();
    }

    /**
     * Привязывает DOM элементы
     * @private
     */
    #bindDOMElements() {
        const elementSelectors = {
            // Основные контейнеры
            loadingOverlay: 'loadingOverlay',
            loadingStatus: 'loadingStatus',
            readerContainer: 'readerContainer',
            
            // Навигация и контроль
            topNavigation: 'topNavigation',
            bottomControls: 'bottomControls',
            readingProgress: 'readingProgress',
            progressFill: 'progressFill',
            
            // Контент
            readingViewport: 'readingViewport',
            pageContent: 'pageContent',
            currentProgress: 'currentProgress',
            readingTime: 'readingTime',
            
            // Кнопки управления
            prevButton: 'prevButton',
            nextButton: 'nextButton',
            settingsButton: 'settingsButton',
            backButton: 'backButton',
            
            // Зоны касания
            leftTouchZone: 'leftTouchZone',
            centerTouchZone: 'centerTouchZone',
            rightTouchZone: 'rightTouchZone',
            
            // Панель настроек
            settingsDrawer: 'settingsDrawer',
            settingsBackdrop: 'settingsBackdrop',
            closeSettingsButton: 'closeSettingsButton',
            
            // Контролы настроек
            brightnessSlider: 'brightnessSlider',
            decreaseFontSize: 'decreaseFontSize',
            increaseFontSize: 'increaseFontSize',
            scrollModeToggle: 'scrollModeToggle'
        };

        Object.entries(elementSelectors).forEach(([key, id]) => {
            const element = document.getElementById(id);
            if (element) {
                this.#elements[key] = element;
            } else {
                console.warn(`⚠️ Element not found: ${id}`);
            }
        });

        console.log(`🔗 DOM elements bound: ${Object.keys(this.#elements).length}`);
    }

    /**
     * Асинхронная инициализация ридера
     * @private
     */
    async #init() {
        try {
            console.log('🚀 Initializing Yandex Books Reader...');
            
            this.#updateLoadingStatus('Загрузка настроек...');
            this.#loadSettings();
            
            this.#updateLoadingStatus('Загрузка текста книги...');
            await this.#loadBookFile();
            
            this.#updateLoadingStatus('Создание страниц...');
            this.#createPages();
            
            this.#updateLoadingStatus('Настройка интерфейса...');
            this.#setupEventHandlers();
            this.#loadProgress();
            
            this.#renderCurrentPage();
            this.#hideLoading();
            this.#showUITemporarily();
            
            console.log('✅ Reader initialized successfully');
            console.log(`📊 Total pages: ${this.#state.totalPages}`);
            console.log(`📝 Words per page: ${this.#wordsPerPage}`);
            
        } catch (error) {
            console.error('❌ Reader initialization failed:', error);
            this.#showError(`Ошибка инициализации: ${error.message}`);
        }
    }

    /**
     * Загружает файл книги
     * @private
     */
    async #loadBookFile() {
        try {
            const response = await fetch('Khadzhi-Girai.txt');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Файл не найден`);
            }
            
            this.#state.bookContent = await response.text();
            
            if (!this.#state.bookContent.trim()) {
                throw new Error('Файл книги пуст');
            }
            
            console.log(`📚 Book loaded: ${this.#state.bookContent.length} characters`);
            
        } catch (error) {
            throw new Error(`Не удалось загрузить книгу: ${error.message}`);
        }
    }

    /**
     * Создает страницы с оптимальной пагинацией
     * @private
     */
    #createPages() {
        console.log('📄 Creating pages...');
        
        // Предварительная обработка текста
        const normalizedText = this.#preprocessText(this.#state.bookContent);
        const paragraphs = this.#splitTextIntoParagraphs(normalizedText);
        
        this.#state.pages = [];
        let currentPageParagraphs = [];
        let currentWordCount = 0;
        
        console.log(`📝 Processing ${paragraphs.length} paragraphs...`);
        
        // Алгоритм разбивки по страницам
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].trim();
            const paragraphWordCount = this.#countWords(paragraph);
            
            // Проверяем, поместится ли параграф на текущую страницу
            if (currentWordCount + paragraphWordCount > this.#wordsPerPage && currentPageParagraphs.length > 0) {
                // Создаем страницу из накопленных параграфов
                this.#addPage(currentPageParagraphs, currentWordCount);
                
                // Начинаем новую страницу с текущего параграфа
                currentPageParagraphs = [paragraph];
                currentWordCount = paragraphWordCount;
            } else {
                // Добавляем параграф к текущей странице
                currentPageParagraphs.push(paragraph);
                currentWordCount += paragraphWordCount;
            }
            
            // Периодическое обновление прогресса
            if (i % 25 === 0) {
                this.#updateLoadingStatus(`Обработано ${i + 1}/${paragraphs.length} параграфов...`);
                await this.#delay(1);
            }
        }
        
        // Добавляем последнюю страницу, если она не пуста
        if (currentPageParagraphs.length > 0) {
            this.#addPage(currentPageParagraphs, currentWordCount);
        }
        
        this.#state.totalPages = this.#state.pages.length;
        
        // Проверка целостности данных
        this.#validatePagination(paragraphs);
        
        console.log(`✅ Pages created: ${this.#state.totalPages}`);
    }

    /**
     * Предварительно обрабатывает текст
     * @param {string} text - Исходный текст
     * @returns {string} Обработанный текст
     * @private
     */
    #preprocessText(text) {
        return text
            .replace(/\r\n/g, '\n')                // Нормализация переносов строк
            .replace(/\n{3,}/g, '\n\n')           // Удаление лишних переносов
            .replace(/\s+$/gm, '')                // Удаление пробелов в конце строк
            .trim();                              // Удаление пробелов в начале и конце
    }

    /**
     * Разбивает текст на параграфы
     * @param {string} text - Обработанный текст
     * @returns {string[]} Массив параграфов
     * @private
     */
    #splitTextIntoParagraphs(text) {
        return text
            .split('\n\n')
            .filter(paragraph => paragraph.trim().length > 0);
    }

    /**
     * Подсчитывает количество слов в тексте
     * @param {string} text - Текст для подсчета
     * @returns {number} Количество слов
     * @private
     */
    #countWords(text) {
        return text
            .split(/\s+/)
            .filter(word => word.length > 0).length;
    }

    /**
     * Добавляет новую страницу
     * @param {string[]} paragraphs - Массив параграфов для страницы
     * @param {number} wordCount - Количество слов на странице
     * @private
     */
    #addPage(paragraphs, wordCount) {
        const formattedContent = this.#formatPageContent(paragraphs);
        
        /** @type {Page} */
        const page = {
            id: this.#state.pages.length,
            content: formattedContent,
            wordCount: wordCount
        };
        
        this.#state.pages.push(page);
    }

    /**
     * Форматирует содержимое страницы в HTML
     * @param {string[]} paragraphs - Массив параграфов
     * @returns {string} HTML-содержимое страницы
     * @private
     */
    #formatPageContent(paragraphs) {
        return paragraphs
            .map(paragraph => this.#formatParagraph(paragraph.trim()))
            .join('');
    }

    /**
     * Форматирует отдельный параграф
     * @param {string} text - Текст параграфа
     * @returns {string} HTML-разметка параграфа
     * @private
     */
    #formatParagraph(text) {
        // Определяем тип контента и возвращаем соответствующую разметку
        if (this.#isMainTitle(text)) {
            return `<h1>${this.#escapeHtml(text)}</h1>`;
        }
        
        if (this.#isAuthor(text)) {
            return `<div class="author">${this.#escapeHtml(text)}</div>`;
        }
        
        if (this.#isChapterTitle(text)) {
            return `<h2>${this.#escapeHtml(text)}</h2>`;
        }
        
        // Обычный параграф
        return `<p>${this.#escapeHtml(text)}</p>`;
    }

    /**
     * Проверяет, является ли текст заголовком книги
     * @param {string} text - Текст для проверки
     * @returns {boolean}
     * @private
     */
    #isMainTitle(text) {
        return text === 'Хаджи-Гирай' || text.includes('Хаджи-Гирай');
    }

    /**
     * Проверяет, является ли текст именем автора
     * @param {string} text - Текст для проверки
     * @returns {boolean}
     * @private
     */
    #isAuthor(text) {
        return text === 'Алим Къуртсеит' || text.includes('Алим Къуртсеит');
    }

    /**
     * Проверяет, является ли текст заголовком главы
     * @param {string} text - Текст для проверки
     * @returns {boolean}
     * @private
     */
    #isChapterTitle(text) {
        return text.length < 80 && (
            text.startsWith('Глава') ||
            text.startsWith('ГЛАВА') ||
            /^[А-ЯЁ\s\-\.]{3,50}$/.test(text) ||
            text === text.toUpperCase()
        );
    }

    /**
     * Экранирует HTML-символы
     * @param {string} text - Исходный текст
     * @returns {string} Экранированный текст
     * @private
     */
    #escapeHtml(text) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        
        return text.replace(/[&<>"']/g, match => escapeMap[match]);
    }

    /**
     * Проверяет целостность пагинации
     * @param {string[]} originalParagraphs - Исходные параграфы
     * @private
     */
    #validatePagination(originalParagraphs) {
        const originalWordCount = originalParagraphs.reduce(
            (total, paragraph) => total + this.#countWords(paragraph), 0
        );
        
        const paginatedWordCount = this.#state.pages.reduce(
            (total, page) => total + page.wordCount, 0
        );
        
        const difference = Math.abs(originalWordCount - paginatedWordCount);
        
        if (difference > 25) {
            console.warn(`⚠️ Potential data loss detected: ${difference} words`);
        } else {
            console.log('✅ Pagination completed without significant data loss');
        }
        
        console.log(`📊 Word count - Original: ${originalWordCount}, Paginated: ${paginatedWordCount}`);
    }

    /**
     * Настраивает обработчики событий
     * @private
     */
    #setupEventHandlers() {
        // Навигация между страницами
        this.#bindNavigationEvents();
        
        // Управление интерфейсом
        this.#bindUIControlEvents();
        
        // Настройки
        this.#bindSettingsEvents();
        
        // Клавиатурные сокращения
        this.#bindKeyboardEvents();
        
        // Жестовое управление
        this.#bindGestureEvents();
        
        console.log('🎮 Event handlers set up');
    }

    /**
     * Привязывает события навигации
     * @private
     */
    #bindNavigationEvents() {
        // Кнопки навигации
        this.#elements.prevButton?.addEventListener('click', () => this.#goToPreviousPage());
        this.#elements.nextButton?.addEventListener('click', () => this.#goToNextPage());
        
        // Зоны касания
        this.#elements.leftTouchZone?.addEventListener('click', () => this.#goToPreviousPage());
        this.#elements.rightTouchZone?.addEventListener('click', () => this.#goToNextPage());
        this.#elements.centerTouchZone?.addEventListener('click', () => this.#toggleUI());
    }

    /**
     * Привязывает события управления интерфейсом
     * @private
     */
    #bindUIControlEvents() {
        this.#elements.settingsButton?.addEventListener('click', () => this.#openSettings());
        this.#elements.backButton?.addEventListener('click', () => this.#handleBackAction());
    }

    /**
     * Привязывает события панели настроек
     * @private
     */
    #bindSettingsEvents() {
        // Закрытие панели настроек
        this.#elements.closeSettingsButton?.addEventListener('click', () => this.#closeSettings());
        this.#elements.settingsBackdrop?.addEventListener('click', () => this.#closeSettings());
        
        // Контроль яркости
        this.#elements.brightnessSlider?.addEventListener('input', (event) => {
            this.#updateBrightness(parseInt(event.target.value));
        });
        
        // Размер шрифта
        this.#elements.decreaseFontSize?.addEventListener('click', () => this.#adjustFontSize(-1));
        this.#elements.increaseFontSize?.addEventListener('click', () => this.#adjustFontSize(1));
        
        // Режим прокрутки
        this.#elements.scrollModeToggle?.addEventListener('change', (event) => {
            this.#toggleScrollMode(event.target.checked);
        });
        
        // Выбор темы
        document.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', () => {
                const theme = button.dataset.theme;
                if (theme) this.#changeTheme(theme);
            });
        });
        
        // Межстрочный интервал
        document.querySelectorAll('.spacing-option').forEach(button => {
            button.addEventListener('click', () => {
                const spacing = parseFloat(button.dataset.spacing);
                if (spacing) this.#changeLineHeight(spacing);
            });
        });
        
        // Выравнивание текста
        document.querySelectorAll('.align-option').forEach(button => {
            button.addEventListener('click', () => {
                const alignment = button.dataset.align;
                if (alignment) this.#changeTextAlignment(alignment);
            });
        });
    }

    /**
     * Привязывает клавиатурные события
     * @private
     */
    #bindKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            // Игнорируем события, если активен input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (event.key) {
                case 'ArrowLeft':
                case 'PageUp':
                case 'h':
                    event.preventDefault();
                    this.#goToPreviousPage();
                    break;
                    
                case 'ArrowRight':
                case 'PageDown':
                case 'l':
                case ' ':
                    event.preventDefault();
                    this.#goToNextPage();
                    break;
                    
                case 'Home':
                case 'g':
                    event.preventDefault();
                    this.#goToPage(0);
                    break;
                    
                case 'End':
                case 'G':
                    event.preventDefault();
                    this.#goToPage(this.#state.totalPages - 1);
                    break;
                    
                case 'j':
                    event.preventDefault();
                    this.#toggleUI();
                    break;
                    
                case 's':
                    event.preventDefault();
                    this.#toggleSettings();
                    break;
                    
                case 'Escape':
                    if (this.#state.isSettingsOpen) {
                        this.#closeSettings();
                    } else if (this.#state.isUIVisible) {
                        this.#hideUI();
                    }
                    break;
            }
        });
    }

    /**
     * Привязывает жестовые события
     * @private
     */
    #bindGestureEvents() {
        let touchStartX = 0;
        let touchStartY = 0;
        const swipeThreshold = 50;
        
        this.#elements.readingViewport?.addEventListener('touchstart', (event) => {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        });
        
        this.#elements.readingViewport?.addEventListener('touchend', (event) => {
            const touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Проверяем горизонтальный свайп
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
                if (deltaX > 0) {
                    this.#goToPreviousPage();
                } else {
                    this.#goToNextPage();
                }
            }
        });
    }

    /**
     * Рендерит текущую страницу (прямой DOM рендеринг)
     * @private
     */
    #renderCurrentPage() {
        const currentPage = this.#state.pages[this.#state.currentPageIndex];
        
        if (!currentPage || !this.#elements.pageContent) {
            console.warn('⚠️ Cannot render page - missing page or content element');
            return;
        }
        
        // Прямое обновление DOM без виртуального DOM
        this.#performDirectDOMUpdate(currentPage.content);
        
        // Обновление состояния интерфейса
        this.#updateInterfaceState();
        
        // Сохранение прогресса
        this.#saveProgress();
    }

    /**
     * Выполняет прямое обновление DOM
     * @param {string} content - HTML-контент страницы
     * @private
     */
    #performDirectDOMUpdate(content) {
        // Плавная анимация смены контента
        this.#elements.pageContent.style.opacity = '0.7';
        this.#elements.pageContent.style.transform = 'translateY(8px)';
        
        requestAnimationFrame(() => {
            // Прямое обновление innerHTML (без виртуального DOM)
            this.#elements.pageContent.innerHTML = content;
            
            // Применение пользовательских настроек к новому контенту
            this.#applyTypographySettings();
            
            // Завершение анимации
            requestAnimationFrame(() => {
                this.#elements.pageContent.style.opacity = '1';
                this.#elements.pageContent.style.transform = 'translateY(0)';
            });
        });
    }

    /**
     * Обновляет состояние интерфейса
     * @private
     */
    #updateInterfaceState() {
        const currentIndex = this.#state.currentPageIndex;
        const totalPages = this.#state.totalPages;
        const progressPercentage = totalPages > 1 ? (currentIndex / (totalPages - 1)) * 100 : 0;
        
        // Обновление индикатора прогресса
        if (this.#elements.progressFill) {
            this.#elements.progressFill.style.width = `${progressPercentage}%`;
        }
        
        // Обновление счетчика страниц (в процентах, как в Яндекс.Книгах)
        if (this.#elements.currentProgress) {
            this.#elements.currentProgress.textContent = Math.round(progressPercentage).toString();
        }
        
        // Обновление времени чтения
        if (this.#elements.readingTime) {
            const remainingPages = totalPages - currentIndex - 1;
            const estimatedMinutes = Math.ceil(remainingPages * (this.#wordsPerPage / 220));
            this.#elements.readingTime.textContent = `${estimatedMinutes} мин`;
        }
        
        // Состояние кнопок навигации
        if (this.#elements.prevButton) {
            this.#elements.prevButton.disabled = currentIndex === 0;
        }
        
        if (this.#elements.nextButton) {
            this.#elements.nextButton.disabled = currentIndex === totalPages - 1;
        }
    }

    /**
     * Переходит к следующей странице
     * @private
     */
    #goToNextPage() {
        if (this.#state.currentPageIndex < this.#state.totalPages - 1) {
            this.#state.currentPageIndex++;
            this.#renderCurrentPage();
            
            console.log(`📖 Next page: ${this.#state.currentPageIndex + 1}/${this.#state.totalPages}`);
        }
    }

    /**
     * Переходит к предыдущей странице
     * @private
     */
    #goToPreviousPage() {
        if (this.#state.currentPageIndex > 0) {
            this.#state.currentPageIndex--;
            this.#renderCurrentPage();
            
            console.log(`📖 Previous page: ${this.#state.currentPageIndex + 1}/${this.#state.totalPages}`);
        }
    }

    /**
     * Переходит к указанной странице
     * @param {number} pageIndex - Индекс страницы (0-based)
     * @private
     */
    #goToPage(pageIndex) {
        const clampedIndex = Math.max(0, Math.min(pageIndex, this.#state.totalPages - 1));
        
        if (clampedIndex !== this.#state.currentPageIndex) {
            this.#state.currentPageIndex = clampedIndex;
            this.#renderCurrentPage();
            
            console.log(`📖 Go to page: ${this.#state.currentPageIndex + 1}/${this.#state.totalPages}`);
        }
    }

    /**
     * Переключает видимость пользовательского интерфейса
     * @private
     */
    #toggleUI() {
        if (this.#state.isUIVisible) {
            this.#hideUI();
        } else {
            this.#showUI();
        }
    }

    /**
     * Показывает пользовательский интерфейс
     * @private
     */
    #showUI() {
        this.#state.isUIVisible = true;
        
        this.#elements.topNavigation?.classList.add('visible');
        this.#elements.bottomControls?.classList.add('visible');
        
        console.log('👁️ UI shown');
    }

    /**
     * Скрывает пользовательский интерфейс
     * @private
     */
    #hideUI() {
        this.#state.isUIVisible = false;
        
        this.#elements.topNavigation?.classList.remove('visible');
        this.#elements.bottomControls?.classList.remove('visible');
        
        console.log('🙈 UI hidden');
    }

    /**
     * Показывает интерфейс временно
     * @private
     */
    #showUITemporarily() {
        this.#showUI();
        
        setTimeout(() => {
            if (!this.#state.isSettingsOpen) {
                this.#hideUI();
            }
        }, 3000);
    }

    /**
     * Переключает состояние панели настроек
     * @private
     */
    #toggleSettings() {
        if (this.#state.isSettingsOpen) {
            this.#closeSettings();
        } else {
            this.#openSettings();
        }
    }

    /**
     * Открывает панель настроек
     * @private
     */
    #openSettings() {
        this.#state.isSettingsOpen = true;
        
        this.#elements.settingsDrawer?.classList.add('visible');
        this.#showUI(); // Показываем UI при открытии настроек
        this.#updateSettingsInterface();
        
        console.log('⚙️ Settings opened');
    }

    /**
     * Закрывает панель настроек
     * @private
     */
    #closeSettings() {
        this.#state.isSettingsOpen = false;
        
        this.#elements.settingsDrawer?.classList.remove('visible');
        
        console.log('⚙️ Settings closed');
    }

    /**
     * Обновляет интерфейс настроек
     * @private
     */
    #updateSettingsInterface() {
        // Яркость
        if (this.#elements.brightnessSlider) {
            this.#elements.brightnessSlider.value = this.#state.settings.brightness.toString();
        }
        
        // Режим прокрутки
        if (this.#elements.scrollModeToggle) {
            this.#elements.scrollModeToggle.checked = this.#state.settings.scrollMode;
        }
        
        // Активная тема
        document.querySelectorAll('.theme-option').forEach(option => {
            const isActive = option.dataset.theme === this.#state.settings.theme;
            option.classList.toggle('active', isActive);
        });
        
        // Межстрочный интервал
        document.querySelectorAll('.spacing-option').forEach(option => {
            const spacing = parseFloat(option.dataset.spacing);
            const isActive = Math.abs(spacing - this.#state.settings.lineHeight) < 0.1;
            option.classList.toggle('active', isActive);
        });
        
        // Выравнивание текста
        document.querySelectorAll('.align-option').forEach(option => {
            const isActive = option.dataset.align === this.#state.settings.textAlign;
            option.classList.toggle('active', isActive);
        });
    }

    /**
     * Изменяет тему оформления
     * @param {string} themeName - Название темы
     * @private
     */
    #changeTheme(themeName) {
        this.#state.settings.theme = themeName;
        document.body.setAttribute('data-theme', themeName);
        this.#saveSettings();
        this.#updateSettingsInterface();
        
        console.log(`🎨 Theme changed to: ${themeName}`);
    }

    /**
     * Обновляет яркость экрана
     * @param {number} brightness - Уровень яркости (30-100)
     * @private
     */
    #updateBrightness(brightness) {
        this.#state.settings.brightness = brightness;
        document.documentElement.style.filter = `brightness(${brightness}%)`;
        this.#saveSettings();
    }

    /**
     * Изменяет размер шрифта
     * @param {number} delta - Изменение размера (-1 или +1)
     * @private
     */
    #adjustFontSize(delta) {
        const newSize = Math.max(14, Math.min(24, this.#state.settings.fontSize + delta));
        
        if (newSize !== this.#state.settings.fontSize) {
            this.#state.settings.fontSize = newSize;
            this.#applyTypographySettings();
            this.#saveSettings();
            
            console.log(`📏 Font size changed to: ${newSize}px`);
        }
    }

    /**
     * Изменяет межстрочный интервал
     * @param {number} lineHeight - Новый межстрочный интервал
     * @private
     */
    #changeLineHeight(lineHeight) {
        this.#state.settings.lineHeight = lineHeight;
        this.#applyTypographySettings();
        this.#saveSettings();
        this.#updateSettingsInterface();
        
        console.log(`📐 Line height changed to: ${lineHeight}`);
    }

    /**
     * Изменяет выравнивание текста
     * @param {string} alignment - Тип выравнивания
     * @private
     */
    #changeTextAlignment(alignment) {
        this.#state.settings.textAlign = alignment;
        this.#applyTypographySettings();
        this.#saveSettings();
        this.#updateSettingsInterface();
        
        console.log(`📄 Text alignment changed to: ${alignment}`);
    }

    /**
     * Переключает режим прокрутки
     * @param {boolean} enabled - Включен ли режим прокрутки
     * @private
     */
    #toggleScrollMode(enabled) {
        this.#state.settings.scrollMode = enabled;
        document.body.classList.toggle('scroll-mode', enabled);
        this.#saveSettings();
        
        console.log(`📜 Scroll mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Применяет настройки типографики
     * @private
     */
    #applyTypographySettings() {
        if (!this.#elements.pageContent) return;
        
        const { fontSize, lineHeight, textAlign } = this.#state.settings;
        
        this.#elements.pageContent.style.fontSize = `${fontSize}px`;
        this.#elements.pageContent.style.lineHeight = lineHeight.toString();
        this.#elements.pageContent.style.textAlign = textAlign;
        
        // Обновляем CSS переменные
        document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);
        document.documentElement.style.setProperty('--line-height-base', lineHeight.toString());
    }

    /**
     * Обрабатывает действие "Назад"
     * @private
     */
    #handleBackAction() {
        // В реальном приложении здесь была бы навигация назад
        console.log('⬅️ Back action');
    }

    /**
     * Сохраняет настройки в localStorage
     * @private
     */
    #saveSettings() {
        try {
            localStorage.setItem(
                `${this.#storageKey}-settings`,
                JSON.stringify(this.#state.settings)
            );
        } catch (error) {
            console.warn('⚠️ Failed to save settings:', error);
        }
    }

    /**
     * Загружает настройки из localStorage
     * @private
     */
    #loadSettings() {
        try {
            const savedSettings = localStorage.getItem(`${this.#storageKey}-settings`);
            
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                Object.assign(this.#state.settings, parsedSettings);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load settings:', error);
        }
        
        this.#applySettings();
    }

    /**
     * Применяет все настройки
     * @private
     */
    #applySettings() {
        // Тема
        document.body.setAttribute('data-theme', this.#state.settings.theme);
        
        // Яркость
        document.documentElement.style.filter = `brightness(${this.#state.settings.brightness}%)`;
        
        // Режим прокрутки
        document.body.classList.toggle('scroll-mode', this.#state.settings.scrollMode);
        
        // Типографика
        this.#applyTypographySettings();
    }

    /**
     * Сохраняет прогресс чтения
     * @private
     */
    #saveProgress() {
        try {
            const progressData = {
                pageIndex: this.#state.currentPageIndex,
                totalPages: this.#state.totalPages,
                timestamp: Date.now()
            };
            
            localStorage.setItem(
                `${this.#storageKey}-progress`,
                JSON.stringify(progressData)
            );
        } catch (error) {
            console.warn('⚠️ Failed to save progress:', error);
        }
    }

    /**
     * Загружает прогресс чтения
     * @private
     */
    #loadProgress() {
        try {
            const savedProgress = localStorage.getItem(`${this.#storageKey}-progress`);
            
            if (savedProgress) {
                const progressData = JSON.parse(savedProgress);
                
                if (progressData.pageIndex < this.#state.totalPages) {
                    this.#state.currentPageIndex = progressData.pageIndex;
                    console.log(`📖 Progress restored: page ${progressData.pageIndex + 1}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load progress:', error);
        }
    }

    /**
     * Обновляет статус загрузки
     * @param {string} message - Сообщение о статусе
     * @private
     */
    #updateLoadingStatus(message) {
        if (this.#elements.loadingStatus) {
            this.#elements.loadingStatus.textContent = message;
        }
        console.log(`🔄 ${message}`);
    }

    /**
     * Скрывает экран загрузки
     * @private
     */
    #hideLoading() {
        this.#elements.loadingOverlay?.classList.add('hidden');
        
        if (this.#elements.readerContainer) {
            this.#elements.readerContainer.style.display = 'flex';
            this.#elements.readerContainer.classList.add('ready');
        }
        
        setTimeout(() => {
            if (this.#elements.loadingOverlay) {
                this.#elements.loadingOverlay.style.display = 'none';
            }
        }, 500);
    }

    /**
     * Показывает ошибку
     * @param {string} message - Сообщение об ошибке
     * @private
     */
    #showError(message) {
        this.#updateLoadingStatus(message);
        console.error(`❌ ${message}`);
        
        // Скрываем спиннер при ошибке
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    /**
     * Утилита для задержки
     * @param {number} ms - Миллисекунды задержки
     * @returns {Promise<void>}
     * @private
     */
    #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Система синхронизации состояния (заглушка для демонстрации архитектуры)
 */
class StateSync {
    /**
     * Синхронизирует состояние между устройствами
     * @param {Object} state - Состояние для синхронизации
     * @static
     */
    static async syncState(state) {
        // В реальном приложении здесь была бы отправка данных на сервер
        console.log('🔄 State sync:', {
            page: state.currentPageIndex,
            settings: state.settings,
            timestamp: Date.now()
        });
    }
}

/**
 * Инициализация приложения при загрузке DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 DOM loaded, initializing reader...');
    
    try {
        // Создаем глобальный экземпляр ридера
        window.yandexBooksReader = new YandexBooksReader();
        
        // Периодическая синхронизация состояния (демонстрация)
        setInterval(() => {
            if (window.yandexBooksReader) {
                StateSync.syncState(window.yandexBooksReader._state);
            }
        }, 30000); // Каждые 30 секунд
        
    } catch (error) {
        console.error('💥 Critical initialization error:', error);
        
        // Показываем пользовательский экран ошибки
        document.body.innerHTML = `
            <div style="
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                background: #000; 
                color: #fff; 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <h1 style="font-size: 24px; margin-bottom: 16px;">Ошибка инициализации</h1>
                    <p style="margin-bottom: 24px; opacity: 0.8;">${error.message}</p>
                    <button 
                        onclick="location.reload()" 
                        style="
                            padding: 12px 24px; 
                            background: #007aff; 
                            color: white; 
                            border: none; 
                            border-radius: 8px; 
                            cursor: pointer; 
                            font-size: 16px;
                        "
                    >
                        Перезагрузить
                    </button>
                </div>
            </div>
        `;
    }
});
