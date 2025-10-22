// КрымЧиталка - Обновленная логика ридера с предзагрузкой всех глав
(() => {
  'use strict';

  // =====================
  // Утилиты
  // =====================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
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
        // ignore quota errors
      }
    },
  };

  const toast = (msg, type = 'info') => {
    const container = $('#toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  };

  // =====================
  // Состояние
  // =====================
  const DEFAULT_SETTINGS = {
    theme: 'light',
    fontFamily: 'inter',
    fontSize: 18,
    lineHeight: 1.6,
    textWidth: 'medium',
    readingMode: 'paginated',
  };

  const STATE = {
    bookId: 'hadji-giray',
    chapters: [],
    chaptersContent: [], // Предзагруженное содержимое всех глав
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: 1,
    globalPage: 1, // Глобальная страница по всей книге
    totalGlobalPages: 1, // Общее количество страниц всей книги
    chapterPageCounts: [], // Количество страниц в каждой главе
    chapterStartPages: [], // Начальная страница каждой главы в глобальной нумерации
    readingStartTs: Date.now(),
    highlights: [],
    annotations: [],
    bookmarks: [],
    isLoading: false,
  };

  // =====================
  // Менеджеры
  // =====================

  class SettingsManager {
    constructor() {
      this.settings = { ...DEFAULT_SETTINGS, ...(storage.get('reader_settings') || {}) };
      this.apply();
      this.bindUI();
    }

    apply() {
      document.body.setAttribute('data-theme', this.settings.theme);
      $('#reader-content').style.setProperty('--font-size-reading', `${this.settings.fontSize}px`);
      $('#reader-content').style.setProperty('--line-height-reading', this.settings.lineHeight);
      
      const family = this.settings.fontFamily;
      const reading = family === 'crimson' ? '"Crimson Text", Georgia, serif' :
                      family === 'georgia' ? 'Georgia, serif' :
                      family === 'times' ? '"Times New Roman", Times, serif' :
                      family === 'arial' ? 'Arial, Helvetica, sans-serif' :
                      'Inter, system-ui, sans-serif';
      $('#reader-content').style.setProperty('--font-reading', reading);

      $('#reader-content').setAttribute('data-width', this.settings.textWidth);
      $('#reader-content').setAttribute('data-mode', this.settings.readingMode);

      storage.set('reader_settings', this.settings);
    }

    bindUI() {
      on($('#settings-btn'), 'click', () => UIManager.openModal('settings-modal'));
      on($('#font-family'), 'change', (e) => this.update('fontFamily', e.target.value));
      on($('#font-size'), 'input', (e) => {
        $('#font-size-value').textContent = `${e.target.value}px`;
        this.update('fontSize', Number(e.target.value));
      });
      on($('#line-height'), 'input', (e) => {
        $('#line-height-value').textContent = e.target.value;
        this.update('lineHeight', Number(e.target.value));
      });
      on($('#text-width'), 'change', (e) => this.update('textWidth', e.target.value));
      on($('#reading-mode'), 'change', (e) => this.update('readingMode', e.target.value));
      $$('.theme-btn').forEach(btn => on(btn, 'click', () => this.setTheme(btn.dataset.theme)));
    }

    setTheme(theme) {
      this.update('theme', theme);
      $$('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    }

    update(key, value) {
      this.settings[key] = value;
      this.apply();
      // Пересчитать страницы при изменении настроек
      setTimeout(() => Reader.recalculateAllPages(), 100);
    }
  }

  class ProgressManager {
    constructor(bookId) {
      this.key = `reader_progress_${bookId}`;
      this.data = storage.get(this.key, { chapter: 0, page: 1, globalPage: 1 });
    }

    save({ chapter, page, globalPage }) {
      this.data = { chapter, page, globalPage };
      storage.set(this.key, this.data);
    }

    load() {
      return this.data;
    }
  }

  class BookmarkManager {
    constructor(bookId) {
      this.key = `reader_bookmarks_${bookId}`;
      this.items = storage.get(this.key, []);
      this.render();
      this.bindUI();
    }

    add({ chapter, page, globalPage, text }) {
      const id = `${chapter}-${page}-${Date.now()}`;
      this.items.push({ id, chapter, page, globalPage, text });
      storage.set(this.key, this.items);
      this.render();
      toast('Закладка добавлена', 'success');
    }

    remove(id) {
      this.items = this.items.filter(b => b.id !== id);
      storage.set(this.key, this.items);
      this.render();
      toast('Закладка удалена', 'info');
    }

    render() {
      const box = $('#bookmarks-list');
      if (!box) return;
      
      box.innerHTML = '';
      if (!this.items.length) {
        box.innerHTML = '<p class="empty-state">Закладки не найдены</p>';
        return;
      }
      
      this.items.forEach(b => {
        const el = document.createElement('div');
        el.className = 'bookmark-item';
        el.innerHTML = `
          <div class="bookmark-head">
            <strong>Гл. ${b.chapter + 1}</strong> • стр. ${b.globalPage || b.page}
            <button class="icon-btn bookmark-remove" data-id="${b.id}"><i class="fas fa-trash"></i></button>
          </div>
          <div class="bookmark-text">${b.text || ''}</div>
        `;
        on(el, 'click', (e) => {
          if (e.target.closest('.bookmark-remove')) return;
          Reader.goToGlobalPage(b.globalPage || Reader.chapterPageToGlobal(b.chapter, b.page));
        });
        on(el.querySelector('.bookmark-remove'), 'click', () => this.remove(b.id));
        box.appendChild(el);
      });
    }

    bindUI() {
      on($('#bookmark-btn'), 'click', () => {
        const sel = window.getSelection();
        const text = sel && sel.toString().trim().slice(0, 140);
        this.add({ 
          chapter: STATE.currentChapterIndex, 
          page: STATE.currentPage, 
          globalPage: STATE.globalPage,
          text 
        });
      });
    }
  }

  class SearchManager {
    constructor() {
      this.bindUI();
    }

    bindUI() {
      on($('#search-btn'), 'click', () => UIManager.openModal('search-modal'));
      on($('#search-submit'), 'click', () => this.search($('#search-input').value));
      on($('#search-input'), 'keydown', (e) => { 
        if (e.key === 'Enter') this.search(e.target.value); 
      });
    }

    async search(query) {
      const q = (query || '').trim();
      if (!q) return;
      
      const results = [];
      const flags = $('#case-sensitive').checked ? 'g' : 'gi';
      const wholeWords = $('#whole-words').checked;
      const searchQuery = wholeWords ? `\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b` : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(searchQuery, flags);
      
      // Поиск по предзагруженному контенту
      STATE.chaptersContent.forEach((content, chapterIndex) => {
        if (!content) return;
        
        const tmp = document.createElement('div');
        tmp.innerHTML = content;
        const text = tmp.textContent || '';
        
        let match;
        while ((match = re.exec(text)) && results.length < 100) {
          const start = Math.max(0, match.index - 60);
          const end = Math.min(text.length, match.index + match[0].length + 60);
          const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
          
          results.push({ 
            chapter: chapterIndex, 
            page: 1, // Упрощено - потом можно улучшить
            snippet,
            globalPage: STATE.chapterStartPages[chapterIndex] || 1
          });
        }
      });
      
      this.render(results, q);
    }

    render(results, query) {
      const box = $('#search-results');
      if (!box) return;
      
      box.innerHTML = '';
      if (!results.length) {
        box.innerHTML = '<p class="empty-state">Ничего не найдено</p>';
        return;
      }
      
      results.forEach(r => {
        const el = document.createElement('div');
        el.className = 'search-result';
        const highlighted = r.snippet.replace(new RegExp(query, 'gi'), m => `<span class="search-highlight">${m}</span>`);
        el.innerHTML = `
          <div class="search-result-chapter">Глава ${r.chapter + 1} • стр. ${r.globalPage}</div>
          <div class="search-result-text">${highlighted}</div>
        `;
        on(el, 'click', () => Reader.goToGlobalPage(r.globalPage));
        box.appendChild(el);
      });
    }
  }

  // =====================
  // Основной ридер
  // =====================

  const Reader = {
    async init() {
      this.cacheEls();
      this.bindGlobalUI();

      this.progress = new ProgressManager(STATE.bookId);
      this.settings = new SettingsManager();
      this.bookmarks = new BookmarkManager(STATE.bookId);
      this.search = new SearchManager();

      await this.loadAllChapters();
      this.restoreProgress();
      this.updateFooter();
      
      $('#loading-screen').classList.add('hidden');
    },

    cacheEls() {
      this.el = {
        header: $('#reader-header'),
        sidebar: $('#reader-sidebar'),
        content: $('#reader-content'),
        chapter: $('#chapter-content'),
        overlay: $('#reader-overlay'),
        currentPage: $('#current-page'),
        totalPages: $('#total-pages'),
        progressFill: $('#progress-fill'),
        progressThumb: $('#progress-thumb'),
        pageInput: $('#page-input'),
        next: $('#next-page'),
        prev: $('#prev-page'),
        tocBtn: $('#toc-btn'),
      };
    },

    bindGlobalUI() {
      on(this.el.tocBtn, 'click', () => UIManager.toggleSidebar());
      on(this.el.next, 'click', () => this.nextPage());
      on(this.el.prev, 'click', () => this.prevPage());
      on(this.el.pageInput, 'change', (e) => this.goToGlobalPage(Number(e.target.value)));

      // Прогресс-бар для глобальной навигации
      on($('#progress-bar'), 'click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const globalPage = Math.max(1, Math.round(ratio * STATE.totalGlobalPages));
        this.goToGlobalPage(globalPage);
      });

      // Горячие клавиши
      on(document, 'keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); UIManager.openModal('settings-modal'); }
        if (e.ctrlKey && e.key.toLowerCase() === 't') { e.preventDefault(); UIManager.toggleSidebar(true); }
        if (e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); $('#bookmark-btn').click(); }
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); this.nextPage(); }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this.prevPage(); }
        if (e.key === 'Escape') { UIManager.closeAllModals(); UIManager.toggleSidebar(false); }
        if (e.key.toLowerCase() === 'f' && !e.ctrlKey) { e.preventDefault(); UIManager.toggleFullscreen(); }
      });

      // Контекстное меню и другие события
      on(this.el.content, 'mouseup', (e) => {
        const text = window.getSelection().toString().trim();
        if (!text) return UIManager.hideContextMenu();
        UIManager.showContextMenu(e.clientX, e.clientY);
      });
      
      on(document, 'click', (e) => {
        if (!e.target.closest('#context-menu')) UIManager.hideContextMenu();
      });

      on($('#highlight-text'), 'click', () => this.highlightSelection());
      on($('#add-note'), 'click', () => this.addNoteForSelection());
      on($('#copy-text'), 'click', () => document.execCommand('copy'));
      on($('#fullscreen-btn'), 'click', () => UIManager.toggleFullscreen());
      on($('#back-btn'), 'click', () => history.back());
    },

    async loadAllChapters() {
      try {
        // Загружаем оглавление
        const res = await fetch('book/chapters.json', { cache: 'no-store' });
        const chapters = await res.json();
        STATE.chapters = chapters;
        
        toast('Загружаем все главы...', 'info');
        
        // Предзагружаем ВСЕ главы
        STATE.chaptersContent = [];
        for (let i = 0; i < chapters.length; i++) {
          try {
            const chapterRes = await fetch(chapters[i].href, { cache: 'no-store' });
            const html = await chapterRes.text();
            STATE.chaptersContent[i] = html;
            
            // Показываем прогресс загрузки
            $('#loading-screen p').textContent = `Загружено глав: ${i + 1} из ${chapters.length}`;
          } catch (e) {
            console.error(`Ошибка загрузки главы ${i}:`, e);
            STATE.chaptersContent[i] = `<h2>Глава ${i + 1}</h2><p>Ошибка загрузки главы.</p>`;
          }
        }
        
        this.renderTOC();
        await this.displayChapter(0);
        this.calculateAllPageCounts();
        
        toast(`Загружено ${chapters.length} глав, ${STATE.totalGlobalPages} страниц`, 'success');
        
      } catch (e) {
        console.error('Ошибка загрузки книги:', e);
        STATE.chapters = [{ title: 'Ошибка', href: '#' }];
        STATE.chaptersContent = ['<h2>Ошибка загрузки</h2><p>Не удалось загрузить книгу.</p>'];
        this.renderTOC();
        await this.displayChapter(0);
      }
    },

    async displayChapter(index) {
      if (STATE.isLoading) return;
      
      STATE.currentChapterIndex = index;
      const chapter = STATE.chapters[index];
      const content = STATE.chaptersContent[index];
      
      if (!chapter || !content) return;

      $('#book-title').textContent = chapter.bookTitle || $('#book-title').textContent;
      this.el.chapter.innerHTML = content;

      this.paginate();
      this.updateFooter();
      this.highlightActiveTOC();
    },

    calculateAllPageCounts() {
      // Временно отображаем каждую главу для подсчета страниц
      const originalContent = this.el.chapter.innerHTML;
      const originalIndex = STATE.currentChapterIndex;
      
      STATE.chapterPageCounts = [];
      STATE.chapterStartPages = [];
      let totalPages = 0;
      
      STATE.chapters.forEach((_, index) => {
        // Временно отображаем главу
        this.el.chapter.innerHTML = STATE.chaptersContent[index] || '';
        
        // Считаем страницы
        const pageHeight = this.el.content.clientHeight;
        const totalHeight = this.el.chapter.scrollHeight;
        const pagesInChapter = Math.max(1, Math.ceil(totalHeight / pageHeight));
        
        STATE.chapterPageCounts[index] = pagesInChapter;
        STATE.chapterStartPages[index] = totalPages + 1;
        totalPages += pagesInChapter;
      });
      
      STATE.totalGlobalPages = totalPages;
      
      // Восстанавливаем исходное содержимое
      this.el.chapter.innerHTML = originalContent;
      STATE.currentChapterIndex = originalIndex;
      
      console.log('Подсчет страниц:', {
        chapterPageCounts: STATE.chapterPageCounts,
        chapterStartPages: STATE.chapterStartPages,
        totalGlobalPages: STATE.totalGlobalPages
      });
    },

    recalculateAllPages() {
      // Пересчитываем при изменении настроек
      setTimeout(() => {
        this.calculateAllPageCounts();
        this.paginate();
        this.updateFooter();
      }, 100);
    },

    paginate() {
      const mode = $('#reader-content').getAttribute('data-mode');
      if (mode === 'scroll') {
        const pageHeight = this.el.content.clientHeight;
        const totalHeight = this.el.chapter.scrollHeight;
        STATE.totalPages = Math.max(1, Math.ceil(totalHeight / pageHeight));
        STATE.currentPage = Math.min(STATE.currentPage, STATE.totalPages);
      } else {
        STATE.totalPages = STATE.chapterPageCounts[STATE.currentChapterIndex] || 1;
        STATE.currentPage = Math.min(STATE.currentPage, STATE.totalPages);
        this.scrollToPage(STATE.currentPage);
      }
      
      // Обновляем глобальную страницу
      STATE.globalPage = this.chapterPageToGlobal(STATE.currentChapterIndex, STATE.currentPage);
    },

    scrollToPage(page) {
      const pageHeight = this.el.content.clientHeight;
      const y = (page - 1) * pageHeight;
      this.el.content.scrollTo({ top: y, behavior: 'smooth' });
    },

    nextPage() {
      if (STATE.currentPage < STATE.totalPages) {
        this.goToPage(STATE.currentPage + 1);
      } else if (STATE.currentChapterIndex < STATE.chapters.length - 1) {
        this.goTo(STATE.currentChapterIndex + 1, 1);
      }
    },

    prevPage() {
      if (STATE.currentPage > 1) {
        this.goToPage(STATE.currentPage - 1);
      } else if (STATE.currentChapterIndex > 0) {
        const prevChapter = STATE.currentChapterIndex - 1;
        const lastPage = STATE.chapterPageCounts[prevChapter] || 1;
        this.goTo(prevChapter, lastPage);
      }
    },

    goTo(chapterIndex, page) {
      this.displayChapter(chapterIndex).then(() => {
        if (page && page !== Number.MAX_SAFE_INTEGER) {
          this.goToPage(page);
        }
      });
    },

    goToPage(page) {
      STATE.currentPage = Math.max(1, Math.min(page, STATE.totalPages));
      this.scrollToPage(STATE.currentPage);
      STATE.globalPage = this.chapterPageToGlobal(STATE.currentChapterIndex, STATE.currentPage);
      this.updateFooter();
      this.saveProgress();
    },

    goToGlobalPage(globalPage) {
      const result = this.globalPageToChapter(globalPage);
      if (result) {
        this.goTo(result.chapter, result.page);
      }
    },

    chapterPageToGlobal(chapterIndex, page) {
      const startPage = STATE.chapterStartPages[chapterIndex] || 1;
      return startPage + page - 1;
    },

    globalPageToChapter(globalPage) {
      for (let i = 0; i < STATE.chapterStartPages.length; i++) {
        const startPage = STATE.chapterStartPages[i];
        const endPage = startPage + STATE.chapterPageCounts[i] - 1;
        
        if (globalPage >= startPage && globalPage <= endPage) {
          return {
            chapter: i,
            page: globalPage - startPage + 1
          };
        }
      }
      return null;
    },

    updateFooter() {
      this.el.currentPage.textContent = STATE.globalPage;
      this.el.totalPages.textContent = STATE.totalGlobalPages;
      
      const ratio = (STATE.globalPage - 1) / Math.max(1, STATE.totalGlobalPages - 1);
      this.el.progressFill.style.width = `${ratio * 100}%`;
      this.el.progressThumb.style.left = `${ratio * 100}%`;
      
      this.el.pageInput.max = String(STATE.totalGlobalPages);
      this.el.pageInput.value = String(STATE.globalPage);
      
      // Обновляем статистику чтения
      const readingTime = Math.round((Date.now() - STATE.readingStartTs) / 60000);
      const readingStats = $('#reading-time');
      if (readingStats) {
        readingStats.textContent = `${readingTime} мин`;
      }
    },

    renderTOC() {
      const list = $('#toc-list');
      if (!list) return;
      
      list.innerHTML = '';
      STATE.chapters.forEach((ch, i) => {
        const item = document.createElement('div');
        item.className = 'toc-item';
        const startGlobalPage = STATE.chapterStartPages[i] || (i + 1);
        item.innerHTML = `<a class="toc-link" data-index="${i}">
          ${ch.title || `Глава ${i + 1}`}
          <small style="color: var(--text-muted); display: block; margin-top: 2px;">стр. ${startGlobalPage}</small>
        </a>`;
        on(item.querySelector('.toc-link'), 'click', () => this.goTo(i, 1));
        list.appendChild(item);
      });
    },

    highlightActiveTOC() {
      $$('.toc-link').forEach(a => a.classList.remove('active'));
      const active = $(`.toc-link[data-index="${STATE.currentChapterIndex}"]`);
      if (active) active.classList.add('active');
    },

    saveProgress() {
      this.progress.save({
        chapter: STATE.currentChapterIndex,
        page: STATE.currentPage,
        globalPage: STATE.globalPage,
      });
    },

    restoreProgress() {
      const p = this.progress.load();
      if (!p) return;
      
      if (p.globalPage) {
        this.goToGlobalPage(p.globalPage);
      } else {
        this.goTo(p.chapter || 0, p.page || 1);
      }
    },

    // Остальные методы (выделение, заметки и т.д.)
    highlightSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return UIManager.hideContextMenu();
      const range = sel.getRangeAt(0);
      const mark = document.createElement('mark');
      mark.className = 'highlight';
      try {
        range.surroundContents(mark);
        sel.removeAllRanges();
      } catch (e) {
        console.warn('Не удалось выделить текст:', e);
      }
      UIManager.hideContextMenu();
    },

    addNoteForSelection() {
      const text = window.getSelection().toString().trim();
      if (!text) return UIManager.hideContextMenu();
      const note = prompt('Заметка к выделению:', '');
      if (note === null) return;
      
      STATE.annotations.push({ 
        chapter: STATE.currentChapterIndex, 
        page: STATE.currentPage, 
        globalPage: STATE.globalPage,
        text, 
        note, 
        ts: Date.now() 
      });
      storage.set(`reader_annotations_${STATE.bookId}`, STATE.annotations);
      UIManager.renderAnnotations();
      UIManager.hideContextMenu();
      toast('Заметка сохранена', 'success');
    },
  };

  // =====================
  // UI менеджер
  // =====================
  const UIManager = {
    openModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.classList.add('active');
      $('#reader-overlay').classList.add('active');
      on($('#reader-overlay'), 'click', () => this.closeAllModals());
      $$('.modal-close').forEach(btn => on(btn, 'click', () => this.closeAllModals()));
    },

    closeAllModals() {
      $$('.modal').forEach(m => m.classList.remove('active'));
      $('#reader-overlay').classList.remove('active');
    },

    toggleSidebar(force) {
      const side = $('#reader-sidebar');
      if (!side) return;
      const want = typeof force === 'boolean' ? force : !side.classList.contains('active');
      side.classList.toggle('active', want);
    },

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
        document.body.classList.add('fullscreen');
      } else {
        document.exitFullscreen?.();
        document.body.classList.remove('fullscreen');
      }
    },

    showContextMenu(x, y) {
      const menu = $('#context-menu');
      if (!menu) return;
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      menu.classList.add('active');
    },

    hideContextMenu() {
      const menu = $('#context-menu');
      if (menu) menu.classList.remove('active');
    },

    renderAnnotations() {
      const box = $('#annotations-list');
      if (!box) return;
      
      const items = storage.get(`reader_annotations_${STATE.bookId}`, []);
      box.innerHTML = '';
      if (!items.length) {
        box.innerHTML = '<p class="empty-state">Заметки не найдены</p>';
        return;
      }
      
      items.forEach(a => {
        const el = document.createElement('div');
        el.className = 'annotation-item';
        el.innerHTML = `
          <div class="annotation-head"><strong>Гл. ${a.chapter + 1}</strong> • стр. ${a.globalPage || a.page}</div>
          <div class="annotation-text">${a.text}</div>
          <div class="annotation-note">${a.note}</div>
        `;
        on(el, 'click', () => Reader.goToGlobalPage(a.globalPage || Reader.chapterPageToGlobal(a.chapter, a.page)));
        box.appendChild(el);
      });
    },
  };

  // Инициализация при загрузке
  window.addEventListener('load', () => Reader.init());
})();
