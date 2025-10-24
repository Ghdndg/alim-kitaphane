(() => {
    'use strict';

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));
    const on = (element, event, handler) => element?.addEventListener(event, handler);

    // Storage utilities
    const storage = {
        get(key, fallback = null) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : fallback;
            } catch {
                return fallback;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch {}
        }
    };

    // Application state
    const state = {
        bookText: '',
        allWords: [], // ВСЕ СЛОВА ПО ПОРЯДКУ
        pages: [], // СТРАНИЦЫ С ТОЧНЫМИ СЛОВАМИ
        currentPageIndex: 0,
        totalPages: 0,
        uiVisible: false,
        
        settings: {
            theme: 'dark',
            fontSize: 18,
            lineHeight: 1.6
        }
    };

    // Settings management
    const settings = {
        load() {
            const saved = storage.get('crimchitalka_settings');
            if (saved) {
                Object.assign(state.settings, saved);
            }
            this.apply();
            this.updateUI();
        },
        
        save() {
            storage.set('crimchitalka_settings', state.settings);
        },
        
        apply() {
            document.body.setAttribute('data-theme', state.settings.theme);
            
            document.documentElement.style.setProperty('--font-size-reading', `${state.settings.fontSize}px`);
            document.documentElement.style.setProperty('--line-height-reading', state.settings.lineHeight);
            
            this.save();
        },
        
        update(key, value) {
            state.settings[key] = value;
            this.apply();
            this.updateUI();
            
            // Re-paginate when settings change
            setTimeout(() => {
                reader.createPages();
                reader.render();
            }, 100);
        },
        
        updateUI() {
            $$('.option-btn[data-theme]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
            });
            
            const fontSizeSlider = $('#font-size-slider');
            const fontSizeValue = $('#font-size-value');
            if (fontSizeSlider && fontSizeValue) {
                fontSizeSlider.value = state.settings.fontSize;
                fontSizeValue.textContent = `${state.settings.fontSize}px`;
            }
            
            const lineHeightSlider = $('#line-height-slider');
            const lineHeightValue = $('#line-height-value');
            if (lineHeightSlider && lineHeightValue) {
                lineHeightSlider.value = state.settings.lineHeight;
                lineHeightValue.textContent = state.settings.lineHeight.toFixed(1);
            }
        }
    };

    // Progress management
    const progress = {
        save() {
            storage.set('crimchitalka_progress', {
                pageIndex: state.currentPageIndex,
                timestamp: Date.now()
            });
        },
        
        load() {
            const saved = storage.get('crimchitalka_progress');
            if (saved && saved.pageIndex < state.totalPages) {
                state.currentPageIndex = saved.pageIndex;
            }
        },
        
        update() {
            const currentPos = $('#current-page');
            const totalPos = $('#total-pages');
            const readingTime = $('#reading-time');
            const progressFill = $('#progress-fill');
            const pageInput = $('#page-input');
            
            const currentPage = state.currentPageIndex + 1;
            
            if (currentPos) currentPos.textContent = currentPage;
            if (totalPos) totalPos.textContent = state.totalPages;
            if (pageInput) {
                pageInput.value = currentPage;
                pageInput.max = state.totalPages;
            }
            
            if (readingTime) {
                const remainingPages = state.totalPages - currentPage;
                const minutes = Math.ceil(remainingPages * 1.5);
                readingTime.textContent = `~${minutes} мин`;
            }
            
            const progressPercent = state.totalPages > 1 ? (state.currentPageIndex / (state.totalPages - 1)) * 100 : 0;
            if (progressFill) progressFill.style.width = `${progressPercent}%`;
            
            this.save();
        }
    };

    // UI management
    const ui = {
        showLoading(message = 'Загрузка...') {
            const loading = $('#loading');
            const status = $('#loading-status');
            if (status) status.textContent = message;
            if (loading) loading.classList.remove('hidden');
        },
        
        hideLoading() {
            const loading = $('#loading');
            if (loading) loading.classList.add('hidden');
        },
        
        toggleUI() {
            state.uiVisible = !state.uiVisible;
            const header = $('#header');
            const footer = $('#footer');
            
            if (header) header.classList.toggle('visible', state.uiVisible);
            if (footer) footer.classList.toggle('visible', state.uiVisible);
        },
        
        showSettings() {
            const modal = $('#settings-modal');
            if (modal) modal.classList.add('visible');
        },
        
        hideSettings() {
            const modal = $('#settings-modal');
            if (modal) modal.classList.remove('visible');
        }
    };

    // Main reader functionality
    const reader = {
        async init() {
            try {
                ui.showLoading('Загрузка книги...');
                
                settings.load();
                await this.loadBook();
                this.prepareWords();
                this.createPages();
                
                progress.load();
                this.bindEvents();
                this.render();
                
                ui.hideLoading();
                
                // Show UI briefly
                setTimeout(() => {
                    ui.toggleUI();
                    setTimeout(() => ui.toggleUI(), 3000);
                }, 500);
                
            } catch (error) {
                console.error('Failed to initialize reader:', error);
                ui.showLoading('Ошибка загрузки. Проверьте файл Khadzhi-Girai.txt');
            }
        },
        
        async loadBook() {
            try {
                ui.showLoading('Загрузка текста книги...');
                
                const response = await fetch('Khadzhi-Girai.txt');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Khadzhi-Girai.txt not found`);
                }
                
                state.bookText = await response.text();
                console.log('📖 Book loaded, length:', state.bookText.length, 'characters');
                
                if (!state.bookText.trim()) {
                    throw new Error('Book file is empty');
                }
                
            } catch (error) {
                console.error('Failed to load book:', error);
                throw error;
            }
        },
        
        prepareWords() {
            ui.showLoading('Разбиение на слова...');
            
            // Очистка текста
            const cleanText = state.bookText
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            // Разбиение на слова с сохранением структуры
            state.allWords = [];
            
            const paragraphs = cleanText.split('\n\n');
            
            paragraphs.forEach((paragraph, paragraphIndex) => {
                const trimmedParagraph = paragraph.trim().replace(/\n/g, ' ');
                if (!trimmedParagraph) return;
                
                // Определяем тип параграфа (заголовок или обычный текст)
                const isTitle = trimmedParagraph.length < 100 && (
                    trimmedParagraph === trimmedParagraph.toUpperCase() || 
                    /^[А-ЯЁ\s\-]+$/.test(trimmedParagraph) ||
                    trimmedParagraph.startsWith('Глава') ||
                    trimmedParagraph.startsWith('ГЛАВА')
                );
                
                // Маркер начала параграфа
                state.allWords.push({
                    type: 'paragraph_start',
                    isTitle: isTitle,
                    paragraphIndex: paragraphIndex
                });
                
                // Разбиваем на слова
                const words = trimmedParagraph.split(/\s+/).filter(w => w.trim());
                
                words.forEach(word => {
                    state.allWords.push({
                        type: 'word',
                        text: word.trim(),
                        paragraphIndex: paragraphIndex,
                        isTitle: isTitle
                    });
                });
                
                // Маркер конца параграфа
                state.allWords.push({
                    type: 'paragraph_end',
                    paragraphIndex: paragraphIndex
                });
            });
            
            console.log('📝 Prepared', state.allWords.filter(w => w.type === 'word').length, 'words in', paragraphs.length, 'paragraphs');
        },
        
        createPages() {
            ui.showLoading('Создание страниц СТРОГО по словам...');
            
            state.pages = [];
            
            // Создаем контейнер для измерений
            const measuringContainer = document.createElement('div');
            measuringContainer.style.cssText = `
                position: absolute;
                visibility: hidden;
                top: -9999px;
                left: 0;
                width: 100%;
                max-width: 680px;
                margin: 0 auto;
                padding: 20px;
                font-family: "Crimson Text", Georgia, serif;
                font-size: ${state.settings.fontSize}px;
                line-height: ${state.settings.lineHeight};
                color: var(--text-primary);
                overflow: hidden;
                box-sizing: border-box;
            `;
            
            // Высота доступного места для текста
            const availableHeight = window.innerHeight - 56 - 80 - 40; // header - footer - padding
            measuringContainer.style.height = `${availableHeight}px`;
            document.body.appendChild(measuringContainer);
            
            let currentPageWords = []; // Слова текущей страницы
            let currentPageHTML = ''; // HTML текущей страницы
            let wordIndex = 0; // Индекс обрабатываемого слова
            
            console.log('📊 Processing', state.allWords.length, 'items...');
            
            // ОБРАБАТЫВАЕМ КАЖДОЕ СЛОВО ПО ПОРЯДКУ
            while (wordIndex < state.allWords.length) {
                const item = state.allWords[wordIndex];
                
                if (item.type === 'word') {
                    // Тестируем добавление этого слова
                    const testWords = [...currentPageWords, item];
                    const testHTML = this.wordsToHTML(testWords);
                    
                    measuringContainer.innerHTML = testHTML;
                    
                    const fits = measuringContainer.scrollHeight <= availableHeight;
                    
                    if (fits) {
                        // СЛОВО ПОМЕЩАЕТСЯ - добавляем
                        currentPageWords.push(item);
                        currentPageHTML = testHTML;
                        wordIndex++;
                    } else {
                        // СЛОВО НЕ ПОМЕЩАЕТСЯ
                        if (currentPageWords.length > 0) {
                            // Сохраняем текущую страницу и начинаем новую
                            state.pages.push(currentPageHTML);
                            console.log(`📄 Page ${state.pages.length}: ${currentPageWords.filter(w => w.type === 'word').length} words`);
                            
                            // Начинаем новую страницу с этого слова
                            currentPageWords = [item];
                            currentPageHTML = this.wordsToHTML([item]);
                            wordIndex++;
                        } else {
                            // Даже одно слово не помещается - принудительно добавляем
                            currentPageWords = [item];
                            currentPageHTML = this.wordsToHTML([item]);
                            state.pages.push(currentPageHTML);
                            console.log(`📄 Page ${state.pages.length}: 1 word (forced)`);
                            
                            currentPageWords = [];
                            currentPageHTML = '';
                            wordIndex++;
                        }
                    }
                } else {
                    // Маркеры параграфов - просто добавляем
                    currentPageWords.push(item);
                    wordIndex++;
                }
            }
            
            // Добавляем последнюю страницу
            if (currentPageWords.length > 0) {
                const finalHTML = this.wordsToHTML(currentPageWords);
                state.pages.push(finalHTML);
                console.log(`📄 Page ${state.pages.length}: ${currentPageWords.filter(w => w.type === 'word').length} words (final)`);
            }
            
            // Убираем контейнер для измерений
            document.body.removeChild(measuringContainer);
            
            state.totalPages = state.pages.length;
            
            // ПРОВЕРКА НА ПОТЕРИ
            const totalOriginalWords = state.allWords.filter(w => w.type === 'word').length;
            let totalWordsInPages = 0;
            
            state.pages.forEach(pageHTML => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = pageHTML;
                const text = tempDiv.textContent || tempDiv.innerText || '';
                const wordsInPage = text.trim().split(/\s+/).filter(w => w.length > 0).length;
                totalWordsInPages += wordsInPage;
            });
            
            console.log('✅ СОЗДАНО', state.totalPages, 'страниц');
            console.log('📊 СЛОВ В ОРИГИНАЛЕ:', totalOriginalWords);
            console.log('📊 СЛОВ НА СТРАНИЦАХ:', totalWordsInPages);
            
            if (totalOriginalWords === totalWordsInPages) {
                console.log('🎉 ВСЕ СЛОВА СОХРАНЕНЫ! ПОТЕРЬ НЕТ!');
            } else {
                console.error('❌ ПОТЕРЯ СЛОВ!', totalOriginalWords - totalWordsInPages, 'слов потеряно');
            }
        },
        
        wordsToHTML(wordItems) {
            let html = '';
            let currentParagraphWords = [];
            let currentIsTitle = false;
            
            wordItems.forEach(item => {
                if (item.type === 'paragraph_start') {
                    currentIsTitle = item.isTitle;
                    currentParagraphWords = [];
                } else if (item.type === 'word') {
                    currentParagraphWords.push(item.text);
                } else if (item.type === 'paragraph_end') {
                    if (currentParagraphWords.length > 0) {
                        const paragraphText = currentParagraphWords.join(' ');
                        if (currentIsTitle) {
                            html += `<h2>${paragraphText}</h2>`;
                        } else {
                            html += `<p>${paragraphText}</p>`;
                        }
                    }
                    currentParagraphWords = [];
                }
            });
            
            // Добавляем незакрытый параграф
            if (currentParagraphWords.length > 0) {
                const paragraphText = currentParagraphWords.join(' ');
                if (currentIsTitle) {
                    html += `<h2>${paragraphText}</h2>`;
                } else {
                    html += `<p>${paragraphText}</p>`;
                }
            }
            
            return html;
        },
        
        render() {
            const pageContent = $('#page-content');
            if (!pageContent || !state.pages[state.currentPageIndex]) return;
            
            const currentPage = state.pages[state.currentPageIndex];
            pageContent.innerHTML = currentPage;
            
            progress.update();
            
            console.log(`📖 Показана страница ${state.currentPageIndex + 1}/${state.totalPages}`);
        },
        
        nextPage() {
            if (state.currentPageIndex < state.totalPages - 1) {
                state.currentPageIndex++;
                this.render();
            }
        },
        
        prevPage() {
            if (state.currentPageIndex > 0) {
                state.currentPageIndex--;
                this.render();
            }
        },
        
        goToPage(pageNumber) {
            const pageIndex = Math.max(0, Math.min(pageNumber - 1, state.totalPages - 1));
            if (pageIndex !== state.currentPageIndex) {
                state.currentPageIndex = pageIndex;
                this.render();
            }
        },
        
        bindEvents() {
            // Touch zones
            on($('#prev-zone'), 'click', () => this.prevPage());
            on($('#next-zone'), 'click', () => this.nextPage());
            on($('#menu-zone'), 'click', () => ui.toggleUI());
            
            // Navigation buttons
            on($('#prev-btn'), 'click', () => this.prevPage());
            on($('#next-btn'), 'click', () => this.nextPage());
            
            // Header buttons
            on($('#back-btn'), 'click', () => history.back());
            on($('#settings-btn'), 'click', () => ui.showSettings());
            
            // Page input
            on($('#page-input'), 'change', (e) => this.goToPage(parseInt(e.target.value) || 1));
            
            // Progress bar
            on($('#progress-bar'), 'click', (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const page = Math.ceil(ratio * state.totalPages);
                this.goToPage(page);
            });
            
            // Settings modal
            on($('#close-settings'), 'click', () => ui.hideSettings());
            on($('#settings-modal .modal-backdrop'), 'click', () => ui.hideSettings());
            
            // Settings buttons
            $$('.option-btn[data-theme]').forEach(btn => {
                on(btn, 'click', () => settings.update('theme', btn.dataset.theme));
            });
            
            // Range sliders
            const fontSizeSlider = $('#font-size-slider');
            const fontSizeValue = $('#font-size-value');
            if (fontSizeSlider && fontSizeValue) {
                on(fontSizeSlider, 'input', (e) => {
                    const size = parseInt(e.target.value);
                    fontSizeValue.textContent = `${size}px`;
                    settings.update('fontSize', size);
                });
            }
            
            const lineHeightSlider = $('#line-height-slider');
            const lineHeightValue = $('#line-height-value');
            if (lineHeightSlider && lineHeightValue) {
                on(lineHeightSlider, 'input', (e) => {
                    const height = parseFloat(e.target.value);
                    lineHeightValue.textContent = height.toFixed(1);
                    settings.update('lineHeight', height);
                });
            }
            
            // Window resize
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    this.createPages();
                    this.render();
                }, 300);
            });
            
            // Keyboard shortcuts
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
                        this.goToPage(state.totalPages);
                        break;
                    case 'Escape':
                        if ($('#settings-modal')?.classList.contains('visible')) {
                            ui.hideSettings();
                        } else if (state.uiVisible) {
                            ui.toggleUI();
                        }
                        break;
                }
            });
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => reader.init());
    } else {
        reader.init();
    }
})();
