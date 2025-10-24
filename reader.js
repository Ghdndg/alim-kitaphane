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

  // State
  const state = {
    chapters: [],
    content: [],
    currentChapterIndex: 0,
    totalChapters: 0,
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
        inter: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        georgia: 'Georgia, serif'
      };
      document.documentElement.style.setProperty('--font-reading', fontMap[state.settings.font]);
      
      const widthMap = {
        narrow: '520px',
        medium: '680px',
        wide: '800px'
      };
      document.documentElement.style.setProperty('--text-width', widthMap[state.settings.textWidth]);
      
      this.save();
    },
    
    update(key, value) {
      state.settings[key] = value;
      this.apply();
    }
  };

  // Progress tracking
  const progress = {
    save() {
      const container = $('#scroll-container');
      if (container) {
        storage.set('crimchitalka_progress', {
          scrollTop: container.scrollTop,
          timestamp: Date.now()
        });
      }
    },
    
    load() {
      const saved = storage.get('crimchitalka_progress');
      if (saved) {
        setTimeout(() => {
          const container = $('#scroll-container');
          if (container) {
            container.scrollTop = saved.scrollTop || 0;
          }
        }, 100);
      }
    },
    
    update() {
      const container = $('#scroll-container');
      if (!container) return;
      
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const progressPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      // Update progress bar
      const progressFill = $('#progress-fill');
      const progressHandle = $('#progress-handle');
      if (progressFill) progressFill.style.width = `${progressPercent}%`;
      if (progressHandle) progressHandle.style.left = `${progressPercent}%`;
      
      // Update progress text
      const progressPercentEl = $('#progress-percent');
      if (progressPercentEl) progressPercentEl.textContent = `${Math.round(progressPercent)}%`;
      
      // Update reading time
      const readingTime = $('#reading-time');
      if (readingTime) {
        const remainingPercent = 100 - progressPercent;
        const totalMinutes = Math.ceil(state.totalWords / 200); // 200 words per minute
        const remainingMinutes = Math.ceil((totalMinutes * remainingPercent) / 100);
        readingTime.textContent = `~${remainingMinutes} мин`;
      }
      
      // Update current chapter
      this.updateCurrentChapter();
      this.save();
    },
    
    updateCurrentChapter() {
      const container = $('#scroll-container');
      const currentChapterEl = $('#current-chapter');
      if (!container || !currentChapterEl) return;
      
      const chapters = $$('.chapter');
      const scrollTop = container.scrollTop + 100; // Offset for header
      
      let activeChapter = 0;
      chapters.forEach((chapter, index) => {
        if (chapter.offsetTop <= scrollTop) {
          activeChapter = index;
        }
      });
      
      state.currentChapterIndex = activeChapter;
      const chapterData = state.chapters[activeChapter];
      if (chapterData) {
        currentChapterEl.textContent = chapterData.title || `Глава ${activeChapter + 1}`;
      }
      
      // Update TOC
      $$('.toc-item').forEach((item, index) => {
        item.classList.toggle('active', index === activeChapter);
      });
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
        
        item.innerHTML = `<div class="toc-title">${chapter.title || `Глава ${index + 1}`}</div>`;
        
        on(item, 'click', () => {
          const chapterEl = $(`.chapter[data-chapter="${index}"]`);
          if (chapterEl) {
            chapterEl.scrollIntoView({ behavior: 'smooth' });
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
        this.renderBook();
        
        progress.load();
        ui.renderTOC();
        this.bindEvents();
        
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
        ui.showLoading('Загрузка оглавления...');
        
        const response = await fetch('book/chapters.json');
        if (!response.ok) throw new Error('Failed to load chapters.json');
        
        state.chapters = await response.json();
        state.content = new Array(state.chapters.length);
        state.totalChapters = state.chapters.length;
        
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
              <div class="chapter-content">
                <p>Ошибка загрузки главы. Попробуйте обновить страницу.</p>
              </div>
            `;
          }
        }
        
      } catch (error) {
        console.error('Failed to load book:', error);
        throw new Error('Не удалось загрузить книгу');
      }
    },
    
    renderBook() {
      const bookContent = $('#book-content');
      if (!bookContent) return;
      
      let totalWords = 0;
      let html = '';
      
      state.chapters.forEach((chapter, index) => {
        const chapterContent = state.content[index] || '';
        
        // Count words for reading time estimation
        const words = chapterContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean);
        totalWords += words.length;
        
        html += `
          <div class="chapter" data-chapter="${index}">
            <h1 class="chapter-title">${chapter.title || `Глава ${index + 1}`}</h1>
            <div class="chapter-content">${chapterContent}</div>
          </div>
        `;
      });
      
      state.totalWords = totalWords;
      bookContent.innerHTML = html;
      
      // Initialize progress
      setTimeout(() => progress.update(), 100);
    },
    
    scrollToChapter(chapterIndex) {
      const chapterEl = $(`.chapter[data-chapter="${chapterIndex}"]`);
      if (chapterEl) {
        chapterEl.scrollIntoView({ behavior: 'smooth' });
      }
    },
    
    scrollUp() {
      const container = $('#scroll-container');
      if (container) {
        container.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
      }
    },
    
    scrollDown() {
      const container = $('#scroll-container');
      if (container) {
        container.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
      }
    },
    
    scrollToTop() {
      const container = $('#scroll-container');
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    
    bindEvents() {
      // Touch zones
      on($('#scroll-up'), 'click', () => this.scrollUp());
      on($('#scroll-down'), 'click', () => this.scrollDown());
      on($('#menu-zone'), 'click', () => ui.toggleUI());
      
      // Navigation buttons
      on($('#chapter-prev'), 'click', () => {
        const prevIndex = Math.max(0, state.currentChapterIndex - 1);
        this.scrollToChapter(prevIndex);
      });
      on($('#chapter-next'), 'click', () => {
        const nextIndex = Math.min(state.totalChapters - 1, state.currentChapterIndex + 1);
        this.scrollToChapter(nextIndex);
      });
      on($('#scroll-top'), 'click', () => this.scrollToTop());
      
      // Header buttons
      on($('#back-btn'), 'click', () => history.back());
      on($('#toc-btn'), 'click', () => ui.showSidebar());
      on($('#settings-btn'), 'click', () => ui.showSettings());
      
      // Progress bar
      on($('#progress-bar'), 'click', (e) => {
        const container = $('#scroll-container');
        if (container) {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const scrollHeight = container.scrollHeight - container.clientHeight;
          container.scrollTo({ top: scrollHeight * ratio, behavior: 'smooth' });
        }
      });
      
      // Scroll tracking
      const container = $('#scroll-container');
      if (container) {
        let scrollTimeout;
        on(container, 'scroll', () => {
          progress.update();
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => progress.save(), 500);
        });
      }
      
      // Sidebar
      on($('#close-sidebar'), 'click', () => ui.hideSidebar());
      on($('#overlay'), 'click', () => ui.hideSidebar());
      
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
          case 'ArrowUp':
          case 'PageUp':
            e.preventDefault();
            this.scrollUp();
            break;
          case 'ArrowDown':
          case 'PageDown':
          case ' ':
            e.preventDefault();
            this.scrollDown();
            break;
          case 'Home':
            e.preventDefault();
            this.scrollToTop();
            break;
          case 'End':
            e.preventDefault();
            const container = $('#scroll-container');
            if (container) {
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
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
