(() => {
    'use strict';

    // Application state
    let state = {
        chapters: [],
        allContent: '',
        currentPage: 1,
        totalPages: 0,
        uiVisible: false
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
                const progress = ((state.currentPage - 1) / (state.totalPages - 1)) * 100;
                progressFill.style.width = `${Math.max(0, progress)}%`;
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
                
                await this.loadBook();
                this.createPages();
                this.initializeTurnJS();
                this.bindEvents();
                
                // Load saved progress
                const saved = storage.get('turnjs_reader_progress');
                if (saved && saved.page <= state.totalPages) {
                    $('#book').turn('page', saved.page);
                }
                
                ui.hideLoading();
                
                // Show UI briefly
                setTimeout(() => {
                    ui.toggleUI();
                    setTimeout(() => ui.toggleUI(), 3000);
                }, 500);
                
            } catch (error) {
                console.error('Failed to initialize reader:', error);
                ui.showLoading('Ошибка загрузки. Проверьте подключение.');
            }
        },
        
        async loadBook() {
            try {
                ui.showLoading('Загрузка книги...');
                
                // Load chapters metadata
                const response = await fetch('book/chapters.json');
                if (!response.ok) throw new Error('Failed to load chapters.json');
                
                state.chapters = await response.json();
                
                // Load all chapters
                let combinedContent = '';
                
                for (let i = 0; i < state.chapters.length; i++) {
                    ui.showLoading(`Загрузка главы ${i + 1} из ${state.chapters.length}...`);
                    
                    try {
                        const chapterResponse = await fetch(state.chapters[i].href);
                        const chapterContent = await chapterResponse.text();
                        
                        combinedContent += `
                            <h1>${state.chapters[i].title || `Глава ${i + 1}`}</h1>
                            ${chapterContent}
                        `;
                        
                    } catch (error) {
                        console.warn(`Failed to load chapter ${i}:`, error);
                        combinedContent += `
                            <h1>${state.chapters[i].title || `Глава ${i + 1}`}</h1>
                            <p>Ошибка загрузки главы. Попробуйте обновить страницу.</p>
                        `;
                    }
                }
                
                state.allContent = combinedContent;
                
            } catch (error) {
                console.error('Failed to load book:', error);
                throw error;
            }
        },
        
        createPages() {
            ui.showLoading('Создание страниц...');
            
            // Create a temporary container to measure content
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = `
                position: absolute;
                visibility: hidden;
                top: -9999px;
                left: 0;
                width: 800px;
                height: 600px;
                padding: 2rem;
                font-family: 'Crimson Text', Georgia, serif;
                font-size: 1.1rem;
                line-height: 1.6;
                color: var(--text-primary);
                text-align: justify;
                overflow: hidden;
                box-sizing: border-box;
            `;
            document.body.appendChild(tempContainer);
            
            // Split content into paragraphs
            const paragraphs = state.allContent.split(/(?=<h1|<p)/g).filter(p => p.trim());
            
            const pages = [];
            let currentPageContent = '';
            
            paragraphs.forEach(paragraph => {
                const testContent = currentPageContent + paragraph;
                tempContainer.innerHTML = testContent;
                
                if (tempContainer.scrollHeight > tempContainer.clientHeight && currentPageContent) {
                    // Save current page
                    pages.push(currentPageContent);
                    currentPageContent = paragraph;
                } else {
                    currentPageContent = testContent;
                }
            });
            
            // Add last page
            if (currentPageContent.trim()) {
                pages.push(currentPageContent);
            }
            
            // Remove temp container
            document.body.removeChild(tempContainer);
            
            // Create Turn.js pages
            const book = document.getElementById('book');
            book.innerHTML = '';
            
            pages.forEach((pageContent, index) => {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'page';
                pageDiv.innerHTML = pageContent;
                book.appendChild(pageDiv);
            });
            
            state.totalPages = pages.length;
            console.log(`Created ${state.totalPages} Turn.js pages`);
        },
        
        initializeTurnJS() {
            ui.showLoading('Инициализация Turn.js...');
            
            const $book = $('#book');
            
            $book.turn({
                width: 800,
                height: 600,
                autoCenter: true,
                elevation: 50,
                gradients: true,
                when: {
                    turned: (event, page, view) => {
                        state.currentPage = page;
                        ui.updateProgress();
                    }
                }
            });
            
            // Set initial state
            state.currentPage = 1;
            ui.updateProgress();
        },
        
        nextPage() {
            $('#book').turn('next');
        },
        
        prevPage() {
            $('#book').turn('previous');
        },
        
        bindEvents() {
            // Navigation buttons
            document.getElementById('prev-btn')?.addEventListener('click', () => this.prevPage());
            document.getElementById('next-btn')?.addEventListener('click', () => this.nextPage());
            
            // Header buttons
            document.getElementById('back-btn')?.addEventListener('click', () => history.back());
            
            // Click to toggle UI
            document.getElementById('book')?.addEventListener('click', (e) => {
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
            
            // Progress bar
            document.getElementById('progress-bar')?.addEventListener('click', (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                const page = Math.ceil(ratio * state.totalPages);
                $('#book').turn('page', page);
            });
            
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
                        $('#book').turn('page', 1);
                        break;
                    case 'End':
                        e.preventDefault();
                        $('#book').turn('page', state.totalPages);
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
                setTimeout(() => {
                    $('#book').turn('resize');
                }, 300);
            });
        }
    };

    // Initialize when DOM and jQuery are ready
    $(document).ready(() => {
        reader.init();
    });
})();
