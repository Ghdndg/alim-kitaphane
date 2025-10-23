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
    pages: [], // Array of page objects: { content: string, chapterIndex: number, pageInChapter: number }
    currentPageIndex: 0,
    totalPages: 0,
    
    // Chapter mapping
    chapterStartPages: [], // First page index for each chapter
    
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
      
      // Apply text width
      const widths = { narrow: '520px', medium: '680px', wide: '800px' };
      document.documentElement.style.setProperty('--text-width', widths[state.settings.textWidth] || widths.medium);
      
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
        setTimeout(() => {
          paginator.calculatePages();
          reader.renderCurrentPage();
          ui.updateProgress();
        }, 100);
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
      if (saved && saved.pageIndex !== undefined) {
        state.currentPageIndex = Math.max(0, Math.min(saved.pageIndex, state.totalPages - 1));
      }
    }
  };

  // Page calculation engine
  const paginator = {
    calculatePages() {
      ui.showLoading('Создание страниц...');
      
      // Clear existing pages
      state.pages = [];
      state.chapterStartPages = [];
      
      // Create a hidden measurement container
      const measureContainer = this.createMeasureContainer();
      
      try {
        state.chapters.forEach((chapter, chapterIndex) => {
          // Mark the start of this chapter
          state.chapterStartPages[chapterIndex] = state.pages.length;
          
          const chapterContent = state.content[chapterIndex] || '';
          const pages = this.paginateChapter(chapterContent, chapterIndex, measureContainer);
          state.pages.push(...pages);
          
          ui.showLoading(`Обработка глав: ${chapterIndex + 1}/${state.chapters.length}`);
        });
        
        state.totalPages = state.pages.length;
        
        // Clean up
        document.body.removeChild(measureContainer);
        
      } catch (error) {
        console.error('Pagination failed:', error);
        document.body.removeChild(measureContainer);
        throw error;
      }
    },
    
    createMeasureContainer() {
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        visibility: hidden;
      `;
      
      const page = document.createElement('div');
      page.className = 'page';
      
      const pageContent = document.createElement('div');
      pageContent.className = 'page-content';
      pageContent.style.cssText = `
        height: calc(100vh - 160px);
        overflow: hidden;
        padding: 40px;
      `;
      
      page.appendChild(pageContent);
      container.appendChild(page);
      document.body.appendChild(container);
      
      return { container, page, pageContent };
    },
    
    paginateChapter(htmlContent, chapterIndex, measureContainer) {
      const { pageContent } = measureContainer;
      const pages = [];
      
      // Create a temporary DOM structure
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Get all child elements
      const elements = Array.from(tempDiv.children);
      
      let currentPageContent = '';
      let pageNumber = 1;
      
      elements.forEach((element, elementIndex) => {
        const elementHTML = element.outerHTML;
        const testContent = currentPageContent + elementHTML;
        
        // Test if content fits on current page
        pageContent.innerHTML = testContent;
        
        if (pageContent.scrollHeight > pageContent.clientHeight) {
          // Content overflows - save current page and start new one
          if (currentPageContent.trim()) {
            pages.push({
              content: currentPageContent,
              chapterIndex: chapterIndex,
              pageInChapter: pageNumber,
              chapterTitle: state.chapters[chapterIndex]?.title || `Глава ${chapterIndex + 1}`
            });
            pageNumber++;
          }
          
          // Start new page with current element
          currentPageContent = elementHTML;
          pageContent.innerHTML = elementHTML;
          
          // Handle very long elements that don't fit on a single page
          if (pageContent.scrollHeight > pageContent.clientHeight) {
            const splitPages = this.splitLongElement(element, chapterIndex, pageNumber, measureContainer);
            pages.push(...splitPages);
            pageNumber += splitPages.length;
            currentPageContent = '';
          }
        } else {
          // Content fits - add to current page
          currentPageContent = testContent;
        }
      });
      
      // Add the last page if it has content
      if (currentPageContent.trim()) {
        pages.push({
          content: currentPageContent,
          chapterIndex: chapterIndex,
          pageInChapter: pageNumber,
          chapterTitle: state.chapters[chapterIndex]?.title || `Глава ${chapterIndex + 1}`
        });
      }
      
      // Ensure at least one page per chapter
      if (pages.length === 0) {
        pages.push({
          content: htmlContent || `<h1>${state.chapters[chapterIndex]?.title || `Глава ${chapterIndex + 1}`}</h1>`,
          chapterIndex: chapterIndex,
          pageInChapter: 1,
          chapterTitle: state.chapters[chapterIndex]?.title || `Глава ${chapterIndex + 1}`
        });
      }
      
      return pages;
    },
    
    splitLongElement(element, chapterIndex, startPageNumber, measureContainer) {
      const { pageContent } = measureContainer;
      const pages = [];
      
      // For very long elements (like long paragraphs), split by sentences
      if (element.tagName === 'P' && element.textContent.length > 500) {
        const sentences = element.textContent.split(/(?<=[.!?…])\s+/);
        let currentContent = `<${element.tagName.toLowerCase()}>`;
        let pageNumber = startPageNumber;
        
        sentences.forEach(sentence => {
          const testContent = currentContent + sentence + ' ';
          pageContent.innerHTML = testContent + `</${element.tagName.toLowerCase()}>`;
          
          if (pageContent.scrollHeight > pageContent.clientHeight && currentContent.length > element.tagName.length + 3) {
            // Save current page
            pages.push({
              content: currentContent + `</${element.tagName.toLowerCase()}>`,
              chapterIndex: chapterIndex,
              pageInChapter: pageNumber,
              chapterTitle: state.chapters[chapterIndex]?.title || `Глава ${chapterIndex + 1}`
            });
            pageNumber++;
            currentContent = `<${element.tagName.toLowerCase()}>${sentence} `;
          } else {
            currentContent = testContent;
          }
        });
        
        // Add final page
        if (currentContent.length > element.tagName.length + 3) {
          pages.push({
            content: currentContent + `</${element.tagName.toLowerCase()}>`,
            chapterIndex: chapterIndex,
            pageInChapter: pageNumber,
            chapterTitle: state.chapters[chapterIndex]?.title || `Глава ${chapterIndex + 1}`
          });
        }
      } else {
        // For other elements, just put on single page (might overflow)
        pages.push({
          content: element.outerHTML,
          chapterIndex: chapterIndex,
          pageInChapter: startPageNumber,
          chapterTitle: state.chapters[chapterIndex]?.title || `Глава ${chapterIndex + 1}`
        });
      }
      
      return pages;
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
      const currentPage = state.currentPageIndex + 1;
      const totalPages = state.totalPages;
      
      const currentPos = $('#current-pos');
      const totalPos = $('#total-pos');
      const readingTime = $('#reading-time');
      const progressFill = $('#progress-fill');
      const progressHandle = $('#progress-handle');
      const pageInput = $('#page-input');
      
      if (currentPos) currentPos.textContent = currentPage;
      if (totalPos) totalPos.textContent = totalPages;
      if (pageInput) {
        pageInput.value = currentPage;
        pageInput.max = totalPages;
      }
      
      // Calculate reading time for current page
      if (readingTime && state.pages[state.currentPageIndex]) {
        const currentPageData = state.pages[state.currentPageIndex];
        const wordCount = currentPageData.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
        const minutes = Math.ceil(wordCount / state.wordsPerMinute);
        readingTime.textContent = `~${minutes} мин`;
      }
      
      // Update progress bar
      const progress = totalPages > 1 ? (currentPage - 1) / (totalPages - 1) : 0;
      if (progressFill) progressFill.style.width = `${progress * 100}%`;
      if (progressHandle) progressHandle.style.left = `${progress * 100}%`;
    },
    
    renderTOC() {
      const tocList = $('#toc-list');
      if (!tocList) return;
      
      tocList.innerHTML = '';
      state.chapters.forEach((chapter, chapterIndex) => {
        const startPageIndex = state.chapterStartPages[chapterIndex];
        const startPageNumber = startPageIndex + 1;
        
        const item = document.createElement('div');
        item.className = 'toc-item';
        
        // Highlight current chapter
        const currentPage = state.pages[state.currentPageIndex];
        if (currentPage && currentPage.chapterIndex === chapterIndex) {
          item.classList.add('active');
        }
        
        item.innerHTML = `
          <div class="toc-title">${chapter.title || `Глава ${chapterIndex + 1}`}</div>
          <div class="toc-page">Страница ${startPageNumber}</div>
        `;
        
        on(item, 'click', () => {
          reader.goToPage(startPageNumber);
          this.hideSidebar();
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
        
        // Calculate pages
        paginator.calculatePages();
        
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
        
        // Show UI briefly then hide for immersive reading
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
    
    renderCurrentPage() {
      const pageContent = $('#page-content');
      if (!pageContent || !state.pages.length) return;
      
      const currentPageData = state.pages[state.currentPageIndex];
      if (!currentPageData) return;
      
      // Render page content WITHOUT scroll
      pageContent.innerHTML = currentPageData.content;
      pageContent.style.overflow = 'hidden'; // No scrolling!
      
      // Update book title
      const bookTitle = $('#book-title');
      if (bookTitle) {
        const chapter = state.chapters[currentPageData.chapterIndex];
        bookTitle.textContent = chapter?.bookTitle || 'КрымЧиталка';
      }
      
      // Update progress
      ui.updateProgress();
      ui.renderTOC();
      
      // Save progress
      progress.save();
      
      // Update navigation buttons
      this.updateNavigationButtons();
    },
    
    updateNavigationButtons() {
      const prevBtn = $('#prev-btn');
      const nextBtn = $('#next-btn');
      
      if (prevBtn) {
        prevBtn.disabled = state.currentPageIndex === 0;
      }
      
      if (nextBtn) {
        nextBtn.disabled = state.currentPageIndex >= state.totalPages - 1;
      }
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
        this.goToPage(state.currentPageIndex + 2); // +2 because goToPage expects 1-based
      }
    },
    
    prevPage() {
      if (state.currentPageIndex > 0) {
        this.goToPage(state.currentPageIndex); // current index is 0-based, so this goes to previous
      }
    },
    
    bindEvents() {
      // Touch zones for page turning
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
      on($('#page-input'), 'change', (e) => {
        const pageNumber = parseInt(e.target.value);
        if (pageNumber >= 1 && pageNumber <= state.totalPages) {
          this.goToPage(pageNumber);
        } else {
          // Reset to current page if invalid
          e.target.value = state.currentPageIndex + 1;
        }
      });
      
      // Progress bar click
      on($('#progress-bar'), 'click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const pageNumber = Math.ceil(ratio * state.totalPages);
        this.goToPage(pageNumber);
      });
      
      // Sidebar controls
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
      
      // Settings controls
      this.bindSettingsControls();
      
      // Keyboard shortcuts
      on(document, 'keydown', (e) => {
        // Don't handle keys when typing in inputs
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
            } else {
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
    },
    
    bindSettingsControls() {
      // Theme buttons
      $$('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === state.settings.theme) {
          btn.classList.add('active');
        }
        on(btn, 'click', () => {
          $$('.theme-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          settings.update('theme', btn.dataset.theme);
        });
      });
      
      // Font buttons
      $$('.font-btn').forEach(btn => {
        if (btn.dataset.font === state.settings.font) {
          btn.classList.add('active');
        }
        on(btn, 'click', () => {
          $$('.font-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          settings.update('font', btn.dataset.font);
        });
      });
      
      // Width buttons
      $$('.width-btn').forEach(btn => {
        if (btn.dataset.width === state.settings.textWidth) {
          btn.classList.add('active');
        }
        on(btn, 'click', () => {
          $$('.width-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          settings.update('textWidth', btn.dataset.width);
        });
      });
      
      // Font size slider
      const fontSizeSlider = $('#font-size-slider');
      const fontSizeValue = $('#font-size-value');
      if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.value = state.settings.fontSize;
        fontSizeValue.textContent = `${state.settings.fontSize}px`;
        on(fontSizeSlider, 'input', (e) => {
          const size = parseInt(e.target.value);
          fontSizeValue.textContent = `${size}px`;
          settings.update('fontSize', size);
        });
      }
      
      // Line height slider
      const lineHeightSlider = $('#line-height-slider');
      const lineHeightValue = $('#line-height-value');
      if (lineHeightSlider && lineHeightValue) {
        lineHeightSlider.value = state.settings.lineHeight;
        lineHeightValue.textContent = state.settings.lineHeight.toFixed(1);
        on(lineHeightSlider, 'input', (e) => {
          const height = parseFloat(e.target.value);
          lineHeightValue.textContent = height.toFixed(1);
          settings.update('lineHeight', height);
        });
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => reader.init());
  } else {
    reader.init();
  }
})();
