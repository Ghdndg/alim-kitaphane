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
     * ИСПРАВЛЕННОЕ создание страниц: подгоняем контент по реальной высоте без прокрутки
     */
    createPages() {
        console.log('📄 Creating pages with measured layout...');
        
        const normalizedText = this.preprocessText(this.state.bookContent);
        const words = normalizedText.split(/\s+/).filter(Boolean);
        this.state.pages = [];

        // Создаем измерительный элемент с теми же стилями, что и у .page-content
        const measureEl = this.createMeasureElement();
        const maxHeight = this.getMaxContentHeight();

        let index = 0;
        let pageNumber = 0;
        while (index < words.length) {
            // Бинарный поиск максимального количества слов, помещающихся по высоте
            let low = 1;
            let high = Math.min(words.length - index, 3000); // верхняя граница для ускорения
            let best = 1;

            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const sliceText = words.slice(index, index + mid).join(' ');
                const html = this.formatSimplePage(sliceText, pageNumber === 0 ? 0 : index);
                measureEl.innerHTML = html;
                const h = measureEl.scrollHeight;

                if (h <= maxHeight) {
                    best = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            const pageText = words.slice(index, index + best).join(' ');
            const formatted = this.formatSimplePage(pageText, pageNumber === 0 ? 0 : index);
            this.state.pages.push({ id: pageNumber, content: formatted, wordCount: best });
            console.log(`📄 Created page ${pageNumber + 1}: ${best} words (fit height ${maxHeight}px)`);
            pageNumber += 1;
            index += best;

            // Страховка от зацикливания, если вдруг ни одно слово не помещается (очень большой шрифт)
            if (best === 0) {
                // Вставим хотя бы слово и продолжим
                const single = words[index];
                const fallback = this.formatSimplePage(single, index);
                this.state.pages.push({ id: pageNumber, content: fallback, wordCount: 1 });
                index += 1;
                pageNumber += 1;
            }
        }

        measureEl.remove();
        this.state.totalPages = this.state.pages.length;
        console.log(`✅ PAGES CREATED: ${this.state.totalPages} pages total`);

        if (this.state.totalPages === 0) {
            // на всякий случай вставим пустую страницу
            this.state.pages = [{ id: 0, content: '<p></p>', wordCount: 0 }];
            this.state.totalPages = 1;
        }
    }

    /** Создает скрытый элемент для измерения высоты контента страницы */
    createMeasureElement() {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.top = '-99999px';
        el.style.left = '-99999px';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '-1';
        el.style.width = '100%';

        // Клонируем ключевые стили из .page-content
        const pageContent = this.elements.pageContent;
        const computed = pageContent ? getComputedStyle(pageContent) : null;
        if (computed) {
            el.style.fontFamily = computed.fontFamily;
            el.style.fontSize = computed.fontSize;
            el.style.lineHeight = computed.lineHeight;
            el.style.letterSpacing = computed.letterSpacing;
            el.style.textAlign = computed.textAlign;
            el.style.width = computed.width;
        } else {
            el.style.fontFamily = 'Georgia, serif';
            el.style.fontSize = `${this.state.settings.fontSize}px`;
            el.style.lineHeight = String(this.state.settings.lineHeight);
            el.style.textAlign = this.state.settings.textAlign;
            el.style.width = '680px';
        }

        // Фиксированная максимальная высота, равная высоте .page-content
        el.style.maxHeight = `${this.getMaxContentHeight()}px`;
        document.body.appendChild(el);
        return el;
    }

    /** Возвращает расчетную максимальную высоту текстового блока внутри страницы */
    getMaxContentHeight() {
        // Берем фактическую высоту из текущего .page-content если доступен
        const pageContent = this.elements.pageContent;
        if (pageContent) {
            const rect = pageContent.getBoundingClientRect();
            // Если высота еще не задана (на ранней инициализации), вычислим по CSS calc
            return Math.max(0, Math.floor(rect.height || 0)) || this.computePageContentCssHeight();
        }
        return this.computePageContentCssHeight();
    }

    computePageContentCssHeight() {
        // Дублируем формулу из CSS
        const vh = window.innerHeight;
        const header = 56; // var(--header-height)
        const footer = 80; // var(--footer-height)
        const safeTop = 0; // для простоты
        const safeBottom = 0;
        const padding = 48;
        return Math.max(0, Math.floor(vh - header - footer - safeTop - safeBottom - padding));
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
                <h1>Хаджи Гирай</h1>
                <div class="author">Алим Мидат</div>
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
        this.bindResizeEvents();
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
        console.log('🎮 Binding settings events...');
        
        // Закрытие панели
        if (this.elements.closeSettingsButton) {
            this.elements.closeSettingsButton.addEventListener('click', (e) => {
                console.log('🔄 Close settings clicked');
                e.preventDefault();
                e.stopPropagation();
                this.closeSettings();
            });
        }
        
        if (this.elements.settingsBackdrop) {
            this.elements.settingsBackdrop.addEventListener('click', (e) => {
                console.log('🔄 Settings backdrop clicked');
                e.preventDefault();
                e.stopPropagation();
                this.closeSettings();
            });
        }
        
        // Яркость
        if (this.elements.brightnessSlider) {
            this.elements.brightnessSlider.addEventListener('input', (event) => {
                console.log('🔄 Brightness changed:', event.target.value);
                this.updateBrightness(parseInt(event.target.value));
            });
        }
        
        // Размер шрифта
        if (this.elements.decreaseFontSize) {
            this.elements.decreaseFontSize.addEventListener('click', (e) => {
                console.log('🔄 Decrease font size clicked');
                e.preventDefault();
                e.stopPropagation();
                this.adjustFontSize(-2);
            });
        }
        
        if (this.elements.increaseFontSize) {
            this.elements.increaseFontSize.addEventListener('click', (e) => {
                console.log('🔄 Increase font size clicked');
                e.preventDefault();
                e.stopPropagation();
                this.adjustFontSize(2);
            });
        }
        
        // Темы
        document.querySelectorAll('.theme-option').forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('🔄 Theme clicked:', button.dataset.theme);
                e.preventDefault();
                e.stopPropagation();
                this.changeTheme(button.dataset.theme);
            });
        });
        
        // Межстрочный интервал
        document.querySelectorAll('.spacing-option').forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('🔄 Spacing clicked:', button.dataset.spacing);
                e.preventDefault();
                e.stopPropagation();
                this.changeLineHeight(parseFloat(button.dataset.spacing));
            });
        });
        
        // Выравнивание текста
        document.querySelectorAll('.align-option').forEach(button => {
            button.addEventListener('click', (e) => {
                console.log('🔄 Alignment clicked:', button.dataset.align);
                e.preventDefault();
                e.stopPropagation();
                this.changeTextAlign(button.dataset.align);
            });
        });
        
        
        console.log('✅ Settings events bound');
    }

    /** Привязывает события изменения размера окна для пересоздания страниц */
    bindResizeEvents() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.recreatePagesForNewMetrics();
            }, 150);
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
    
        // Показываем существующую панель настроек
    if (this.elements.settingsDrawer) {
        this.elements.settingsDrawer.classList.add('visible');
        console.log('✅ Settings panel shown');
    } else {
            console.error('❌ settingsDrawer element not found in DOM');
            return;
    }
    
    // Показываем UI
    this.showUI();
    
    // Обновляем состояние настроек
    this.updateSettingsInterface();
}




    /**
    * Закрытие настроек
    */
    closeSettings() {
        console.log('⚙️ Settings closed');
        
        this.state.isSettingsOpen = false;
        
        if (this.elements.settingsDrawer) {
            this.elements.settingsDrawer.classList.remove('visible');
        }
    }

    /**
     * Обновление интерфейса настроек
     */
    updateSettingsInterface() {
        console.log('🔄 Updating settings interface');
        
        // Обновляем яркость
        if (this.elements.brightnessSlider) {
            this.elements.brightnessSlider.value = this.state.settings.brightness;
        }
        
        // Обновляем активную тему
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === this.state.settings.theme);
        });
        
        // Обновляем активный межстрочный интервал
        document.querySelectorAll('.spacing-option').forEach(btn => {
            const spacing = parseFloat(btn.dataset.spacing);
            btn.classList.toggle('active', Math.abs(spacing - this.state.settings.lineHeight) < 0.1);
        });
        
        // Обновляем активное выравнивание
        document.querySelectorAll('.align-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === this.state.settings.textAlign);
        });
        
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

    /**
     * Методы для работы настроек
     */
    updateBrightness(brightness) {
        this.state.settings.brightness = brightness;
        document.documentElement.style.filter = `brightness(${brightness}%)`;
        this.saveSettings();
        console.log(`🔆 Brightness: ${brightness}%`);
    }

    adjustFontSize(delta) {
        const newSize = Math.max(14, Math.min(24, this.state.settings.fontSize + delta));
        if (newSize !== this.state.settings.fontSize) {
            this.state.settings.fontSize = newSize;
            this.applyTypographySettings();
            this.saveSettings();
                this.recreatePagesForNewMetrics();
            console.log(`📏 Font size: ${newSize}px`);
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
        
        console.log(`🎨 Theme: ${themeName}`);
    }

    changeLineHeight(lineHeight) {
        this.state.settings.lineHeight = lineHeight;
        this.applyTypographySettings();
        this.saveSettings();
        
        // Обновляем активную кнопку
            document.querySelectorAll('.spacing-option').forEach(btn => {
            const spacing = parseFloat(btn.dataset.spacing);
            btn.classList.toggle('active', Math.abs(spacing - lineHeight) < 0.1);
        });
        
            this.recreatePagesForNewMetrics();
        console.log(`📐 Line height: ${lineHeight}`);
        }

        changeTextAlign(alignment) {
            this.state.settings.textAlign = alignment;
            this.applyTypographySettings();
            this.saveSettings();
            
            // Обновляем активную кнопку
            document.querySelectorAll('.align-option').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.align === alignment);
            });
            
            this.recreatePagesForNewMetrics();
            console.log(`📐 Text alignment: ${alignment}`);
        }

/** Пересоздание страниц при изменении шрифта/интервала/ширины */
    recreatePagesForNewMetrics() {
        const progressRatio = this.state.totalPages > 1 ? this.state.currentPageIndex / (this.state.totalPages - 1) : 0;
        this.createPages();
        // Восстанавливаем близкую позицию чтения
        const newIndex = Math.round(progressRatio * (this.state.totalPages - 1));
        this.state.currentPageIndex = Math.max(0, Math.min(newIndex, this.state.totalPages - 1));
        this.renderCurrentPage();
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
