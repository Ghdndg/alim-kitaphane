(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on = (el, evt, cb) => el.addEventListener(evt, cb);

  const storage = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // ignore
      }
    },
  };

  const DEFAULTS = {
    theme: 'auto',
    font: 'crimson',
    size: 18,
    lh: 1.7,
    width: 'medium',
    mode: 'page'
  };

  const STATE = {
    chapters: [],
    content: [],
    currentChapter: 0,
    currentPage: 1,
    totalPages: 1,
    globalPage: 1,
    totalGlobalPages: 1,
    chapterPages: [],
    chapterStart: [],
    settings: { ...DEFAULTS }
  };

  const Settings = {
    load() {
      STATE.settings = { ...DEFAULTS, ...(storage.get('premium_reader_settings') || {}) };
      this.apply();
    },
    
    apply() {
      document.body.dataset.theme = STATE.settings.theme;
      document.documentElement.style.setProperty('--fs', `${STATE.settings.size}px`);
      document.documentElement.style.setProperty('--lh', STATE.settings.lh);
      
      const widths = { narrow: '58ch', medium: '68ch', wide: '78ch' };
      document.documentElement.style.setProperty('--mw', widths[STATE.settings.width] || '68ch');
      
      const fonts = {
        crimson: '"Crimson Text", Georgia, serif',
        inter: 'Inter, system-ui, sans-serif',
        georgia: 'Georgia, serif'
      };
      document.documentElement.style.setProperty('--serif', fonts[STATE.settings.font] || fonts.crimson);
      
      storage.set('premium_reader_settings', STATE.settings);
    },

    bindUI() {
      // Theme buttons
      $$('[data-theme]').forEach(btn => {
        on(btn, 'click', () => {
          $$('[data-theme]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          STATE.settings.theme = btn.dataset.theme;
          this.apply();
        });
      });

      // Font buttons
      $$('[data-font]').forEach(btn => {
        on(btn, 'click', () => {
          $$('[data-font]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          STATE.settings.font = btn.dataset.font;
          this.apply();
        });
      });

      // Width buttons
      $$('[data-width]').forEach(btn => {
        on(btn, 'click', () => {
          $$('[data-width]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          STATE.settings.width = btn.dataset.width;
          this.apply();
        });
      });

      // Range inputs
      const sizeSlider = $('#ctrl-size');
      const lhSlider = $('#ctrl-lh');
      
      if (sizeSlider) {
        sizeSlider.value = STATE.settings.size;
        on(sizeSlider, 'input', (e) => {
          STATE.settings.size = +e.target.value;
          this.apply();
        });
      }
      
      if (lhSlider) {
        lhSlider.value = STATE.settings.lh;
        on(lhSlider, 'input', (e) => {
          STATE.settings.lh = +e.target.value;
          this.apply();
        });
      }
    }
  };

  const Reader = {
    async init() {
      try {
        Settings.load();
        await this.loadBook();
        this.buildSimplePages();
        this.renderUI();
        this.bindEvents();
        Settings.bindUI();
        this.hideLoading();
        
        // Restore progress
        const progress = storage.get('premium_reader_progress_hadji');
        if (progress && progress.page) {
          this.goToPage(progress.page);
        }
      } catch (error) {
        console.error('Reader init error:', error);
        this.showError('Ошибка инициализации ридера');
      }
    },

    async loadBook() {
      try {
        const response = await fetch('book/chapters.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load chapters.json');
        
        STATE.chapters = await response.json();
        
        // Load all chapters
        for (let i = 0; i < STATE.chapters.length; i++) {
          try {
            const chapterResponse = await fetch(STATE.chapters[i].href, { cache: 'no-store' });
            const html = await chapterResponse.text();
            STATE.content[i] = html;
            
            // Update loading text
            const loadingHint = $('#loading .loading__hint');
            if (loadingHint) {
              loadingHint.textContent = `Загружено глав: ${i + 1} из ${STATE.chapters.length}`;
            }
          } catch (e) {
            console.warn(`Failed to load chapter ${i}:`, e);
            STATE.content[i] = `<h1>${STATE.chapters[i].title || `Глава ${i + 1}`}</h1><p>Ошибка загрузки главы.</p>`;
          }
        }
      } catch (error) {
        console.error('Failed to load book:', error);
        throw new Error('Не удалось загрузить книгу');
      }
    },

    buildSimplePages() {
      // Simple pagination: each chapter = multiple pages based on content length
      STATE.chapterPages = [];
      STATE.chapterStart = [];
      let totalPages = 0;

      STATE.chapters.forEach((chapter, index) => {
        const content = STATE.content[index] || '';
        const textLength = content.replace(/<[^>]*>/g, '').length;
        const wordsPerPage = 800; // approximate
        const pages = Math.max(1, Math.ceil(textLength / wordsPerPage));
        
        STATE.chapterPages[index] = pages;
        STATE.chapterStart[index] = totalPages + 1;
        totalPages += pages;
      });

      STATE.totalGlobalPages = totalPages;
      STATE.totalPages = totalPages;
    },

    renderUI() {
      // Build table of contents
      const tocList = $('#toc-list');
      if (tocList) {
        tocList.innerHTML = '';
        STATE.chapters.forEach((chapter, index) => {
          const link = document.createElement('a');
          link.href = 'javascript:void(0)';
          link.innerHTML = `
            <div>${chapter.title || `Глава ${index + 1}`}</div>
            <div class="meta">стр. ${STATE.chapterStart[index]}</div>
          `;
          on(link, 'click', () => {
            this.goToChapter(index);
            this.hideSidebar();
          });
          tocList.appendChild(link);
        });
      }

      // Display first chapter
      this.displayChapter(0);
      this.updateProgress();
    },

    displayChapter(index) {
      STATE.currentChapter = index;
      STATE.currentPage = 1;
      STATE.globalPage = STATE.chapterStart[index];

      // Simple display: show chapter content in a page
      const pager = $('#pager');
      if (pager) {
        const content = STATE.content[index] || '<p>Глава не найдена</p>';
        pager.innerHTML = `
          <div class="page">
            <div class="sheet">
              ${content}
            </div>
          </div>
        `;
      }

      this.updateProgress();
    },

    bindEvents() {
      // Navigation
      on($('#tap-right'), 'click', () => this.nextPage());
      on($('#tap-left'), 'click', () => this.prevPage());
      on($('#btn-next'), 'click', () => this.nextPage());
      on($('#btn-prev'), 'click', () => this.prevPage());

      // UI toggles
      on($('#tap-center'), 'click', () => this.toggleTopbar());
      on($('#btn-toc'), 'click', () => this.showSidebar());
      on($('#overlay'), 'click', () => this.hideSidebar());
      on($('#btn-settings'), 'click', () => this.showSettings());
      on($('#btn-back'), 'click', () => history.back());

      // Page input
      const gotoInput = $('#goto');
      if (gotoInput) {
        on(gotoInput, 'change', (e) => {
          const page = parseInt(e.target.value);
          if (page >= 1 && page <= STATE.totalGlobalPages) {
            this.goToPage(page);
          }
        });
      }

      // Keyboard shortcuts
      on(document, 'keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          this.nextPage();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prevPage();
        } else if (e.key === 'Escape') {
          this.hideSidebar();
          this.hideTopbar();
        } else if (e.key === 't' && e.ctrlKey) {
          e.preventDefault();
          this.showSidebar();
        }
      });

      // Sidebar tabs
      $$('.tab').forEach(tab => {
        on(tab, 'click', () => {
          $$('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          
          const panelId = tab.dataset.tab;
          $$('.panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === panelId);
          });
        });
      });

      // Modal close buttons
      $$('dialog').forEach(dialog => {
        const closeBtn = dialog.querySelector('[value="close"]');
        if (closeBtn) {
          on(closeBtn, 'click', () => dialog.close());
        }
      });
    },

    nextPage() {
      if (STATE.currentChapter < STATE.chapters.length - 1) {
        this.displayChapter(STATE.currentChapter + 1);
      }
      this.saveProgress();
    },

    prevPage() {
      if (STATE.currentChapter > 0) {
        this.displayChapter(STATE.currentChapter - 1);
      }
      this.saveProgress();
    },

    goToChapter(index) {
      if (index >= 0 && index < STATE.chapters.length) {
        this.displayChapter(index);
        this.saveProgress();
      }
    },

    goToPage(globalPage) {
      // Find which chapter contains this global page
      for (let i = 0; i < STATE.chapterStart.length; i++) {
        const start = STATE.chapterStart[i];
        const end = start + STATE.chapterPages[i] - 1;
        
        if (globalPage >= start && globalPage <= end) {
          this.displayChapter(i);
          break;
        }
      }
      this.saveProgress();
    },

    updateProgress() {
      const currentGlobal = STATE.chapterStart[STATE.currentChapter];
      const total = STATE.totalGlobalPages;
      
      // Update progress text
      const progressText = $('#progress-text');
      if (progressText) {
        progressText.textContent = `${currentGlobal} из ${total} • ~3 мин`;
      }

      // Update progress bar
      const progressFill = $('#progress-fill');
      if (progressFill) {
        const ratio = (currentGlobal - 1) / Math.max(1, total - 1);
        progressFill.style.width = `${ratio * 100}%`;
      }

      // Update page input
      const gotoInput = $('#goto');
      const totalSpan = $('#total');
      if (gotoInput) gotoInput.value = currentGlobal;
      if (totalSpan) totalSpan.textContent = `/ ${total}`;

      // Highlight active chapter in TOC
      $$('#toc-list a').forEach((link, index) => {
        link.classList.toggle('active', index === STATE.currentChapter);
      });
    },

    saveProgress() {
      storage.set('premium_reader_progress_hadji', {
        page: STATE.chapterStart[STATE.currentChapter],
        chapter: STATE.currentChapter
      });
    },

    // UI helpers
    showSidebar() {
      $('#sidebar').classList.add('show');
      $('#overlay').classList.add('show');
    },

    hideSidebar() {
      $('#sidebar').classList.remove('show');
      $('#overlay').classList.remove('show');
    },

    toggleTopbar() {
      $('#topbar').classList.toggle('show');
    },

    hideTopbar() {
      $('#topbar').classList.remove('show');
    },

    showSettings() {
      const modal = $('#modal-settings');
      if (modal) modal.showModal();
    },

    hideLoading() {
      const loading = $('#loading');
      if (loading) {
        loading.classList.add('hidden');
      }
    },

    showError(message) {
      const loading = $('#loading');
      if (loading) {
        loading.innerHTML = `
          <div class="loading__box">
            <div class="loading__title">Ошибка</div>
            <div class="loading__hint">${message}</div>
          </div>
        `;
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Reader.init());
  } else {
    Reader.init();
  }
})();
