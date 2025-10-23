(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // State
  let chapters = [];
  let content = [];
  let pages = []; // Массив страниц: {content: "html", chapterIndex: 0}
  let currentPageIndex = 0;
  let totalPages = 0;
  let uiVisible = false;

  // Storage
  const save = () => localStorage.setItem('reader_pos', JSON.stringify({page: currentPageIndex}));
  const load = () => { 
    try { 
      const p = JSON.parse(localStorage.getItem('reader_pos')); 
      if(p && typeof p.page === 'number') currentPageIndex = Math.max(0, p.page); 
    } catch{} 
  };

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

  // Update progress
  const updateInfo = () => {
    const currentPage = currentPageIndex + 1;
    $('#current-pos').textContent = currentPage;
    $('#total-pos').textContent = totalPages;
    $('#page-input').value = currentPage;
    $('#page-input').max = totalPages;
    
    const progress = totalPages > 1 ? currentPageIndex / (totalPages - 1) : 0;
    $('#progress-fill').style.width = `${progress * 100}%`;
    $('#progress-handle').style.left = `${progress * 100}%`;

    // Update reading time (rough estimate)
    const wordsOnPage = 200;
    const readingSpeed = 200; // words per minute
    const minutes = Math.ceil(wordsOnPage / readingSpeed);
    $('#reading-time').textContent = `~${minutes} мин`;

    // Update TOC (show active chapter)
    if (pages[currentPageIndex]) {
      const activeChapter = pages[currentPageIndex].chapterIndex;
      $$('#toc-list .toc-item').forEach((item, i) => {
        item.classList.toggle('active', i === activeChapter);
      });
    }
  };

  // Render current page
  const render = () => {
    const pageContent = $('#page-content');
    if (!pageContent || !pages[currentPageIndex]) return;

    // Display page content
    pageContent.innerHTML = pages[currentPageIndex].content;
    pageContent.scrollTop = 0;

    // Update book title
    const pageData = pages[currentPageIndex];
    const chapter = chapters[pageData.chapterIndex];
    if (chapter) {
      $('#book-title').textContent = chapter.bookTitle || 'Хаджи-Гирай';
    }

    updateInfo();
    save();
  };

  // Navigation
  const nextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      currentPageIndex++;
      render();
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      currentPageIndex--;
      render();
    }
  };

  const goToPage = (pageNum) => {
    const pageIndex = Math.max(0, Math.min(pageNum - 1, totalPages - 1));
    if (pageIndex !== currentPageIndex) {
      currentPageIndex = pageIndex;
      render();
    }
  };

  // Real pagination - split text into pages that fit screen height
// Оптимальная пагинация - заполняем страницы почти полностью
const createPages = () => {
  $('#loading-status').textContent = 'Разбиение на страницы...';
  
  pages = [];

  const viewportHeight = window.innerHeight;
  const isMobile = window.innerWidth <= 768;
  
  // Более точные размеры UI
  const headerHeight = isMobile ? 56 : 64;
  const footerHeight = isMobile ? 76 : 88; // Реальная высота footer
  const contentPadding = isMobile ? 52 : 64; // padding контента сверху и снизу
  
  const availableHeight = viewportHeight - headerHeight - footerHeight - contentPadding;
  
  // Оптимальное количество символов - заполняем страницы на 92-95%
  const fontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size-reading'));
  const lineHeight = fontSize * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--line-height-reading'));
  const linesPerPage = Math.floor(availableHeight / lineHeight);
  const charsPerLine = isMobile ? 35 : 50; // Оптимальное количество символов в строке
  const charsPerPage = Math.floor(linesPerPage * charsPerLine * 0.88); // Заполняем на 88%

  
  console.log('Viewport:', viewportHeight, 'Available:', availableHeight, 'Lines:', linesPerPage, 'Chars:', charsPerPage, 'Mobile:', isMobile);

  // Process each chapter
  chapters.forEach((chapter, chapterIndex) => {
    const chapterContent = content[chapterIndex] || '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chapterContent;
    const textContent = tempDiv.textContent || '';
    
    // Разбиваем на предложения
    const sentences = textContent.split(/(?<=[.!?…])\s+/).filter(s => s.length > 0);
    
    let currentPageText = '';
    let isFirstPageOfChapter = true;
    
    sentences.forEach((sentence, index) => {
      const testText = currentPageText + (currentPageText ? ' ' : '') + sentence;
      
      // Проверяем, поместится ли предложение
      if (testText.length > charsPerPage && currentPageText.length > 0) {
        // Создаем страницу с текущим текстом
        let pageHTML = '';
        
        if (isFirstPageOfChapter) {
          pageHTML += `<h1>${chapter.title || `Глава ${chapterIndex + 1}`}</h1>`;
          isFirstPageOfChapter = false;
        }
        
        // Группируем предложения в абзацы (3-4 предложения в абзац)
        const paragraphs = currentPageText.split(/(?<=[.!?…])\s+(?=[А-ЯЁABCDEFGHIJKLMNOPQRSTUVWXYZ])/);
        const groupedParagraphs = [];
        const sentencesPerParagraph = 3;
        
        for (let i = 0; i < paragraphs.length; i += sentencesPerParagraph) {
          const paragraphGroup = paragraphs.slice(i, i + sentencesPerParagraph).join(' ');
          if (paragraphGroup.trim()) {
            groupedParagraphs.push(`<p>${paragraphGroup.trim()}</p>`);
          }
        }
        
        pageHTML += groupedParagraphs.join('');
        
        pages.push({
          content: pageHTML,
          chapterIndex: chapterIndex
        });
        
        // Начинаем новую страницу с текущего предложения
        currentPageText = sentence;
      } else {
        // Добавляем предложение к текущей странице
        currentPageText += (currentPageText ? ' ' : '') + sentence;
      }
    });
    
    // Добавляем последнюю страницу главы
    if (currentPageText.trim()) {
      let pageHTML = '';
      
      if (isFirstPageOfChapter) {
        pageHTML += `<h1>${chapter.title || `Глава ${chapterIndex + 1}`}</h1>`;
      }
      
      const paragraphs = currentPageText.split(/(?<=[.!?…])\s+(?=[А-ЯЁABCDEFGHIJKLMNOPQRSTUVWXYZ])/);
      const groupedParagraphs = [];
      const sentencesPerParagraph = 3;
      
      for (let i = 0; i < paragraphs.length; i += sentencesPerParagraph) {
        const paragraphGroup = paragraphs.slice(i, i + sentencesPerParagraph).join(' ');
        if (paragraphGroup.trim()) {
          groupedParagraphs.push(`<p>${paragraphGroup.trim()}</p>`);
        }
      }
      
      pageHTML += groupedParagraphs.join('');
      
      pages.push({
        content: pageHTML,
        chapterIndex: chapterIndex
      });
    }
  });

  totalPages = pages.length;
  if (currentPageIndex >= totalPages) {
    currentPageIndex = Math.max(0, totalPages - 1);
  }
  
  console.log(`Created ${totalPages} pages`);
};








  // Build table of contents with page numbers
  const buildTOC = () => {
    const tocList = $('#toc-list');
    if (!tocList) return;

    tocList.innerHTML = '';

    // Find first page for each chapter
    const chapterPages = {};
    pages.forEach((page, index) => {
      if (!(page.chapterIndex in chapterPages)) {
        chapterPages[page.chapterIndex] = index + 1;
      }
    });

    chapters.forEach((chapter, i) => {
      const item = document.createElement('div');
      item.className = 'toc-item';
      const startPage = chapterPages[i] || 1;
      
      item.innerHTML = `
        <div class="toc-title">${chapter.title || `Глава ${i + 1}`}</div>
        <div class="toc-page">Страница ${startPage}</div>
      `;
      
      item.addEventListener('click', () => {
        goToPage(startPage);
        hideSidebar();
      });
      
      tocList.appendChild(item);
    });
  };

  // Load book content
  const loadBook = async () => {
    try {
      $('#loading-status').textContent = 'Загрузка оглавления...';
      
      const res = await fetch('book/chapters.json');
      if (!res.ok) throw new Error('Нет chapters.json');
      
      chapters = await res.json();
      content = new Array(chapters.length);

      // Load all chapters
      for (let i = 0; i < chapters.length; i++) {
        $('#loading-status').textContent = `Загрузка главы ${i + 1}/${chapters.length}`;
        
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

  // Event binding
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
      if (page >= 1 && page <= totalPages) {
        goToPage(page);
      }
    });

    // Progress bar click
    $('#progress-bar')?.addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const page = Math.round(ratio * (totalPages - 1)) + 1;
      goToPage(page);
    });
    // Обработчик поворота экрана и изменения размера окна
    window.addEventListener('resize', () => {
      // Пересчитать страницы при изменении размера окна
      setTimeout(() => {
        createPages();
        buildTOC();
        render();
      }, 300);
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
        // Recreate pages with new font
        setTimeout(() => {
          createPages();
          buildTOC();
          render();
        }, 100);
      });
    });

    $$('.width-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.width-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const widths = { narrow: '520px', medium: '680px', wide: '800px' };
        document.documentElement.style.setProperty('--text-width', widths[btn.dataset.width]);
        localStorage.setItem('reader_width', btn.dataset.width);
        // Recreate pages with new width
        setTimeout(() => {
          createPages();
          buildTOC();
          render();
        }, 100);
      });
    });

    // Font size slider
    $('#font-size-slider')?.addEventListener('input', (e) => {
      const size = e.target.value + 'px';
      $('#font-size-value').textContent = size;
      document.documentElement.style.setProperty('--font-size-reading', size);
      localStorage.setItem('reader_size', e.target.value);
      // Recreate pages with new font size
      setTimeout(() => {
        createPages();
        buildTOC();
        render();
      }, 100);
    });

    // Line height slider
    $('#line-height-slider')?.addEventListener('input', (e) => {
      const height = e.target.value;
      $('#line-height-value').textContent = height;
      document.documentElement.style.setProperty('--line-height-reading', height);
      localStorage.setItem('reader_lineheight', height);
      // Recreate pages with new line height
      setTimeout(() => {
        createPages();
        buildTOC();
        render();
      }, 100);
    });

    // Keyboard shortcuts
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
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
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

  // Load settings
  const loadSettings = () => {
    const theme = localStorage.getItem('reader_theme') || 'dark';
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

  // Initialize app
const init = async () => {
  try {
    loadSettings();
    
    const success = await loadBook();
    if (!success) return;

    createPages();
    load(); // Load saved position
    buildTOC();
    render();
    bindEvents();

    // Hide loading
    $('#loading')?.classList.add('hidden');

    // На мобильных показать UI и не скрывать footer
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      showUI();
      // Footer остается видимым на мобильных
    } else {
      // На десктопе показать UI ненадолго
      showUI();
      setTimeout(hideUI, 3000);
    }

  } catch (err) {
    $('#loading-status').textContent = 'Критическая ошибка: ' + err.message;
    console.error('Init failed:', err);
  }
};

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
