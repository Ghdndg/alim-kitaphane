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
                scrollMode: false
            }
        };

        this.elements = {};
        this.wordsPerPage = 200; // УМЕНЬШИЛИ для гарантированного создания страниц
        this.storageKey = 'yandex-books-reader';
        
        // Запуск инициализации
        this.bindDOMElements();
        this.init();
    }

    /**
     * Привязывает DOM элементы
     */
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
            readingTime: 'readingTime',
            prevButton: 'prevButton',
            nextButton: 'nextButton',
            settingsButton: 'settingsButton',
            backButton: 'backButton',
            leftTouchZone: 'leftTouchZone',
            centerTouchZone: 'centerTouchZone',
            rightTouchZone: 'rightTouchZone',
            settingsDrawer: 'settingsDrawer',
            settingsBackdrop: 'settingsBackdrop',
            closeSettingsButton: 'closeSettingsButton',
            brightnessSlider: 'brightnessSlider',
            decreaseFontSize: 'decreaseFontSize',
            increaseFontSize: 'increaseFontSize',
            scrollModeToggle: 'scrollModeToggle'
        };

        Object.entries(elementSelectors).forEach(([key, id]) => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[key] = element;
                console.log(`✅ Found element: ${id}`);
            } else {
                console.warn(`⚠️ Element not found: ${id}`);
            }
        });

        console.log(`🔗 DOM elements bound: ${Object.keys(this.elements).length}`);
    }

    /**
     * Асинхронная инициализация ридера
     */
    async init() {
        try {
            console.log('🚀 Initializing Yandex Books Reader...');
            
            this.updateLoadingStatus('Загрузка настроек...');
            this.loadSettings();
            
            this.updateLoadingStatus('Загрузка текста книги...');
            await this.loadBookFile();
            
            this.updateLoadingStatus('Создание страниц...');
            this.createPages();
            
            this.updateLoadingStatus('Настройка интерфейса...');
            this.setupEventHandlers();
            this.loadProgress();
            
            this.renderCurrentPage();
            this.hideLoading();
            this.showUITemporarily();
            
            console.log('✅ Reader initialized successfully');
            console.log(`📊 Total pages: ${this.state.totalPages}`);
            
        } catch (error) {
            console.error('❌ Reader initialization failed:', error);
            this.showError(`Ошибка инициализации: ${error.message}`);
        }
    }

    /**
     * Загружает файл книги
     */
    async loadBookFile() {
        try {
            console.log('📚 Loading Khadzhi-Girai.txt...');
            
            const response = await fetch('Khadzhi-Girai.txt');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Файл не найден`);
            }
            
            this.state.bookContent = await response.text();
            
            if (!this.state.bookContent.trim()) {
                throw new Error('Файл книги пуст');
            }
            
            console.log(`📚 Book loaded: ${this.state.bookContent.length} characters`);
            
        } catch (error) {
            throw new Error(`Не удалось загрузить книгу: ${error.message}`);
        }
    }

    /**
     * ИСПРАВЛЕННОЕ создание страниц
     */
    createPages() {
        console.log('📄 Creating pages...');
        
        // Предобработка текста
        const normalizedText = this.preprocessText(this.state.bookContent);
        console.log(`📝 Normalized text length: ${normalizedText.length}`);
        
        // Простое разделение на куски по словам
        const allWords = normalizedText.split(/\s+/).filter(word => word.trim().length > 0);
        console.log(`📝 Total words in book: ${allWords.length}`);
        
        this.state.pages = [];
        
        // НОВЫЙ АЛГОРИТМ: Разбиваем по фиксированному количеству слов
        for (let i = 0; i < allWords.length; i += this.wordsPerPage) {
            const pageWords = allWords.slice(i, i + this.wordsPerPage);
            const pageText = pageWords.join(' ');
            
            // Форматируем страницу
            const formattedContent = this.formatSimplePage(pageText, i);
            
            this.state.pages.push({
                id: this.state.pages.length,
                content: formattedContent,
                wordCount: pageWords.length
            });
            
            console.log(`📄 Created page ${this.state.pages.length}: ${pageWords.length} words`);
        }
        
        this.state.totalPages = this.state.pages.length;
        
        console.log(`✅ PAGES CREATED: ${this.state.totalPages} pages total`);
        console.log(`📊 Average words per page: ${this.wordsPerPage}`);
        
        // Проверяем что создались страницы
        if (this.state.totalPages <= 1) {
            console.error('❌ CRITICAL: Only 1 page created! This will break navigation!');
            
            // Принудительно создаем больше страниц
            this.createMorePages(normalizedText);
        }
    }

    /**
     * Принудительное создание дополнительных страниц
     */
    createMorePages(text) {
        console.log('🔧 Force creating more pages...');
        
        // Еще более мелкое разделение
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        console.log(`📝 Found ${sentences.length} sentences`);
        
        this.state.pages = [];
        const sentencesPerPage = Math.max(3, Math.floor(sentences.length / 50)); // Минимум 50 страниц
        
        for (let i = 0; i < sentences.length; i += sentencesPerPage) {
            const pageSentences = sentences.slice(i, i + sentencesPerPage);
            const pageText = pageSentences.join('. ').trim() + '.';
            
            this.state.pages.push({
                id: this.state.pages.length,
                content: `<p>${this.escapeHtml(pageText)}</p>`,
                wordCount: this.countWords(pageText)
            });
        }
        
        this.state.totalPages = this.state.pages.length;
        console.log(`✅ FORCE CREATED: ${this.state.totalPages} pages`);
    }

    /**
     * Форматирует простую страницу
     */
    formatSimplePage(text, startIndex) {
        // Добавляем заголовок только на первую страницу
        if (startIndex === 0) {
            return `
                <h1>Хаджи-Гирай</h1>
                <div class="author">Алим Къуртсеит</div>
                <p>${this.escapeHtml(text)}</p>
            `;
        }
        
        return `<p>${this.escapeHtml(text)}</p>`;
    }

    /**
     * Предварительно обрабатывает текст
     */
    preprocessText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s+/g, ' ') // Заменяем все пробелы на одинарные
            .trim();
    }

    /**
     * Подсчитывает количество слов в тексте
     */
    countWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * ИСПРАВЛЕННОЕ экранирование HTML-символов
     */
    escapeHtml(text) {
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
     * Настраивает обработчики событий
     */
    setupEventHandlers() {
        console.log('🎮 Setting up event handlers...');
        
        this.bindNavigationEvents();
        this.bindUIControlEvents();
        this.bindSettingsEvents();
        this.bindKeyboardEvents();
        this.bindGestureEvents();
        
        console.log('✅ Event handlers set up');
    }

    /**
     * Привязывает события навигации
     */
    bindNavigationEvents() {
        // Кнопки навигации
        if (this.elements.prevButton) {
            this.elements.prevButton.addEventListener('click', () => {
                console.log('🔄 Previous button clicked');
                this.goToPreviousPage();
            });
        }
        
        if (this.elements.nextButton) {
            this.elements.nextButton.addEventListener('click', () => {
                console.log('🔄 Next button clicked');
                this.goToNextPage();
            });
        }
        
        // Зоны касания
        if (this.elements.leftTouchZone) {
            this.elements.leftTouchZone.addEventListener('click', () => {
                console.log('🔄 Left zone clicked');
                this.goToPreviousPage();
            });
        }
        
        if (this.elements.rightTouchZone) {
            this.elements.rightTouchZone.addEventListener('click', () => {
                console.log('🔄 Right zone clicked');
                this.goToNextPage();
            });
        }
        
        if (this.elements.centerTouchZone) {
            this.elements.centerTouchZone.addEventListener('click', () => {
                console.log('🔄 Center zone clicked');
                this.toggleUI();
            });
        }
    }

    /**
     * Привязывает события управления интерфейсом
     */
    bindUIControlEvents() {
        if (this.elements.settingsButton) {
            this.elements.settingsButton.addEventListener('click', () => this.openSettings());
        }
        
        if (this.elements.backButton) {
            this.elements.backButton.addEventListener('click', () => this.handleBackAction());
        }
    }

    /**
     * Привязывает события панели настроек
     */
    bindSettingsEvents() {
        if (this.elements.closeSettingsButton) {
            this.elements.closeSettingsButton.addEventListener('click', () => this.closeSettings());
        }
        
        if (this.elements.settingsBackdrop) {
            this.elements.settingsBackdrop.addEventListener('click', () => this.closeSettings());
        }
        
        // Остальные настройки...
    }

    /**
     * Привязывает клавиатурные события
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (event.key) {
                case 'ArrowLeft':
                case 'PageUp':
                case 'h':
                    event.preventDefault();
                    console.log('⌨️ Keyboard: Previous page');
                    this.goToPreviousPage();
                    break;
                    
                case 'ArrowRight':
                case 'PageDown':
                case 'l':
                case ' ':
                    event.preventDefault();
                    console.log('⌨️ Keyboard: Next page');
                    this.goToNextPage();
                    break;
                    
                case 'Home':
                    event.preventDefault();
                    this.goToPage(0);
                    break;
                    
                case 'End':
                    event.preventDefault();
                    this.goToPage(this.state.totalPages - 1);
                    break;
            }
        });
    }

    /**
     * Привязывает жестовые события
     */
    bindGestureEvents() {
        // Простая реализация свайпов
        let touchStartX = 0;
        
        if (this.elements.readingViewport) {
            this.elements.readingViewport.addEventListener('touchstart', (event) => {
                touchStartX = event.touches[0].clientX;
            });
            
            this.elements.readingViewport.addEventListener('touchend', (event) => {
                const touchEndX = event.changedTouches[0].clientX;
                const deltaX = touchEndX - touchStartX;
                
                if (Math.abs(deltaX) > 50) {
                    if (deltaX > 0) {
                        console.log('👆 Swipe: Previous page');
                        this.goToPreviousPage();
                    } else {
                        console.log('👆 Swipe: Next page');
                        this.goToNextPage();
                    }
                }
            });
        }
    }

    /**
     * ИСПРАВЛЕННЫЙ рендеринг текущей страницы
     */
    renderCurrentPage() {
        console.log(`📖 Rendering page ${this.state.currentPageIndex + 1}/${this.state.totalPages}`);
        
        const currentPage = this.state.pages[this.state.currentPageIndex];
        
        if (!currentPage) {
            console.error('❌ No page to render at index:', this.state.currentPageIndex);
            console.error('❌ Available pages:', this.state.pages.length);
            return;
        }
        
        if (!this.elements.pageContent) {
            console.error('❌ pageContent element not found');
            return;
        }
        
        // Прямое обновление DOM
        this.performDirectDOMUpdate(currentPage.content);
        
        // Обновление интерфейса
        this.updateInterfaceState();
        
        // Сохранение прогресса
        this.saveProgress();
    }

    /**
     * Выполняет прямое обновление DOM
     */
    performDirectDOMUpdate(content) {
        if (!this.elements.pageContent) return;
        
        this.elements.pageContent.style.opacity = '0.7';
        
        setTimeout(() => {
            this.elements.pageContent.innerHTML = content;
            this.applyTypographySettings();
            
            setTimeout(() => {
                this.elements.pageContent.style.opacity = '1';
            }, 50);
        }, 100);
    }

    /**
     * Обновляет состояние интерфейса
     */
    updateInterfaceState() {
        const currentIndex = this.state.currentPageIndex;
        const totalPages = this.state.totalPages;
        const progressPercentage = totalPages > 1 ? (currentIndex / (totalPages - 1)) * 100 : 0;
        
        console.log(`📊 UI Update: Page ${currentIndex + 1}/${totalPages}, Progress: ${Math.round(progressPercentage)}%`);
        
        // Обновление индикатора прогресса
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progressPercentage}%`;
        }
        
        // Обновление счетчика страниц
        if (this.elements.currentProgress) {
            this.elements.currentProgress.textContent = Math.round(progressPercentage).toString();
        }
        
        // Обновление времени чтения
        if (this.elements.readingTime) {
            const remainingPages = totalPages - currentIndex - 1;
            const estimatedMinutes = Math.ceil(remainingPages * 0.5); // 30 сек на страницу
            this.elements.readingTime.textContent = `${estimatedMinutes} мин`;
        }
        
        // ИСПРАВЛЕНИЕ: Правильное состояние кнопок навигации
        if (this.elements.prevButton) {
            this.elements.prevButton.disabled = currentIndex === 0;
            console.log(`🔄 Prev button disabled: ${currentIndex === 0}`);
        }
        
        if (this.elements.nextButton) {
            this.elements.nextButton.disabled = currentIndex >= totalPages - 1;
            console.log(`🔄 Next button disabled: ${currentIndex >= totalPages - 1}`);
        }
    }

    /**
     * ИСПРАВЛЕННЫЕ методы навигации с подробным логированием
     */
    goToNextPage() {
        console.log(`📖 NEXT: Current ${this.state.currentPageIndex}, Total: ${this.state.totalPages}`);
        
        if (this.state.currentPageIndex < this.state.totalPages - 1) {
            this.state.currentPageIndex++;
            this.renderCurrentPage();
            console.log(`✅ Moved to page ${this.state.currentPageIndex + 1}/${this.state.totalPages}`);
        } else {
            console.log('🚫 Already at last page');
        }
    }

    goToPreviousPage() {
        console.log(`📖 PREV: Current ${this.state.currentPageIndex}, Total: ${this.state.totalPages}`);
        
        if (this.state.currentPageIndex > 0) {
            this.state.currentPageIndex--;
            this.renderCurrentPage();
            console.log(`✅ Moved to page ${this.state.currentPageIndex + 1}/${this.state.totalPages}`);
        } else {
            console.log('🚫 Already at first page');
        }
    }

    goToPage(pageIndex) {
        const clampedIndex = Math.max(0, Math.min(pageIndex, this.state.totalPages - 1));
        
        if (clampedIndex !== this.state.currentPageIndex) {
            this.state.currentPageIndex = clampedIndex;
            this.renderCurrentPage();
            console.log(`📖 Jumped to page: ${this.state.currentPageIndex + 1}/${this.state.totalPages}`);
        }
    }

    /**
     * Управление UI
     */
    toggleUI() {
        if (this.state.isUIVisible) {
            this.hideUI();
        } else {
            this.showUI();
        }
    }

    showUI() {
        this.state.isUIVisible = true;
        
        if (this.elements.topNavigation) {
            this.elements.topNavigation.classList.add('visible');
        }
        if (this.elements.bottomControls) {
            this.elements.bottomControls.classList.add('visible');
        }
        
        console.log('👁️ UI shown');
    }

    hideUI() {
        this.state.isUIVisible = false;
        
        if (this.elements.topNavigation) {
            this.elements.topNavigation.classList.remove('visible');
        }
        if (this.elements.bottomControls) {
            this.elements.bottomControls.classList.remove('visible');
        }
        
        console.log('🙈 UI hidden');
    }

    showUITemporarily() {
        this.showUI();
        
        setTimeout(() => {
            if (!this.state.isSettingsOpen) {
                this.hideUI();
            }
        }, 3000);
    }

    /**
 * ИСПРАВЛЕННЫЙ метод открытия настроек
 */
openSettings() {
    console.log('⚙️ Settings opened');
    
    this.state.isSettingsOpen = true;
    
    // Ищем элемент панели настроек
    if (this.elements.settingsDrawer) {
        this.elements.settingsDrawer.classList.add('visible');
        console.log('✅ Settings panel shown');
    } else {
        console.warn('❌ settingsDrawer element not found in DOM');
        
        // Создаем панель настроек динамически, если её нет
        this.createSettingsPanel();
    }
    
    // Показываем UI
    this.showUI();
    
    // Обновляем состояние настроек
    this.updateSettingsInterface();
}

/**
 * Создает панель настроек динамически
 */
createSettingsPanel() {
    console.log('🔧 Creating settings panel dynamically...');
    
    const settingsHTML = `
        <aside class="settings-drawer visible" id="settingsDrawer">
            <div class="settings-backdrop" id="settingsBackdrop"></div>
            
            <div class="settings-panel">
                <header class="settings-header">
                    <h3>Настройки чтения</h3>
                    <button class="close-button" id="closeSettingsButton">✕</button>
                </header>
                
                <div class="settings-content">
                    <!-- Яркость -->
                    <section class="setting-group">
                        <label>Яркость</label>
                        <div class="brightness-control">
                            <input type="range" id="brightnessSlider" min="30" max="100" value="100">
                        </div>
                    </section>

                    <!-- Темы -->
                    <section class="setting-group">
                        <label>Тема оформления</label>
                        <div class="theme-options">
                            <button class="theme-option" data-theme="sepia" id="themeSepia">
                                <div class="theme-preview sepia"></div>
                                <span>Сепия</span>
                            </button>
                            <button class="theme-option" data-theme="gray" id="themeGray">
                                <div class="theme-preview gray"></div>
                                <span>Серый</span>
                            </button>
                            <button class="theme-option active" data-theme="dark" id="themeDark">
                                <div class="theme-preview dark"></div>
                                <span>Черный</span>
                            </button>
                        </div>
                    </section>

                    <!-- Размер шрифта -->
                    <section class="setting-group">
                        <label>Размер шрифта</label>
                        <div class="font-controls">
                            <button class="font-btn" id="decreaseFontSize">А-</button>
                            <button class="font-btn" id="increaseFontSize">А+</button>
                        </div>
                    </section>

                    <!-- Межстрочный интервал -->
                    <section class="setting-group">
                        <label>Межстрочный интервал</label>
                        <div class="spacing-controls">
                            <button class="spacing-btn" id="spacingTight" data-spacing="1.4">Узкий</button>
                            <button class="spacing-btn active" id="spacingNormal" data-spacing="1.6">Нормальный</button>
                            <button class="spacing-btn" id="spacingLoose" data-spacing="2.0">Широкий</button>
                        </div>
                    </section>
                </div>
            </div>
        </aside>
    `;
    
    // Добавляем CSS для настроек
    const settingsCSS = `
        .settings-drawer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            z-index: 200;
        }
        
        .settings-drawer.visible {
            transform: translateY(0);
        }
        
        .settings-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .settings-panel {
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px 20px 0 0;
            max-height: 70vh;
            overflow: hidden;
            color: #fff;
        }
        
        .settings-header {
            padding: 20px 24px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .close-button {
            background: none;
            border: none;
            color: #fff;
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
        }
        
        .close-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .settings-content {
            padding: 24px;
            max-height: 50vh;
            overflow-y: auto;
        }
        
        .setting-group {
            margin-bottom: 24px;
        }
        
        .setting-group label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 12px;
            color: #fff;
        }
        
        .brightness-control input[type="range"] {
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: rgba(255, 255, 255, 0.2);
            outline: none;
            -webkit-appearance: none;
        }
        
        .brightness-control input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #007aff;
            cursor: pointer;
        }
        
        .theme-options, .font-controls, .spacing-controls {
            display: flex;
            gap: 12px;
        }
        
        .theme-option, .font-btn, .spacing-btn {
            flex: 1;
            padding: 12px 8px;
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            color: #fff;
            font-size: 14px;
        }
        
        .theme-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        
        .theme-option.active, .font-btn:hover, .spacing-btn.active {
            border-color: #007aff;
            background: rgba(0, 122, 255, 0.1);
        }
        
        .font-btn:hover, .spacing-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .theme-preview {
            width: 36px;
            height: 36px;
            border-radius: 8px;
        }
        
        .theme-preview.sepia { background: #f7f0e6; }
        .theme-preview.gray { background: #f5f5f5; }
        .theme-preview.dark { background: #000; }
    `;
    
    // Добавляем CSS
    const styleSheet = document.createElement('style');
    styleSheet.textContent = settingsCSS;
    document.head.appendChild(styleSheet);
    
    // Добавляем HTML
    document.body.insertAdjacentHTML('beforeend', settingsHTML);
    
    // Обновляем ссылки на элементы
    this.elements.settingsDrawer = document.getElementById('settingsDrawer');
    this.elements.settingsBackdrop = document.getElementById('settingsBackdrop');
    this.elements.closeSettingsButton = document.getElementById('closeSettingsButton');
    this.elements.brightnessSlider = document.getElementById('brightnessSlider');
    this.elements.decreaseFontSize = document.getElementById('decreaseFontSize');
    this.elements.increaseFontSize = document.getElementById('increaseFontSize');
    
    // ПРИВЯЗЫВАЕМ СОБЫТИЯ ДЛЯ ВСЕХ КНОПОК
    this.bindDynamicSettingsEvents();
    
    console.log('✅ Settings panel created and shown');
}

/**
 * НОВЫЙ МЕТОД: Привязывает события для динамически созданных кнопок
 */
bindDynamicSettingsEvents() {
    console.log('🎮 Binding dynamic settings events...');
    
    // Закрытие панели
    this.elements.closeSettingsButton?.addEventListener('click', () => {
        console.log('🔄 Close settings clicked');
        this.closeSettings();
    });
    
    this.elements.settingsBackdrop?.addEventListener('click', () => {
        console.log('🔄 Settings backdrop clicked');
        this.closeSettings();
    });
    
    // Яркость
    this.elements.brightnessSlider?.addEventListener('input', (event) => {
        console.log('🔄 Brightness changed:', event.target.value);
        this.updateBrightness(parseInt(event.target.value));
    });
    
    // Размер шрифта
    this.elements.decreaseFontSize?.addEventListener('click', () => {
        console.log('🔄 Decrease font size clicked');
        this.adjustFontSize(-2);
    });
    
    this.elements.increaseFontSize?.addEventListener('click', () => {
        console.log('🔄 Increase font size clicked');
        this.adjustFontSize(2);
    });
    
    // Темы
    document.querySelectorAll('.theme-option').forEach(button => {
        button.addEventListener('click', () => {
            console.log('🔄 Theme clicked:', button.dataset.theme);
            this.changeTheme(button.dataset.theme);
        });
    });
    
    // Межстрочный интервал
    document.querySelectorAll('.spacing-btn').forEach(button => {
        button.addEventListener('click', () => {
            console.log('🔄 Spacing clicked:', button.dataset.spacing);
            this.changeLineHeight(parseFloat(button.dataset.spacing));
        });
    });
    
    console.log('✅ Dynamic settings events bound');
}

/**
 * НОВЫЕ МЕТОДЫ для работы с настройками
 */
updateBrightness(brightness) {
    this.state.settings.brightness = brightness;
    document.documentElement.style.filter = `brightness(${brightness}%)`;
    this.saveSettings();
    console.log(`🔆 Brightness set to: ${brightness}%`);
}

adjustFontSize(delta) {
    const newSize = Math.max(14, Math.min(24, this.state.settings.fontSize + delta));
    
    if (newSize !== this.state.settings.fontSize) {
        this.state.settings.fontSize = newSize;
        this.applyTypographySettings();
        this.saveSettings();
        console.log(`📏 Font size changed to: ${newSize}px`);
    }
}

changeTheme(themeName) {
    this.state.settings.theme = themeName;
    document.body.setAttribute('data-theme', themeName);
    this.saveSettings();
    
    // Обновляем активную тему
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === themeName);
    });
    
    console.log(`🎨 Theme changed to: ${themeName}`);
}

changeLineHeight(lineHeight) {
    this.state.settings.lineHeight = lineHeight;
    this.applyTypographySettings();
    this.saveSettings();
    
    // Обновляем активную кнопку
    document.querySelectorAll('.spacing-btn').forEach(btn => {
        const spacing = parseFloat(btn.dataset.spacing);
        btn.classList.toggle('active', Math.abs(spacing - lineHeight) < 0.1);
    });
    
    console.log(`📐 Line height changed to: ${lineHeight}`);
}


/**
 * Закрытие настроек
 */
closeSettings() {
    console.log('⚙️ Settings closed');
    
    this.state.isSettingsOpen = false;
    
    if (this.elements.settingsDrawer) {
        this.elements.settingsDrawer.classList.remove('visible');
        
        // Удаляем панель через секунду
        setTimeout(() => {
            if (this.elements.settingsDrawer && !this.state.isSettingsOpen) {
                this.elements.settingsDrawer.remove();
                this.elements.settingsDrawer = null;
            }
        }, 300);
    }
}

/**
 * Обновление интерфейса настроек
 */
updateSettingsInterface() {
    console.log('🔄 Updating settings interface');
    // Заглушка для обновления настроек
}


    handleBackAction() {
        console.log('⬅️ Back action');
    }

    /**
     * Применяет настройки типографики
     */
    applyTypographySettings() {
        if (!this.elements.pageContent) return;
        
        const { fontSize, lineHeight, textAlign } = this.state.settings;
        
        this.elements.pageContent.style.fontSize = `${fontSize}px`;
        this.elements.pageContent.style.lineHeight = lineHeight.toString();
        this.elements.pageContent.style.textAlign = textAlign;
    }

    /**
     * Работа с настройками и прогрессом (заглушки)
     */
    saveSettings() {
        try {
            localStorage.setItem(`${this.storageKey}-settings`, JSON.stringify(this.state.settings));
        } catch (error) {
            console.warn('⚠️ Failed to save settings:', error);
        }
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem(`${this.storageKey}-settings`);
            if (savedSettings) {
                Object.assign(this.state.settings, JSON.parse(savedSettings));
            }
        } catch (error) {
            console.warn('⚠️ Failed to load settings:', error);
        }
        this.applySettings();
    }

    applySettings() {
        document.body.setAttribute('data-theme', this.state.settings.theme);
        this.applyTypographySettings();
    }

    saveProgress() {
        try {
            const progressData = {
                pageIndex: this.state.currentPageIndex,
                totalPages: this.state.totalPages,
                timestamp: Date.now()
            };
            localStorage.setItem(`${this.storageKey}-progress`, JSON.stringify(progressData));
        } catch (error) {
            console.warn('⚠️ Failed to save progress:', error);
        }
    }

    loadProgress() {
        try {
            const savedProgress = localStorage.getItem(`${this.storageKey}-progress`);
            if (savedProgress) {
                const progressData = JSON.parse(savedProgress);
                if (progressData.pageIndex < this.state.totalPages) {
                    this.state.currentPageIndex = progressData.pageIndex;
                    console.log(`📖 Progress restored: page ${progressData.pageIndex + 1}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load progress:', error);
        }
    }

    /**
     * Утилиты загрузки
     */
    updateLoadingStatus(message) {
        if (this.elements.loadingStatus) {
            this.elements.loadingStatus.textContent = message;
        }
        console.log(`🔄 ${message}`);
    }

    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
        
        if (this.elements.readerContainer) {
            this.elements.readerContainer.style.display = 'flex';
            this.elements.readerContainer.classList.add('ready');
        }
        
        setTimeout(() => {
            if (this.elements.loadingOverlay) {
                this.elements.loadingOverlay.style.display = 'none';
            }
        }, 500);
    }

    showError(message) {
        this.updateLoadingStatus(message);
        console.error(`❌ ${message}`);
        
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
}

/**
 * Инициализация приложения
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 DOM loaded, initializing reader...');
    
    try {
        window.yandexBooksReader = new YandexBooksReader();
    } catch (error) {
        console.error('💥 Critical initialization error:', error);
        
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
