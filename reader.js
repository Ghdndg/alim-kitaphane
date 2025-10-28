class PerfectReader {
    constructor() {
        this.bookText = '';
        this.pages = [];
        this.currentPage = 0;
        this.init();
    }
    
    async init() {
        try {
            await this.loadBook();
            this.createPerfectPages();
            this.setupEvents();
            this.render();
            document.getElementById('loading').classList.add('hidden');
        } catch (error) {
            console.error('Failed to load:', error);
            document.getElementById('loading').textContent = 'Error loading book';
        }
    }
    
    async loadBook() {
        const response = await fetch('Khadzhi-Girai.txt');
        this.bookText = await response.text();
        console.log('Book loaded:', this.bookText.length, 'characters');
    }
    
    createPerfectPages() {
        // Clean the text
        const cleanText = this.bookText
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        // Split into paragraphs
        const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
        
        // Calculate safe page size (words per page)
        const wordsPerPage = this.calculateWordsPerPage();
        
        this.pages = [];
        let currentPageParagraphs = [];
        let currentWordCount = 0;
        
        console.log(`Target words per page: ${wordsPerPage}`);
        
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i].trim();
            const words = paragraph.split(/\s+/).length;
            
            // Check if adding this paragraph would exceed the limit
            if (currentWordCount + words > wordsPerPage && currentPageParagraphs.length > 0) {
                // Save current page
                this.pages.push(this.formatPageContent(currentPageParagraphs));
                console.log(`Page ${this.pages.length}: ${currentWordCount} words`);
                
                // Start new page
                currentPageParagraphs = [paragraph];
                currentWordCount = words;
            } else {
                // Add to current page
                currentPageParagraphs.push(paragraph);
                currentWordCount += words;
            }
        }
        
        // Add the last page
        if (currentPageParagraphs.length > 0) {
            this.pages.push(this.formatPageContent(currentPageParagraphs));
            console.log(`Final page ${this.pages.length}: ${currentWordCount} words`);
        }
        
        console.log(`Total pages created: ${this.pages.length}`);
        
        // Verify no text was lost
        this.verifyTextIntegrity(paragraphs);
    }
    
    calculateWordsPerPage() {
        const containerHeight = window.innerHeight - 60 - 80 - 40; // header - footer - padding
        const lineHeight = 18 * 1.6; // font-size * line-height
        const linesPerPage = Math.floor(containerHeight / lineHeight);
        const wordsPerLine = 8; // conservative estimate
        
        return Math.max(50, Math.floor(linesPerPage * wordsPerLine * 0.8)); // 80% safety margin
    }
    
    formatPageContent(paragraphs) {
        return paragraphs.map(p => {
            const text = p.trim();
            
            // Check if it's a title
            if (text === 'Хаджи-Гирай' || text.includes('Хаджи-Гирай')) {
                return `<h1 style="text-align: center; margin-bottom: 20px; font-size: 24px;">${text}</h1>`;
            }
            
            // Check if it's author
            if (text === 'Алим Къуртсеит' || text.includes('Алим Къуртсеит')) {
                return `<div style="text-align: center; margin-bottom: 30px; font-style: italic; color: #ccc;">${text}</div>`;
            }
            
            // Check if it's a chapter heading
            if (text.length < 80 && (text === text.toUpperCase() || /^[А-ЯЁ\s\-\.]{3,50}$/.test(text))) {
                return `<h2 style="margin: 30px 0 15px 0; font-size: 20px;">${text}</h2>`;
            }
            
            // Regular paragraph
            return `<p style="margin-bottom: 15px; text-align: justify;">${text}</p>`;
            
        }).join('');
    }
    
    verifyTextIntegrity(originalParagraphs) {
        let pagesText = '';
        this.pages.forEach(page => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page;
            pagesText += tempDiv.textContent + '\n\n';
        });
        
        const originalText = originalParagraphs.join('\n\n');
        const pagesTextClean = pagesText.trim();
        
        console.log('Original length:', originalText.length);
        console.log('Pages length:', pagesTextClean.length);
        
        if (Math.abs(originalText.length - pagesTextClean.length) < 100) {
            console.log('✅ TEXT INTEGRITY VERIFIED - No significant loss detected');
        } else {
            console.warn('⚠️ Potential text loss detected');
        }
    }
    
    render() {
        if (this.pages[this.currentPage]) {
            document.getElementById('content').innerHTML = this.pages[this.currentPage];
        }
        
        document.getElementById('page-info').textContent = 
            `Page ${this.currentPage + 1} of ${this.pages.length}`;
        
        document.getElementById('prev-btn').disabled = this.currentPage === 0;
        document.getElementById('next-btn').disabled = this.currentPage === this.pages.length - 1;
    }
    
    nextPage() {
        if (this.currentPage < this.pages.length - 1) {
            this.currentPage++;
            this.render();
        }
    }
    
    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.render();
        }
    }
    
    setupEvents() {
        document.getElementById('next-btn').onclick = () => this.nextPage();
        document.getElementById('prev-btn').onclick = () => this.prevPage();
        
        document.onkeydown = (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                this.nextPage();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevPage();
            }
        };
    }
}

// Start the reader
new PerfectReader();
