// Скрипт для загрузки содержимого книги из файла Хаджи Гирай.txt

async function loadBookContent() {
    try {
        // Читаем файл по частям
        // Важно: используем encodeURI для кириллицы и пробела в имени файла
        const cacheBust = Date.now();
        const response = await fetch(encodeURI('./Хаджи Гирай.txt') + '?v=' + cacheBust, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Не удалось загрузить файл книги: HTTP ' + response.status);
        }
        
        const text = await response.text();
        // Быстрая верификация: ищем характерный маркер
        if (!/БИРИНДЖИ\s+КЪЫСЫМ|Биринджи\s+баб/i.test(text)) {
            console.warn('Загружен текст без ожидаемых маркеров глав. Проверьте файл Хаджи Гирай.txt');
        }
        const lines = text.split('\n');
        
        // Создаем HTML структуру
        let htmlContent = '';
        let currentChapter = '';
        let chapterIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                htmlContent += '<br>';
                continue;
            }
            
            // Проверяем, является ли строка заголовком части
            if (line.match(/^[А-Я].*КЪЫСЫМ$/)) {
                htmlContent += `<div class="section-title">${line}</div>`;
                continue;
            }
            
            // Проверяем, является ли строка заголовком баба (главы)
            if (line.match(/^[А-Я].*баб$/)) {
                currentChapter = line;
                chapterIndex++;
                htmlContent += `<div class="chapter-title" data-chapter="${chapterIndex}">${line}</div>`;
                continue;
            }
            
            // Обычный текст
            htmlContent += `<div class="text-block"><p>${line}</p></div>`;
        }
        
        return htmlContent;
        
    } catch (error) {
        console.error('Ошибка загрузки книги (load_book_content.js):', error);
        return '<div class="text-block"><p>Ошибка загрузки содержимого книги.</p></div>';
    }
}

// Функция для создания содержания
function createTableOfContents(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const chapters = doc.querySelectorAll('.chapter-title');
    
    let tocHtml = '<ul class="toc-list">';
    
    chapters.forEach((chapter, index) => {
        const chapterText = chapter.textContent;
        tocHtml += `<li><a href="#" class="toc-link" data-chapter="${index}">${chapterText}</a></li>`;
    });
    
    tocHtml += '</ul>';
    return tocHtml;
}

// Загружаем содержимое при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    const textContent = document.getElementById('textContent');
    const sidebarContent = document.getElementById('sidebarContent');
    
    if (textContent) {
        // Проверяем, есть ли уже содержимое
        if (textContent.innerHTML.trim() === '') {
            const bookContent = await loadBookContent();
            textContent.innerHTML = bookContent;
            
            // Создаем содержание
            if (sidebarContent) {
                const toc = createTableOfContents(bookContent);
                sidebarContent.innerHTML = toc;
            }
        }
        
        // Инициализируем читалку после загрузки DOM
        setTimeout(() => {
            if (typeof calculatePageDimensions === 'function') {
                calculatePageDimensions();
            }
        }, 100);
    }
});
