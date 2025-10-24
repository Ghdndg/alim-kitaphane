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
        pages: [],
        currentPageIndex: 0,
        totalPages: 0,
        uiVisible: false,
        pageWidth: 0,
        pageHeight: 0,
        
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
            // Update theme buttons
            $$('.option-btn[data-theme]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
            });
            
            // Update sliders
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
                this.calculatePageDimensions();
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
                console.log('Book loaded, length:', state.bookText.length);
                
                if (!state.bookText.trim()) {
                    throw new Error('Book file is empty');
                }
                
            } catch (error) {
                console.error('Failed to load book:', error);
                throw error;
            }
        },
        
        calculatePageDimensions() {
            // Calculate exact page dimensions
            const reader = $('.reader');
            if (reader) {
                const rect = reader.getBoundingClientRect();
                state.pageWidth = Math.floor(rect.width - 40); // 40px padding
                state.pageHeight = Math.floor(rect.height - 40); // 40px padding
            } else {
                // Fallback
                state.pageWidth = Math.floor(window.innerWidth - 40);
                state.pageHeight = Math.floor(window.innerHeight - 136 - 40); // header + footer + padding
            }
            
            console.log(`Page dimensions: ${state.pageWidth} x ${state.pageHeight}`);
        },
        
        createPages() {
            ui.showLoading('Создание идеальной пагинации...');
            
            state.pages = [];
            
            // Clean text
            const cleanText = state.bookText
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            // Format text as HTML
            const formattedHTML = this.formatTextAsHTML(cleanText);
            
            // Create invisible container for CSS column pagination
            const paginationContainer = document.createElement('div');
            paginationContainer.style.cssText = `
                position: absolute;
                visibility: hidden;
                top: -99999px;
                left: 0;
                width: ${state.pageWidth}px;
                height: ${state.pageHeight}px;
                padding: 20px;
                margin: 0;
                font-family: "Crimson Text", Georgia, serif;
                font-size: ${state.settings.fontSize}px;
                line-height: ${state.settings.lineHeight};
                color: var(--text-primary);
                column-width: ${state.pageWidth - 40}px;
                column-gap: 0;
                column-fill: auto;
                overflow: hidden;
                box-sizing: border-box;
            `;
            
            paginationContainer.innerHTML = formattedHTML;
            document.body.appendChild(paginationContainer);
            
            // Calculate how many columns (pages) are needed
            const totalWidth = paginationContainer.scrollWidth;
            const pageCount = Math.ceil(totalWidth / (state.pageWidth - 40));
            
            console.log(`Total width: ${totalWidth}, Pages needed: ${pageCount}`);
            
            // Create pages by extracting visible content at each column position
            for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                const pageContainer = document.createElement('div');
                pageContainer.style.cssText = `
                    position: absolute;
                    visibility: hidden;
                    top: -99999px;
                    left: 0;
                    width: ${state.pageWidth}px;
                    height: ${state.pageHeight}px;
                    padding: 20px;
                    margin: 0;
                    font-family: "Crimson Text", Georgia, serif;
                    font-size: ${state.settings.fontSize}px;
                    line-height: ${state.settings.lineHeight};
                    color: var(--text-primary);
                    column-width: ${state.pageWidth - 40}px;
                    column-gap: 0;
                    column-fill: auto;
                    overflow: hidden;
                    box-sizing: border-box;
                    transform: translateX(-${pageIndex * (state.pageWidth - 40)}px);
                `;
                
                pageContainer.innerHTML = formattedHTML;
                document.body.appendChild(pageContainer);
                
                // Extract visible text from this page
                const pageContent = this.extractVisibleContent(pageContainer);
                state.pages.push(pageContent);
                
                document.body.removeChild(pageContainer);
            }
            
            // Remove pagination container
            document.body.removeChild(paginationContainer);
            
            state.totalPages = state.pages.length;
            
            console.log(`Created ${state.totalPages} pages with CSS column pagination`);
        },
        
        formatTextAsHTML(text) {
            return text
                .split('\n\n')
                .map(paragraph => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return '';
                    
                    // Check if it looks like a title
                    if (trimmed.length < 50 && (trimmed === trimmed.toUpperCase() || /^[А-ЯЁ\s\-]+$/.test(trimmed))) {
                        return `<h2>${trimmed}</h2>`;
                    } else {
                        return `<p>${trimmed}</p>`;
                    }
                })
                .filter(p => p)
                .join('');
        },
        
        extractVisibleContent(container) {
            // Clone the container to get visible content
            const cloned = container.cloneNode(true);
            cloned.style.visibility = 'visible';
            cloned.style.position = 'static';
            cloned.style.top = 'auto';
            cloned.style.left = 'auto';
            cloned.style.transform = 'none';
            
            // Remove any content that might overflow
            const elements = cloned.querySelectorAll('*');
            elements.forEach(element => {
                const rect = element.getBoundingClientRect();
                const containerRect = cloned.getBoundingClientRect();
                
                if (rect.bottom > containerRect.bottom + 5) { // 5px tolerance
                    element.remove();
                }
            });
            
            return cloned.innerHTML;
        },
        
        render() {
            const pageContent = $('#page-content');
            if (!pageContent || !state.pages[state.currentPageIndex]) return;
            
            const currentPage = state.pages[state.currentPageIndex];
            pageContent.innerHTML = currentPage;
            
            progress.update();
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
                    this.calculatePageDimensions();
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
