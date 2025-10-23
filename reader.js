(() => {
  'use strict';

  // Utility functions
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const on = (element, event, handler) => element.addEventListener(event, handler);

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
      } catch {
        // Ignore storage errors
      }
    }
  };

  // Application state
  const state = {
    // Book data
    chapters: [],
    content: [],
    
    // Pagination data
    pages: [], // Array of {chapterIndex, content, pageNumber}
    currentPageIndex: 0,
    totalPages: 0,
    
    // UI state
    uiVisible: false,
    sidebarVisible: false,
    settingsVisible: false,
    
    // Settings
    settings: {
      theme: 'light',
      font: 'crimson',
      fontSize: 18,
      lineHeight: 1.6,
      textWidth: 'medium'
    },
    
    // Reading stats
    readingStartTime: Date.now(),
    wordsPerMinute: 200
  };

  // Settings management
  const settings = {
    load() {
      const saved = storage.get('crimchitalka_settings');
      if (saved) {
        Object.assign(state.settings, saved);
      }
      this.apply();
    },
    
    save() {
      storage.set('crimchitalka_settings', state.settings);
    },
    
    apply() {
      // Apply theme
      document.body.setAttribute('data-theme', state.settings.theme);
      document.body.setAttribute('data-width', state.settings.textWidth);
      
      // Apply typography
      document.documentElement.style.setProperty('--font-size-reading', `${state.settings.fontSize}px`);
      document.documentElement.style.setProperty('--line-height-reading', state.settings.lineHeight);
      
      // Apply font family
      const fontMap = {
        crimson: '"Crimson Text", Georgia, "Times New Roman", serif',
        inter: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        georgia: 'Georgia, "Times New Roman", serif'
      };
      document.documentElement.style.setProperty('--font-reading', fontMap[state.settings.font] || fontMap.crimson);
      
      // Apply text width
      const widthMap = {
        narrow: '520px',
        medium: '680px',
        wide: '800px'
      };
      document.documentElement.style.setProperty('--text-width', widthMap[state.settings.textWidth] || widthMap.medium);
      
      this.save();
    },
    
    update(key, value) {
      state.settings[key] = value;
      this.apply();
      // Trigger repagination if typography changed
      if (['fontSize', 'lineHeight', 'textWidth'].includes(key)) {
        reader.paginate();
        reader.renderCurrentPage();
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
      if (saved) {
        state.currentPageIndex = Math.max(0, Math.min(saved.pageIndex || 0, state.totalPages - 1));
      }
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
      state.sidebarVisible = true;
      const sidebar = $('#sidebar');
      const overlay = $('#overlay');
      
      if (sidebar) sidebar.classList.add('visible');
      if (overlay) overlay.classList.add('visible');
    },
    
    hideSidebar() {
      state.sidebarVisible = false;
      const sidebar = $('#sidebar');
      const overlay = $('#overlay');
      
      if (sidebar) sidebar.classList.remove('visible');
      if (overlay) overlay.classList.remove('visible');
    },
    
    showSettings() {
      state.settingsVisible = true;
      const modal = $('#settings-modal');
      if (modal) modal.classList.add('visible');
    },
    
    hideSettings() {
      state.settingsVisible = false;
      const modal = $('#settings-modal');
      if (modal) modal.classList.remove('visible');
    },
    
    updateProgress() {
      const currentPos = $('#current-pos');
      const totalPos = $('#total-pos');
      const readingTime = $('#reading-time');
      const progressFill = $('#progress-fill');
      const progressHandle = $('#progress-handle');
      const pageInput = $('#page-input');
      
      const currentPage = state.currentPageIndex + 1;
      
      if (currentPos) currentPos.textContent = currentPage;
      if (totalPos) totalPos.textContent = state.totalPages;
      if (pageInput) {
        pageInput.value = currentPage;
        pageInput.max = state.totalPages;
      }
      
      // Calculate reading time for current page
      if (readingTime && state.pages[state.currentPageIndex]) {
        const pageContent = state.pages[state.currentPageIndex].content;
        const wordCount = pageContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
        const minutes = Math.ceil(wordCount / state.wordsPerMinute);
        readingTime.textContent = `~${minutes} мин`;
      }
      
      // Update progress bar
      const progress = state.totalPages > 1 ? state.currentPageIndex / (state.totalPages - 1) : 0;
      if (progressFill) progressFill.style.width = `${progress * 100}%`;
      if (progressHandle) progressHandle.style.left = `${progress * 100}%`;
    },
    
    renderTOC() {
      const tocList = $('#toc-list');
      if (!tocList) return;
      
      tocList.innerHTML = '';
      
      // Create TOC entries with page numbers
      const chapterPages = new Map();
      state.pages.forEach((page, index) => {
        if (!chapterPages.has(page.chapterIndex)) {
          chapterPages.set(page.chapterIndex, index + 1);
        }
      });
      
      state.chapters.forEach((chapter, index) => {
        const item = document.createElement('div');
        item.className = 'toc-item';
        
        const currentChapter = state.pages[state.currentPageIndex]?.chapterIndex;
        if (index === currentChapter) item.classList.add('active');
        
        const startPage = chapterPages.get(index) || 1;
        
        item.innerHTML = `
          <div class="toc-title">${chapter.title || `Глава ${index + 1}`}</div>
          <div class="toc-page">Страница ${startPage}</div>
        `;
        
        on(item, 'click', () => {
          const pageIndex = state.pages.findIndex(p => p.chapterIndex === index);
          if (pageIndex >= 0) {
            reader.goToPage(pageIndex + 1);
            ui.hideSidebar();
          }
        });
        
        tocList.appendChild(item);
      });
    }
  };

  // Main reader functionality
  const reader = {
    async init() {
      try {
        ui.showLoading('Инициализация...');
        
        // Load settings
        settings.load();
        
        // Load book content
        await this.loadBook();
        
        // Create pagination
        await this.paginate();
        
        // Restore reading position
        progress.load();
        
        // Render current page
        this.renderCurrentPage();
        
        // Update UI
        ui.renderTOC();
        ui.updateProgress();
        
        // Bind events
        this.bindEvents();
        
        // Hide loading
        ui.hideLoading();
        
        // Show UI briefly then hide
        setTimeout(() => {
          ui.toggleUI();
          setTimeout(() => ui.toggleUI(), 2000);
        }, 500);
        
      } catch (error) {
        console.error('Failed to initialize reader:', error);
        ui.showLoading('Ошибка загрузки. Проверьте подключение.');
      }
    },
    
    async loadBook() {
      try {
        ui.showLoading('Загрузка оглавления...');
        
        // Load chapters metadata
        const response = await fetch('book/chapters.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load chapters.json');
        
        state.chapters = await response.json();
        state.content = new Array(state.chapters.length);
        
        // Load all chapters
        for (let i = 0; i < state.chapters.length; i++) {
          ui.showLoading(`Загрузка главы ${i + 1} из ${state.chapters.length}...`);
          
          try {
            const chapterResponse = await fetch(state.chapters[i].href, { cache: 'no-store' });
            if (chapterResponse.ok) {
              state.content[i] = await chapterResponse.text();
            } else {
              throw new Error(`HTTP ${chapterResponse.status}`);
            }
          } catch (error) {
            console.warn(`Failed to load chapter ${i}:`, error);
            state.content[i] = `
              <h1>${state.chapters[i].title || `Глава ${i + 1}`}</h1>
              <p>Ошибка загрузки главы. Попробуйте обновить страницу.</p>
            `;
          }
        }
        
      } catch (error) {
        console.error('Failed to load book:', error);
        throw new Error('Не удалось загрузить книгу');
      }
    },
    
    async paginate() {
      ui.showLoading('Подготовка страниц...');
      
      state.pages = [];
      
      // Create a temporary container for measuring
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.top = '0';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '100%';
      tempContainer.style.height = '100vh';
      document.body.appendChild(tempContainer);
      
      const tempPage = document.createElement('div');
      tempPage.className = 'page';
      tempPage.style.width = '100%';
      tempPage.style.maxWidth = 'var(--text-width)';
      tempPage.style.height = 'calc(100vh - 160px)';
      tempPage.style.overflow = 'hidden';
      tempContainer.appendChild(tempPage);
      
      const tempContent = document.createElement('div');
      tempContent.className = 'page-content';
      tempContent.style.height = '100%';
      tempContent.style.padding = '40px';
      tempContent.style.fontFamily = 'var(--font-reading)';
      tempContent.style.fontSize = 'var(--font-size-reading)';
      tempContent.style.lineHeight = 'var(--line-height-reading)';
      tempContent.style.overflow = 'hidden';
      tempPage.appendChild(tempContent);
      
      // Force style recalculation
      tempContainer.offsetHeight;
      
      // Process each chapter
      for (let chapterIndex = 0; chapterIndex < state.chapters.length; chapterIndex++) {
        const content = state.content[chapterIndex] || '';
        
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // Get all text nodes and elements
        const walker = document.createTreeWalker(
          tempDiv,
          NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            nodes.push(node.cloneNode(true));
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            nodes.push(node.cloneNode(true));
          }
        }
        
        // Split into pages
        let currentPageContent = '';
        let pageNumber = 1;
        
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          let nodeHTML = '';
          
          if (node.nodeType === Node.TEXT_NODE) {
            nodeHTML = node.textContent;
          } else {
            nodeHTML = node.outerHTML;
          }
          
          // Try adding this node to current page
          const testContent = currentPageContent + nodeHTML;
          tempContent.innerHTML = testContent;
          
          // Check if it overflows
          if (tempContent.scrollHeight > tempContent.clientHeight && currentPageContent) {
            // Save current page
            state.pages.push({
              chapterIndex: chapterIndex,
              content: currentPageContent,
              pageNumber: state.pages.length + 1
            });
            
            // Start new page with this node
            currentPageContent = nodeHTML;
            pageNumber++;
          } else {
            // Add to current page
            currentPageContent = testContent;
          }
        }
        
        // Add final page if there's content
        if (currentPageContent.trim()) {
          state.pages.push({
            chapterIndex: chapterIndex,
            content: currentPageContent,
            pageNumber: state.pages.length + 1
          });
        }
      }
      
      // Clean up temporary elements
      document.body.removeChild(tempContainer);
      
      state.totalPages = state.pages.length;
      
      // Ensure current page index is valid
      state.currentPageIndex = Math.max(0, Math.min(state.currentPageIndex, state.totalPages - 1));
    },
    
    renderCurrentPage() {
      const pageContent = $('#page-content');
      if (!pageContent || !state.pages[state.currentPageIndex]) return;
      
      const currentPage = state.pages[state.currentPageIndex];
      
      // Update page content (no scrolling, just replace)
      pageContent.innerHTML = currentPage.content;
      
      // Update book title
      const bookTitle = $('#book-title');
      const chapter = state.chapters[currentPage.chapterIndex];
      if (bookTitle && chapter) {
        bookTitle.textContent = chapter.bookTitle || 'КрымЧиталка';
      }
      
      // Update progress
      ui.updateProgress();
      ui.renderTOC();
      
      // Save progress
      progress.save();
    },
    
    goToPage(pageNumber) {
      const pageIndex = Math.max(0, Math.min(pageNumber - 1, state.totalPages - 1));
      if (pageIndex !== state.currentPageIndex) {
        state.currentPageIndex = pageIndex;
        this.renderCurrentPage();
      }
    },
    
    nextPage() {
      if (state.currentPageIndex < state.totalPages - 1) {
        state.currentPageIndex++;
        this.renderCurrentPage();
      }
    },
    
    prevPage() {
      if (state.currentPageIndex > 0) {
        state.currentPageIndex--;
        this.renderCurrentPage();
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
      
      // Sidebar tabs
      $$('.tab-btn').forEach(btn => {
        on(btn, 'click', () => {
          $$('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          const tabName = btn.dataset.tab;
          $$('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
          });
        });
      });
      
      // Settings modal
      on($('#close-settings'), 'click', () => ui.hideSettings());
      on($('#settings-modal .modal-backdrop'), 'click', () => ui.hideSettings());
      
      // Theme buttons
      $$('.theme-btn').forEach(btn => {
        on(btn, 'click', () => {
          $$('.theme-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          settings.update('theme', btn.dataset.theme);
        });
      });
      
      // Font buttons
      $$('.font-btn').forEach(btn => {
        on(btn, 'click', () => {
          $$('.font-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          settings.update('font', btn.dataset.font);
        });
      });
      
      // Width buttons
      $$('.width-btn').forEach(btn => {
        on(btn, 'click', () => {
          $$('.width-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          settings.update('textWidth', btn.dataset.width);
        });
      });
      
      // Range sliders
      const fontSizeSlider = $('#font-size-slider');
      const fontSizeValue = $('#font-size-value');
      if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.value = state.settings.fontSize;
        on(fontSizeSlider, 'input', (e) => {
          const size = parseInt(e.target.value);
          fontSizeValue.textContent = `${size}px`;
          settings.update('fontSize', size);
        });
      }
      
      const lineHeightSlider = $('#line-height-slider');
      const lineHeightValue = $('#line-height-value');
      if (lineHeightSlider && lineHeightValue) {
        lineHeightSlider.value = state.settings.lineHeight;
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
            if (state.settingsVisible) {
              ui.hideSettings();
            } else if (state.sidebarVisible) {
              ui.hideSidebar();
            } else if (state.uiVisible) {
              ui.toggleUI();
            }
            break;
          case 't':
            if (e.ctrlKey) {
              e.preventDefault();
              ui.showSidebar();
            }
            break;
          case 's':
            if (e.ctrlKey) {
              e.preventDefault();
              ui.showSettings();
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
