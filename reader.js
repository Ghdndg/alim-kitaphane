(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, cb) => el.addEventListener(ev, cb);

  const storage = {
    get(k, f = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  const toast = (msg, type='info') => {
    const c = $('#toast-container'); if (!c) return;
    const t = document.createElement('div'); t.className = `toast toast-${type}`; t.textContent = msg;
    c.appendChild(t); requestAnimationFrame(()=>t.classList.add('show'));
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),200); }, 2500);
  };

  const DEFAULTS = {
    theme:'light', fontFamily:'crimson', fontSize:18, lineHeight:1.7, textWidth:'medium', readingMode:'paginated'
  };

  const STATE = {
    bookId:'hadji-giray',
    chapters:[],
    content:[],
    currentChapter:0,
    currentPage:1,
    totalPages:1,
    globalPage:1,
    totalGlobalPages:1,
    chapterPages:[],
    chapterStart:[],
    readingStart:Date.now()
  };

  const Settings = {
    load(){ this.val = {...DEFAULTS, ...(storage.get('reader_settings')||{})}; this.apply(); this.bind(); },
    apply(){
      document.body.dataset.theme = this.val.theme;
      const rc = $('#reader-content').style;
      rc.setProperty('--font-size-reading', `${this.val.fontSize}px`);
      rc.setProperty('--line-height-reading', this.val.lineHeight);
      const fam = this.val.fontFamily;
      const reading =
        fam==='crimson' ? '"Crimson Text", Georgia, serif' :
        fam==='georgia' ? 'Georgia, serif' :
        fam==='times' ? '"Times New Roman", Times, serif' :
        fam==='arial' ? 'Arial, Helvetica, sans-serif' :
        'Inter, system-ui, sans-serif';
      rc.setProperty('--font-reading', reading);
      $('#reader-content').dataset.width = this.val.textWidth;
      $('#reader-content').dataset.mode  = this.val.readingMode;
      storage.set('reader_settings', this.val);
    },
    bind(){
      on($('#settings-btn'),'click',()=>UI.openModal('settings-modal'));
      on($('#font-family'),'change',e=>{ this.val.fontFamily=e.target.value; this.apply(); Reader.recalcAll(); });
      on($('#font-size'),'input',e=>{ $('#font-size-value').textContent=`${e.target.value}px`; this.val.fontSize=+e.target.value; this.apply(); Reader.recalcAll(); });
      on($('#line-height'),'input',e=>{ $('#line-height-value').textContent=e.target.value; this.val.lineHeight=+e.target.value; this.apply(); Reader.recalcAll(); });
      on($('#text-width'),'change',e=>{ this.val.textWidth=e.target.value; this.apply(); Reader.recalcAll(); });
      on($('#reading-mode'),'change',e=>{ this.val.readingMode=e.target.value; this.apply(); Reader.recalcAll(); });
      $$('.theme-btn').forEach(b=>on(b,'click',()=>{ $$('.theme-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); this.val.theme=b.dataset.theme; this.apply(); }));
    }
  };

  const Progress = {
    key:`reader_progress_${STATE.bookId}`,
    save(){ storage.set(this.key,{chapter:STATE.currentChapter,page:STATE.currentPage,global:STATE.globalPage}); },
    load(){ return storage.get(this.key,{chapter:0,page:1,global:1}); }
  };

  const UI = {
    openModal(id){ const m = document.getElementById(id); if(!m) return; m.classList.add('active'); $('#reader-overlay').classList.add('active'); },
    closeAll(){ $$('.modal').forEach(m=>m.classList.remove('active')); $('#reader-overlay').classList.remove('active'); },
    toggleSidebar(force){ const s = $('#reader-sidebar'); const want = typeof force==='boolean'?force:!s.classList.contains('active'); s.classList.toggle('active', want); },
    showMenu(x,y){ const m=$('#context-menu'); m.style.left=`${x}px`; m.style.top=`${y}px`; m.classList.add('active'); },
    hideMenu(){ $('#context-menu').classList.remove('active'); }
  };

  const Reader = {
    async init(){
      this.cache();
      this.bind();
      Settings.load();
      await this.loadAll();
      this.restore();
      $('#loading-screen').classList.add('hidden');
    },
    cache(){
      this.el = {
        content: $('#reader-content'),
        chapter: $('#chapter-content'),
        tocBtn: $('#toc-btn'),
        next: $('#next-page'),
        prev: $('#prev-page'),
        pageInput: $('#page-input'),
        cur: $('#current-page'),
        total: $('#total-pages'),
        fill: $('#progress-fill'),
        thumb: $('#progress-thumb')
      };
    },
    bind(){
      on(this.el.tocBtn,'click',()=>UI.toggleSidebar());
      on(this.el.next,'click',()=>this.nextPage());
      on(this.el.prev,'click',()=>this.prevPage());
      on(this.el.pageInput,'change',e=>this.goGlobal(+e.target.value));
      on($('#progress-bar'),'click',e=>{
        const r=e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX-r.left)/r.width;
        const g = Math.max(1, Math.round(ratio*STATE.totalGlobalPages));
        this.goGlobal(g);
      });
      on(document,'keydown',e=>{
        if (e.target.tagName==='INPUT') return;
        if (e.ctrlKey && e.key.toLowerCase()==='s'){ e.preventDefault(); UI.openModal('settings-modal'); }
        if (e.ctrlKey && e.key.toLowerCase()==='t'){ e.preventDefault(); UI.toggleSidebar(true); }
        if (e.ctrlKey && e.key.toLowerCase()==='b'){ e.preventDefault(); $('#bookmark-btn').click(); }
        if (e.key==='ArrowRight' || e.key==='PageDown' || e.key===' ') { e.preventDefault(); this.nextPage(); }
        if (e.key==='ArrowLeft'  || e.key==='PageUp')                   { e.preventDefault(); this.prevPage(); }
        if (e.key==='Escape'){ UI.closeAll(); UI.toggleSidebar(false); }
        if (e.key==='Home'){ e.preventDefault(); this.goGlobal(1); }
        if (e.key==='End'){  e.preventDefault(); this.goGlobal(STATE.totalGlobalPages); }
      });

      on($('#search-btn'),'click',()=>UI.openModal('search-modal'));
      on($('#search-submit'),'click',()=>Search.run());
      on($('#search-input'),'keydown',e=>{ if(e.key==='Enter') Search.run(); });

      on(this.el.content,'mouseup',e=>{
        const t = getSelection().toString().trim(); if (!t) return UI.hideMenu(); UI.showMenu(e.clientX,e.clientY);
      });
      on(document,'click',e=>{ if(!e.target.closest('#context-menu')) UI.hideMenu(); });

      on($('#highlight-text'),'click',()=>this.highlight());
      on($('#add-note'),'click',()=>this.addNote());
      on($('#copy-text'),'click',()=>document.execCommand('copy'));
      on($('#lookup-word'),'click',()=>toast('Словарь скоро будет','info'));

      on($('#back-btn'),'click',()=>history.back());
    },
    async loadAll(){
      try{
        const meta = await fetch('book/chapters.json',{cache:'no-store'}).then(r=>r.json());
        STATE.chapters = meta;
        STATE.content = [];
        for (let i=0;i<meta.length;i++){
          try{
            const html = await fetch(meta[i].href,{cache:'no-store'}).then(r=>r.text());
            STATE.content[i]=html;
            $('#loading-screen p').textContent = `Загружено глав: ${i+1} из ${meta.length}`;
          }catch{ STATE.content[i]=`<h2>${meta[i].title||('Глава '+(i+1))}</h2><p>Не удалось загрузить.</p>`; }
        }
        this.renderTOC();
        await this.display(0);
        this.calcAll();
      }catch(e){
        this.el.chapter.innerHTML = `<h2>Ошибка</h2><p>Не удалось загрузить book/chapters.json</p>`;
      }
    },
    renderTOC(){
      const box = $('#toc-list'); box.innerHTML='';
      STATE.chapters.forEach((ch,i)=>{
        const a=document.createElement('a');
        a.className='toc-link'; a.dataset.index=i;
        a.href='javascript:void(0)'; a.innerHTML = `${ch.title||('Глава '+(i+1))}<div style="color:var(--text-muted);font-size:12px;margin-top:2px" class="toc-start">стр. …</div>`;
        on(a,'click',()=>this.go(i,1));
        const item=document.createElement('div'); item.className='toc-item'; item.appendChild(a);
        box.appendChild(item);
      });
    },
    async display(index){
      STATE.currentChapter=index;
      $('#book-title').textContent = STATE.chapters[index].bookTitle || $('#book-title').textContent;
      this.el.chapter.innerHTML = STATE.content[index] || '';
      // форсируем рефлоу перед измерением
      void this.el.chapter.offsetHeight;
      this.paginate();
      this.update();
      this.highlightTOC();
    },
    paginate(){
      const mode = $('#reader-content').dataset.mode;
      if (mode==='scroll'){
        const pageH = this.el.content.clientHeight;
        const totalH = this.el.chapter.scrollHeight;
        STATE.totalPages = Math.max(1, Math.ceil(totalH/pageH));
        STATE.currentPage = Math.min(STATE.currentPage, STATE.totalPages);
      }else{
        STATE.totalPages = STATE.chapterPages[STATE.currentChapter] || 1;
        STATE.currentPage = Math.min(STATE.currentPage, STATE.totalPages);
        this.scrollTo(STATE.currentPage);
      }
      STATE.globalPage = this.chapterToGlobal(STATE.currentChapter, STATE.currentPage);
    },
    calcAll(){
      const savedHTML = this.el.chapter.innerHTML;
      const savedIndex = STATE.currentChapter;
      STATE.chapterPages=[]; STATE.chapterStart=[];
      let total=0;
      STATE.chapters.forEach((_,i)=>{
        this.el.chapter.innerHTML = STATE.content[i] || '';
        void this.el.chapter.offsetHeight; // рефлоу
        const pageH = this.el.content.clientHeight;
        const totalH = this.el.chapter.scrollHeight;
        const pages = Math.max(1, Math.ceil(totalH/pageH));
        STATE.chapterPages[i]=pages;
        STATE.chapterStart[i]=total+1;
        total+=pages;
      });
      STATE.totalGlobalPages = total;
      // подпишем в TOC стартовые страницы
      $$('#toc-list .toc-item .toc-start').forEach((el,idx)=>{ el.textContent = `стр. ${STATE.chapterStart[idx]||1}`; });
      // восстановим
      this.el.chapter.innerHTML = savedHTML;
      STATE.currentChapter = savedIndex;
      this.update();
    },
    recalcAll(){ setTimeout(()=>{ this.calcAll(); this.paginate(); this.update(); }, 50); },
    scrollTo(page){
      const pageH = this.el.content.clientHeight;
      const top = (page-1)*pageH;
      this.el.content.scrollTo({top, behavior:'smooth'});
    },
    nextPage(){
      if (STATE.currentPage < STATE.totalPages) this.goPage(STATE.currentPage+1);
      else if (STATE.currentChapter < STATE.chapters.length-1) this.go(STATE.currentChapter+1,1);
    },
    prevPage(){
      if (STATE.currentPage > 1) this.goPage(STATE.currentPage-1);
      else if (STATE.currentChapter>0){ const p=STATE.chapterPages[STATE.currentChapter-1]||1; this.go(STATE.currentChapter-1,p); }
    },
    go(chapter,page){ this.display(chapter).then(()=>this.goPage(page)); },
    goPage(page){
      STATE.currentPage = Math.max(1, Math.min(page, STATE.totalPages));
      this.scrollTo(STATE.currentPage);
      STATE.globalPage = this.chapterToGlobal(STATE.currentChapter, STATE.currentPage);
      this.update(); Progress.save();
    },
    goGlobal(g){
      const m = this.globalToChapter(g); if (!m) return;
      this.go(m.chapter, m.page);
    },
    chapterToGlobal(ch,p){ return (STATE.chapterStart[ch]||1)+p-1; },
    globalToChapter(g){
      for (let i=0;i<STATE.chapterStart.length;i++){
        const s=STATE.chapterStart[i]; const e = s + (STATE.chapterPages[i]||1) - 1;
        if (g>=s && g<=e) return {chapter:i,page:g-s+1};
      }
      return null;
    },
    update(){
      this.el.cur.textContent = STATE.globalPage;
      this.el.total.textContent = STATE.totalGlobalPages;
      this.el.pageInput.max = String(STATE.totalGlobalPages);
      this.el.pageInput.value = String(STATE.globalPage);
      const ratio = (STATE.globalPage-1)/Math.max(1,STATE.totalGlobalPages-1);
      this.el.fill.style.width = `${ratio*100}%`;
      this.el.thumb.style.left = `${ratio*100}%`;
      const mins = Math.max(0, Math.round((Date.now()-STATE.readingStart)/60000));
      $('#reading-time').textContent = `${mins} мин`;
      this.highlightTOC();
    },
    highlightTOC(){
      $$('#toc-list .toc-link').forEach(a=>a.classList.remove('active'));
      const act = $(`#toc-list .toc-link[data-index="${STATE.currentChapter}"]`); if (act) act.classList.add('active');
    },
    restore(){
      const p = Progress.load();
      if (p && p.global) this.goGlobal(p.global);
      else this.go(0,1);
    },
    highlight(){
      const sel=window.getSelection(); if(!sel || sel.isCollapsed) return UI.hideMenu();
      const r = sel.getRangeAt(0); const mark=document.createElement('mark'); mark.className='highlight';
      try{ r.surroundContents(mark); }catch{}
      sel.removeAllRanges(); UI.hideMenu(); toast('Выделено','success');
    },
    addNote(){
      const t = window.getSelection().toString().trim(); if(!t) return UI.hideMenu();
      const note = prompt('Заметка к выделению:',''); if (note===null) return;
      const key=`reader_annotations_${STATE.bookId}`;
      const list = storage.get(key,[]); list.push({chapter:STATE.currentChapter,global:STATE.globalPage,text:t,note,ts:Date.now()});
      storage.set(key,list); UI.hideMenu(); toast('Заметка сохранена','success');
      // simple render
      const box = $('#annotations-list'); if (box) box.innerHTML = list.map(a=>`<div class="annotation-item"><div class="annotation-head"><strong>Гл. ${a.chapter+1}</strong> • стр. ${a.global}</div><div class="annotation-text">${a.text}</div><div class="annotation-note">${a.note}</div></div>`).join('');
    }
  };

  const Search = {
    async run(){
      const q = ($('#search-input').value||'').trim(); if(!q) return;
      const cs = $('#case-sensitive').checked; const ww = $('#whole-words').checked;
      const flags = cs?'g':'gi';
      const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re = new RegExp(ww?`\\b${esc(q)}\\b`:esc(q), flags);
      const box = $('#search-results'); box.innerHTML='';
      let out=[];
      for (let i=0;i<STATE.content.length;i++){
        const tmp=document.createElement('div'); tmp.innerHTML=STATE.content[i]||''; const text=tmp.textContent||'';
        let m; let count=0;
        while((m=re.exec(text)) && count<20){
          const s=Math.max(0,m.index-60), e=Math.min(text.length,m.index+m[0].length+60);
          const snippet = text.slice(s,e).replace(/\s+/g,' ').trim();
          out.push({chapter:i,global:STATE.chapterStart[i]||1,snippet}); count++;
        }
      }
      if (!out.length){ box.innerHTML='<p class="empty-state">Ничего не найдено</p>'; return; }
      out.slice(0,100).forEach(r=>{
        const el=document.createElement('div'); el.className='search-result';
        const safe = r.snippet.replace(new RegExp(q,'gi'), m=>`<span class="search-highlight">${m}</span>`);
        el.innerHTML = `<div class="search-result-chapter">Глава ${r.chapter+1} • стр. ${r.global}</div><div class="search-result-text">${safe}</div>`;
        on(el,'click',()=>Reader.goGlobal(r.global));
        box.appendChild(el);
      });
    }
  };

  window.addEventListener('load',()=>Reader.init());
})();
