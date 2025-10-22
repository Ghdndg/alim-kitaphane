// КрымЧиталка - Логика ридера
// Версия с улучшенной архитектурой, оффлайн-поддержкой, поиском, закладками и аннотациями

(() => {
  'use strict';

  // =====================
  // Утилиты
  // =====================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, evt, cb) => el.addEventListener(evt, cb);
  const off = (el, evt, cb) => el.removeEventListener(evt, cb);

  const debounce = (fn, delay = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  const throttle = (fn, limit = 200) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        fn.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  };

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
  // Константы и состояние
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
    bookId: 'tavridanin-yildizlari',
    chapters: [],
    currentChapterIndex: 0,
    currentPage: 1,
    totalPages: 1,
    readingStartTs: Date.now(),
    wordsRead: 0,
    highlights: [],
    annotations: [],
    bookmarks: [],
    searchIndex: null,
    isSidebarOpen: false,
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

      const width = this.settings.textWidth;
      $('#reader-content').setAttribute('data-width', width);

      const mode = this.settings.readingMode;
      $('#reader-content').setAttribute('data-mode', mode);

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
    }
  }

  class ProgressManager {
    constructor(bookId) {
      this.key = `reader_progress_${bookId}`;
      this.data = storage.get(this.key, { chapter: 0, page: 1, cfi: null });
    }

    save({ chapter, page, cfi }) {
      this.data = { chapter, page, cfi };
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

    add({ chapter, page, text }) {
      const id = `${chapter}-${page}-${Date.now()}`;
      this.items.push({ id, chapter, page, text });
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
            <strong>Гл. ${b.chapter + 1}</strong> • стр. ${b.page}
            <button class="icon-btn bookmark-remove" data-id="${b.id}"><i class="fas fa-trash"></i></button>
          </div>
          <div class="bookmark-text">${b.text || ''}</div>
        `;
        on(el, 'click', (e) => {
          if (e.target.closest('.bookmark-remove')) return;
          Reader.goTo(b.chapter, b.page);
        });
        on(el.querySelector('.bookmark-remove'), 'click', () => this.remove(b.id));
        box.appendChild(el);
      });
    }

    bindUI() {
      on($('#bookmark-btn'), 'click', () => {
        const sel = window.getSelection();
        const text = sel && sel.toString().trim().slice(0, 140);
        this.add({ chapter: STATE.currentChapterIndex, page: STATE.currentPage, text });
      });
    }
  }

  class SearchManager {
    constructor() {
      this.worker = null;
      this.bindUI();
    }

    bindUI() {
      on($('#search-btn'), 'click', () => UIManager.openModal('search-modal'));
      on($('#search-submit'), 'click', () => this.search($('#search-input').value));
      on($('#search-input'), 'keydown', (e) => { if (e.key === 'Enter') this.search(e.target.value); });
    }

    async search(query) {
      const q = (query || '').trim();
      if (!q) return;
      const results = await Reader.searchInBook(q, {
        caseSensitive: $('#case-sensitive').checked,
        wholeWords: $('#whole-words').checked,
      });
      this.render(results, q);
    }

    render(results, query) {
      const box = $('#search-results');
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
          <div class="search-result-chapter">Глава ${r.chapter + 1} • стр. ${r.page}</div>
          <div class="search-result-text">${highlighted}</div>
        `;
        on(el, 'click', () => Reader.goTo(r.chapter, r.page));
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

      await this.loadBook();
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
        searchBtn: $('#search-btn'),
      };
    },

    bindGlobalUI() {
      // Оглавление
      on(this.el.tocBtn, 'click', () => UIManager.toggleSidebar());
      // Навигация
      on(this.el.next, 'click', () => this.nextPage());
      on(this.el.prev, 'click', () => this.prevPage());
      on(this.el.pageInput, 'change', (e) => this.goToPage(Number(e.target.value)));

      // Прогресс-бар (перемотка)
      on($('#progress-bar'), 'click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const page = Math.max(1, Math.round(ratio * STATE.totalPages));
        this.goToPage(page);
      });

      // Горячие клавиши
      on(document, 'keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); UIManager.openModal('settings-modal'); }
        if (e.ctrlKey && e.key.toLowerCase() === 't') { e.preventDefault(); UIManager.toggleSidebar(true); }
        if (e.ctrlKey && e.key.toLowerCase() === 'b') { e.preventDefault(); $('#bookmark-btn').click(); }
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); this.nextPage(); }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this.prevPage(); }
        if (e.key === 'Escape') { UIManager.closeAllModals(); UIManager.toggleSidebar(false); }
        if (e.key.toLowerCase() === 'f' && !e.ctrlKey) { e.preventDefault(); UIManager.toggleFullscreen(); }
      });

      // Контекстное меню для выделенного текста
      on(this.el.content, 'mouseup', (e) => {
        const text = window.getSelection().toString().trim();
        if (!text) return UIManager.hideContextMenu();
        UIManager.showContextMenu(e.clientX, e.clientY);
      });
      on(document, 'click', (e) => {
        if (!e.target.closest('#context-menu')) UIManager.hideContextMenu();
      });

      // Контекстные действия
      on($('#highlight-text'), 'click', () => this.highlightSelection());
      on($('#add-note'), 'click', () => this.addNoteForSelection());
      on($('#copy-text'), 'click', () => document.execCommand('copy'));
      on($('#lookup-word'), 'click', () => this.lookupSelection());

      // Полноэкранный режим
      on($('#fullscreen-btn'), 'click', () => UIManager.toggleFullscreen());

      // Назад
      on($('#back-btn'), 'click', () => history.back());
    },

    async loadBook() {
      // В этой версии книга представлена как набор глав в JSON/HTML.
      // Подключите свой источник данных тут: API, EPUB парсер или статические файлы
      // Пример: загружаем chapters.json с массивом объектов { title, href }
      try {
        const res = await fetch('book/chapters.json', { cache: 'no-store' });
        const chapters = await res.json();
        STATE.chapters = chapters;
        this.renderTOC();
        await this.displayChapter(0);
      } catch (e) {
        console.error(e);
        // fallback: одна страница из встроенного HTML
        STATE.chapters = [{ title: 'Глава 1', href: 'book/ch1.html' }];
        this.renderTOC();
        await this.displayChapter(0);
      }
    },

    async displayChapter(index) {
      STATE.currentChapterIndex = index;
      const chapter = STATE.chapters[index];
      if (!chapter) return;

      $('#book-title').textContent = chapter.bookTitle || $('#book-title').textContent;
      try {
        const html = await fetch(chapter.href, { cache: 'no-store' }).then(r => r.text());
        this.el.chapter.innerHTML = html;
      } catch (e) {
        this.el.chapter.innerHTML = `<h2>${chapter.title}</h2><p>Не удалось загрузить главу.</p>`;
      }

      // Рассчитать страницы для постраничного режима
      this.paginate();
      this.updateFooter();
      this.highlightActiveTOC();
    },

    paginate() {
      const mode = $('#reader-content').getAttribute('data-mode');
      if (mode === 'scroll') {
        STATE.totalPages = Math.max(1, Math.ceil(this.el.chapter.scrollHeight / this.el.content.clientHeight));
        STATE.currentPage = Math.min(STATE.currentPage, STATE.totalPages);
      } else {
        // В простом варианте считаем страницу по высоте контейнера
        const pageHeight = this.el.content.clientHeight;
        const totalHeight = this.el.chapter.scrollHeight;
        STATE.totalPages = Math.max(1, Math.ceil(totalHeight / pageHeight));
        STATE.currentPage = Math.min(STATE.currentPage, STATE.totalPages);
        this.scrollToPage(STATE.currentPage);
      }
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
        this.goTo(STATE.currentChapterIndex - 1, Number.MAX_SAFE_INTEGER);
      }
    },

    goTo(chapterIndex, page) {
      this.displayChapter(chapterIndex).then(() => {
        if (page && page !== Number.MAX_SAFE_INTEGER) this.goToPage(page);
        if (page === Number.MAX_SAFE_INTEGER) this.goToPage(STATE.totalPages);
      });
    },

    goToPage(page) {
      STATE.currentPage = Math.max(1, Math.min(page, STATE.totalPages));
      this.scrollToPage(STATE.currentPage);
      this.updateFooter();
      this.saveProgress();
    },

    updateFooter() {
      this.el.currentPage.textContent = STATE.currentPage;
      this.el.totalPages.textContent = STATE.totalPages;
      const ratio = (STATE.currentPage - 1) / Math.max(1, STATE.totalPages - 1);
      this.el.progressFill.style.width = `${ratio * 100}%`;
      this.el.progressThumb.style.left = `${ratio * 100}%`;
      this.el.pageInput.max = String(STATE.totalPages);
      this.el.pageInput.value = String(STATE.currentPage);
    },

    renderTOC() {
      const list = $('#toc-list');
      list.innerHTML = '';
      STATE.chapters.forEach((ch, i) => {
        const item = document.createElement('div');
        item.className = 'toc-item';
        item.innerHTML = `<a class="toc-link" data-index="${i}">${ch.title || `Глава ${i + 1}`}</a>`;
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
        cfi: null,
      });
    },

    restoreProgress() {
      const p = this.progress.load();
      if (!p) return;
      this.goTo(p.chapter || 0, p.page || 1);
    },

    // Выделение
    highlightSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return UIManager.hideContextMenu();
      const range = sel.getRangeAt(0);
      const mark = document.createElement('mark');
      mark.className = 'highlight';
      range.surroundContents(mark);
      sel.removeAllRanges();
      UIManager.hideContextMenu();
    },

    addNoteForSelection() {
      const text = window.getSelection().toString().trim();
      if (!text) return UIManager.hideContextMenu();
      const note = prompt('Заметка к выделению:', '');
      if (note === null) return;
      STATE.annotations.push({ chapter: STATE.currentChapterIndex, page: STATE.currentPage, text, note, ts: Date.now() });
      storage.set(`reader_annotations_${STATE.bookId}`, STATE.annotations);
      UIManager.renderAnnotations();
      UIManager.hideContextMenu();
      toast('Заметка сохранена', 'success');
    },

    lookupSelection() {
      const text = window.getSelection().toString().trim();
      if (!text) return UIManager.hideContextMenu();
      // Здесь можно сделать запрос к словарю крымскотатарского языка
      toast(`Поиск в словаре: “${text}”`, 'info');
    },

    async searchInBook(query, { caseSensitive = false, wholeWords = false } = {}) {
      const results = [];
      const flags = caseSensitive ? 'g' : 'gi';
      const q = wholeWords ? `\\b${query}\\b` : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(q, flags);
      for (let i = 0; i < STATE.chapters.length; i++) {
        try {
          const html = await fetch(STATE.chapters[i].href, { cache: 'no-store' }).then(r => r.text());
          const tmp = document.createElement('div');
          tmp.innerHTML = html;
          const text = tmp.textContent || '';
          let m;
          while ((m = re.exec(text)) && results.length < 200) {
            const start = Math.max(0, m.index - 60);
            const end = Math.min(text.length, m.index + m[0].length + 60);
            const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
            results.push({ chapter: i, page: 1, snippet });
          }
        } catch {}
      }
      return results;
    },
  };

  // =====================
  // UI менеджер
  // =====================
  const UIManager = {
    openModal(id) {
      const modal = document.getElementById(id);
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
      const want = typeof force === 'boolean' ? force : !side.classList.contains('active');
      side.classList.toggle('active', want);
      STATE.isSidebarOpen = want;
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
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      menu.classList.add('active');
    },

    hideContextMenu() {
      $('#context-menu').classList.remove('active');
    },

    renderAnnotations() {
      const box = $('#annotations-list');
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
          <div class="annotation-head"><strong>Гл. ${a.chapter + 1}</strong> • стр. ${a.page}</div>
          <div class="annotation-text">${a.text}</div>
          <div class="annotation-note">${a.note}</div>
        `;
        on(el, 'click', () => Reader.goTo(a.chapter, a.page));
        box.appendChild(el);
      });
    },
  };

  // Инициализация
  window.addEventListener('load', () => Reader.init());
})();
