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
        
        console.log(`📏 Max content height: ${maxHeight}px`);
        
        while (index < words.length) {
            // Начинаем с более агрессивного количества слов
            let best = Math.min(200, words.length - index); // Начинаем с 200 слов
            let found = false;
            let attempts = 0;
            const maxAttempts = 20; // Ограничиваем количество попыток
            
            // Ищем максимальное количество слов, которое помещается
            while (best > 0 && attempts < maxAttempts) {
                const sliceText = words.slice(index, index + best).join(' ');
                const html = this.formatSimplePage(sliceText, pageNumber === 0 ? 0 : index);
                measureEl.innerHTML = html;
                
                // Ждем рендеринга
                measureEl.offsetHeight;
                
                const actualHeight = measureEl.scrollHeight;
                console.log(`🔍 Testing ${best} words: height ${actualHeight}px vs max ${maxHeight}px`);
                
                if (actualHeight <= maxHeight) {
                    found = true;
                    // Если помещается, попробуем добавить еще слов консервативно
                    let nextBest = Math.min(best + 50, words.length - index);
                    let maxAttempts = 3;
                    let attempts = 0;
                    
                    while (attempts < maxAttempts && nextBest < words.length - index) {
                        const nextSliceText = words.slice(index, index + nextBest).join(' ');
                        const nextHtml = this.formatSimplePage(nextSliceText, pageNumber === 0 ? 0 : index);
                        measureEl.innerHTML = nextHtml;
                        measureEl.offsetHeight;
                        const nextHeight = measureEl.scrollHeight;
                        
                        if (nextHeight <= maxHeight) {
                            best = nextBest;
                            console.log(`✅ Can fit more: ${best} words, height ${nextHeight}px (${Math.round(nextHeight/maxHeight * 100)}% filled)`);
                            nextBest = Math.min(best + 25, words.length - index);
                        } else {
                            break;
                        }
                        attempts++;
                    }
                    break;
                }
                
                // Уменьшаем количество слов более агрессивно
                if (actualHeight > maxHeight * 1.5) {
                    best = Math.max(1, Math.floor(best * 0.6)); // Уменьшаем на 40%
                } else {
                    best = Math.max(1, Math.floor(best * 0.8)); // Уменьшаем на 20%
                }
                attempts++;
            }
            
            // Если ничего не помещается, берем хотя бы одно слово
            if (!found) {
                best = 1;
            }

            const pageText = words.slice(index, index + best).join(' ');
            const formatted = this.formatSimplePage(pageText, pageNumber === 0 ? 0 : index);
            
            // Финальная проверка высоты
            measureEl.innerHTML = formatted;
            measureEl.offsetHeight;
            let finalHeight = measureEl.scrollHeight;
            let finalBest = best;
            
            // Дополнительная оптимизация: если на странице много свободного места, попробуем добавить еще слов
            if (finalHeight < maxHeight * 0.8 && index + best < words.length) {
                console.log(`🔧 Page has ${Math.round((1 - finalHeight/maxHeight) * 100)}% free space, trying to add more words...`);
                
                let additionalWords = 0;
                let testBest = best;
                
                // Пробуем добавить по 10 слов за раз для более консервативного подхода
                while (testBest < words.length - index && additionalWords < 50) {
                    testBest += 10;
                    const testSliceText = words.slice(index, index + testBest).join(' ');
                    const testHtml = this.formatSimplePage(testSliceText, pageNumber === 0 ? 0 : index);
                    measureEl.innerHTML = testHtml;
                    measureEl.offsetHeight;
                    const testHeight = measureEl.scrollHeight;
                    
                    if (testHeight <= maxHeight) {
                        finalBest = testBest;
                        finalHeight = testHeight;
                        additionalWords += 10;
                        console.log(`✅ Added ${additionalWords} more words, height: ${testHeight}px (${Math.round(testHeight/maxHeight * 100)}% filled)`);
                    } else {
                        // Если не помещается, попробуем добавить по 1 слову
                        testBest -= 10;
                        while (testBest < words.length - index && testBest < best + additionalWords + 10) {
                            testBest += 1;
                            const singleTestSliceText = words.slice(index, index + testBest).join(' ');
                            const singleTestHtml = this.formatSimplePage(singleTestSliceText, pageNumber === 0 ? 0 : index);
                            measureEl.innerHTML = singleTestHtml;
                            measureEl.offsetHeight;
                            const singleTestHeight = measureEl.scrollHeight;
                            
                            if (singleTestHeight <= maxHeight) {
                                finalBest = testBest;
                                finalHeight = singleTestHeight;
                                additionalWords = testBest - best;
                                console.log(`✅ Added ${additionalWords} more words (1 by 1), height: ${singleTestHeight}px (${Math.round(singleTestHeight/maxHeight * 100)}% filled)`);
                            } else {
                                break;
                            }
                        }
                        break;
                    }
                }
            }
            
            const finalPageText = words.slice(index, index + finalBest).join(' ');
            const finalFormatted = this.formatSimplePage(finalPageText, pageNumber === 0 ? 0 : index);
            
            this.state.pages.push({ 
                id: pageNumber, 
                content: finalFormatted, 
                wordCount: finalBest,
                actualHeight: finalHeight
            });
            
            // Финальная проверка: если страница заполнена менее чем на 70%, попробуем добавить еще слов
            if (finalHeight < maxHeight * 0.7 && index + finalBest < words.length) {
                console.log(`🔧 Final optimization: page only ${Math.round(finalHeight/maxHeight * 100)}% filled, trying to add more...`);
                
                let extraWords = 0;
                let testFinal = finalBest;
                
                while (testFinal < words.length - index && extraWords < 20) {
                    testFinal += 1;
                    const extraSliceText = words.slice(index, index + testFinal).join(' ');
                    const extraHtml = this.formatSimplePage(extraSliceText, pageNumber === 0 ? 0 : index);
                    measureEl.innerHTML = extraHtml;
                    measureEl.offsetHeight;
                    const extraHeight = measureEl.scrollHeight;
                    
                    if (extraHeight <= maxHeight) {
                        finalBest = testFinal;
                        finalHeight = extraHeight;
                        extraWords++;
                    } else {
                        break;
                    }
                }
                
                if (extraWords > 0) {
                    console.log(`✅ Final optimization added ${extraWords} more words`);
                }
            }
            
            console.log(`📄 Created page ${pageNumber + 1}: ${finalBest} words, height: ${finalHeight}px/${maxHeight}px (${Math.round(finalHeight/maxHeight * 100)}% filled)`);
            pageNumber += 1;
            index += finalBest;

            // Защита от бесконечного цикла
            if (best === 0) {
                console.error('❌ CRITICAL: No words fit on page, breaking loop');
                break;
            }
        }

        measureEl.remove();
        this.state.totalPages = this.state.pages.length;
        
        // Проверяем целостность текста
        this.validateTextIntegrity(normalizedText, words);
        
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
        el.style.width = '680px'; // Фиксированная ширина как у .page-content
        el.style.maxWidth = '680px';

        // Применяем все стили из .page-content
        el.style.fontFamily = 'Charter, Georgia, "Times New Roman", serif';
        el.style.fontSize = `${this.state.settings.fontSize}px`;
        el.style.lineHeight = String(this.state.settings.lineHeight);
        el.style.letterSpacing = '-0.01em';
        el.style.textAlign = this.state.settings.textAlign;
        el.style.hyphens = 'auto';
        el.style.webkitHyphens = 'auto';
        el.style.userSelect = 'text';
        el.style.webkitUserSelect = 'text';
        
        // Важно: применяем все отступы и стили как у реального контента
        el.style.padding = '0';
        el.style.margin = '0';
        el.style.border = 'none';
        el.style.boxSizing = 'border-box';

        // Фиксированная максимальная высота
        el.style.maxHeight = `${this.getMaxContentHeight()}px`;
        el.style.overflow = 'hidden';
        
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
            if (rect.height > 0) {
                console.log(`📏 Using actual page content height: ${rect.height}px`);
                return Math.floor(rect.height);
            }
        }
        
        const computed = this.computePageContentCssHeight();
        console.log(`📏 Using computed height: ${computed}px`);
        return computed;
    }

    computePageContentCssHeight() {
        // Дублируем формулу из CSS с учетом safe-area
        const vh = window.innerHeight;
        const header = 56; // var(--header-height)
        const footer = 80; // var(--footer-height)
        const safeTop = 0; // для простоты
        const safeBottom = 0;
        const padding = 48; // 24px сверху + 24px снизу
        
        const height = Math.max(0, Math.floor(vh - header - footer - safeTop - safeBottom - padding));
        console.log(`📏 Computed height: ${vh}vh - ${header}px(header) - ${footer}px(footer) - ${padding}px(padding) = ${height}px`);
        return height;
    }

    /** Проверяет целостность текста после пагинации */
    validateTextIntegrity(originalText, originalWords) {
        let totalWordsInPages = 0;
        let allPageText = '';
        
        for (const page of this.state.pages) {
            // Извлекаем текст из HTML контента страницы
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page.content;
            const pageText = tempDiv.textContent || tempDiv.innerText || '';
            const pageWords = pageText.split(/\s+/).filter(word => word.trim().length > 0);
            
            totalWordsInPages += pageWords.length;
            allPageText += pageText + ' ';
        }
        
        const originalWordCount = originalWords.length;
        const pageWordCount = totalWordsInPages;
        
        console.log(`📊 Text integrity check:`);
        console.log(`   Original words: ${originalWordCount}`);
        console.log(`   Page words: ${pageWordCount}`);
        console.log(`   Difference: ${originalWordCount - pageWordCount}`);
        
        if (Math.abs(originalWordCount - pageWordCount) > 10) {
            console.warn(`⚠️ WARNING: Significant word count difference detected!`);
            console.warn(`   This might indicate lost text during pagination.`);
        }
        
        // Проверяем, что первые и последние слова совпадают
        if (originalWords.length > 0 && this.state.pages.length > 0) {
            const firstPageText = this.state.pages[0].content;
            const lastPageText = this.state.pages[this.state.pages.length - 1].content;
            
            const firstPageDiv = document.createElement('div');
            firstPageDiv.innerHTML = firstPageText;
            const firstPageWords = (firstPageDiv.textContent || '').split(/\s+/).filter(w => w.trim());
            
            const lastPageDiv = document.createElement('div');
            lastPageDiv.innerHTML = lastPageText;
            const lastPageWords = (lastPageDiv.textContent || '').split(/\s+/).filter(w => w.trim());
            
            if (firstPageWords.length > 0 && lastPageWords.length > 0) {
                console.log(`📖 First page starts with: "${firstPageWords[0]}"`);
                console.log(`📖 Last page ends with: "${lastPageWords[lastPageWords.length - 1]}"`);
                console.log(`📖 Original starts with: "${originalWords[0]}"`);
                console.log(`📖 Original ends with: "${originalWords[originalWords.length - 1]}"`);
            }
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
