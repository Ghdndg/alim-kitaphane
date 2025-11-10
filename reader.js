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
            console.log('Initializing Yandex Books Reader...');
            
            this.updateLoadingStatus('Загрузка настроек...');
            this.loadSettings();
            
            this.updateLoadingStatus('Загрузка книги...');
            await this.loadBookFile();
            
            this.updateLoadingStatus('Создание страниц...');
            this.createPages();
            
            this.updateLoadingStatus('Настройка интерфейса...');
            this.setupEventHandlers();  // ← здесь уже есть обработчик скролла
            
            this.loadProgress();
            this.renderCurrentPage();
            this.hideLoading();
            
            // ← ДОБАВЬТЕ ЭТУ СТРОКУ
            this.loadScrollPosition();
            
            this.showUITemporarily();
            
            console.log('Reader initialized successfully');
            console.log(`Total pages: ${this.state.totalPages}`);
        } catch (error) {
            console.error('Reader initialization failed', error);
            this.showError(error.message);
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
     * Простой режим: одна длинная страница с прокруткой (без пагинации)
     */
    createPages() {
        console.log('📄 Creating single scrollable page...');
        const normalizedText = this.preprocessText(this.state.bookContent);
        const paragraphs = normalizedText.split(/\n\s*\n/).filter(Boolean);
        
        const parts = [];
        // Заголовок и автор
        parts.push('<h1>Хаджи Гирай</h1>');
        parts.push('<div class="author">Алим Мидат</div>');
        
        // Абзацы
        for (const p of paragraphs) {
            parts.push(`<p>${this.escapeHtml(p)}</p>`);
        }
        
        const content = parts.join('\n');
        this.state.pages = [{ id: 0, content, wordCount: this.countWords(normalizedText) }];
        this.state.totalPages = 1;
        this.state.currentPageIndex = 0;
        console.log('✅ Single page created');
    }

    /** Строгий режим: выделение главных абзацев + точная подгонка без потерь */
    createPagesStrict(words) {
        console.log('📄 STRICT MODE: Creating pages with main paragraph detection...');
        
        const normalizedText = this.preprocessText(this.state.bookContent);
        const paragraphs = this.splitIntoParagraphs(normalizedText);
        const mainParagraphs = this.identifyMainParagraphs(paragraphs);
        
        console.log(`📊 Found ${paragraphs.length} paragraphs, ${mainParagraphs.length} main paragraphs`);
        
        const measureEl = this.createMeasureElement();
        const maxHeight = this.getMaxContentHeight();
        this.state.pages = [];
        
        let currentPageContent = '';
        let currentPageWords = 0;
        let pageNumber = 0;
        
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            const isMain = mainParagraphs.includes(i);
            const paragraphWords = paragraph.split(/\s+/).filter(Boolean);
            
            // Форматируем абзац с учетом его важности
            const formattedParagraph = this.formatParagraph(paragraph, isMain, pageNumber === 0 && i === 0);
            
            // Проверяем, поместится ли абзац на текущую страницу
            const testContent = currentPageContent + (currentPageContent ? '\n\n' : '') + formattedParagraph;
            const testHtml = this.formatSimplePage(testContent, pageNumber === 0 ? 0 : currentPageWords);
            measureEl.innerHTML = testHtml;
            measureEl.offsetHeight;
            
            if (measureEl.scrollHeight <= maxHeight) {
                // Абзац помещается на текущую страницу
                currentPageContent = testContent;
                currentPageWords += paragraphWords.length;
            } else {
                // Абзац не помещается, создаем новую страницу
                if (currentPageContent.trim()) {
            this.state.pages.push({
                        id: pageNumber,
                        content: this.formatSimplePage(currentPageContent, pageNumber === 0 ? 0 : currentPageWords - paragraphWords.length),
                        wordCount: currentPageWords - paragraphWords.length
                    });
                    pageNumber++;
                }
                
                // Пытаемся поместить абзац на новую страницу
                currentPageContent = formattedParagraph;
                currentPageWords = paragraphWords.length;
                
                // Если абзац слишком длинный, разбиваем его точно по словам
                if (measureEl.scrollHeight > maxHeight) {
                    const splitResult = this.splitLongParagraphStrict(paragraph, isMain, pageNumber === 0, measureEl, maxHeight);
                    currentPageContent = splitResult.content;
                    currentPageWords = splitResult.wordCount;
                }
            }
        }
        
        // Добавляем последнюю страницу
        if (currentPageContent.trim()) {
            this.state.pages.push({
                id: pageNumber,
                content: this.formatSimplePage(currentPageContent, pageNumber === 0 ? 0 : currentPageWords),
                wordCount: currentPageWords
            });
        }
        
        measureEl.remove();
        this.state.totalPages = this.state.pages.length;
        
        // Строгая проверка целостности
        const diff = this.validateTextIntegrity(normalizedText, normalizedText.split(/\s+/).filter(Boolean));
        if (Math.abs(diff) > 0) {
            console.warn(`⚠️ Paragraph mode integrity diff = ${diff}. Falling back to word-by-word mode...`);
            this.createPagesWordByWord(words);
        }
        
        console.log(`✅ STRICT PAGES CREATED: ${this.state.totalPages} pages total`);
    }

    /** Разбивает текст на абзацы */
    splitIntoParagraphs(text) {
        return text
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);
    }

    /** Выявляет главные абзацы по ключевым словам и длине */
    identifyMainParagraphs(paragraphs) {
        const mainParagraphs = [];
        const mainKeywords = [
            'хаджи', 'гирай', 'крым', 'хан', 'татар', 'история', 'биография',
            'родился', 'умер', 'правил', 'государство', 'династия', 'основатель',
            'бабам', 'мидат', 'къуртсеит', 'айдын', 'хатырасына', 'багъышлайым',
            'лагъабы', 'эди', 'мелек', 'янъы', 'яратылгъан', 'эсернинъ', 'къараманы',
            'муэллифи', 'акъкъында', 'тарихий', 'мевзугъа', 'сиясий', 'ичтимаий',
            'кечмишимизде', 'из', 'къалдыргъан', 'инсанларгъа', 'бедиий', 'весикъалы',
            'публицистик', 'эдебиятымызда', 'бошлукълар', 'мевджут', 'олгъаны'
        ];
        
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].toLowerCase();
            const wordCount = paragraph.split(/\s+/).length;
            
            // Главный абзац если:
            // 1. Содержит ключевые слова
            // 2. Имеет достаточную длину (не менее 15 слов)
            // 3. Начинается с заглавной буквы (вероятно начало предложения)
            const hasKeywords = mainKeywords.some(keyword => paragraph.includes(keyword));
            const isLongEnough = wordCount >= 15;
            const startsProperly = paragraphs[i].match(/^[А-ЯЁ]/);
            
            if ((hasKeywords || isLongEnough) && startsProperly) {
                mainParagraphs.push(i);
            }
        }
        
        return mainParagraphs;
    }

    /** Форматирует абзац с учетом его важности */
    formatParagraph(text, isMain, isFirst) {
        if (isFirst) {
            return `<h1>Хаджи Гирай</h1><div class="author">Алим Мидат</div><p class="${isMain ? 'main-paragraph' : ''}">${this.escapeHtml(text)}</p>`;
        }
        
        if (isMain) {
            return `<p class="main-paragraph">${this.escapeHtml(text)}</p>`;
        }
        
        return `<p>${this.escapeHtml(text)}</p>`;
    }

    /** Разбивает длинный абзац точно по словам без потерь */
    splitLongParagraphStrict(paragraph, isMain, isFirst, measureEl, maxHeight) {
        const words = paragraph.split(/\s+/).filter(Boolean);
        let best = 1;
        
        // Бинарный поиск максимального количества слов
        let low = 1;
        let high = words.length;
        
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const sliceText = words.slice(0, mid).join(' ');
            const formatted = this.formatParagraph(sliceText, isMain, isFirst);
            const testHtml = this.formatSimplePage(formatted, 0);
            measureEl.innerHTML = testHtml;
            measureEl.offsetHeight;
            
            if (measureEl.scrollHeight <= maxHeight) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        
        // Точная доводка по одному слову
        while (best < words.length) {
            const testSlice = words.slice(0, best + 1).join(' ');
            const testFormatted = this.formatParagraph(testSlice, isMain, isFirst);
            const testHtml = this.formatSimplePage(testFormatted, 0);
            measureEl.innerHTML = testHtml;
            measureEl.offsetHeight;
            
            if (measureEl.scrollHeight <= maxHeight) {
                best += 1;
            } else {
                break;
            }
        }
        
        const content = words.slice(0, best).join(' ');
        return {
            content: this.formatParagraph(content, isMain, isFirst),
            wordCount: best
        };
    }

    /** Последний резерв: слово за словом без потерь */
    createPagesWordByWord(words) {
        console.log('📄 WORD-BY-WORD MODE: Creating pages without any losses...');
        
        const measureEl = this.createMeasureElement();
        const maxHeight = this.getMaxContentHeight();
        this.state.pages = [];
        let index = 0;
        let pageNumber = 0;
        
        while (index < words.length) {
            let wordCount = 1;
            
            // Добавляем слова по одному пока помещается
            while (index + wordCount < words.length) {
                const sliceText = words.slice(index, index + wordCount + 1).join(' ');
                const html = this.formatSimplePage(sliceText, pageNumber === 0 ? 0 : index);
                measureEl.innerHTML = html;
                measureEl.offsetHeight;
                
                if (measureEl.scrollHeight <= maxHeight) {
                    wordCount++;
                } else {
                    break;
                }
            }
            
            const pageText = words.slice(index, index + wordCount).join(' ');
            const formatted = this.formatSimplePage(pageText, pageNumber === 0 ? 0 : index);
            this.state.pages.push({ id: pageNumber, content: formatted, wordCount: wordCount });
            
            index += wordCount;
            pageNumber += 1;
            
            if (wordCount === 0) {
                console.error('❌ CRITICAL: No words fit, forcing single word');
                this.state.pages.push({ 
                    id: pageNumber, 
                    content: this.formatSimplePage(words[index] || '', index), 
                    wordCount: 1 
                });
                index += 1;
                pageNumber += 1;
            }
        }
        
        measureEl.remove();
        this.state.totalPages = this.state.pages.length;
        
        // Финальная проверка целостности
        const diff = this.validateTextIntegrity(this.preprocessText(this.state.bookContent), words);
        if (Math.abs(diff) > 0) {
            console.error(`❌ CRITICAL: Word-by-word mode still has ${diff} word difference!`);
        }
        
        console.log(`✅ WORD-BY-WORD PAGES CREATED: ${this.state.totalPages} pages total`);
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
                const safe = Math.max(0, Math.floor(rect.height - 4)); // небольшой безопасный отступ
                console.log(`📏 Using actual page content height: ${rect.height}px -> safe ${safe}px`);
                return safe;
            }
        }
        
        const computed = this.computePageContentCssHeight();
        const safeComputed = Math.max(0, computed - 4);
        console.log(`📏 Using computed height: ${computed}px -> safe ${safeComputed}px`);
        return safeComputed;
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
        const diff = originalWordCount - pageWordCount;
        console.log(`   Difference: ${diff}`);
        
        if (Math.abs(diff) > 10) {
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
        
        return diff;
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
            .replace(/\n{3,}/g, '\n\n')        // всегда двойной перевод строки для разметки абзацев
            .replace(/[ \t]+\n/g, '\n')        // убираем лишние пробелы перед переводом строки
            .replace(/\n[ \t]+/g, '\n')        // убираем лишние пробелы после перевода строки
            .replace(/[ \t]{2,}/g, ' ')        // двойные и больше пробелы -> 1 пробел
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
        this.bindScrollProgressEvents();
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
        // Простая реализация свайпов и тап по центру для показа/скрытия меню
        let touchStartX = 0;
        let touchStartY = 0;
        
        if (this.elements.readingViewport) {
            const vp = this.elements.readingViewport;
            
            vp.addEventListener('touchstart', (event) => {
                touchStartX = event.touches[0].clientX;
                touchStartY = event.touches[0].clientY;
            }, { passive: true });
            
            vp.addEventListener('touchend', (event) => {
                const touchEndX = event.changedTouches[0].clientX;
                const touchEndY = event.changedTouches[0].clientY;
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;
                
                // Горизонтальный свайп (только если несколько страниц)
                if (this.state.totalPages > 1 && Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
                    if (deltaX > 0) {
                        this.goToPreviousPage();
                    } else {
                        this.goToNextPage();
                    }
                    return;
                }
                
                // Тап по центру (в пределах средней трети ширины)
                const rect = vp.getBoundingClientRect();
                const x = event.changedTouches[0].clientX - rect.left;
                const ratio = x / Math.max(1, rect.width);
                if (ratio > 0.33 && ratio < 0.66 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                    this.toggleUI();
                }
            });
            
            // Поддержка клика мышью по центру
            vp.addEventListener('click', (event) => {
                // Игнорируем клики по ссылкам/выделениям
                if ((event.target && (event.target.closest('a') || window.getSelection()?.toString()))){
                    return;
                }
                const rect = vp.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const ratio = x / Math.max(1, rect.width);
                if (ratio > 0.33 && ratio < 0.66) {
                    this.toggleUI();
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
        if (this.state.totalPages === 1) {
            // Прогресс по прокрутке
            this.updateScrollProgressUI();
            // Скрываем кнопки перелистывания
            if (this.elements.prevButton) this.elements.prevButton.style.display = 'none';
            if (this.elements.nextButton) this.elements.nextButton.style.display = 'none';
            return;
        }
        
        const currentIndex = this.state.currentPageIndex;
        const totalPages = this.state.totalPages;
        const progressPercentage = totalPages > 1 ? (currentIndex / (totalPages - 1)) * 100 : 0;
        
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progressPercentage}%`;
        }
        if (this.elements.currentProgress) {
            this.elements.currentProgress.textContent = Math.round(progressPercentage).toString();
        }
        if (this.elements.readingTime) {
            const remainingPages = totalPages - currentIndex - 1;
            const estimatedMinutes = Math.ceil(remainingPages * 0.5);
            this.elements.readingTime.textContent = `${estimatedMinutes} мин`;
        }
        if (this.elements.prevButton) {
            this.elements.prevButton.disabled = currentIndex === 0;
        }
        if (this.elements.nextButton) {
            this.elements.nextButton.disabled = currentIndex >= totalPages - 1;
        }
    }

    /** Прогресс прокрутки */
    bindScrollProgressEvents() {
        if (!this.elements.readingViewport) return;
        let rafId = null;
        const onScroll = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                this.updateScrollProgressUI();
                rafId = null;
            });
        };
        this.elements.readingViewport.addEventListener('scroll', onScroll, { passive: true });
        // начальное обновление
        this.updateScrollProgressUI();
    }

    updateScrollProgressUI() {
        if (!this.elements.readingViewport) return;
        const vp = this.elements.readingViewport;
        const max = Math.max(1, vp.scrollHeight - vp.clientHeight);
        const ratio = Math.min(1, Math.max(0, vp.scrollTop / max));
        const pct = Math.round(ratio * 100);
        if (this.elements.progressFill) this.elements.progressFill.style.width = `${pct}%`;
        if (this.elements.currentProgress) this.elements.currentProgress.textContent = String(pct);
        if (this.elements.readingTime) {
            // Грубая оценка: 200 слов/мин
            const totalWords = this.state.pages[0]?.wordCount || this.countWords(this.state.bookContent);
            const remainingRatio = 1 - ratio;
            const minutes = Math.max(1, Math.ceil((totalWords / 200) * remainingRatio));
            this.elements.readingTime.textContent = `${minutes} мин`;
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

        // Сохраняет позицию прокрутки
    // Сохраняет позицию прокрутки ВНУТРИ reading-viewport
    saveScrollPosition() {
        try {
            const viewport = this.elements.readingViewport;
            if (!viewport) return;
            
            const scrollData = {
                scrollTop: viewport.scrollTop,
                timestamp: Date.now()
            };
            localStorage.setItem(`${this.storageKey}-scroll`, JSON.stringify(scrollData));
            console.log('Saved scroll position:', scrollData.scrollTop);
        } catch (error) {
            console.warn('Failed to save scroll position', error);
        }
    }

    // Загружает сохранённую позицию прокрутки
    loadScrollPosition() {
        try {
            const savedScroll = localStorage.getItem(`${this.storageKey}-scroll`);
            if (!savedScroll) return;
            
            const scrollData = JSON.parse(savedScroll);
            const viewport = this.elements.readingViewport;
            
            if (!viewport) {
                console.warn('reading-viewport element not found');
                return;
            }
            
            // Ждём, пока контент точно загрузится
            const restoreScroll = () => {
                if (viewport.scrollHeight > 100) {  // Проверяем, что контент загружен
                    viewport.scrollTop = scrollData.scrollTop;
                    console.log('Scroll position restored:', scrollData.scrollTop);
                } else {
                    setTimeout(restoreScroll, 100);  // Повторяем через 100ms
                }
            };
            
            setTimeout(restoreScroll, 200);  // Начинаем через 200ms
        } catch (error) {
            console.warn('Failed to load scroll position', error);
        }
    }
    

    setupEventListeners() {
        console.log('Setting up event listeners...');
        this.bindNavigationEvents();
        this.bindUIControlEvents();
        this.bindSettingsEvents();
        this.bindKeyboardEvents();
        this.bindGestureEvents();
        this.bindResizeEvents();
        this.bindScrollProgressEvents();
        
        // Сохранение позиции скролла для reading-viewport (не window!)
        const viewport = this.elements.readingViewport;
        if (viewport) {
            let scrollTimeout;
            viewport.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.saveScrollPosition();
                }, 1000);
            });
        }
        
        console.log('Event handlers set up');
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
