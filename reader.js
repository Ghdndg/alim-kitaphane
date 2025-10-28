/**
 * Профессиональный ридер в стиле Яндекс.Книг
 * Совместимость: ES6+ (поддерживается во всех современных браузерах)
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
        this.wordsPerPage = 280;
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
     * Создает страницы с оптимальной пагинацией
     */
    createPages() {
        console.log('📄 Creating pages...');
        
        const normalizedText = this.preprocessText(this.state.bookContent);
        const paragraphs = this.splitTextIntoParagraphs(normalizedText);
        
        this.state.pages = [];
        let currentPageParagraphs = [];
        let currentWordCount = 0;
        
        console.log(`📝 Processing ${paragraphs.length} paragraphs...`);
        
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].trim();
            const paragraphWordCount = this.countWords(paragraph);
            
            if (currentWordCount + paragraphWordCount > this.wordsPerPage && currentPageParagraphs.length > 0) {
                this.addPage(currentPageParagraphs, currentWordCount);
                currentPageParagraphs = [paragraph];
                currentWordCount = paragraphWordCount;
            } else {
                currentPageParagraphs.push(paragraph);
                currentWordCount += paragraphWordCount;
            }
            
            if (i % 25 === 0) {
                this.updateLoadingStatus(`Обработано ${i + 1}/${paragraphs.length} параграфов...`);
            }
        }
        
        if (currentPageParagraphs.length > 0) {
            this.addPage(currentPageParagraphs, currentWordCount);
        }
        
        this.state.totalPages = this.state.pages.length;
        this.validatePagination(paragraphs);
        
        console.log(`✅ Pages created: ${this.state.totalPages}`);
    }

    /**
     * Предварительно обрабатывает текст
     */
    preprocessText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s+$/gm, '')
            .trim();
    }

    /**
     * Разбивает текст на параграфы
     */
    splitTextIntoParagraphs(text) {
        return text
            .split('\n\n')
            .filter(paragraph => paragraph.trim().length > 0);
    }

    /**
     * Подсчитывает количество слов в тексте
     */
    countWords(text) {
        return text
            .split(/\s+/)
            .filter(word => word.length > 0).length;
    }

    /**
     * Добавляет новую страницу
     */
    addPage(paragraphs, wordCount) {
        const formattedContent = this.formatPageContent(paragraphs);
        
        const page = {
            id: this.state.pages.length,
            content: formattedContent,
            wordCount: wordCount
        };
        
        this.state.pages.push(page);
    }

    /**
     * Форматирует содержимое страницы в HTML
     */
    formatPageContent(paragraphs) {
        return paragraphs
            .map(paragraph => this.formatParagraph(paragraph.trim()))
            .join('');
    }

    /**
     * Форматирует отдельный параграф
     */
    formatParagraph(text) {
        if (this.isMainTitle(text)) {
            return `<h1>${this.escapeHtml(text)}</h1>`;
        }
        
        if (this.isAuthor(text)) {
            return `<div class="author">${this.escapeHtml(text)}</div>`;
        }
        
        if (this.isChapterTitle(text)) {
            return `<h2>${this.escapeHtml(text)}</h2>`;
        }
        
        return `<p>${this.escapeHtml(text)}</p>`;
    }

    /**
     * Проверяет, является ли текст заголовком книги
     */
    isMainTitle(text) {
        return text === 'Хаджи-Гирай' || text.includes('Хаджи-Гирай');
    }

    /**
     * Проверяет, является ли текст именем автора
     */
    isAuthor(text) {
        return text === 'Алим Къуртсеит' || text.includes('Алим Къуртсеит');
    }

    /**
     * Проверяет, является ли текст заголовком главы
     */
    isChapterTitle(text) {
        return text.length < 80 && (
            text.startsWith('Глава') ||
            text.startsWith('ГЛАВА') ||
            /^[А-ЯЁ\s\-\.]{3,50}$/.test(text) ||
            text === text.toUpperCase()
        );
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
     * Проверяет целостность пагинации
     */
    validatePagination(originalParagraphs) {
        const originalWordCount = originalParagraphs.reduce(
            (total, paragraph) => total + this.countWords(paragraph), 0
        );
        
        const paginatedWordCount = this.state.pages.reduce(
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
        } else {
            console.warn('⚠️ prevButton not found');
        }
        
        if (this.elements.nextButton) {
            this.elements.nextButton.addEventListener('click', () => {
                console.log('🔄 Next button clicked');
                this.goToNextPage();
            });
        } else {
            console.warn('⚠️ nextButton not found');
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
        
        if (this.elements.brightnessSlider) {
            this.elements.brightnessSlider.addEventListener('input', (event) => {
                this.updateBrightness(parseInt(event.target.value));
            });
        }
        
        if (this.elements.decreaseFontSize) {
            this.elements.decreaseFontSize.addEventListener('click', () => this.adjustFontSize(-1));
        }
        
        if (this.elements.increaseFontSize) {
            this.elements.increaseFontSize.addEventListener('click', () => this.adjustFontSize(1));
        }
        
        if (this.elements.scrollModeToggle) {
            this.elements.scrollModeToggle.addEventListener('change', (event) => {
                this.toggleScrollMode(event.target.checked);
            });
        }
        
        // Выбор темы
        document.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', () => {
                const theme = button.dataset.theme;
                if (theme) this.changeTheme(theme);
            });
        });
        
        // Межстрочный интервал
        document.querySelectorAll('.spacing-option').forEach(button => {
            button.addEventListener('click', () => {
                const spacing = parseFloat(button.dataset.spacing);
                if (spacing) this.changeLineHeight(spacing);
            });
        });
        
        // Выравнивание текста
        document.querySelectorAll('.align-option').forEach(button => {
            button.addEventListener('click', () => {
                const alignment = button.dataset.align;
                if (alignment) this.changeTextAlignment(alignment);
            });
        });
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
                case 'g':
                    event.preventDefault();
                    this.goToPage(0);
                    break;
                    
                case 'End':
                case 'G':
                    event.preventDefault();
                    this.goToPage(this.state.totalPages - 1);
                    break;
                    
                case 'Escape':
                    if (this.state.isSettingsOpen) {
                        this.closeSettings();
                    } else if (this.state.isUIVisible) {
                        this.hideUI();
                    }
                    break;
            }
        });
    }

    /**
     * Привязывает жестовые события
     */
    bindGestureEvents() {
        let touchStartX = 0;
        let touchStartY = 0;
        const swipeThreshold = 50;
        
        if (this.elements.readingViewport) {
            this.elements.readingViewport.addEventListener('touchstart', (event) => {
                touchStartX = event.touches[0].clientX;
                touchStartY = event.touches[0].clientY;
            });
            
            this.elements.readingViewport.addEventListener('touchend', (event) => {
                const touchEndX = event.changedTouches[0].clientX;
                const touchEndY = event.changedTouches[0].clientY;
                
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;
                
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
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
     * Рендерит текущую страницу (прямой DOM рендеринг)
     */
    renderCurrentPage() {
        console.log(`📖 Rendering page ${this.state.currentPageIndex + 1}/${this.state.totalPages}`);
        
        const currentPage = this.state.pages[this.state.currentPageIndex];
        
        if (!currentPage) {
            console.error('❌ No page to render');
            return;
        }
        
        if (!this.elements.pageContent) {
            console.error('❌ pageContent element not found');
            return;
        }
        
        // Прямое обновление DOM без виртуального DOM
        this.performDirectDOMUpdate(currentPage.content);
        
        // Обновление состояния интерфейса
        this.updateInterfaceState();
        
        // Сохранение прогресса
        this.saveProgress();
    }

    /**
     * Выполняет прямое обновление DOM
     */
    performDirectDOMUpdate(content) {
        if (!this.elements.pageContent) return;
        
        // Плавная анимация смены контента
        this.elements.pageContent.style.opacity = '0.7';
        this.elements.pageContent.style.transform = 'translateY(8px)';
        
        setTimeout(() => {
            // Прямое обновление innerHTML (без виртуального DOM)
            this.elements.pageContent.innerHTML = content;
            
            // Применение пользовательских настроек к новому контенту
            this.applyTypographySettings();
            
            // Завершение анимации
            setTimeout(() => {
                this.elements.pageContent.style.opacity = '1';
                this.elements.pageContent.style.transform = 'translateY(0)';
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
        
        // Обновление индикатора прогресса
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progressPercentage}%`;
        }
        
        // Обновление счетчика страниц (в процентах, как в Яндекс.Книгах)
        if (this.elements.currentProgress) {
            this.elements.currentProgress.textContent = Math.round(progressPercentage).toString();
        }
        
        // Обновление времени чтения
        if (this.elements.readingTime) {
            const remainingPages = totalPages - currentIndex - 1;
            const estimatedMinutes = Math.ceil(remainingPages * (this.wordsPerPage / 220));
            this.elements.readingTime.textContent = `${estimatedMinutes} мин`;
        }
        
        // Состояние кнопок навигации
        if (this.elements.prevButton) {
            this.elements.prevButton.disabled = currentIndex === 0;
        }
        
        if (this.elements.nextButton) {
            this.elements.nextButton.disabled = currentIndex === totalPages - 1;
        }
    }

    /**
     * Переходит к следующей странице
     */
    goToNextPage() {
        console.log(`📖 Attempting to go to next page. Current: ${this.state.currentPageIndex}, Total: ${this.state.totalPages}`);
        
        if (this.state.currentPageIndex < this.state.totalPages - 1) {
            this.state.currentPageIndex++;
            this.renderCurrentPage();
            console.log(`✅ Moved to page ${this.state.currentPageIndex + 1}/${this.state.totalPages}`);
        } else {
            console.log('🚫 Already at last page');
        }
    }

    /**
     * Переходит к предыдущей странице
     */
    goToPreviousPage() {
        console.log(`📖 Attempting to go to previous page. Current: ${this.state.currentPageIndex}, Total: ${this.state.totalPages}`);
        
        if (this.state.currentPageIndex > 0) {
            this.state.currentPageIndex--;
            this.renderCurrentPage();
            console.log(`✅ Moved to page ${this.state.currentPageIndex + 1}/${this.state.totalPages}`);
        } else {
            console.log('🚫 Already at first page');
        }
    }

    /**
     * Переходит к указанной странице
     */
    goToPage(pageIndex) {
        const clampedIndex = Math.max(0, Math.min(pageIndex, this.state.totalPages - 1));
        
        if (clampedIndex !== this.state.currentPageIndex) {
            this.state.currentPageIndex = clampedIndex;
            this.renderCurrentPage();
            console.log(`📖 Jumped to page: ${this.state.currentPageIndex + 1}/${this.state.totalPages}`);
        }
    }

    /**
     * Переключает видимость пользовательского интерфейса
     */
    toggleUI() {
        if (this.state.isUIVisible) {
            this.hideUI();
        } else {
            this.showUI();
        }
    }

    /**
     * Показывает пользовательский интерфейс
     */
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

    /**
     * Скрывает пользовательский интерфейс
     */
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

    /**
     * Показывает интерфейс временно
     */
    showUITemporarily() {
        this.showUI();
        
        setTimeout(() => {
            if (!this.state.isSettingsOpen) {
                this.hideUI();
            }
        }, 3000);
    }

    /**
     * Открывает панель настроек
     */
    openSettings() {
        this.state.isSettingsOpen = true;
        
        if (this.elements.settingsDrawer) {
            this.elements.settingsDrawer.classList.add('visible');
        }
        
        this.showUI();
        this.updateSettingsInterface();
        console.log('⚙️ Settings opened');
    }

    /**
     * Закрывает панель настроек
     */
    closeSettings() {
        this.state.isSettingsOpen = false;
        
        if (this.elements.settingsDrawer) {
            this.elements.settingsDrawer.classList.remove('visible');
        }
        
        console.log('⚙️ Settings closed');
    }

    /**
     * Обновляет интерфейс настроек
     */
    updateSettingsInterface() {
        if (this.elements.brightnessSlider) {
            this.elements.brightnessSlider.value = this.state.settings.brightness.toString();
        }
        
        if (this.elements.scrollModeToggle) {
            this.elements.scrollModeToggle.checked = this.state.settings.scrollMode;
        }
        
        document.querySelectorAll('.theme-option').forEach(option => {
            const isActive = option.dataset.theme === this.state.settings.theme;
            option.classList.toggle('active', isActive);
        });
        
        document.querySelectorAll('.spacing-option').forEach(option => {
            const spacing = parseFloat(option.dataset.spacing);
            const isActive = Math.abs(spacing - this.state.settings.lineHeight) < 0.1;
            option.classList.toggle('active', isActive);
        });
        
        document.querySelectorAll('.align-option').forEach(option => {
            const isActive = option.dataset.align === this.state.settings.textAlign;
            option.classList.toggle('active', isActive);
        });
    }

    /**
     * Изменяет тему оформления
     */
    changeTheme(themeName) {
        this.state.settings.theme = themeName;
        document.body.setAttribute('data-theme', themeName);
        this.saveSettings();
        this.updateSettingsInterface();
        console.log(`🎨 Theme changed to: ${themeName}`);
    }

    /**
     * Обновляет яркость экрана
     */
    updateBrightness(brightness) {
        this.state.settings.brightness = brightness;
        document.documentElement.style.filter = `brightness(${brightness}%)`;
        this.saveSettings();
    }

    /**
     * Изменяет размер шрифта
     */
    adjustFontSize(delta) {
        const newSize = Math.max(14, Math.min(24, this.state.settings.fontSize + delta));
        
        if (newSize !== this.state.settings.fontSize) {
            this.state.settings.fontSize = newSize;
            this.applyTypographySettings();
            this.saveSettings();
            console.log(`📏 Font size changed to: ${newSize}px`);
        }
    }

    /**
     * Изменяет межстрочный интервал
     */
    changeLineHeight(lineHeight) {
        this.state.settings.lineHeight = lineHeight;
        this.applyTypographySettings();
        this.saveSettings();
        this.updateSettingsInterface();
        console.log(`📐 Line height changed to: ${lineHeight}`);
    }

    /**
     * Изменяет выравнивание текста
     */
    changeTextAlignment(alignment) {
        this.state.settings.textAlign = alignment;
        this.applyTypographySettings();
        this.saveSettings();
        this.updateSettingsInterface();
        console.log(`📄 Text alignment changed to: ${alignment}`);
    }

    /**
     * Переключает режим прокрутки
     */
    toggleScrollMode(enabled) {
        this.state.settings.scrollMode = enabled;
        document.body.classList.toggle('scroll-mode', enabled);
        this.saveSettings();
        console.log(`📜 Scroll mode ${enabled ? 'enabled' : 'disabled'}`);
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
        
        document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);
        document.documentElement.style.setProperty('--line-height-base', lineHeight.toString());
    }

    /**
     * Обрабатывает действие "Назад"
     */
    handleBackAction() {
        console.log('⬅️ Back action');
    }

    /**
     * Сохраняет настройки в localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem(
                `${this.storageKey}-settings`,
                JSON.stringify(this.state.settings)
            );
        } catch (error) {
            console.warn('⚠️ Failed to save settings:', error);
        }
    }

    /**
     * Загружает настройки из localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem(`${this.storageKey}-settings`);
            
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                Object.assign(this.state.settings, parsedSettings);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load settings:', error);
        }
        
        this.applySettings();
    }

    /**
     * Применяет все настройки
     */
    applySettings() {
        document.body.setAttribute('data-theme', this.state.settings.theme);
        document.documentElement.style.filter = `brightness(${this.state.settings.brightness}%)`;
        document.body.classList.toggle('scroll-mode', this.state.settings.scrollMode);
        this.applyTypographySettings();
    }

    /**
     * Сохраняет прогресс чтения
     */
    saveProgress() {
        try {
            const progressData = {
                pageIndex: this.state.currentPageIndex,
                totalPages: this.state.totalPages,
                timestamp: Date.now()
            };
            
            localStorage.setItem(
                `${this.storageKey}-progress`,
                JSON.stringify(progressData)
            );
        } catch (error) {
            console.warn('⚠️ Failed to save progress:', error);
        }
    }

    /**
     * Загружает прогресс чтения
     */
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
     * Обновляет статус загрузки
     */
    updateLoadingStatus(message) {
        if (this.elements.loadingStatus) {
            this.elements.loadingStatus.textContent = message;
        }
        console.log(`🔄 ${message}`);
    }

    /**
     * Скрывает экран загрузки
     */
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

    /**
     * Показывает ошибку
     */
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
 * Инициализация приложения при загрузке DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 DOM loaded, initializing reader...');
    
    try {
        // Создаем глобальный экземпляр ридера
        window.yandexBooksReader = new YandexBooksReader();
        
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
