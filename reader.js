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
        allContent: '', // All chapters combined
        pages: [], // Paginated content
        currentPageIndex: 0,
        totalPages: 0,
        uiVisible: false,
        
        settings: {
            theme: 'dark',
            fontFamily: 'serif',
            fontSize: 100,
            lineHeight: 1.6,
            columnWidth: 'medium',
            justifyText: true
        }
    };

    // Settings management
    const settings = {
        load() {
            const saved = storage.get('readium_reader_settings');
            if (saved) {
                Object.assign(state.settings, saved);
            }
            this.apply();
        },
        
        save() {
            storage.set('readium_reader_settings', state.settings);
        },
        
        apply() {
            document.body.setAttribute('data-theme', state.settings.theme);
            this.updateUI();
            this.save();
            
            // Re-paginate when settings change
            if (state.allContent) {
                setTimeout(() => {
                    reader.paginate();
                    reader.render();
                }, 100);
            }
        },
        
        update(key, value) {
            state.settings[key] = value;
            this.apply();
        },
        
        updateUI() {
            // Update theme buttons
            $$('.theme-option').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
            });
            
            // Update font family
            const fontSelect = $('#font-family');
            if (fontSelect) fontSelect.value = state.settings.fontFamily;
            
            // Update font size
            const fontSizeSlider = $('#font-size');
            const fontSizeDisplay = $('#font-size-display');
            if (fontSizeSlider && fontSizeDisplay) {
                fontSizeSlider.value = state.settings.fontSize;
                fontSizeDisplay.textContent = `${state.settings.fontSize}%`;
            }
            
            // Update line height
            const lineHeightRadio = $(`[name="line-height"][value="${state.settings.lineHeight}"]`);
            if (lineHeightRadio) lineHeightRadio.checked = true;
            
            // Update column width
            const columnWidthRadio = $(`[name="column-width"][value="${state.settings.columnWidth}"]`);
            if (columnWidthRadio) columnWidthRadio.checked = true;
            
            // Update justify text
            const justifyCheckbox = $('#justify-text');
            if (justifyCheckbox) justifyCheckbox.checked = state.settings.justifyText;
        }
    };

    // Progress management
    const progress = {
        save() {
            storage.set('readium_reader_progress', {
                pageIndex: state.currentPageIndex,
                timestamp: Date.now()
            });
        },
        
        load() {
            const saved = storage.get('readium_reader_progress');
            if (saved && saved.pageIndex < state.totalPages) {
                state.currentPageIndex = saved.pageIndex;
                reader.render();
            }
        },
        
        update() {
            const currentPos = $('#current-position');
            const progressPercent = $('#progress-percent');
            const readingTime = $('#reading-time');
            const progressFill = $('#progress-fill');
            const progressHandle = $('#progress-handle');
            const currentPage = $('#current-page');
            const totalPages = $('#total-pages');
            
            const currentPageNum = state.currentPageIndex + 1;
            const progressPercentValue = state.totalPages > 0 ? 
                Math.round((state.currentPageIndex / (state.totalPages - 1)) * 100) : 0;
            
            if (currentPos) {
                // Find current chapter based on page content
                const currentPageData = state.pages[state.currentPageIndex];
                if (currentPageData && currentPageData.chapterTitle) {
                    currentPos.textContent = currentPageData.chapterTitle;
                } else {
                    currentPos.textContent = `Страница ${currentPageNum}`;
                }
            }
            
            if (progressPercent) {
                progressPercent.textContent = `${progressPercentValue}%`;
            }
            
            if (progressFill) {
                progressFill.style.width = `${progressPercentValue}%`;
            }
            
            if (progressHandle) {
                progressHandle.style.left = `${progressPercentValue}%`;
            }
            
            if (readingTime) {
                const remainingPages = state.totalPages - currentPageNum;
                const estimatedMinutes = Math.ceil(remainingPages * 1.5); // 1.5 min per page
                readingTime.textContent = `~${estimatedMinutes} мин`;
            }
            
            if (currentPage) currentPage.textContent = currentPageNum;
            if (totalPages) totalPages.textContent = state.totalPages;
            
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
            const sidebar = $('#toc-sidebar');
            const overlay = $('#overlay');
            
            if (sidebar) sidebar.classList.add('visible');
            if (overlay) overlay.classList.add('visible');
        },
        
        hideSidebar() {
            const sidebar = $('#toc-sidebar');
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
            if (!tocList || !state.chapters.length) return;
            
            tocList.innerHTML = '';
            
            // Create TOC with page numbers for each chapter
            const chapterStartPages = new Map();
            state.pages.forEach((page, index) => {
                if (page.isChapterStart && !chapterStartPages.has(page.chapterIndex)) {
                    chapterStartPages.set(page.chapterIndex, index + 1);
                }
            });
            
            state.chapters.forEach((chapter, index) => {
                const item = document.createElement('div');
                item.className = 'toc-item';
                
                // Check if current page is in this chapter
                const currentPageData = state.pages[state.currentPageIndex];
                if (currentPageData && currentPageData.chapterIndex === index) {
                    item.classList.add('active');
                }
                
                const startPage = chapterStartPages.get(index) || 1;
                
                item.innerHTML = `
                    <div class="toc-item-title">${chapter.title || `Глава ${index + 1}`}</div>
                    <div class="toc-item-page">Страница ${startPage}</div>
                `;
                
                on(item, 'click', () => {
                    const pageIndex = state.pages.findIndex(p => p.chapterIndex === index && p.isChapterStart);
                    if (pageIndex >= 0) {
                        state.currentPageIndex = pageIndex;
                        reader.render();
                        ui.hideSidebar();
                    }
                });
                
                tocList.appendChild(item);
            });
        }
    };

    // Main Reader functionality
    const reader = {
        async init() {
            try {
                ui.showLoading('Инициализация профессионального ридера...');
                
                settings.load();
                await this.loadBook();
                this.paginate();
                
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
                ui.showLoading('Ошибка инициализации ридера. Проверьте подключение.');
            }
        },
        
        async loadBook() {
            try {
                ui.showLoading('Загрузка книги...');
                
                // Load chapters metadata
                const response = await fetch('book/chapters.json');
                if (!response.ok) throw new Error('Failed to load chapters.json');
                
                state.chapters = await response.json();
                
                // Load all chapters and combine
                let combinedContent = '';
                
                for (let i = 0; i < state.chapters.length; i++) {
                    ui.showLoading(`Загрузка главы ${i + 1} из ${state.chapters.length}...`);
                    
                    try {
                        const chapterResponse = await fetch(state.chapters[i].href);
                        const chapterContent = await chapterResponse.text();
                        
                        // Add chapter with metadata
                        combinedContent += `
                            <div data-chapter-index="${i}" data-chapter-start="true">
                                <h1 class="chapter-title">${state.chapters[i].title || `Глава ${i + 1}`}</h1>
                                <div class="chapter-content">${chapterContent}</div>
                            </div>
                        `;
                        
                    } catch (error) {
                        console.warn(`Failed to load chapter ${i}:`, error);
                        combinedContent += `
                            <div data-chapter-index="${i}" data-chapter-start="true">
                                <h1 class="chapter-title">${state.chapters[i].title || `Глава ${i + 1}`}</h1>
                                <div class="chapter-content">
                                    <p>Ошибка загрузки главы. Попробуйте обновить страницу.</p>
                                </div>
                            </div>
                        `;
                    }
                }
                
                state.allContent = combinedContent;
                
            } catch (error) {
                console.error('Failed to load book:', error);
                throw error;
            }
        },
        
        paginate() {
            ui.showLoading('Создание страниц...');
            
            state.pages = [];
            const isMobile = window.innerWidth <= 768;
            
            // Create temporary container to measure content
            const measureContainer = document.createElement('div');
            measureContainer.style.cssText = `
                position: absolute;
                visibility: hidden;
                top: -9999px;
                left: 0;
                width: 100%;
                max-width: 680px;
                height: calc(100vh - 120px); /* Account for header/footer */
                padding: 2rem;
                font-family: var(--font-reading-serif);
                font-size: ${(1.125 * state.settings.fontSize / 100)}rem;
                line-height: ${state.settings.lineHeight};
                color: var(--text-primary);
                overflow: hidden;
                box-sizing: border-box;
            `;
            document.body.appendChild(measureContainer);
            
            // Parse combined content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = state.allContent;
            
            const allElements = Array.from(tempDiv.children);
            let currentPageContent = '';
            let currentChapterIndex = 0;
            let isChapterStart = false;
            
            allElements.forEach((chapterDiv, chapterIdx) => {
                const chapterIndex = parseInt(chapterDiv.dataset.chapterIndex);
                const chapterElements = Array.from(chapterDiv.children);
                
                chapterElements.forEach((element, elementIdx) => {
                    const isFirstElementOfChapter = elementIdx === 0; // h1 title
                    
                    // Test adding this element
                    const testContent = currentPageContent + element.outerHTML;
                    measureContainer.innerHTML = testContent;
                    
                    const fits = measureContainer.scrollHeight <= measureContainer.clientHeight;
                    
                    if (!fits && currentPageContent.length > 0) {
                        // Current page is full, save it
                        state.pages.push({
                            content: currentPageContent,
                            chapterIndex: currentChapterIndex,
                            chapterTitle: state.chapters[currentChapterIndex]?.title || `Глава ${currentChapterIndex + 1}`,
                            isChapterStart: isChapterStart
                        });
                        
                        // Start new page with current element
                        currentPageContent = element.outerHTML;
                        currentChapterIndex = chapterIndex;
                        isChapterStart = isFirstElementOfChapter;
                    } else {
                        // Element fits, add to current page
                        currentPageContent = testContent;
                        if (isFirstElementOfChapter) {
                            currentChapterIndex = chapterIndex;
                            isChapterStart = true;
                        }
                    }
                });
            });
            
            // Add last page
            if (currentPageContent.trim()) {
                state.pages.push({
                    content: currentPageContent,
                    chapterIndex: currentChapterIndex,
                    chapterTitle: state.chapters[currentChapterIndex]?.title || `Глава ${currentChapterIndex + 1}`,
                    isChapterStart: isChapterStart
                });
            }
            
            // Remove measure container
            document.body.removeChild(measureContainer);
            
            state.totalPages = state.pages.length;
            
            // Ensure current page is valid
            if (state.currentPageIndex >= state.totalPages) {
                state.currentPageIndex = Math.max(0, state.totalPages - 1);
            }
            
            console.log(`Created ${state.totalPages} continuous pages`);
        },
        
        render() {
            const container = $('#readium-reader');
            if (!container || !state.pages[state.currentPageIndex]) return;
            
            const currentPage = state.pages[state.currentPageIndex];
            
            // Apply current settings to content
            let fontFamily = 'var(--font-reading-serif)';
            if (state.settings.fontFamily === 'sans') {
                fontFamily = 'var(--font-reading-sans)';
            } else if (state.settings.fontFamily === 'mono') {
                fontFamily = 'var(--font-reading-mono)';
            }
            
            const fontSize = 1.125 * (state.settings.fontSize / 100);
            const textAlign = state.settings.justifyText ? 'justify' : 'left';
            
            container.innerHTML = `
                <div class="readium-page" style="
                    max-width: 680px;
                    margin: 0 auto;
                    padding: 2rem;
                    font-family: ${fontFamily};
                    font-size: ${fontSize}rem;
                    line-height: ${state.settings.lineHeight};
                    color: var(--text-primary);
                    text-align: ${textAlign};
                    height: 100%;
                    overflow: hidden;
                ">
                    ${currentPage.content}
                </div>
            `;
            
            // Style chapter titles
            const chapterTitles = container.querySelectorAll('.chapter-title');
            chapterTitles.forEach(title => {
                title.style.cssText += `
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 2rem;
                    text-align: center;
                    color: var(--text-primary);
                `;
            });
            
            // Style chapter content
            const chapterContents = container.querySelectorAll('.chapter-content');
            chapterContents.forEach(content => {
                content.style.cssText += `
                    text-align: ${textAlign};
                `;
                
                // Style paragraphs
                const paragraphs = content.querySelectorAll('p');
                paragraphs.forEach(p => {
                    p.style.marginBottom = '1rem';
                });
            });
            
            progress.update();
            ui.renderTOC();
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
        
        goToPage(pageIndex) {
            if (pageIndex >= 0 && pageIndex < state.totalPages) {
                state.currentPageIndex = pageIndex;
                this.render();
            }
        },
        
        nextChapter() {
            // Find next chapter start
            for (let i = state.currentPageIndex + 1; i < state.totalPages; i++) {
                if (state.pages[i].isChapterStart) {
                    state.currentPageIndex = i;
                    this.render();
                    return;
                }
            }
        },
        
        prevChapter() {
            // Find previous chapter start
            for (let i = state.currentPageIndex - 1; i >= 0; i--) {
                if (state.pages[i].isChapterStart) {
                    state.currentPageIndex = i;
                    this.render();
                    return;
                }
            }
        },
        
        bindEvents() {
            // Navigation
            on($('#nav-prev'), 'click', () => this.prevPage());
            on($('#nav-next'), 'click', () => this.nextPage());
            on($('#nav-center'), 'click', () => ui.toggleUI());
            
            // Header buttons
            on($('#back-btn'), 'click', () => history.back());
            on($('#toc-btn'), 'click', () => ui.showSidebar());
            on($('#settings-btn'), 'click', () => ui.showSettings());
            
            // Footer controls
            on($('#prev-chapter'), 'click', () => this.prevChapter());
            on($('#next-chapter'), 'click', () => this.nextChapter());
            
            // Progress bar
            on($('#progress-bar'), 'click', (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const pageIndex = Math.floor(ratio * state.totalPages);
                this.goToPage(pageIndex);
            });
            
            // Sidebar
            on($('#close-toc'), 'click', () => ui.hideSidebar());
            on($('#overlay'), 'click', () => ui.hideSidebar());
            
            // Settings
            on($('#close-settings'), 'click', () => ui.hideSettings());
            on($('#settings-modal .modal-backdrop'), 'click', () => ui.hideSettings());
            
            // Theme selection
            $$('.theme-option').forEach(btn => {
                on(btn, 'click', () => settings.update('theme', btn.dataset.theme));
            });
            
            // Font family
            on($('#font-family'), 'change', (e) => settings.update('fontFamily', e.target.value));
            
            // Font size
            on($('#font-size'), 'input', (e) => {
                const size = parseInt(e.target.value);
                $('#font-size-display').textContent = `${size}%`;
                settings.update('fontSize', size);
            });
            
            // Line height
            $$('[name="line-height"]').forEach(radio => {
                on(radio, 'change', (e) => settings.update('lineHeight', parseFloat(e.target.value)));
            });
            
            // Column width
            $$('[name="column-width"]').forEach(radio => {
                on(radio, 'change', (e) => settings.update('columnWidth', e.target.value));
            });
            
            // Justify text
            on($('#justify-text'), 'change', (e) => settings.update('justifyText', e.target.checked));
            
            // Resize handler
            window.addEventListener('resize', () => {
                setTimeout(() => {
                    this.paginate();
                    this.render();
                }, 300);
            });
            
            // Keyboard shortcuts
            on(document, 'keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
                
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
                        this.goToPage(0);
                        break;
                    case 'End':
                        e.preventDefault();
                        this.goToPage(state.totalPages - 1);
                        break;
                    case 'Escape':
                        if ($('#settings-modal')?.classList.contains('visible')) {
                            ui.hideSettings();
                        } else if ($('#toc-sidebar')?.classList.contains('visible')) {
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
