(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // Simple state
  let currentChapter = 0;
  let chapters = [];
  let content = [];
  let totalChapters = 0;
  let uiVisible = false;

  // Simple storage
  const save = () => localStorage.setItem('reader_pos', JSON.stringify({ch: currentChapter}));
  const load = () => { try { const p = JSON.parse(localStorage.getItem('reader_pos')); if(p) currentChapter = p.ch || 0; } catch{} };

  // UI helpers
  const showUI = () => { 
    uiVisible = true;
    $('#header')?.classList.add('visible');
    $('#footer')?.classList.add('visible');
  };
  const hideUI = () => { 
    uiVisible = false;
    $('#header')?.classList.remove('visible');
    $('#footer')?.classList.remove('visible');
  };
  const toggleUI = () => uiVisible ? hideUI() : showUI();

  const showSidebar = () => {
    $('#sidebar')?.classList.add('visible');
    $('#overlay')?.classList.add('visible');
  };
  const hideSidebar = () => {
    $('#sidebar')?.classList.remove('visible');
    $('#overlay')?.classList.remove('visible');
  };

  const showSettings = () => $('#settings-modal')?.classList.add('visible');
  const hideSettings = () => $('#settings-modal')?.classList.remove('visible');

  // Update page info
  const updateInfo = () => {
    $('#current-pos').textContent = currentChapter + 1;
    $('#total-pos').textContent = totalChapters;
    $('#page-input').value = currentChapter + 1;
    $('#page-input').max = totalChapters;
    
    const progress = totalChapters > 1 ? currentChapter / (totalChapters - 1) : 0;
    $('#progress-fill').style.width = `${progress * 100}%`;
    $('#progress-handle').style.left = `${progress * 100}%`;

    // Update TOC
    $$('#toc-list .toc-item').forEach((item, i) => {
      item.classList.toggle('active', i === currentChapter);
    });
  };

  // Render current chapter
  const render = () => {
    const pageContent = $('#page-content');
    if (!pageContent) return;

    const html = content[currentChapter] || '<h1>Глава не найдена</h1>';
    pageContent.innerHTML = html;
    pageContent.scrollTop = 0; // Reset scroll to top

    const chapter = chapters[currentChapter];
    if (chapter) {
      $('#book-title').textContent = chapter.bookTitle || 'Хаджи-Гирай';
    }

    updateInfo();
    save();
  };

  // Navigation
  const nextPage = () => {
    if (currentChapter < totalChapters - 1) {
      currentChapter++;
      render();
    }
  };

  const prevPage = () => {
    if (currentChapter > 0) {
      currentChapter--;
      render();
    }
  };

  const goToChapter = (index) => {
    if (index >= 0 && index < totalChapters) {
      currentChapter = index;
      render();
    }
  };

  // Build table of contents
  const buildTOC = () => {
    const tocList = $('#toc-list');
    if (!tocList) return;

    tocList.innerHTML = '';
    chapters.forEach((chapter, i) => {
      const item = document.createElement('div');
      item.className = 'toc-item';
      item.innerHTML = `
        <div class="toc-title">${chapter.title || `Глава ${i + 1}`}</div>
        <div class="toc-page">Страница ${i + 1}</div>
      `;
      item.addEventListener('click', () => {
        goToChapter(i);
        hideSidebar();
      });
      tocList.appendChild(item);
    });
  };

  // Load book
  const loadBook = async () => {
    try {
      $('#loading-status').textContent = 'Загрузка оглавления...';
      
      const res = await fetch('book/chapters.json');
      if (!res.ok) throw new Error('Нет chapters.json');
      
      chapters = await res.json();
      totalChapters = chapters.length;
      content = new Array(totalChapters);

      // Load chapters one by one
      for (let i = 0; i < totalChapters; i++) {
        $('#loading-status').textContent = `Загрузка: ${i + 1}/${totalChapters}`;
        
        try {
          const chRes = await fetch(chapters[i].href);
          if (chRes.ok) {
            content[i] = await chRes.text();
          } else {
            content[i] = `<h1>${chapters[i].title}</h1><p>Ошибка загрузки</p>`;
          }
        } catch {
          content[i] = `<h1>${chapters[i].title}</h1><p>Ошибка загрузки</p>`;
        }
      }

      return true;
    } catch (err) {
      $('#loading-status').textContent = 'Ошибка: ' + err.message;
      console.error(err);
      return false;
    }
  };

  // Bind events
  const bindEvents = () => {
    // Touch zones
    $('#prev-zone')?.addEventListener('click', prevPage);
    $('#next-zone')?.addEventListener('click', nextPage);
    $('#menu-zone')?.addEventListener('click', toggleUI);

    // Navigation
    $('#prev-btn')?.addEventListener('click', prevPage);
    $('#next-btn')?.addEventListener('click', nextPage);

    // Header
    $('#back-btn')?.addEventListener('click', () => history.back());
    $('#toc-btn')?.addEventListener('click', showSidebar);
    $('#settings-btn')?.addEventListener('click', showSettings);

    // Sidebar
    $('#close-sidebar')?.addEventListener('click', hideSidebar);
    $('#overlay')?.addEventListener('click', hideSidebar);

    // Settings
    $('#close-settings')?.addEventListener('click', hideSettings);
    $('#settings-modal .modal-backdrop')?.addEventListener('click', hideSettings);

    // Page input
    $('#page-input')?.addEventListener('change', (e) => {
      const page = parseInt(e.target.value);
      if (page >= 1 && page <= totalChapters) {
        goToChapter(page - 1);
      }
    });

    // Progress bar
    $('#progress-bar')?.addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const page = Math.round(ratio * (totalChapters - 1));
      goToChapter(page);
    });

    // Settings controls
    $$('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.body.setAttribute('data-theme', btn.dataset.theme);
        localStorage.setItem('reader_theme', btn.dataset.theme);
      });
    });

    $$('.font-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.font-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const fonts = {
          crimson: '"Crimson Text", Georgia, serif',
          inter: 'Inter, sans-serif',
          georgia: 'Georgia, serif'
        };
        document.documentElement.style.setProperty('--font-reading', fonts[btn.dataset.font]);
        localStorage.setItem('reader_font', btn.dataset.font);
      });
    });

    $$('.width-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.width-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const widths = { narrow: '520px', medium: '680px', wide: '800px' };
        document.documentElement.style.setProperty('--text-width', widths[btn.dataset.width]);
        localStorage.setItem('reader_width', btn.dataset.width);
      });
    });

    // Font size slider
    $('#font-size-slider')?.addEventListener('input', (e) => {
      const size = e.target.value + 'px';
      $('#font-size-value').textContent = size;
      document.documentElement.style.setProperty('--font-size-reading', size);
      localStorage.setItem('reader_size', e.target.value);
    });

    // Line height slider  
    $('#line-height-slider')?.addEventListener('input', (e) => {
      const height = e.target.value;
      $('#line-height-value').textContent = height;
      document.documentElement.style.setProperty('--line-height-reading', height);
      localStorage.setItem('reader_lineheight', height);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prevPage();
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          nextPage();
          break;
        case 'Home':
          e.preventDefault();
          goToChapter(0);
          break;
        case 'End':
          e.preventDefault();
          goToChapter(totalChapters - 1);
          break;
        case 'Escape':
          if ($('#settings-modal')?.classList.contains('visible')) {
            hideSettings();
          } else if ($('#sidebar')?.classList.contains('visible')) {
            hideSidebar();
          } else {
            toggleUI();
          }
          break;
        case 't':
          if (e.ctrlKey) {
            e.preventDefault();
            showSidebar();
          }
          break;
      }
    });
  };

  // Load saved settings
  const loadSettings = () => {
    const theme = localStorage.getItem('reader_theme') || 'light';
    const font = localStorage.getItem('reader_font') || 'crimson';
    const width = localStorage.getItem('reader_width') || 'medium';
    const size = localStorage.getItem('reader_size') || '18';
    const lineheight = localStorage.getItem('reader_lineheight') || '1.6';

    document.body.setAttribute('data-theme', theme);
    
    const fonts = {
      crimson: '"Crimson Text", Georgia, serif',
      inter: 'Inter, sans-serif', 
      georgia: 'Georgia, serif'
    };
    const widths = { narrow: '520px', medium: '680px', wide: '800px' };

    document.documentElement.style.setProperty('--font-reading', fonts[font]);
    document.documentElement.style.setProperty('--text-width', widths[width]);
    document.documentElement.style.setProperty('--font-size-reading', size + 'px');
    document.documentElement.style.setProperty('--line-height-reading', lineheight);

    // Set active buttons
    $(`.theme-btn[data-theme="${theme}"]`)?.classList.add('active');
    $(`.font-btn[data-font="${font}"]`)?.classList.add('active');
    $(`.width-btn[data-width="${width}"]`)?.classList.add('active');
    
    const sizeSlider = $('#font-size-slider');
    const lineSlider = $('#line-height-slider');
    if (sizeSlider) {
      sizeSlider.value = size;
      $('#font-size-value').textContent = size + 'px';
    }
    if (lineSlider) {
      lineSlider.value = lineheight;
      $('#line-height-value').textContent = lineheight;
    }
  };

  // Main init
  const init = async () => {
    try {
      loadSettings();
      
      const success = await loadBook();
      if (!success) {
        $('#loading-status').textContent = 'Ошибка загрузки книги';
        return;
      }

      load(); // Load saved position
      buildTOC();
      render();
      bindEvents();

      // Hide loading
      $('#loading')?.classList.add('hidden');

      // Show UI briefly
      showUI();
      setTimeout(hideUI, 3000);

    } catch (err) {
      $('#loading-status').textContent = 'Критическая ошибка: ' + err.message;
      console.error('Init failed:', err);
    }
  };

  // Start when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
