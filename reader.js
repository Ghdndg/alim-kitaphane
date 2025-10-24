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
        chapters: [],
        pages: [],
        currentPageIndex: 0,
        totalPages: 0,
        uiVisible: false,
        
        settings: {
            theme: 'dark',
            font: 'crimson',
            fontSize: 18,
            lineHeight: 1.6,
            textWidth: 'medium'
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
            document.body.setAttribute('data-width', state.settings.textWidth);
            
            document.documentElement.style.setProperty('--font-size-reading', `${state.settings.fontSize}px`);
            document.documentElement.style.setProperty('--line-height-reading', state.settings.lineHeight);
            
            const fontMap = {
                crimson: '"Crimson Text", Georgia, serif',
                inter: 'Inter, -apple-system, sans-serif',
                georgia: 'Georgia, serif'
            };
            document.documentElement.style.setProperty('--font-reading', fontMap[state.settings.font]);
            
            this.save();
        },
        
        update(key, value) {
            state.settings[key] = value;
            this.apply();
            this.updateUI();
        },
        
        updateUI() {
            // Update theme buttons
            $$('.option-btn[data-theme]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
            });
            
            // Update font buttons
            $$('.option-btn[data-font]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.font === state.settings.font);
            });
            
            // Update width buttons
            $$('.option-btn[data-width]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.width === state.settings.textWidth);
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
        
        showSidebar() {
            const sidebar = $('#sidebar');
            const overlay = $('#overlay');
            
            if (sidebar) sidebar.classList.add('visible');
            if (overlay) overlay.classList.add('visible');
        },
        
        hideSidebar() {
            const sidebar = $('#sidebar');
            const overlay = $('#overlay');
            
            if (sidebar) sidebar.classList.remove('visible');
            if (overlay) overlay.classList.remove('visible');
        },
        
        showSettings() {
            const modal = $('#settings-modal');
            if (modal) modal.classList.add('visible');
        },
        
        hideSettings() {
            const modal = $('#settings-modal');
            if (modal) modal.classList.remove('visible');
        },
        
        renderTOC() {
            const tocList = $('#toc-list');
            if (!tocList) return;
            
            tocList.innerHTML = '';
            
            state.chapters.forEach((chapter, index) => {
                const item = document.createElement('div');
                item.className = 'toc-item';
                
                if (index === state.currentPageIndex) {
                    item.classList.add('active');
                }
                
                item.innerHTML = `
                    <div class="toc-title">${chapter.title || `Глава ${index + 1}`}</div>
                    <div class="toc-page">Страница ${index + 1}</div>
                `;
                
                on(item, 'click', () => {
                    state.currentPageIndex = index;
                    reader.render();
                    ui.hideSidebar();
                });
                
                tocList.appendChild(item);
            });
        }
    };

    // Main reader functionality
    const reader = {
        async init() {
            try {
                ui.showLoading('Инициализация ридера...');
                
                settings.load();
                await this.loadBook();
                this.createPages();
                
                progress.load();
                ui.renderTOC();
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
                ui.showLoading('Ошибка загрузки. Проверьте файлы chapters.json и главы.');
            }
        },
        
        async loadBook() {
            try {
                ui.showLoading('Загрузка книги...');
                
                // ИСПРАВЛЕННЫЙ ПУТЬ: chapters.json находится в корне
                const response = await fetch('chapters.json');
                if (!response.ok) {
                    throw new Error(`Failed to load chapters.json: HTTP ${response.status}`);
                }
                
                state.chapters = await response.json();
                console.log('Loaded chapters:', state.chapters);
                
                if (!Array.isArray(state.chapters) || state.chapters.length === 0) {
                    throw new Error('chapters.json is empty or invalid');
                }
                
            } catch (error) {
                console.error('Failed to load book:', error);
                
                // FALLBACK: создаем главы на основе имеющихся файлов
                state.chapters = [
                    { title: "Муэллиф Бириндже СОЗ", href: "ch0.html" },
                    { title: "Глава 1", href: "ch1.html" },
                    { title: "Глава 2", href: "ch2.html" },
                    { title: "Глава 3", href: "ch3.html" },
                    { title: "Глава 4", href: "ch4.html" },
                    { title: "Глава 5", href: "ch5.html" },
                    { title: "Глава 6", href: "ch6.html" },
                    { title: "Глава 7", href: "ch7.html" },
                    { title: "Глава 8", href: "ch8.html" },
                    { title: "Глава 9", href: "ch9.html" },
                    { title: "Глава 10", href: "ch10.html" }
                ];
                
                console.log('Using fallback chapters:', state.chapters);
            }
        },
        
        createPages() {
            ui.showLoading('Создание страниц из HTML файлов...');
            
            state.pages = [];
            
            // Каждая глава = одна страница
            state.chapters.forEach((chapter, chapterIndex) => {
                state.pages.push({
                    chapterIndex: chapterIndex,
                    chapterFile: chapter.href,
                    title: chapter.title || `Глава ${chapterIndex + 1}`,
                    isChapterStart: true
                });
            });
            
            state.totalPages = state.pages.length;
            
            console.log(`Created ${state.totalPages} pages from ${state.chapters.length} chapters`);
        },
        
        async render() {
            const pageContent = $('#page-content');
            if (!pageContent) return;
            
            const currentPage = state.pages[state.currentPageIndex];
            if (!currentPage) {
                pageContent.innerHTML = '<h1>Ошибка</h1><p>Страница не найдена.</p>';
                return;
            }
            
            try {
                // Load chapter content if not cached
                if (!currentPage.content) {
                    ui.showLoading('Загрузка главы...');
                    
                    // ИСПРАВЛЕННЫЙ ПУТЬ: файлы глав находятся в корне
                    const response = await fetch(currentPage.chapterFile);
                    if (response.ok) {
                        currentPage.content = await response.text();
                    } else {
                        throw new Error(`HTTP ${response.status}: ${currentPage.chapterFile}`);
                    }
                    
                    ui.hideLoading();
                }
                
                // Render content
                pageContent.innerHTML = currentPage.content;
                
                progress.update();
                ui.renderTOC();
                
            } catch (error) {
                console.error('Failed to render page:', error);
                pageContent.innerHTML = `
                    <h1>${currentPage.title}</h1>
                    <p>Ошибка загрузки главы: ${error.message}</p>
                    <p>Проверьте что файл <strong>${currentPage.chapterFile}</strong> существует.</p>
                `;
            }
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
            on($('#toc-btn'), 'click', () => ui.showSidebar());
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
            
            // Sidebar
            on($('#close-sidebar'), 'click', () => ui.hideSidebar());
            on($('#overlay'), 'click', () => ui.hideSidebar());
            
            // Settings modal
            on($('#close-settings'), 'click', () => ui.hideSettings());
            on($('#settings-modal .modal-backdrop'), 'click', () => ui.hideSettings());
            
            // Settings buttons
            $$('.option-btn[data-theme]').forEach(btn => {
                on(btn, 'click', () => settings.update('theme', btn.dataset.theme));
            });
            
            $$('.option-btn[data-font]').forEach(btn => {
                on(btn, 'click', () => settings.update('font', btn.dataset.font));
            });
            
            $$('.option-btn[data-width]').forEach(btn => {
                on(btn, 'click', () => settings.update('textWidth', btn.dataset.width));
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
                        } else if ($('#sidebar')?.classList.contains('visible')) {
                            ui.hideSidebar();
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
