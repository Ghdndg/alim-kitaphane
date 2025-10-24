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
    content: [],
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
      // Repaginate after settings change
      setTimeout(() => {
        reader.paginate();
        reader.render();
      }, 100);
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
    
    updateProgress() {
      const currentPage = $('#current-page');
      const totalPages = $('#total-pages');
      const readingTime = $('#reading-time');
      const progressFill = $('#progress-fill');
      const pageInput = $('#page-input');
      
      const current = state.currentPageIndex + 1;
      
      if (currentPage) currentPage.textContent = current;
      if (totalPages) totalPages.textContent = state.totalPages;
      if (pageInput) {
        pageInput.value = current;
        pageInput.max = state.totalPages;
      }
      
      if (readingTime && state.pages[state.currentPageIndex]) {
        const remainingPages = state.totalPages - current;
        const minutes = Math.ceil(remainingPages * 1.5); // Assume 1.5 min per page
        readingTime.textContent = `~${minutes} мин`;
      }
      
      const progressPercent = state.totalPages > 1 ? (state.currentPageIndex / (state.totalPages - 1)) * 100 : 0;
      if (progressFill) progressFill.style.width = `${progressPercent}%`;
    },
    
    renderTOC() {
      const tocList = $('#toc-list');
      if (!tocList) return;
      
      tocList.innerHTML = '';
      
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
        
        settings.load();
        await this.loadBook();
        this.paginate();
        
        progress.load();
        this.render();
        
        ui.renderTOC();
        ui.updateProgress();
        this.bindEvents();
        
        ui.hideLoading();
        
        // Show UI briefly
        setTimeout(() => {
          ui.toggleUI();
          setTimeout(() => ui.toggleUI(), 3000);
        }, 500);
        
      } catch (error) {
        console.error('Failed to initialize reader:', error);
        ui.showLoading('Ошибка загрузки. Проверьте подключение к интернету.');
      }
    },
    
    async loadBook() {
      try {
        ui.showLoading('Загрузка оглавления...');
        
        const response = await fetch('book/chapters.json');
        if (!response.ok) throw new Error('Failed to load chapters.json');
        
        state.chapters = await response.json();
        state.content = new Array(state.chapters.length);
        
        for (let i = 0; i < state.chapters.length; i++) {
          ui.showLoading(`Загрузка главы ${i + 1} из ${state.chapters.length}...`);
          
          try {
            const chapterResponse = await fetch(state.chapters[i].href);
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
        throw error;
      }
    },
    
    paginate() {
      ui.showLoading('Создание страниц...');
      
      state.pages = [];
      const isMobile = window.innerWidth <= 768;
      
      // VERY SAFE character limits - never overflow
      const charsPerPage = isMobile ? 400 : 700; // Very conservative
      
      console.log('SAFE chars per page:', charsPerPage, 'Mobile:', isMobile);

      state.chapters.forEach((chapter, chapterIndex) => {
        const chapterContent = state.content[chapterIndex] || '';
        
        // Extract plain text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chapterContent;
        const textContent = tempDiv.textContent || '';
        
        const words = textContent.split(/\s+/).filter(word => word.length > 0);
        
        let isFirstPageOfChapter = true;
        let currentText = '';
        
        words.forEach(word => {
          const testText = currentText + (currentText ? ' ' : '') + word;
          
          if (testText.length > charsPerPage && currentText.length > 0) {
            // Create page
            let pageHTML = '';
            
            if (isFirstPageOfChapter) {
              pageHTML += `<h1>${chapter.title || `Глава ${chapterIndex + 1}`}</h1>`;
              isFirstPageOfChapter = false;
            }
            
            // Split into small paragraphs
            const pageWords = currentText.split(/\s+/);
            const wordsPerParagraph = isMobile ? 12 : 18; // Very small paragraphs
            
            for (let i = 0; i < pageWords.length; i += wordsPerParagraph) {
              const paragraphWords = pageWords.slice(i, i + wordsPerParagraph);
              if (paragraphWords.length > 0) {
                pageHTML += `<p>${paragraphWords.join(' ')}</p>`;
              }
            }
            
            state.pages.push({
              content: pageHTML,
              chapterIndex: chapterIndex
            });
            
            currentText = word;
          } else {
            currentText = testText;
          }
        });
        
        // Last page of chapter
        if (currentText.trim()) {
          let pageHTML = '';
          
          if (isFirstPageOfChapter) {
            pageHTML += `<h1>${chapter.title || `Глава ${chapterIndex + 1}`}</h1>`;
          }
          
          const pageWords = currentText.split(/\s+/);
          const wordsPerParagraph = isMobile ? 12 : 18;
          
          for (let i = 0; i < pageWords.length; i += wordsPerParagraph) {
            const paragraphWords = pageWords.slice(i, i + wordsPerParagraph);
            if (paragraphWords.length > 0) {
              pageHTML += `<p>${paragraphWords.join(' ')}</p>`;
            }
          }
          
          state.pages.push({
            content: pageHTML,
            chapterIndex: chapterIndex
          });
        }
      });

      state.totalPages = state.pages.length;
      if (state.currentPageIndex >= state.totalPages) {
        state.currentPageIndex = Math.max(0, state.totalPages - 1);
      }
      
      console.log(`Created ${state.totalPages} ULTRA-SAFE pages`);
    },
    
    render() {
      const pageContent = $('#page-content');
      if (!pageContent || !state.pages[state.currentPageIndex]) return;
      
      const currentPage = state.pages[state.currentPageIndex];
      pageContent.innerHTML = currentPage.content;
      
      ui.updateProgress();
      ui.renderTOC();
      progress.save();
    },
    
    goToPage(pageNumber) {
      const pageIndex = Math.max(0, Math.min(pageNumber - 1, state.totalPages - 1));
      if (pageIndex !== state.currentPageIndex) {
        state.currentPageIndex = pageIndex;
        this.render();
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
      
      // Resize handler
      window.addEventListener('resize', () => {
        setTimeout(() => {
          this.paginate();
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
