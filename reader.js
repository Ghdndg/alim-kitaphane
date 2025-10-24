(() => {
    'use strict';

    // Application state
    let state = {
        chapters: [],
        allContent: '',
        currentPage: 1,
        totalPages: 0,
        uiVisible: false,
        bookInitialized: false
    };

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

    // UI management
    const ui = {
        showLoading(message = 'Загрузка...') {
            const loading = document.getElementById('loading');
            const status = document.getElementById('loading-status');
            if (status) status.textContent = message;
            if (loading) loading.classList.remove('hidden');
        },
        
        hideLoading() {
            const loading = document.getElementById('loading');
            if (loading) loading.classList.add('hidden');
        },
        
        toggleUI() {
            state.uiVisible = !state.uiVisible;
            const header = document.getElementById('header');
            const footer = document.getElementById('footer');
            
            if (header) header.classList.toggle('visible', state.uiVisible);
            if (footer) footer.classList.toggle('visible', state.uiVisible);
        },
        
        updateProgress() {
            const currentPageEl = document.getElementById('current-page');
            const totalPagesEl = document.getElementById('total-pages');
            const readingTimeEl = document.getElementById('reading-time');
            const progressFill = document.getElementById('progress-fill');
            
            if (currentPageEl) currentPageEl.textContent = state.currentPage;
            if (totalPagesEl) totalPagesEl.textContent = state.totalPages;
            
            if (readingTimeEl) {
                const remainingPages = state.totalPages - state.currentPage;
                const minutes = Math.ceil(remainingPages * 1.5);
                readingTimeEl.textContent = `~${minutes} мин`;
            }
            
            if (progressFill && state.totalPages > 0) {
                const progress = ((state.currentPage - 1) / Math.max(state.totalPages - 1, 1)) * 100;
                progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
            }
            
            // Save progress
            storage.set('turnjs_reader_progress', {
                page: state.currentPage,
                timestamp: Date.now()
            });
        }
    };

    // Main reader functionality
    const reader = {
        async init() {
            try {
                ui.showLoading('Инициализация Turn.js ридера...');
                
                // Wait for jQuery to load
                if (typeof jQuery === 'undefined') {
                    throw new Error('jQuery not loaded');
                }
                
                await this.loadBook();
                this.createPages();
                this.initializeTurnJS();
                this.bindEvents();
                
                // Load saved progress
                const saved = storage.get('turnjs_reader_progress');
                if (saved && saved.page <= state.totalPages && state.bookInitialized) {
                    setTimeout(() => {
                        jQuery('#book').turn('page', saved.page);
                    }, 100);
                }
                
                ui.hideLoading();
                
                // Show UI briefly
                setTimeout(() => {
                    ui.toggleUI();
                    setTimeout(() => ui.toggleUI(), 3000);
                }, 500);
                
            } catch (error) {
                console.error('Failed to initialize reader:', error);
                ui.showLoading(`Ошибка загрузки: ${error.message}. Проверьте подключение.`);
            }
        },
        
        async loadBook() {
            try {
                ui.showLoading('Загрузка книги...');
                
                // Load chapters metadata
                const response = await fetch('book/chapters.json');
                if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load chapters.json`);
                
                state.chapters = await response.json();
                if (!Array.isArray(state.chapters) || state.chapters.length === 0) {
                    throw new Error('Invalid chapters data');
                }
                
                // Load all chapters
                let combinedContent = '';
                
                for (let i = 0; i < state.chapters.length; i++) {
                    ui.showLoading(`Загрузка главы ${i + 1} из ${state.chapters.length}...`);
                    
                    try {
                        const chapterResponse = await fetch(state.chapters[i].href);
                        if (chapterResponse.ok) {
                            const chapterContent = await chapterResponse.text();
                            
                            combinedContent += `
                                <h1>${state.chapters[i].title || `Глава ${i + 1}`}</h1>
                                ${chapterContent}
                            `;
                        } else {
                            throw new Error(`HTTP ${chapterResponse.status}`);
                        }
                        
                    } catch (error) {
                        console.warn(`Failed to load chapter ${i}:`, error);
                        combinedContent += `
                            <h1>${state.chapters[i].title || `Глава ${i + 1}`}</h1>
                            <p>Ошибка загрузки главы ${i + 1}. Попробуйте обновить страницу.</p>
                        `;
                    }
                }
                
                if (!combinedContent.trim()) {
                    throw new Error('No content loaded');
                }
                
                state.allContent = combinedContent;
                console.log('Book loaded successfully, content length:', combinedContent.length);
                
            } catch (error) {
                console.error('Failed to load book:', error);
                throw error;
            }
        },
        
        createPages() {
            ui.showLoading('Создание страниц...');
            
            try {
                // Create a temporary container to measure content
                const tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                    position: absolute;
                    visibility: hidden;
                    top: -9999px;
                    left: 0;
                    width: 700px;
                    height: 500px;
                    padding: 2rem;
                    font-family: 'Crimson Text', Georgia, serif;
                    font-size: 1.1rem;
                    line-height: 1.6;
                    color: #ffffff;
                    text-align: justify;
                    overflow: hidden;
                    box-sizing: border-box;
                    background: #1c1c1e;
                `;
                document.body.appendChild(tempContainer);
                
                // Clean content and split into manageable chunks
                const cleanContent = state.allContent
                    .replace(/<h1>/g, '\n<h1>')
                    .replace(/<p>/g, '\n<p>')
                    .replace(/\n+/g, '\n')
                    .trim();
                
                const chunks = cleanContent.split('\n').filter(chunk => chunk.trim());
                
                const pages = [];
                let currentPageContent = '';
                
                chunks.forEach((chunk, index) => {
                    const testContent = currentPageContent + chunk;
                    tempContainer.innerHTML = testContent;
                    
                    const fits = tempContainer.scrollHeight <= tempContainer.clientHeight;
                    
                    if (!fits && currentPageContent.trim()) {
                        // Save current page
                        pages.push(currentPageContent.trim());
                        currentPageContent = chunk;
                    } else {
                        currentPageContent = testContent;
                    }
                });
                
                // Add last page
                if (currentPageContent.trim()) {
                    pages.push(currentPageContent.trim());
                }
                
                // Remove temp container
                document.body.removeChild(tempContainer);
                
                // Ensure we have at least one page
                if (pages.length === 0) {
                    pages.push('<h1>Ошибка</h1><p>Не удалось создать страницы. Попробуйте обновить страницу.</p>');
                }
                
                // Create Turn.js pages
                const book = document.getElementById('book');
                if (!book) throw new Error('Book container not found');
                
                book.innerHTML = '';
                
                pages.forEach((pageContent, index) => {
                    const pageDiv = document.createElement('div');
                    pageDiv.className = 'page';
                    pageDiv.innerHTML = pageContent;
                    book.appendChild(pageDiv);
                });
                
                state.totalPages = pages.length;
                console.log(`Created ${state.totalPages} Turn.js pages`);
                
            } catch (error) {
                console.error('Failed to create pages:', error);
                // Fallback: create single page with error
                const book = document.getElementById('book');
                if (book) {
                    book.innerHTML = `
                        <div class="page">
                            <h1>Ошибка создания страниц</h1>
                            <p>Произошла ошибка при создании страниц: ${error.message}</p>
                            <p>Попробуйте обновить страницу.</p>
                        </div>
                    `;
                    state.totalPages = 1;
                }
            }
        },
        
        initializeTurnJS() {
            ui.showLoading('Инициализация Turn.js...');
            
            try {
                const $book = jQuery('#book');
                
                if ($book.length === 0) {
                    throw new Error('Book element not found');
                }
                
                // Initialize Turn.js
                $book.turn({
                    width: 800,
                    height: 600,
                    autoCenter: true,
                    elevation: 50,
                    gradients: true,
                    when: {
                        turned: function(event, page, view) {
                            state.currentPage = page;
                            state.bookInitialized = true;
                            ui.updateProgress();
                        },
                        first: function(event, page, view) {
                            state.currentPage = 1;
                            state.bookInitialized = true;
                            ui.updateProgress();
                        }
                    }
                });
                
                // Set initial state
                state.currentPage = 1;
                state.bookInitialized = true;
                ui.updateProgress();
                
                console.log('Turn.js initialized successfully');
                
            } catch (error) {
                console.error('Failed to initialize Turn.js:', error);
                ui.showLoading(`Ошибка инициализации Turn.js: ${error.message}`);
            }
        },
        
        nextPage() {
            if (state.bookInitialized) {
                jQuery('#book').turn('next');
            }
        },
        
        prevPage() {
            if (state.bookInitialized) {
                jQuery('#book').turn('previous');
            }
        },
        
        goToPage(page) {
            if (state.bookInitialized && page >= 1 && page <= state.totalPages) {
                jQuery('#book').turn('page', page);
            }
        },
        
        bindEvents() {
            // Navigation buttons
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            
            if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
            if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());
            
            // Header buttons
            const backBtn = document.getElementById('back-btn');
            if (backBtn) backBtn.addEventListener('click', () => history.back());
            
            // Click to toggle UI
            const book = document.getElementById('book');
            if (book) {
                book.addEventListener('click', (e) => {
                    // Only toggle UI if clicking empty space, not on text
                    const rect = e.currentTarget.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const clickZone = Math.abs(e.clientX - centerX) / (rect.width / 2);
                    
                    if (clickZone > 0.6) {
                        if (e.clientX < centerX) {
                            this.prevPage();
                        } else {
                            this.nextPage();
                        }
                    } else {
                        ui.toggleUI();
                    }
                });
            }
            
            // Progress bar
            const progressBar = document.getElementById('progress-bar');
            if (progressBar) {
                progressBar.addEventListener('click', (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    const page = Math.ceil(ratio * state.totalPages);
                    this.goToPage(page);
                });
            }
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
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
                        if (state.uiVisible) {
                            ui.toggleUI();
                        }
                        break;
                }
            });
            
            // Resize handler
            window.addEventListener('resize', () => {
                if (state.bookInitialized) {
                    setTimeout(() => {
                        jQuery('#book').turn('resize');
                    }, 300);
                }
            });
        }
    };

    // Initialize when DOM and jQuery are ready
    function initWhenReady() {
        if (typeof jQuery !== 'undefined' && document.readyState === 'complete') {
            reader.init();
        } else {
            setTimeout(initWhenReady, 100);
        }
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
        initWhenReady();
    }
})();
