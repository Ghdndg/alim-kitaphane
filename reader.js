// Premium paging reader with swipe, tap zones, smart pagination and top-tier UX
import 'https://cdn.jsdelivr.net/npm/pepjs@0.4.3/dist/pep.min.js';

(() => {
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const on=(e,t,h)=>e.addEventListener(t,h,{passive:true});

  const fmt = (n)=>n.toLocaleString('ru-RU');

  const settingsKey='premium_reader_settings';
  const progressKey='premium_reader_progress_hadji';

  const Settings = {
    val: { theme:'auto', font:'crimson', size:18, lh:1.7, width:'medium', mode:'page' },
    load(){ try{ this.val={...this.val, ...(JSON.parse(localStorage.getItem(settingsKey)||'{}'))}; }catch{} this.apply(); },
    save(){ localStorage.setItem(settingsKey, JSON.stringify(this.val)); },
    apply(){
      document.body.dataset.theme = this.val.theme;
      document.documentElement.style.setProperty('--fs', `${this.val.size}px`);
      document.documentElement.style.setProperty('--lh', this.val.lh);
      document.documentElement.style.setProperty('--mw', this.val.width==='narrow'?'58ch': this.val.width==='wide'?'78ch':'68ch');
      const serif = this.val.font==='crimson' ? '"Crimson Text", Georgia, serif'
                   : this.val.font==='georgia' ? 'Georgia, serif'
                   : '"Crimson Text", Georgia, serif';
      document.documentElement.style.setProperty('--serif', serif);
      this.save();
    }
  };

  const State = {
    chapters:[], html:[],
    pages:[], // array of page HTML strings
    pageIndex:0, // 0-based
    totalPages:1,
    wordsPerMin:220,
    chapterStarts:[], // global page start per chapter
    surface: $('#surface'),
    pager: $('#pager'),
    topbar: $('#topbar'),
    sidebar: $('#sidebar'),
    overlay: $('#overlay'),
    floats: $('.floats'),
    loading: $('#loading'),
  };

  const Progress = {
    save(){ localStorage.setItem(progressKey, JSON.stringify({page:State.pageIndex})); },
    load(){ try{ const p=JSON.parse(localStorage.getItem(progressKey)||'{}'); if(typeof p.page==='number') State.pageIndex=p.page; }catch{} }
  };

  async function loadBook(){
    const meta = await fetch('book/chapters.json',{cache:'no-store'}).then(r=>r.json());
    State.chapters = meta;
    State.html = await Promise.all(meta.map(async c=>{
      try{ return await fetch(c.href,{cache:'no-store'}).then(r=>r.text()); }
      catch{ return `<h1>${c.title||''}</h1><p>Ошибка загрузки.</p>`; }
    }));
  }

  function splitToPages(){
    // Create a hidden measuring container
    const probe = document.createElement('div');
    probe.style.position='absolute'; probe.style.inset='0 -9999px auto 0';
    probe.style.width='100%'; probe.style.height='100%';
    probe.style.overflow='hidden';
    probe.innerHTML = `<div class="page"><div class="sheet"></div></div>`;
    document.body.appendChild(probe);
    const sheet = $('.sheet', probe);

    // Build one flow of all chapters with markers
    const parts=[];
    State.chapterStarts=[]; let pageStart=0;
    State.chapters.forEach((ch,i)=>{ parts.push(`<h1>${ch.title||('Глава '+(i+1))}</h1>`); parts.push(State.html[i]); });
    const flow = `<div class="flow">${parts.join('\n')}</div>`;
    // We will paginate by iteratively filling sheet height
    const tmp = document.createElement('div'); tmp.style.visibility='hidden'; tmp.style.position='absolute'; tmp.style.inset='0 -9999px auto 0';
    tmp.innerHTML = flow; document.body.appendChild(tmp);

    const nodes = Array.from(tmp.querySelector('.flow').childNodes);
    let cur = document.createElement('div');

    const pages=[];
    function pushPage(){
      pages.push(`<div class="page"><div class="sheet">${cur.innerHTML}</div></div>`);
      cur = document.createElement('div');
    }

    // naive streaming layout: append nodes until overflow, then back off by paragraph
    sheet.innerHTML=''; cur.innerHTML='';
    let chapterIdx=-1; let currentChapterStartSet=false;

    nodes.forEach(node=>{
      // detect chapter headings to mark chapter start
      if (node.nodeType===1 && node.tagName==='H1'){ chapterIdx+=1; currentChapterStartSet=false; }
      const clone = node.cloneNode(true);
      cur.appendChild(clone); sheet.innerHTML = cur.innerHTML;
      // measure
      const tooHigh = sheet.scrollHeight > sheet.clientHeight;
      if (tooHigh){
        // remove last node, push page, start new with it
        cur.removeChild(clone);
        pushPage();
        // mark chapter start on first page where chapter appears
        if (chapterIdx>=0 && !currentChapterStartSet){ State.chapterStarts[chapterIdx]=pages.length; currentChapterStartSet=true; }
        cur.appendChild(clone);
        sheet.innerHTML = cur.innerHTML;
        // if still too high (very long element) split by paragraph text
        if (sheet.scrollHeight > sheet.clientHeight){
          // split paragraph by sentences roughly
          if (clone.textContent && clone.textContent.length>200){
            let text = clone.textContent;
            let chunks = text.split(/(?<=[.!?…])\s+/);
            cur.removeChild(clone);
            let acc='';
            for (let i=0;i<chunks.length;i++){
              const part = chunks[i];
              const span = document.createElement('p'); span.textContent = (acc?acc+' ':'')+part;
              cur.appendChild(span); sheet.innerHTML=cur.innerHTML;
              if (sheet.scrollHeight > sheet.clientHeight){
                // back off
                cur.removeChild(span);
                pushPage();
                cur.appendChild(span);
                sheet.innerHTML = cur.innerHTML;
              }
              acc='';
            }
          }
        }
      }
      // mark chapter start if just added h1
      if (node.nodeType===1 && node.tagName==='H1'){
        if (chapterIdx>=0 && !currentChapterStartSet){ State.chapterStarts[chapterIdx]=pages.length-1; currentChapterStartSet=true; }
      }
    });
    // last page
    if (cur.innerHTML.trim().length) pushPage();

    document.body.removeChild(probe);
    document.body.removeChild(tmp);

    State.pages = pages;
    State.totalPages = pages.length || 1;
  }

  function renderPager(){
    const p = State.pager;
    p.innerHTML = State.pages.join('');
    $('#total').textContent = `/${fmt(State.totalPages)}`;
    updateProgress();
    goTo(State.pageIndex, false);
  }

  function updateProgress(){
    const cur = State.pageIndex+1;
    $('#goto').value = cur;
    const ratio = (cur-1)/Math.max(1, State.totalPages-1);
    $('#progress-fill').style.width = `${ratio*100}%`;
    const words = Math.round(State.pages[State.pageIndex]?.replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length || 0);
    const mins = Math.max(1, Math.round(words/State.wordsPerMin));
    $('#progress-text').textContent = `${fmt(cur)} из ${fmt(State.totalPages)} • ~${fmt(mins)} мин`;
    // active chapter in TOC
    highlightTOC();
  }

  function goTo(idx, smooth=true){
    State.pageIndex = Math.max(0, Math.min(idx, State.totalPages-1));
    const x = State.pageIndex * State.pager.clientWidth;
    State.pager.scrollTo({left:x, behavior: smooth?'smooth':'auto'});
    updateProgress(); Progress.save();
  }

  function next(){ goTo(State.pageIndex+1); }
  function prev(){ goTo(State.pageIndex-1); }

  function buildTOC(){
    const box = $('#toc-list'); box.innerHTML='';
    State.chapters.forEach((ch,i)=>{
      const a=document.createElement('a');
      a.href='javascript:void(0)';
      const start = (State.chapterStarts[i]||0)+1;
      a.innerHTML=`<div>${ch.title||('Глава '+(i+1))}</div><div class="meta">стр. ${fmt(start)}</div>`;
      a.addEventListener('click',()=>{ goTo(start-1); toggleSidebar(false); });
      box.appendChild(a);
    });
  }
  function highlightTOC(){
    const cur = State.pageIndex;
    const idx = [...(State.chapterStarts||[])].reduce((acc,st,i)=> (st<=cur ? i : acc), 0);
    $$('#toc-list a').forEach((a,i)=> a.classList.toggle('active', i===idx));
  }

  function toggleTopbar(show){
    const tb = State.topbar;
    const b = typeof show==='boolean' ? show : !tb.classList.contains('show');
    tb.classList.toggle('show', b);
  }
  function toggleSidebar(show){
    const s = State.sidebar, o = State.overlay;
    const b = typeof show==='boolean' ? show : !s.classList.contains('show');
    s.classList.toggle('show', b);
    o.classList.toggle('show', b);
  }

  function bindUI(){
    // panels
    on($('#tap-center'),'click',()=>toggleTopbar());
    on(State.overlay,'click',()=>toggleSidebar(false));
    on($('#btn-toc'),'click',()=>toggleSidebar(true));
    on($('#btn-back'),'click',()=>history.back());

    // nav
    on($('#tap-right'),'click',next);
    on($('#tap-left'),'click',prev);
    on($('#btn-next'),'click',next);
    on($('#btn-prev'),'click',prev);

    on($('#goto'),'change',e=>goTo(+e.target.value-1,false));

    // keyboard
    document.addEventListener('keydown',e=>{
      if (e.key==='ArrowRight' || e.key==='PageDown' || e.key===' ') { e.preventDefault(); next(); }
      if (e.key==='ArrowLeft'  || e.key==='PageUp') { e.preventDefault(); prev(); }
      if (e.key==='t' && e.ctrlKey){ e.preventDefault(); toggleSidebar(true); }
      if (e.key==='s' && (e.ctrlKey || !e.ctrlKey)){ e.preventDefault(); openSettings(); }
      if (e.key==='Escape'){ toggleSidebar(false); toggleTopbar(false); }
      if (e.key==='Home'){ e.preventDefault(); goTo(0); }
      if (e.key==='End'){ e.preventDefault(); goTo(State.totalPages-1); }
    });

    // sidebar tabs
    $$('.tab').forEach(t=>t.addEventListener('click',()=>{
      $$('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
      const panel = t.dataset.tab;
      $$('.panel').forEach(p=>p.classList.toggle('active', p.dataset.panel===panel));
    }));

    // settings
    on($('#btn-settings'),'click',openSettings);
    $('#ctrl-size').addEventListener('input',e=>{ Settings.val.size=+e.target.value; Settings.apply(); reflow(); });
    $('#ctrl-lh').addEventListener('input',e=>{ Settings.val.lh=+e.target.value; Settings.apply(); reflow(); });
    $$('.segmented .seg').forEach(seg=>seg.addEventListener('click',()=>{
      const group = seg.parentElement;
      group.querySelectorAll('.seg').forEach(x=>x.classList.remove('active'));
      seg.classList.add('active');
      if (seg.dataset.theme){ Settings.val.theme=seg.dataset.theme; }
      if (seg.dataset.font){ Settings.val.font=seg.dataset.font; }
      if (seg.dataset.width){ Settings.val.width=seg.dataset.width; }
      if (seg.dataset.mode){ Settings.val.mode=seg.dataset.mode; }
      Settings.apply(); reflow();
    }));

    // search
    on($('#btn-search'),'click',openSearch);
    on($('#do-search'),'click',runSearch);
    $('#q').addEventListener('keydown',e=>{ if(e.key==='Enter') runSearch(); });

    // swipe with mouse/touch
    let sx=0, dx=0, dragging=false;
    State.pager.addEventListener('pointerdown',e=>{ dragging=true; sx=e.clientX; dx=0; State.pager.setPointerCapture(e.pointerId); });
    State.pager.addEventListener('pointermove',e=>{ if(!dragging) return; dx=e.clientX-sx; });
    State.pager.addEventListener('pointerup',e=>{
      if(!dragging) return; dragging=false;
      if (dx<-40) next(); else if (dx>40) prev();
    });
  }

  function openSettings(){ const d=$('#modal-settings'); d.showModal(); d.addEventListener('close',()=>Settings.save(),{once:true}); }
  function openSearch(){ $('#modal-search').showModal(); }

  function runSearch(){
    const q = ($('#q').value||'').trim(); if(!q) return;
    const cs = $('#cs').checked, ww = $('#ww').checked;
    const flags = cs?'g':'gi';
    const esc = s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re = new RegExp(ww?`\\b${esc(q)}\\b`:esc(q), flags);
    const box = $('#search-results'); box.innerHTML='';

    let results=[];
    State.html.forEach((h,i)=>{
      const text = h.replace(/<[^>]+>/g,' ');
      let m, cnt=0;
      while((m=re.exec(text)) && cnt<30){
        const s=Math.max(0,m.index-60), e=Math.min(text.length,m.index+m[0].length+60);
        results.push({chapter:i, snippet:text.slice(s,e).replace(/\s+/g,' ').trim()});
        cnt++;
      }
    });
    if (!results.length){ box.innerHTML='<div class="item">Ничего не найдено</div>'; return; }
    results.slice(0,120).forEach(r=>{
      const start = (State.chapterStarts[r.chapter]||0)+1;
      const el=document.createElement('div'); el.className='item';
      const safe = r.snippet.replace(new RegExp(q,'gi'), m=>`<mark>${m}</mark>`);
      el.innerHTML=`<div class="cap">Глава ${r.chapter+1} • стр. ${fmt(start)}</div><div>${safe}</div>`;
      el.addEventListener('click',()=>{ $('#modal-search').close(); goTo(start-1); });
      box.appendChild(el);
    });
  }

  async function reflow(){
    // rebuild pagination preserving approximate reading position
    const oldRatio = State.totalPages>1 ? State.pageIndex/(State.totalPages-1) : 0;
    await paginateRender();
    const target = Math.round(oldRatio*(State.totalPages-1));
    goTo(target,false);
  }

  async function paginateRender(){
    $('#loading .loading__hint').textContent = 'Вёрстка страниц…';
    splitToPages();
    renderPager();
    buildTOC();
  }

  async function start(){
    Settings.load();
    $('#loading .loading__hint').textContent='Загрузка глав…';
    await loadBook();
    Progress.load();
    await paginateRender();
    State.loading.classList.add('hidden');
    // show topbar shortly then hide for immersion
    toggleTopbar(true); setTimeout(()=>toggleTopbar(false), 900);
  }

  start();
})();
