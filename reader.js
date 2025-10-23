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
    
    // Reading position
    currentChapter: 0,
    currentPage: 1,
    totalPages: 1,
    
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
    
    // Cache
    pageCache: new Map(),
    
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
      
      this.save();
    },
    
    update(key, value) {
      state.settings[key] = value;
      this.apply();
      // Trigger page recalculation if typography changed
      if (['fontSize', 'lineHeight', 'textWidth'].includes(key)) {
        reader.calculatePages();
        reader.renderCurrentPage();
      }
    }
  };

  // Progress management
  const progress = {
    save() {
      storage.set('crimchitalka_progress', {
        chapter: state.currentChapter,
        page: state.currentPage,
        timestamp: Date.now()
      });
    },
    
    load() {
      const saved = storage.get('crimchitalka_progress');
      if (saved) {
        state.currentChapter = Math.max(0, Math.min(saved.chapter || 0, state.chapters.length - 1));
        state.currentPage = Math.max(1, saved.page || 1);
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
      
      if (currentPos) currentPos.textContent = state.currentPage;
      if (totalPos) totalPos.textContent = state.totalPages;
      if (pageInput) {
        pageInput.value = state.currentPage;
        pageInput.max = state.totalPages;
      }
      
      // Calculate reading time
      const chapter = state.chapters[state.currentChapter];
      if (chapter && readingTime) {
        const content = state.content[state.currentChapter] || '';
        const wordCount = content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
        const minutes = Math.ceil(wordCount / state.wordsPerMinute);
        readingTime.textContent = `~${minutes} мин`;
      }
      
      // Update progress bar
      const progress = state.totalPages > 1 ? (state.currentPage - 1) / (state.totalPages - 1) : 0;
      if (progressFill) progressFill.style.width = `${progress * 100}%`;
      if (progressHandle) progressHandle.style.left = `${progress * 100}%`;
    },
    
    renderTOC() {
      const tocList = $('#toc-list');
      if (!tocList) return;
      
      tocList.innerHTML = '';
      state.chapters.forEach((chapter, index) => {
        const item = document.createElement('div');
        item.className = 'toc-item';
        if (index === state.currentChapter) item.classList.add('active');
        
        item.innerHTML = `
          <div class="toc-title">${chapter.title || `Глава ${index + 1}`}</div>
          <div class="toc-page">Страница ${index + 1}</div>
        `;
        
        on(item, 'click', () => reader.goToChapter(index));
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
        
        // Calculate pages
        this.calculatePages();
        
        // Restore reading position
        progress.load();
        
        // Render UI
        this.renderCurrentPage();
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
    
    calculatePages() {
      // Simple approach: each chapter is one "page"
      // In a real implementation, you'd measure actual text height
      state.totalPages = state.chapters.length;
    },
    
    renderCurrentPage() {
      const pageContent = $('#page-content');
      if (!pageContent) return;
      
      const chapterIndex = state.currentChapter;
      const content = state.content[chapterIndex] || '<p>Глава не найдена</p>';
      
      // Update page content
      pageContent.innerHTML = content;
      
      // Update book title
      const bookTitle = $('#book-title');
      const chapter = state.chapters[chapterIndex];
      if (bookTitle && chapter) {
        bookTitle.textContent = chapter.bookTitle || 'КрымЧиталка';
      }
      
      // Update progress
      ui.updateProgress();
      ui.renderTOC();
      
      // Save progress
      progress.save();
    },
    
    goToChapter(index) {
      if (index >= 0 && index < state.chapters.length) {
        state.currentChapter = index;
        state.currentPage = index + 1; // Simple mapping
        this.renderCurrentPage();
        ui.hideSidebar();
      }
    },
    
    goToPage(page) {
      const pageNumber = Math.max(1, Math.min(parseInt(page) || 1, state.totalPages));
      const chapterIndex = pageNumber - 1; // Simple mapping
      this.goToChapter(chapterIndex);
    },
    
    nextPage() {
      if (state.currentChapter < state.chapters.length - 1) {
        this.goToChapter(state.currentChapter + 1);
      }
    },
    
    prevPage() {
      if (state.currentChapter > 0) {
        this.goToChapter(state.currentChapter - 1);
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
      on($('#page-input'), 'change', (e) => this.goToPage(e.target.value));
      
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
