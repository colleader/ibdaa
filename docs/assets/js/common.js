/* منصة إبداع الوزية — سكربت مشترك لكل الصفحات العامة */
(() => {
  'use strict';

  // ---------- أدوات مساعدة ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="assets/icons.svg#i-${name}"></use></svg>`;
  const STAR = `<svg viewBox="0 0 100 100" class="star" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"><rect x="22" y="22" width="56" height="56"/><rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)"/></g></svg>`;

  const TYPES = {
    competition: { label: 'المسابقات', one: 'مسابقة', page: 'competitions.html', icon: 'trophy' },
    achievement: { label: 'الإنجازات', one: 'إنجاز', page: 'achievements.html', icon: 'award' },
    participation: { label: 'المشاركات', one: 'مشاركة', page: 'participations.html', icon: 'users' },
    event: { label: 'الفعاليات والأنشطة', one: 'فعالية', page: 'events.html', icon: 'calendar-days' },
    gallery: { label: 'معرض الإبداع', one: 'عمل إبداعي', page: 'gallery.html', icon: 'image' },
    honor: { label: 'لوحة الشرف', one: 'طالبة متميزة', page: 'honor.html', icon: 'crown' },
    news: { label: 'الأخبار والإعلانات', one: 'خبر', page: 'news.html', icon: 'newspaper' },
  };
  const STATUS = {
    open: { label: 'مفتوحة', cls: 'ok' },
    upcoming: { label: 'قادمة', cls: 'warn' },
    closed: { label: 'منتهية', cls: 'muted' },
  };
  const EVENT_STATUS = { open: 'جارية', upcoming: 'قادمة', closed: 'منتهية' };

  const fmtDate = (s, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => {
    if (!s) return '';
    const d = new Date(s.length <= 10 ? s + 'T12:00:00' : s.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', opts).format(d);
  };
  const fmtHijri = (s) => {
    if (!s) return '';
    const d = new Date(s + 'T12:00:00');
    try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch { return ''; }
  };
  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h)) return t;
    const suffix = h < 12 ? 'ص' : 'م';
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${suffix}`;
  };

  const api = (path, opts) => window.IbdaaData.api(path, opts);

  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* تجاهل */ } },
  };

  function toast(msg, type = 'ok') {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'err' ? ' err' : '');
    t.innerHTML = icon(type === 'err' ? 'circle-alert' : type === 'bell' ? 'bell' : 'circle-check') + `<span>${esc(msg)}</span>`;
    box.append(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, type === 'bell' ? 6000 : 3500);
  }

  // ---------- الوضع الليلي ----------
  const savedTheme = store.get('theme');
  const prefersDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = savedTheme || (prefersDark ? 'dark' : 'light');

  // ---------- الرأس ----------
  const NAV = [
    ['index.html', 'الرئيسية'], ['competitions.html', 'المسابقات'], ['achievements.html', 'الإنجازات'], ['participations.html', 'المشاركات'],
    ['events.html', 'الفعاليات'], ['gallery.html', 'معرض الإبداع'], ['honor.html', 'لوحة الشرف'], ['news.html', 'الأخبار'], ['contact.html', 'تواصل معنا'],
  ];
  const here = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');

  const BRAND_MARK = `<svg class="brand-mark" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"><rect x="20" y="20" width="60" height="60" rx="3"/><rect x="20" y="20" width="60" height="60" rx="3" transform="rotate(45 50 50)"/></g><circle cx="50" cy="50" r="11" fill="currentColor"/></svg>`;

  function renderHeader(settings) {
    const el = $('#site-header');
    if (!el) return;
    let pre = '';
    if (settings.announcement_bar) pre += `<div class="announce-bar">${esc(settings.announcement_bar)}</div>`;
    if (settings.demo_count > 0) pre += `<div class="demo-bar">${icon('circle-alert')} تعرض المنصة حالياً بيانات تجريبية للتوضيح فقط، وليست إنجازات حقيقية. تُحذف من لوحة التحكم.</div>`;
    el.outerHTML = `${pre}<header class="site-header" id="top">
      <div class="container bar">
        <a class="brand" href="./" aria-label="${esc(settings.platform_name)} — الصفحة الرئيسية">${BRAND_MARK}
          <span class="brand-text"><b>إبداع الوزية</b><small>النشاط الطلابي في ${esc(settings.school_name)}</small></span></a>
        <nav class="main-nav" id="main-nav" aria-label="القائمة الرئيسية">
          ${NAV.map(([href, label]) => `<a href="${href}"${href.replace(/\.html$/, '') === here ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
        </nav>
        <div class="header-tools">
          <div class="tool-wrap">
            <button class="icon-btn" id="search-btn" aria-label="بحث" aria-expanded="false">${icon('search')}</button>
            <div class="popover" id="search-pop">
              <form class="search-form" action="search.html" role="search">
                <input class="input" type="search" name="q" placeholder="ابحثي عن مسابقة، إنجاز، طالبة…" aria-label="كلمة البحث" required>
                <button class="btn btn-primary btn-sm" type="submit">بحث</button>
              </form>
            </div>
          </div>
          <div class="tool-wrap">
            <button class="icon-btn" id="bell-btn" aria-label="الإشعارات" aria-expanded="false">${icon('bell')}<span class="dot" hidden></span></button>
            <div class="popover" id="bell-pop"><div class="popover-head"><span>الإعلانات الجديدة</span><a class="link-more" href="news.html">الكل</a></div><ul class="notif-list"><li style="padding:12px;color:var(--ink-3)">جارٍ التحميل…</li></ul></div>
          </div>
          <button class="icon-btn theme-toggle" id="theme-btn" aria-label="تبديل الوضع الليلي والنهاري">${icon('moon', 'icon moon')}${icon('sun', 'icon sun')}</button>
          <button class="icon-btn menu-btn" id="menu-btn" aria-label="القائمة" aria-expanded="false" aria-controls="main-nav">${icon('menu')}</button>
        </div>
      </div>
    </header>`;

    const closeAll = (except) => {
      $$('.popover.open').forEach((p) => { if (p !== except) { p.classList.remove('open'); p.previousElementSibling?.setAttribute('aria-expanded', 'false'); } });
    };
    const togglePop = (btn, pop, onOpen) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !pop.classList.contains('open');
        closeAll(pop);
        pop.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (open && onOpen) onOpen();
      });
      pop.addEventListener('click', (e) => e.stopPropagation());
    };
    togglePop($('#search-btn'), $('#search-pop'), () => $('#search-pop input').focus());
    togglePop($('#bell-btn'), $('#bell-pop'), markSeen);
    document.addEventListener('click', () => closeAll());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeAll(); closeMenu(); } });

    $('#theme-btn').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      store.set('theme', next);
    });
    const nav = $('#main-nav'), menuBtn = $('#menu-btn');
    function closeMenu() { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.innerHTML = icon('menu'); document.body.style.overflow = ''; }
    menuBtn.addEventListener('click', () => {
      const open = !nav.classList.contains('open');
      if (!open) return closeMenu();
      nav.style.top = $('.site-header').getBoundingClientRect().bottom + 'px'; nav.classList.add('open'); menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.innerHTML = icon('x'); document.body.style.overflow = 'hidden';
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  }

  // ---------- الإشعارات ----------
  let announcements = [];
  function markSeen() {
    if (!announcements.length) return;
    store.set('seen_news', Math.max(...announcements.map((a) => a.id)));
    const dot = $('#bell-btn .dot'); if (dot) dot.hidden = true;
  }
  async function loadAnnouncements() {
    try {
      const { items } = await api('/announcements');
      announcements = items;
      const seen = store.get('seen_news', 0);
      const fresh = items.filter((a) => a.id > seen);
      const list = $('#bell-pop .notif-list');
      list.innerHTML = items.length ? items.map((a) => `<li><a href="news.html?id=${a.id}" class="${a.id > seen ? 'new' : ''}">
        <b>${esc(a.title)}</b><small>${fmtDate(a.date || a.created_at)}</small></a></li>`).join('')
        : '<li style="padding:12px;color:var(--ink-3)">لا توجد إعلانات حالياً</li>';
      const dot = $('#bell-btn .dot');
      if (fresh.length) {
        dot.hidden = false; dot.textContent = fresh.length > 9 ? '9+' : fresh.length;
        const lastToast = store.get('toasted_news', 0);
        if (fresh[0].id > lastToast) {
          store.set('toasted_news', fresh[0].id);
          setTimeout(() => toast('إعلان جديد: ' + fresh[0].title, 'bell'), 1200);
        }
      }
    } catch { /* تجاهل */ }
  }

  // ---------- التذييل ----------
  function renderFooter(s) {
    const el = $('#site-footer');
    if (!el) return;
    el.outerHTML = `<footer class="site-footer">
      <div class="footer-quote"><div class="container"><blockquote>${esc(s.footer_quote)}</blockquote></div></div>
      <div class="container footer-main">
        <div>
          <div class="brand">${BRAND_MARK}<span class="brand-text"><b>${esc(s.platform_name)}</b><small>${esc(s.school_name)}</small></span></div>
          <div class="footer-staff">
            <span>مسؤولة النشاط الطلابي: <b>${esc(s.activity_lead)}</b></span>
            <span>مديرة المدرسة: <b>${esc(s.principal)}</b></span>
          </div>
        </div>
        <div><h4>أقسام المنصة</h4><ul>${NAV.slice(1, 5).map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
        <div><h4>روابط</h4><ul>${NAV.slice(5).map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}<li><a href="admin.html">دخول الإدارة</a></li></ul></div>
      </div>
      <div class="container footer-bottom"><span>© ${new Date().getFullYear()} ${esc(s.platform_name)} — ${esc(s.school_name)}</span><span>جميع الحقوق محفوظة</span></div>
    </footer>
    <button class="to-top" id="to-top" aria-label="العودة إلى الأعلى">${icon('chevron-up')}</button>`;
    const btn = $('#to-top');
    const onScroll = () => btn.classList.toggle('show', scrollY > 600);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    btn.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ---------- البطاقات ----------
  function statusBadge(item) {
    if (item.type === 'competition' && item.computed_status) {
      const s = STATUS[item.computed_status];
      return `<span class="badge ${s.cls}">${s.label}</span>`;
    }
    if (item.type === 'event' && item.computed_status) {
      const s = STATUS[item.computed_status];
      return `<span class="badge ${s.cls}">${EVENT_STATUS[item.computed_status]}</span>`;
    }
    return '';
  }
  const demoBadge = (item) => (item.is_demo ? `<span class="badge demo">${icon('circle-alert')} تجريبي</span>` : '');

  function mediaBox(item, extra = '') {
    const img = item.cover
      ? `<img src="${esc(item.cover)}" alt="" loading="lazy" decoding="async">`
      : `<div class="placeholder">${icon(TYPES[item.type]?.icon || 'sparkles')}</div>`;
    return `<div class="card-media">${img}<div class="card-flags">${demoBadge(item)}${statusBadge(item)}${extra}</div></div>`;
  }

  function card(item) {
    const t = TYPES[item.type] || {};
    const metas = [];
    const date = item.date ? fmtDate(item.date) : '';
    if (date) metas.push(`<span>${icon('calendar-days')}${date}${item.end_date && item.end_date !== item.date ? ' – ' + fmtDate(item.end_date) : ''}</span>`);
    if (item.people) metas.push(`<span>${icon(item.type === 'achievement' ? 'graduation-cap' : 'users')}${esc(item.people)}</span>`);
    if (item.location) metas.push(`<span>${icon('map-pin')}${esc(item.location)}</span>`);
    const tags = [];
    if (item.category) tags.push(`<span class="badge">${esc(item.category)}</span>`);
    if (item.level) tags.push(`<span class="badge gold">${esc(item.level)}</span>`);
    if (item.media_count > 1) tags.push(`<span class="badge muted">${icon('image')} ${item.media_count}</span>`);
    return `<button class="card" type="button" data-open="${item.id}" aria-label="عرض تفاصيل ${esc(t.one || '')}: ${esc(item.title)}">
      ${mediaBox(item)}
      <div class="card-body">
        <h3>${esc(item.title)}</h3>
        ${item.summary ? `<p>${esc(item.summary)}</p>` : ''}
        ${metas.length ? `<div class="meta">${metas.join('')}</div>` : ''}
        ${tags.length ? `<div class="card-foot">${tags.join('')}</div>` : ''}
      </div>
    </button>`;
  }

  function emptyState(title = 'لا يوجد محتوى بعد', text = 'سيظهر هنا فور نشره من لوحة التحكم.') {
    return `<div class="empty">${STAR.replace('class="star"', 'class="star" style="width:54px;height:54px;color:var(--gold);margin:0 auto 12px;display:block"')}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
  }

  // ---------- النافذة المنبثقة للتفاصيل ----------
  let modalEl, lastFocus;
  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.innerHTML = '<div class="modal-box" tabindex="-1"></div>';
    document.body.append(modalEl);
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (!modalEl.classList.contains('open') || lightboxOpen()) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') { // حصر التنقل داخل النافذة
        const f = $$('a[href], button:not([disabled]), input, video, [tabindex]:not([tabindex="-1"])', modalEl);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
      }
    });
    return modalEl;
  }
  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
    $$('video', modalEl).forEach((v) => v.pause());
    const u = new URL(location.href);
    if (u.searchParams.has('id')) { u.searchParams.delete('id'); history.replaceState(null, '', u.pathname + u.search); }
    lastFocus?.focus?.();
  }

  function shareUrl(item) { return new URL((TYPES[item.type]?.page || 'index.html') + '?id=' + item.id, location.href).href; }

  function detailHTML(item) {
    const t = TYPES[item.type] || {};
    const info = [];
    const add = (label, val) => { if (val) info.push(`<div class="info"><small>${label}</small><b>${val}</b></div>`); };
    if (item.date) {
      const range = item.end_date && item.end_date !== item.date ? `${fmtDate(item.date)} – ${fmtDate(item.end_date)}` : fmtDate(item.date);
      add(item.type === 'competition' ? 'تاريخ المسابقة' : 'التاريخ', range + `<br><small style="color:var(--ink-3);font-weight:400">${fmtHijri(item.date)}</small>`);
    }
    if (item.time) add('الوقت', fmtTime(item.time));
    if (item.location) add('المكان', esc(item.location));
    if (item.type === 'honor') { add('نوع التميّز', esc(item.distinction)); if (item.rank) add('الترتيب', 'المركز ' + item.rank); }
    if (item.people) add(item.type === 'achievement' ? 'الطالبة / الفريق' : 'المشاركات', esc(item.people));
    if (item.level) add(item.type === 'achievement' ? 'مستوى الإنجاز' : 'نطاق المشاركة', esc(item.level));
    if (item.category) add('التصنيف', esc(item.category));
    if (item.result) add('النتيجة', esc(item.result));

    const conditions = (item.conditions || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const images = item.media.filter((m) => m.kind === 'image');
    const cover = item.cover ? `<div class="modal-cover"><img src="${esc(item.cover)}" alt="${esc(item.title)}" data-lb="${images.findIndex((m) => m.url === item.cover)}"></div>` : '<div style="height:64px"></div>';

    return `<button class="modal-close" data-close aria-label="إغلاق">${icon('x')}</button>
      ${cover}
      <div class="modal-content">
        <div style="display:flex;gap:6px;flex-wrap:wrap">${demoBadge(item)}${statusBadge(item)}<span class="badge muted">${icon(t.icon)} ${t.one}</span></div>
        <h2 id="modal-title">${esc(item.title)}</h2>
        ${item.summary ? `<p style="font-size:18px">${esc(item.summary)}</p>` : ''}
        ${info.length ? `<div class="info-grid">${info.join('')}</div>` : ''}
        ${item.body ? `<div class="body">${esc(item.body)}</div>` : ''}
        ${conditions.length ? `<div class="block"><h4>${icon('list-checks')} شروط المشاركة</h4><ul class="conditions">${conditions.map((c) => `<li>${icon('check')}<span>${esc(c)}</span></li>`).join('')}</ul></div>` : ''}
        ${item.winners?.length ? `<div class="block"><h4>${icon('medal')} الفائزات والمراكز</h4><div class="winners">${item.winners.map((w) => `<div class="winner"><span class="medal">${icon('medal')}</span><div><b>${esc(w.name)}</b><br><small style="color:var(--ink-3)">${esc(w.rank)}</small></div></div>`).join('')}</div></div>` : ''}
        ${item.media.length ? `<div class="block"><h4>${icon('image')} الصور والمرفقات (${item.media.length})</h4><div class="thumbs">${item.media.map((m, i) => thumbHTML(m, i)).join('')}</div></div>` : ''}
        <div class="share-row"><span>مشاركة:</span>
          <button class="btn btn-ghost btn-sm" data-share="native">${icon('share-2')} مشاركة</button>
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(item.title + '\n' + shareUrl(item))}">واتساب</a>
          <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(shareUrl(item))}">إكس</a>
          <button class="btn btn-ghost btn-sm" data-share="copy">${icon('copy')} نسخ الرابط</button>
        </div>
      </div>`;
  }

  function thumbHTML(m, i) {
    const cap = esc(m.caption || '');
    if (m.kind === 'image') return `<button type="button" data-media="${i}" aria-label="تكبير الصورة ${cap}"><img src="${esc(m.url)}" alt="${cap}" loading="lazy"></button>`;
    if (m.kind === 'video') return `<button type="button" data-media="${i}" aria-label="تشغيل الفيديو ${cap}"><video src="${esc(m.url)}#t=0.5" preload="metadata" muted></video><span class="kind">${icon('play')}</span></button>`;
    return `<button type="button" data-media="${i}" aria-label="فتح الملف ${cap}"><span class="file">${icon('file-text')}<span>${cap || 'ملف PDF'}</span></span></button>`;
  }

  async function openItem(id, preloaded) {
    ensureModal();
    lastFocus = document.activeElement;
    const box = $('.modal-box', modalEl);
    box.innerHTML = '<div style="padding:80px;text-align:center;color:var(--ink-3)">جارٍ التحميل…</div>';
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    let item;
    try { item = preloaded?.media && preloaded.media.length === preloaded.media_count ? preloaded : await api('/items/' + id); }
    catch (e) { box.innerHTML = `<button class="modal-close" data-close aria-label="إغلاق">${icon('x')}</button><div style="padding:60px">${emptyState('المحتوى غير متاح', e.message)}</div>`; $('[data-close]', box).onclick = closeModal; return; }
    box.innerHTML = detailHTML(item);
    modalEl.setAttribute('aria-labelledby', 'modal-title');
    box.scrollTop = 0; box.focus();
    const u = new URL(location.href);
    if (u.searchParams.get('id') !== String(item.id)) { u.searchParams.set('id', item.id); history.replaceState(null, '', u); }
    $('[data-close]', box).onclick = closeModal;
    $$('[data-media]', box).forEach((b) => b.addEventListener('click', () => openLightbox(item.media, +b.dataset.media)));
    $('[data-lb]', box)?.addEventListener('click', (e) => { const i = item.media.findIndex((m) => m.url === item.cover); openLightbox(item.media, Math.max(0, i)); e.stopPropagation(); });
    $('[data-share="copy"]', box).onclick = () => copyLink(shareUrl(item));
    const nativeBtn = $('[data-share="native"]', box);
    if (navigator.share) nativeBtn.onclick = () => navigator.share({ title: item.title, text: item.summary || item.title, url: shareUrl(item) }).catch(() => {});
    else nativeBtn.remove();
  }

  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); toast('تم نسخ الرابط'); }
    catch { prompt('انسخي الرابط:', url); }
  }

  // ---------- عارض الصور ----------
  let lbEl, lbList = [], lbIndex = 0;
  const lightboxOpen = () => lbEl?.classList.contains('open');
  function openLightbox(list, index) {
    lbList = list; lbIndex = index;
    if (!lbEl) {
      lbEl = document.createElement('div');
      lbEl.className = 'lightbox';
      lbEl.setAttribute('role', 'dialog'); lbEl.setAttribute('aria-modal', 'true'); lbEl.setAttribute('aria-label', 'عارض الوسائط');
      lbEl.innerHTML = `<button class="lb-btn lb-close" aria-label="إغلاق">${icon('x')}</button>
        <a class="lb-btn lb-open" target="_blank" rel="noopener" aria-label="فتح في نافذة مستقلة">${icon('external-link')}</a>
        <button class="lb-btn lb-prev" aria-label="السابق">${icon('chevron-right')}</button>
        <figure></figure>
        <button class="lb-btn lb-next" aria-label="التالي">${icon('chevron-left')}</button>
        <span class="lb-count"></span>`;
      document.body.append(lbEl);
      $('.lb-close', lbEl).onclick = closeLightbox;
      $('.lb-prev', lbEl).onclick = () => stepLb(-1);
      $('.lb-next', lbEl).onclick = () => stepLb(1);
      lbEl.addEventListener('click', (e) => { if (e.target === lbEl) closeLightbox(); });
      document.addEventListener('keydown', (e) => {
        if (!lightboxOpen()) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') stepLb(1);
        if (e.key === 'ArrowRight') stepLb(-1);
      });
      let sx = null;
      lbEl.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      lbEl.addEventListener('touchend', (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) stepLb(dx > 0 ? 1 : -1); sx = null; });
    }
    lbEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderLb();
    $('.lb-close', lbEl).focus();
  }
  function stepLb(d) { lbIndex = (lbIndex + d + lbList.length) % lbList.length; renderLb(); }
  function renderLb() {
    const m = lbList[lbIndex];
    const fig = $('figure', lbEl);
    const cap = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : '';
    if (m.kind === 'image') fig.innerHTML = `<img src="${esc(m.url)}" alt="${esc(m.caption || '')}">${cap}`;
    else if (m.kind === 'video') fig.innerHTML = `<video src="${esc(m.url)}" controls autoplay playsinline></video>${cap}`;
    else fig.innerHTML = `<iframe src="${esc(m.url)}" title="${esc(m.caption || 'ملف')}"></iframe>${cap}`;
    $('.lb-open', lbEl).href = m.url;
    const multi = lbList.length > 1;
    $('.lb-prev', lbEl).hidden = !multi; $('.lb-next', lbEl).hidden = !multi;
    $('.lb-count', lbEl).textContent = multi ? `${lbIndex + 1} / ${lbList.length}` : '';
  }
  function closeLightbox() {
    lbEl.classList.remove('open');
    $('figure', lbEl).innerHTML = '';
    if (!modalEl?.classList.contains('open')) document.body.style.overflow = '';
  }

  // ---------- عدادات متحركة ----------
  function animateCount(el) {
    const target = +el.dataset.count || 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) { el.textContent = target; return; }
    const dur = 1600, start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function observeCounters(root = document) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); }
    }), { threshold: .4 });
    $$('[data-count]', root).forEach((el) => io.observe(el));
  }

  // فتح البطاقات بالنقر (تفويض أحداث)
  const cache = new Map();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    e.preventDefault();
    openItem(+b.dataset.open, cache.get(+b.dataset.open));
  });
  const remember = (items) => items.forEach((i) => cache.set(i.id, i));

  // ---------- التهيئة ----------
  let settingsPromise;
  function init() {
    settingsPromise = api('/settings').catch(() => ({
      platform_name: 'منصة إبداع الوزية', school_name: 'متوسطة الوزية', activity_lead: 'نورة المصلح',
      principal: 'خزماء القحطاني', tagline: '', footer_quote: 'كل إنجاز يبدأ بفكرة، وكل إبداع يستحق أن يُوثّق', demo_count: 0,
    }));
    settingsPromise.then((s) => { renderHeader(s); renderFooter(s); loadAnnouncements(); });
    // فتح عنصر مباشرة من الرابط ?id=
    const id = new URLSearchParams(location.search).get('id');
    if (id && /^\d+$/.test(id) && document.body.dataset.deeplink !== 'off') openItem(+id);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.Ibdaa = {
    $, $$, esc, icon, api, store, toast, fmtDate, fmtHijri, fmtTime, TYPES, STATUS, STAR,
    card, emptyState, openItem, openLightbox, observeCounters, remember, demoBadge, statusBadge,
    settings: () => settingsPromise,
  };
})();
