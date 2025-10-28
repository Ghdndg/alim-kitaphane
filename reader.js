(() => {
    'use strict';

    // Утилиты
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const on = (element, event, handler) => element?.addEventListener(event, handler);

    // Хранилище данных
    const storage = {
        get(key, fallback = null) {
            try {
                const value = localStorage.getItem(`crimreader_${key}`);
                return value ? JSON.parse(value) : fallback;
            } catch {
                return fallback;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(`crimreader_${key}`, JSON.stringify(value));
            } catch {}
        }
    };

    // Главный класс ридера
    class PerfectReader {
        constructor() {
            this.state = {
                bookText: '',
                textSegments: [], // Сегменты текста
                pages: [], // Идеальные страницы
                currentPage: 0,
                totalPages: 0,
                uiVisible: false,
                isLoading: true,
                
                settings: {
                    theme: 'dark',
                    fontSize: 18,
                    lineHeight: 1.6
                }
            };
            
            this.elements = {
                loading: $('#loading'),
                loadingStatus: $('#loading-status'),
                header: $('#header'),
                footer: $('#footer'),
                pageContent: $('#page-content'),
                currentPageEl: $('#current-page'),
                totalPagesEl: $('#total-pages'),
                readingTimeEl: $('#reading-time'),
                progressFill: $('#progress-fill'),
                pageInput: $('#page-input'),
                prevBtn: $('#prev-btn'),
                nextBtn: $('#next-btn'),
                settingsModal: $('#settings-modal')
            };
            
            this.init();
        }
        
        async init() {
            try {
                this.showLoading('Инициализация ридера...');
                
                this.loadSettings();
                await this.loadBook();
                this.prepareText();
                await this.createPages();
                
                this.loadProgress();
                this.bindEvents();
                this.render();
                
                this.hideLoading();
                this.showUIBriefly();
                
                console.log('✅ Perfect Reader initialized successfully');
                console.log(`📖 Total pages: ${this.state.totalPages}`);
                console.log(`📊 Text segments: ${this.state.textSegments.length}`);
                
            } catch (error) {
                console.error('❌ Initialization failed:', error);
                this.showLoading('Ошибка загрuzки. Проверьте файл Khadzhi-Girai.txt');
            }
        }
        
        async loadBook() {
            this.showLoading('Загрузка книги...');
            
            try {
                const response = await fetch('Khadzhi-Girai.txt');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: File not found`);
                }
                
                this.state.bookText = await response.text();
                
                if (!this.state.bookText.trim()) {
                    throw new Error('Book file is empty');
                }
                
                console.log(`📚 Book loaded: ${this.state.bookText.length} characters`);
                
            } catch (error) {
                throw new Error(`Failed to load book: ${error.message}`);
            }
        }
        
        prepareText() {
            this.showLoading('Подготовка текста...');
            
            // Очистка и нормализация текста
            const cleanText = this.state.bookText
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            // Разбиение на параграфы
            const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
            
            // Создание сегментов с метаданными
            this.state.textSegments = [];
            
            paragraphs.forEach((paragraph, index) => {
                const text = paragraph.trim().replace(/\n/g, ' ');
                if (!text) return;
                
                const segment = {
                    id: index,
                    text: text,
                    type: this.getSegmentType(text),
                    wordCount: text.split(/\s+/).length,
                    charCount: text.length
                };
                
                this.state.textSegments.push(segment);
            });
            
            console.log(`📝 Prepared ${this.state.textSegments.length} text segments`);
        }
        
        getSegmentType(text) {
            // Определение типа сегмента
            if (text === 'Хаджи-Гирай' || text.includes('Хаджи-Гирай')) {
                return 'title';
            }
            if (text === 'Алим Къуртсеит' || text.includes('Алим Къуртсеит')) {
                return 'author';
            }
            if (text.length < 80 && (
                text.startsWith('Глава') ||
                text.startsWith('ГЛАВА') ||
                /^[А-ЯЁ\s\-\.]{3,50}$/.test(text) ||
                text === text.toUpperCase()
            )) {
                return 'chapter';
            }
            return 'paragraph';
        }
        
        async createPages() {
            this.showLoading('Создание ГАРАНТИРОВАННОЙ пагинации...');
            
            this.state.pages = [];
            
            // Получаем точные размеры
            const availableHeight = this.getAvailableHeight();
            const fontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size-reading'));
            const lineHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--line-height-reading'));
            
            // МАТЕМАТИЧЕСКИЙ РАСЧЕТ максимального количества строк
            const lineHeightPx = fontSize * lineHeight;
            const maxLines = Math.floor(availableHeight / lineHeightPx);
            const safeMaxLines = Math.max(5, maxLines - 2); // Буфер безопасности
            
            console.log('🧮 Пагинация по строкам:', {
                availableHeight,
                fontSize,
                lineHeight,
                lineHeightPx,
                maxLines,
                safeMaxLines
            });
            
            // Создаем измеритель строк
            const lineCounter = document.createElement('div');
            lineCounter.style.cssText = `
                position: absolute;
                top: -99999px;
                left: 0;
                width: ${Math.min(680, this.elements.pageContent.offsetWidth)}px;
                font-family: var(--font-reading);
                font-size: var(--font-size-reading);
                line-height: var(--line-height-reading);
                padding: 0;
                margin: 0;
                border: none;
                visibility: hidden;
                white-space: pre-wrap;
                word-wrap: break-word;
                hyphens: auto;
            `;
            document.body.appendChild(lineCounter);
            
            let currentPageSegments = [];
            let currentLineCount = 0;
            let segmentIndex = 0;
            
            while (segmentIndex < this.state.textSegments.length) {
                const segment = this.state.textSegments[segmentIndex];
                
                // Подсчитываем строки для этого сегмента
                lineCounter.innerHTML = this.formatSegmentForMeasurement(segment);
                const segmentLines = this.countLines(lineCounter);
                
                // Проверяем, поместится ли сегмент
                if (currentLineCount + segmentLines <= safeMaxLines) {
                    // Сегмент помещается
                    currentPageSegments.push(segment);
                    currentLineCount += segmentLines;
                    segmentIndex++;
                } else {
                    // Сегмент не помещается
                    if (currentPageSegments.length > 0) {
                        // Сохраняем текущую страницу
                        const pageHTML = this.segmentsToHTML(currentPageSegments);
                        this.state.pages.push({
                            id: this.state.pages.length,
                            html: pageHTML,
                            segments: [...currentPageSegments],
                            lineCount: currentLineCount
                        });
                        
                        console.log(`📄 Page ${this.state.pages.length}: ${currentLineCount} lines, ${currentPageSegments.length} segments`);
                        
                        // Начинаем новую страницу
                        currentPageSegments = [];
                        currentLineCount = 0;
                        // НЕ увеличиваем segmentIndex - повторяем с тем же сегментом
                    } else {
                        // Даже один сегмент не помещается - разбиваем
                        const splitSegments = this.splitSegmentByLines(segment, safeMaxLines, lineCounter);
                        for (const splitSeg of splitSegments) {
                            const splitHTML = this.segmentsToHTML([splitSeg]);
                            lineCounter.innerHTML = splitHTML;
                            const splitLines = this.countLines(lineCounter);
                            
                            this.state.pages.push({
                                id: this.state.pages.length,
                                html: splitHTML,
                                segments: [splitSeg],
                                lineCount: splitLines
                            });
                            
                            console.log(`📄 Page ${this.state.pages.length}: ${splitLines} lines (split segment)`);
                        }
                        segmentIndex++;
                    }
                }
                
                // Показываем прогресс
                if (segmentIndex % 5 === 0) {
                    this.showLoading(`Пагинация: ${segmentIndex}/${this.state.textSegments.length} сегментов...`);
                    await this.delay(1);
                }
            }
            
            // Добавляем последнюю страницу
            if (currentPageSegments.length > 0) {
                const pageHTML = this.segmentsToHTML(currentPageSegments);
                this.state.pages.push({
                    id: this.state.pages.length,
                    html: pageHTML,
                    segments: [...currentPageSegments],
                    lineCount: currentLineCount
                });
                
                console.log(`📄 Final page ${this.state.pages.length}: ${currentLineCount} lines`);
            }
            
            document.body.removeChild(lineCounter);
            
            this.state.totalPages = this.state.pages.length;
            
            // ПРОВЕРКА НА ПОТЕРИ
            const originalCount = this.state.textSegments.length;
            const processedCount = this.state.pages.reduce((sum, page) => sum + page.segments.length, 0);
            
            console.log('✅ ПАГИНАЦИЯ ЗАВЕРШЕНА:', {
                totalPages: this.state.totalPages,
                originalSegments: originalCount,
                processedSegments: processedCount,
                maxLinesPerPage: safeMaxLines
            });
            
            if (originalCount === processedCount) {
                console.log('🎉 ИДЕАЛЬНО! Все сегменты сохранены!');
            } else {
                console.error(`❌ ПОТЕРИ: ${originalCount - processedCount} сегментов потеряно!`);
            }
        }

        
        async splitLongSegment(segment, availableHeight, measurer) {
            const sentences = segment.text.split(/(?<=[.!?])\s+/);
            const pages = [];
            let currentSentences = [];
            
            for (const sentence of sentences) {
                const testSentences = [...currentSentences, sentence];
                const testSegment = {
                    ...segment,
                    text: testSentences.join(' ')
                };
                const testHTML = this.segmentsToHTML([testSegment]);
                
                measurer.innerHTML = testHTML;
                
                if (measurer.scrollHeight <= availableHeight) {
                    currentSentences.push(sentence);
                } else {
                    if (currentSentences.length > 0) {
                        const pageSegment = {
                            ...segment,
                            text: currentSentences.join(' ')
                        };
                        pages.push({
                            id: pages.length,
                            html: this.segmentsToHTML([pageSegment]),
                            segments: [pageSegment],
                            wordCount: pageSegment.wordCount
                        });
                        currentSentences = [sentence];
                    } else {
                        // Даже одно предложение не помещается - принудительно добавляем
                        const forceSegment = {
                            ...segment,
                            text: sentence
                        };
                        pages.push({
                            id: pages.length,
                            html: this.segmentsToHTML([forceSegment]),
                            segments: [forceSegment],
                            wordCount: forceSegment.wordCount
                        });
                    }
                }
            }
            
            if (currentSentences.length > 0) {
                const pageSegment = {
                    ...segment,
                    text: currentSentences.join(' ')
                };
                pages.push({
                    id: pages.length,
                    html: this.segmentsToHTML([pageSegment]),
                    segments: [pageSegment],
                    wordCount: pageSegment.wordCount
                });
            }
            
            return pages;
        }
        
        createMeasurer() {
            const measurer = document.createElement('div');
            const computedStyle = getComputedStyle(this.elements.pageContent);
            
            measurer.style.cssText = `
                position: absolute;
                top: -99999px;
                left: 0;
                width: ${this.elements.pageContent.offsetWidth}px;
                font-family: ${computedStyle.fontFamily};
                font-size: ${computedStyle.fontSize};
                line-height: ${computedStyle.lineHeight};
                color: ${computedStyle.color};
                overflow: hidden;
                box-sizing: border-box;
                visibility: hidden;
                pointer-events: none;
                word-wrap: break-word;
                hyphens: auto;
                -webkit-hyphens: auto;
                padding: 0;
                margin: 0;
                border: none;
            `;
            
            return measurer;
        }

        
        getAvailableHeight() {
            const computedStyle = getComputedStyle(document.documentElement);
            const headerHeight = parseInt(computedStyle.getPropertyValue('--header-height'));
            const footerHeight = parseInt(computedStyle.getPropertyValue('--footer-height'));
            const pagePadding = parseInt(computedStyle.getPropertyValue('--page-padding'));
            const safeAreaBottom = parseInt(computedStyle.getPropertyValue('--safe-area-bottom')) || 0;
            
            const availableHeight = window.innerHeight - headerHeight - (footerHeight + safeAreaBottom) - (pagePadding * 2);
            const buffer = 10;
            const finalHeight = Math.max(200, availableHeight - buffer);
            
            console.log('📏 Height calculation:', {
                windowHeight: window.innerHeight,
                headerHeight: headerHeight,
                footerHeight: footerHeight + safeAreaBottom,
                pagePadding: pagePadding * 2,
                buffer: buffer,
                availableHeight: availableHeight,
                finalHeight: finalHeight
            });
            
            return finalHeight;
        }

        
        segmentsToHTML(segments) {
            return segments.map(segment => {
                switch (segment.type) {
                    case 'title':
                        return `<h1>${segment.text}</h1>`;
                    case 'author':
                        return `<div class="author">${segment.text}</div>`;
                    case 'chapter':
                        return `<h2>${segment.text}</h2>`;
                    default:
                        return `<p>${segment.text}</p>`;
                }
            }).join('');
        }
        
        validatePagination() {
            const totalOriginalWords = this.state.textSegments.reduce((sum, s) => sum + s.wordCount, 0);
            const totalPageWords = this.state.pages.reduce((sum, p) => sum + p.wordCount, 0);
            
            console.log(`📊 Original words: ${totalOriginalWords}`);
            console.log(`📊 Paginated words: ${totalPageWords}`);
            
            if (Math.abs(totalOriginalWords - totalPageWords) > 10) {
                console.warn(`⚠️ Word count mismatch: ${totalOriginalWords - totalPageWords} words difference`);
            } else {
                console.log('✅ Perfect pagination - no text lost!');
            }
        }
        
        // UI и навигация
        render() {
            if (!this.state.pages[this.state.currentPage]) return;
            
            const page = this.state.pages[this.state.currentPage];
            this.elements.pageContent.innerHTML = page.html;
            
            this.updateProgress();
            this.updateNavigation();
        }
        
        updateProgress() {
            const current = this.state.currentPage + 1;
            const total = this.state.totalPages;
            
            this.elements.currentPageEl.textContent = current;
            this.elements.totalPagesEl.textContent = total;
            this.elements.pageInput.value = current;
            this.elements.pageInput.max = total;
            
            // Прогресс бар
            const progress = total > 1 ? (this.state.currentPage / (total - 1)) * 100 : 0;
            this.elements.progressFill.style.width = `${progress}%`;
            
            // Время чтения
            const remainingPages = total - current;
            const minutes = Math.ceil(remainingPages * 1.5);
            this.elements.readingTimeEl.textContent = `~${minutes} мин`;
            
            this.saveProgress();
        }
        
        updateNavigation() {
            this.elements.prevBtn.disabled = this.state.currentPage === 0;
            this.elements.nextBtn.disabled = this.state.currentPage === this.state.totalPages - 1;
        }
        
        nextPage() {
            if (this.state.currentPage < this.state.totalPages - 1) {
                this.state.currentPage++;
                this.render();
            }
        }
        
        prevPage() {
            if (this.state.currentPage > 0) {
                this.state.currentPage--;
                this.render();
            }
        }
        
        goToPage(pageNumber) {
            const page = Math.max(0, Math.min(pageNumber - 1, this.state.totalPages - 1));
            if (page !== this.state.currentPage) {
                this.state.currentPage = page;
                this.render();
            }
        }
        
        // Настройки и состояние
        loadSettings() {
            const saved = storage.get('settings');
            if (saved) {
                Object.assign(this.state.settings, saved);
            }
            this.applySettings();
        }
        
        updateSetting(key, value) {
            this.state.settings[key] = value;
            this.applySettings();
            this.saveSettings();
            
            // Пересоздаем страницы при изменении настроек
            if (key === 'fontSize' || key === 'lineHeight') {
                setTimeout(() => {
                    this.createPages().then(() => {
                        this.render();
                    });
                }, 100);
            }
        }
        
        applySettings() {
            document.body.setAttribute('data-theme', this.state.settings.theme);
            document.documentElement.style.setProperty('--font-size-reading', `${this.state.settings.fontSize}px`);
            document.documentElement.style.setProperty('--line-height-reading', this.state.settings.lineHeight);
        }
        
        saveSettings() {
            storage.set('settings', this.state.settings);
        }
        
        updateSettingsUI() {
            // Обновляем кнопки тем
            $$('.option-btn[data-theme]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === this.state.settings.theme);
            });
            
            // Обновляем слайдеры
            $('#font-size-slider').value = this.state.settings.fontSize;
            $('#font-size-value').textContent = `${this.state.settings.fontSize}px`;
            
            $('#line-height-slider').value = this.state.settings.lineHeight;
            $('#line-height-value').textContent = this.state.settings.lineHeight.toFixed(1);
        }
        
        saveProgress() {
            storage.set('progress', {
                page: this.state.currentPage,
                timestamp: Date.now()
            });
        }
        
        loadProgress() {
            const saved = storage.get('progress');
            if (saved && saved.page < this.state.totalPages) {
                this.state.currentPage = saved.page;
            }
        }
        
        // UI состояния
        showLoading(message) {
            this.elements.loadingStatus.textContent = message;
            this.elements.loading.classList.remove('hidden');
        }
        
        hideLoading() {
            this.elements.loading.classList.add('hidden');
        }
        
        toggleUI() {
            this.state.uiVisible = !this.state.uiVisible;
            this.elements.header.classList.toggle('visible', this.state.uiVisible);
            this.elements.footer.classList.toggle('visible', this.state.uiVisible);
        }
        
        showUIBriefly() {
            this.state.uiVisible = true;
            this.elements.header.classList.add('visible');
            this.elements.footer.classList.add('visible');
            
            setTimeout(() => {
                this.state.uiVisible = false;
                this.elements.header.classList.remove('visible');
                this.elements.footer.classList.remove('visible');
            }, 3000);
        }
        
        showSettings() {
            this.elements.settingsModal.classList.add('visible');
            this.updateSettingsUI();
        }
        
        hideSettings() {
            this.elements.settingsModal.classList.remove('visible');
        }
        
        // События
        bindEvents() {
            // Навигация
            on(this.elements.prevBtn, 'click', () => this.prevPage());
            on(this.elements.nextBtn, 'click', () => this.nextPage());
            
            // Touch zones
            on($('#prev-zone'), 'click', () => this.prevPage());
            on($('#next-zone'), 'click', () => this.nextPage());
            on($('#menu-zone'), 'click', () => this.toggleUI());
            
            // Ввод страницы
            on(this.elements.pageInput, 'change', (e) => {
                this.goToPage(parseInt(e.target.value) || 1);
            });
            
            // Прогресс бар
            on($('#progress-bar'), 'click', (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const page = Math.ceil(ratio * this.state.totalPages);
                this.goToPage(page);
            });
            
            // Настройки
            on($('#settings-btn'), 'click', () => this.showSettings());
            on($('#close-settings'), 'click', () => this.hideSettings());
            on(this.elements.settingsModal, 'click', (e) => {
                if (e.target === this.elements.settingsModal) this.hideSettings();
            });
            
            // Кнопки тем
            $$('.option-btn[data-theme]').forEach(btn => {
                on(btn, 'click', () => this.updateSetting('theme', btn.dataset.theme));
            });
            
            // Слайдеры
            on($('#font-size-slider'), 'input', (e) => {
                const size = parseInt(e.target.value);
                $('#font-size-value').textContent = `${size}px`;
                this.updateSetting('fontSize', size);
            });
            
            on($('#line-height-slider'), 'input', (e) => {
                const height = parseFloat(e.target.value);
                $('#line-height-value').textContent = height.toFixed(1);
                this.updateSetting('lineHeight', height);
            });
            
            // Клавиатура
            on(document, 'keydown', (e) => {
                if (e.target.tagName === 'INPUT') return;
                
                switch (e.key) {
                    case 'ArrowLeft':
                    case 'PageUp':
                        e.preventDefault();
                        this.prevPage();
                        break;
                    case 'ArrowRight':
                    case 'PageDown':
                    case ' ':
                        e.preventDefault();
                        this.nextPage();
                        break;
                    case 'Home':
                        e.preventDefault();
                        this.goToPage(1);
                        break;
                    case 'End':
                        e.preventDefault();
                        this.goToPage(this.state.totalPages);
                        break;
                    case 'Escape':
                        if (this.elements.settingsModal.classList.contains('visible')) {
                            this.hideSettings();
                        } else if (this.state.uiVisible) {
                            this.toggleUI();
                        }
                        break;
                }
            });
        }
        
                delay(ms) {
                    return new Promise(resolve => setTimeout(resolve, ms));
                }
                
                // НОВЫЕ МЕТОДЫ ДЛЯ ТОЧНОЙ ПАГИНАЦИИ
                countLines(element) {
                    const style = getComputedStyle(element);
                    const lineHeight = parseFloat(style.lineHeight);
                    const height = element.offsetHeight;
                    return Math.ceil(height / lineHeight);
                }
        
                formatSegmentForMeasurement(segment) {
                    switch (segment.type) {
                        case 'title':
                            return `<h1 style="font-size: clamp(1.75rem, 4vw, 2.5rem); line-height: 1.2; margin: 0 0 1.5rem 0; font-weight: 700;">${segment.text}</h1>`;
                        case 'author':
                            return `<div style="font-size: 1.25rem; font-style: italic; text-align: center; margin: 1rem 0 3rem 0;">${segment.text}</div>`;
                        case 'chapter':
                            return `<h2 style="font-size: clamp(1.25rem, 3vw, 1.75rem); line-height: 1.3; margin: 2rem 0 1rem 0; font-weight: 600;">${segment.text}</h2>`;
                        default:
                            return `<p style="margin: 0 0 1rem 0; text-align: justify;">${segment.text}</p>`;
                    }
                }
        
                splitSegmentByLines(segment, maxLines, measurer) {
                    const words = segment.text.split(' ');
                    const splitSegments = [];
                    let currentWords = [];
                    
                    for (let i = 0; i < words.length; i++) {
                        const testWords = [...currentWords, words[i]];
                        const testSegment = { ...segment, text: testWords.join(' ') };
                        const testHTML = this.formatSegmentForMeasurement(testSegment);
                        
                        measurer.innerHTML = testHTML;
                        const lines = this.countLines(measurer);
                        
                        if (lines <= maxLines) {
                            currentWords.push(words[i]);
                        } else {
                            if (currentWords.length > 0) {
                                splitSegments.push({
                                    ...segment,
                                    text: currentWords.join(' ')
                                });
                                currentWords = [words[i]];
                            } else {
                                // Даже одно слово не помещается - добавляем принудительно
                                splitSegments.push({
                                    ...segment,
                                    text: words[i]
                                });
                            }
                        }
                    }
                    
                    if (currentWords.length > 0) {
                        splitSegments.push({
                            ...segment,
                            text: currentWords.join(' ')
                        });
                    }
                    
                    return splitSegments;
                }
            }


    // Инициализация
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new PerfectReader());
    } else {
        new PerfectReader();
    }
})();
