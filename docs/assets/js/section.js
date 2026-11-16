/* صفحات الأقسام: المسابقات، الإنجازات، المشاركات، الفعاليات، المعرض، لوحة الشرف، الأخبار، البحث */
document.addEventListener('DOMContentLoaded', () => {
  const I = window.Ibdaa;
  const { $, $$, esc, icon, fmtDate } = I;
  const page = document.body.dataset.page;
  const root = $('#page-root');
  const PAGE_SIZE = 12;

  const CONFIG = {
    competitions: { type: 'competition', chips: { key: 'status', label: 'حالة المسابقة', options: [['', 'الكل'], ['open', 'مفتوحة'], ['upcoming', 'قادمة'], ['closed', 'منتهية']] }, placeholder: 'ابحثي باسم المسابقة أو الفائزة…' },
    achievements: { type: 'achievement', chips: { key: 'level', label: 'مستوى الإنجاز', options: [['', 'كل المستويات'], ['محلي', 'محلي'], ['وطني', 'وطني'], ['دولي', 'دولي']] }, placeholder: 'ابحثي باسم الإنجاز أو الطالبة…' },
    participations: { type: 'participation', chips: { key: 'level', label: 'نوع المشاركة', options: [['', 'الكل'], ['مدرسية', 'مدرسية'], ['خارجية', 'خارجية']] }, placeholder: 'ابحثي في المشاركات…' },
    news: { type: 'news', placeholder: 'ابحثي في الأخبار والإعلانات…' },
    events: { type: 'event', chips: { key: 'status', label: 'حالة الفعالية', options: [['', 'الكل'], ['upcoming', 'قادمة'], ['open', 'جارية'], ['closed', 'منتهية']] }, placeholder: 'ابحثي في الفعاليات…' },
    gallery: { type: 'gallery', placeholder: 'ابحثي في معرض الإبداع…' },
  };

  if (page === 'honor') return honorPage();
  if (page === 'search') return searchPage();
  const cfg = CONFIG[page];
  if (!cfg) return;

  const params = new URLSearchParams(location.search);
  const state = { q: params.get('q') || '', year: params.get('year') || '', category: params.get('category') || '', status: '', level: '', offset: 0 };
  if (cfg.chips) state[cfg.chips.key] = params.get(cfg.chips.key) || '';

  root.innerHTML = `
    ${page === 'events' ? '<div class="cal-wrap" id="cal-wrap"></div><div class="section-head" style="margin-bottom:0"><h2>' + I.STAR + 'كل الفعاليات</h2></div>' : ''}
    <form class="toolbar" id="filters" role="search">
      <label class="search"><span class="sr-only">بحث</span>${icon('search')}<input class="input" type="search" name="q" placeholder="${cfg.placeholder}" value="${esc(state.q)}"></label>
      <select class="input" name="year" aria-label="السنة"><option value="">كل السنوات</option></select>
      <select class="input" name="category" aria-label="التصنيف"><option value="">كل التصنيفات</option></select>
    </form>
    ${cfg.chips ? `<div class="chips" role="group" aria-label="${cfg.chips.label}">${cfg.chips.options.map(([v, l]) => `<button type="button" class="chip" data-chip="${v}" aria-pressed="${state[cfg.chips.key] === v}">${l}</button>`).join('')}</div>` : ''}
    <div class="result-count" id="count" aria-live="polite"></div>
    <div id="results" class="${page === 'gallery' ? 'masonry' : 'grid'}"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>
    <div class="load-more"><button class="btn btn-ghost" id="more" hidden>عرض المزيد</button></div>`;
  if (page === 'events' && root.querySelector('#filters')) root.querySelector('#filters').style.margin = '18px 0 24px';

  const form = $('#filters');
  const yearSel = form.elements.year;
  let catSel = form.elements.category;
  let debounce, seq = 0, galleryMedia = [];

  form.addEventListener('submit', (e) => e.preventDefault());
  form.q.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { state.q = form.q.value.trim(); reload(); }, 300); });
  yearSel.addEventListener('change', () => { state.year = yearSel.value; reload(); });
  catSel.addEventListener('change', () => { state.category = catSel.value; reload(); });
  $$('[data-chip]').forEach((c) => c.addEventListener('click', () => {
    state[cfg.chips.key] = c.dataset.chip;
    $$('[data-chip]').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    reload();
  }));
  $('#more').addEventListener('click', () => { state.offset += PAGE_SIZE; load(true); });

  function syncUrl() {
    const u = new URL(location.href);
    ['q', 'year', 'category', 'status', 'level'].forEach((k) => { if (state[k]) u.searchParams.set(k, state[k]); else u.searchParams.delete(k); });
    history.replaceState(null, '', u);
  }
  function reload() { state.offset = 0; syncUrl(); load(false); }

  async function load(append) {
    const my = ++seq;
    const qs = new URLSearchParams({ type: cfg.type, limit: page === 'gallery' ? 60 : PAGE_SIZE, offset: state.offset });
    ['q', 'year', 'category', 'status', 'level'].forEach((k) => state[k] && qs.set(k, state[k]));
    if (page === 'events') qs.set('sort', 'date_asc');
    let data;
    try { data = await I.api('/items?' + qs); }
    catch (e) { $('#results').innerHTML = I.emptyState('تعذّر تحميل المحتوى', e.message); return; }
    if (my !== seq) return;
    I.remember(data.items);
    fillSelect(yearSel, data.years, state.year, 'كل السنوات');
    if (catSel) fillSelect(catSel, data.categories, state.category, 'كل التصنيفات');
    const filtered = state.q || state.year || state.category || state.status || state.level;
    $('#count').textContent = data.total ? `${data.total} ${data.total === 1 ? 'نتيجة' : data.total === 2 ? 'نتيجتان' : data.total <= 10 ? 'نتائج' : 'نتيجة'}` : '';
    const results = $('#results');
    if (page === 'gallery') return renderGallery(data, append);
    const html = data.items.map(I.card).join('');
    if (!data.items.length && !append) {
      results.innerHTML = `<div style="grid-column:1/-1">${filtered ? I.emptyState('لا توجد نتائج مطابقة', 'جرّبي كلمة بحث أخرى أو غيّري التصفية.') : I.emptyState()}</div>`;
    } else if (append) results.insertAdjacentHTML('beforeend', html);
    else results.innerHTML = html;
    $('#more').hidden = state.offset + data.items.length >= data.total;
  }

  function fillSelect(sel, values, current, allLabel) {
    const vals = [...new Set([...(values || []), ...(current ? [current] : [])])];
    sel.innerHTML = `<option value="">${allLabel}</option>` + vals.map((v) => `<option ${v === current ? 'selected' : ''}>${esc(v)}</option>`).join('');
  }

  // ---------- المعرض ----------
  function renderGallery(data, append) {
    const results = $('#results');
    if (!append) galleryMedia = [];
    const tiles = [];
    for (const item of data.items) {
      for (const m of item.media) {
        const idx = galleryMedia.length;
        galleryMedia.push({ ...m, caption: m.caption && !/^صورة تجريبية$/.test(m.caption) ? m.caption : item.title });
        let inner;
        if (m.kind === 'image') inner = `<img src="${esc(m.url)}" alt="${esc(m.caption || item.title)}" loading="lazy" decoding="async">`;
        else if (m.kind === 'video') inner = `<video src="${esc(m.url)}#t=0.5" preload="metadata" muted playsinline style="width:100%"></video><span class="play">${icon('play')}</span>`;
        else inner = `<span class="pdf-tile">${icon('file-text')}<span>${esc(m.caption || 'ملف PDF')}</span></span>`;
        tiles.push(`<button class="tile" type="button" data-g="${idx}" aria-label="تكبير: ${esc(item.title)}">${inner}
          ${item.is_demo ? `<span class="demo-tag">${I.demoBadge(item)}</span>` : ''}
          <span class="cap"><b>${esc(item.title)}</b><small>${esc(item.category || '')}${item.people ? ' — ' + esc(item.people) : ''}</small></span></button>`);
      }
    }
    if (!tiles.length && !append) {
      results.className = '';
      results.innerHTML = state.q || state.year || state.category ? I.emptyState('لا توجد أعمال مطابقة', 'جرّبي تصنيفاً آخر.') : I.emptyState('المعرض فارغ حالياً', 'ستُعرض صور وأعمال الطالبات هنا فور رفعها.');
    } else {
      results.className = 'masonry';
      if (append) results.insertAdjacentHTML('beforeend', tiles.join('')); else results.innerHTML = tiles.join('');
    }
    $('#count').textContent = galleryMedia.length ? `${galleryMedia.length} عمل في ${data.total} ألبوم` : '';
    $('#more').hidden = state.offset + data.items.length >= data.total;
  }
  $('#results').addEventListener('click', (e) => {
    const t = e.target.closest('[data-g]');
    if (t) I.openLightbox(galleryMedia, +t.dataset.g);
  });
  if (page === 'gallery') { // تبويبات تصنيف المعرض الأساسية
    const cats = ['صور', 'فيديوهات', 'أعمال الطالبات', 'تصاميم فنية', 'مشاريع وابتكارات'];
    form.insertAdjacentHTML('afterend', `<div class="chips" role="group" aria-label="تصنيف المعرض">${['', ...cats].map((c) => `<button type="button" class="chip" data-gcat="${c}" aria-pressed="${state.category === c}">${c || 'كل الأعمال'}</button>`).join('')}</div>`);
    catSel.remove();
    catSel = null;
    $$('[data-gcat]').forEach((c) => c.addEventListener('click', () => {
      state.category = c.dataset.gcat;
      $$('[data-gcat]').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      reload();
    }));
  }

  // ---------- تقويم الفعاليات ----------
  if (page === 'events') initCalendar();
  async function initCalendar() {
    let events = [];
    try { events = (await I.api('/items?type=event&limit=200&sort=date_asc')).items; } catch { /* تجاهل */ }
    I.remember(events);
    const byDay = {};
    for (const e of events) {
      if (!e.date) continue;
      const start = new Date(e.date + 'T12:00:00');
      const end = new Date((e.end_date || e.date) + 'T12:00:00');
      for (let d = new Date(start), n = 0; d <= end && n < 60; d.setDate(d.getDate() + 1), n++) {
        const k = d.toISOString().slice(0, 10);
        (byDay[k] = byDay[k] || []).push(e);
      }
    }
    const todayKey = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
    const now = new Date(todayKey + 'T12:00:00');
    let view = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    let selected = todayKey;
    const wrap = $('#cal-wrap');
    const DOW = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    function render() {
      const y = view.getFullYear(), m = view.getMonth();
      const first = new Date(y, m, 1, 12);
      const startOffset = first.getDay();
      const days = [];
      for (let i = 0; i < 42; i++) days.push(new Date(y, m, 1 - startOffset + i, 12));
      const trimmed = days.slice(0, days[35].getMonth() !== m ? 35 : 42);
      const hijri = (() => { try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { month: 'long', year: 'numeric' }).format(new Date(y, m, 15)); } catch { return ''; } })();
      const selEvents = byDay[selected] || [];
      const upcoming = events.filter((e) => (e.end_date || e.date) >= todayKey).slice(0, 4);
      wrap.innerHTML = `<div class="calendar">
          <div class="cal-head">
            <button class="cal-nav" data-nav="-1" aria-label="الشهر السابق">${icon('chevron-right')}</button>
            <h3 aria-live="polite">${fmtDate(key(first), { month: 'long', year: 'numeric' })}<small>${hijri}</small></h3>
            <button class="cal-nav" data-nav="1" aria-label="الشهر التالي">${icon('chevron-left')}</button>
          </div>
          <div class="cal-grid">${DOW.map((d) => `<div class="dow" title="${d}">${d.replace('ال', '').slice(0, 3)}</div>`).join('')}
          ${trimmed.map((d) => {
            const k = key(d), evs = byDay[k] || [];
            const cls = ['cal-day', d.getMonth() !== m && 'out', k === todayKey && 'today', evs.length && 'has', k === selected && 'sel'].filter(Boolean).join(' ');
            return `<button type="button" class="${cls}" data-day="${k}" ${evs.length ? '' : 'tabindex="-1"'} aria-label="${fmtDate(k)}${evs.length ? '، ' + evs.length + ' فعالية' : ''}">${d.getDate()}${evs.length ? `<span class="dots">${evs.slice(0, 3).map(() => '<i></i>').join('')}</span>` : ''}</button>`;
          }).join('')}</div>
          <div style="display:flex;justify-content:center;margin-top:12px"><button class="btn btn-ghost btn-sm" data-today>اليوم</button></div>
        </div>
        <div class="cal-side">
          <h3>${selEvents.length ? 'فعاليات ' + fmtDate(selected, { day: 'numeric', month: 'long' }) : 'الفعاليات القادمة'}</h3>
          <div class="event-list">${(selEvents.length ? selEvents : upcoming).map(evRow).join('') || '<p style="color:var(--ink-3)">لا توجد فعاليات قادمة مجدولة حالياً.</p>'}</div>
        </div>`;
      $$('[data-nav]', wrap).forEach((b) => b.onclick = () => { view = new Date(y, m + +b.dataset.nav, 1, 12); render(); });
      $('[data-today]', wrap).onclick = () => { view = new Date(now.getFullYear(), now.getMonth(), 1, 12); selected = todayKey; render(); };
      $$('.cal-day.has', wrap).forEach((b) => b.onclick = () => { selected = b.dataset.day; render(); $(`[data-day="${selected}"]`, wrap)?.focus(); });
    }
    function evRow(e) {
      const d = new Date(e.date + 'T12:00:00');
      return `<button class="event-row" type="button" data-open="${e.id}"><span class="date-chip"><b>${d.getDate()}</b><small>${fmtDate(e.date, { month: 'long' })}</small></span>
        <span style="display:grid;gap:2px"><span style="display:flex;gap:6px">${I.demoBadge(e)}${I.statusBadge(e)}</span><h3>${esc(e.title)}</h3>
        <span class="meta">${e.time ? `<span>${icon('clock')}${I.fmtTime(e.time)}</span>` : ''}${e.location ? `<span>${icon('map-pin')}${esc(e.location)}</span>` : ''}</span></span></button>`;
    }
    render();
  }

  load(false);

  // ---------- لوحة الشرف ----------
  async function honorPage() {
    root.innerHTML = '<div style="height:40px"></div><div class="podium" id="podium"></div><div class="chips" id="dchips"></div><div class="honor-list" id="hlist"><div class="skeleton" style="min-height:90px"></div></div>';
    let items = [];
    try { items = (await I.api('/items?type=honor&limit=200&sort=rank')).items; }
    catch (e) { $('#hlist').innerHTML = I.emptyState('تعذّر التحميل', e.message); return; }
    I.remember(items);
    if (!items.length) { $('#podium').remove(); $('#hlist').innerHTML = I.emptyState('لوحة الشرف بانتظار المتميزات', 'ستظهر أسماء الطالبات المكرّمات هنا فور إضافتهن.'); return; }
    const ranked = items.filter((i) => i.rank).sort((a, b) => a.rank - b.rank);
    const top = ranked.slice(0, 3);
    const ava = (h) => (h.cover ? `<img src="${esc(h.cover)}" alt="">` : icon('graduation-cap'));
    if (top.length) {
      const order = [top[1], top[0], top[2]].filter(Boolean);
      const cls = (h) => (h === top[0] ? 'first' : h === top[1] ? 'second' : 'third');
      $('#podium').innerHTML = order.map((h) => `<button class="p ${cls(h)}" type="button" data-open="${h.id}">
        <span class="ava">${ava(h)}</span>
        <span class="step" style="display:block"><span class="rank">${h.rank}</span>${h.is_demo ? `<div style="margin-top:6px">${I.demoBadge(h)}</div>` : ''}<h3>${esc(h.title)}</h3><p>${esc(h.distinction)}</p></span></button>`).join('');
    } else $('#podium').remove();
    const rest = items.filter((i) => !top.includes(i));
    const distinctions = [...new Set(items.map((i) => i.distinction).filter(Boolean))];
    const draw = (filter) => {
      const list = filter ? items.filter((i) => i.distinction === filter) : rest;
      $('#hlist').innerHTML = list.map((h) => `<button class="honor-row" type="button" data-open="${h.id}">
        <span class="rk">${h.rank ?? '—'}</span><span class="av">${ava(h)}</span>
        <span><b style="font-family:var(--display);font-size:19px">${esc(h.title)}</b> ${I.demoBadge(h)}<br><small style="color:var(--ink-3)">${esc(h.summary)}</small></span>
        <span class="badge gold">${esc(h.distinction || 'تميّز')}</span></button>`).join('') || (filter ? I.emptyState('لا توجد أسماء في هذا التصنيف') : '');
    };
    if (distinctions.length > 1) {
      $('#dchips').innerHTML = ['', ...distinctions].map((d) => `<button type="button" class="chip" data-d="${esc(d)}" aria-pressed="${d === ''}">${d ? esc(d) : 'بقية المتميزات'}</button>`).join('');
      $$('[data-d]').forEach((c) => c.onclick = () => { $$('[data-d]').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); draw(c.dataset.d); });
    }
    draw('');
  }

  // ---------- البحث الشامل ----------
  async function searchPage() {
    const q = new URLSearchParams(location.search).get('q') || '';
    root.innerHTML = `<form class="toolbar" action="search.html" role="search"><label class="search"><span class="sr-only">بحث</span>${icon('search')}<input class="input" type="search" name="q" value="${esc(q)}" placeholder="اكتبي كلمة البحث…" required></label><button class="btn btn-primary">بحث</button></form><div id="sres"></div>`;
    if (!q.trim()) { $('#sres').innerHTML = I.emptyState('ابدئي البحث', 'اكتبي اسم مسابقة أو إنجاز أو طالبة.'); return; }
    let data;
    try { data = await I.api('/items?limit=100&q=' + encodeURIComponent(q)); }
    catch (e) { $('#sres').innerHTML = I.emptyState('تعذّر البحث', e.message); return; }
    I.remember(data.items);
    if (!data.items.length) { $('#sres').innerHTML = I.emptyState(`لا توجد نتائج لـ «${q}»`, 'جرّبي كلمة أقصر أو اسماً آخر.'); return; }
    const groups = {};
    data.items.forEach((i) => (groups[i.type] = groups[i.type] || []).push(i));
    $('#sres').innerHTML = `<p class="result-count">${data.total} نتيجة لـ «${esc(q)}»</p>` + Object.keys(I.TYPES).filter((t) => groups[t]).map((t) => `
      <section style="margin-bottom:40px"><div class="section-head" style="margin-bottom:16px"><h2 style="font-size:24px">${I.STAR}${I.TYPES[t].label} <span class="badge muted">${groups[t].length}</span></h2>
      <a class="link-more" href="${I.TYPES[t].page}?q=${encodeURIComponent(q)}">عرض في القسم</a></div>
      <div class="grid">${groups[t].map(I.card).join('')}</div></section>`).join('');
  }
});
