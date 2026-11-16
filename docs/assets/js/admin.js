/* لوحة تحكم منصة إبداع الوزية */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="assets/icons.svg#i-${n}"></use></svg>`;
  const fmtDate = (s) => {
    if (!s) return '';
    const d = new Date(s.length <= 10 ? s + 'T12:00:00' : s.replace(' ', 'T') + 'Z');
    return isNaN(d) ? '' : new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  };
  const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' م.ب' : Math.max(1, Math.round(b / 1024)) + ' ك.ب');

  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = JSON.parse(t); } catch { /* تجاهل */ }

  // ---------- أنواع المحتوى وحقولها ----------
  const CATS = {
    general: ['ثقافية', 'علمية', 'أدبية', 'فنية', 'رياضية', 'تقنية', 'دينية', 'اجتماعية'],
    participation: ['ثقافية', 'علمية', 'فنية', 'مناسبات وطنية', 'رياضية', 'تطوعية'],
    event: ['فعالية مدرسية', 'ورشة عمل', 'حفل', 'رحلة', 'محاضرة', 'معرض', 'مناسبة وطنية'],
    news: ['خبر', 'إعلان', 'تهنئة'],
    gallery: ['صور', 'فيديوهات', 'أعمال الطالبات', 'تصاميم فنية', 'مشاريع وابتكارات'],
  };
  const T = {
    competition: { label: 'المسابقات', one: 'مسابقة', icon: 'trophy', page: 'competitions.html',
      fields: ['title', 'summary', 'date', 'end_date', 'status', 'category:general', 'conditions', 'body', 'winners'] },
    achievement: { label: 'الإنجازات', one: 'إنجاز', icon: 'award', page: 'achievements.html',
      fields: ['title', 'summary', 'people', 'date', 'level:achievement', 'category:general', 'body'] },
    participation: { label: 'المشاركات', one: 'مشاركة', icon: 'users', page: 'participations.html',
      fields: ['title', 'summary', 'date', 'level:participation', 'category:participation', 'people', 'result', 'body'] },
    event: { label: 'الفعاليات', one: 'فعالية', icon: 'calendar-days', page: 'events.html',
      fields: ['title', 'summary', 'date', 'end_date', 'time', 'location', 'category:event', 'body'] },
    news: { label: 'الأخبار والإعلانات', one: 'خبر أو إعلان', icon: 'megaphone', page: 'news.html',
      fields: ['title', 'summary', 'date', 'category:news', 'body'] },
    gallery: { label: 'معرض الإبداع', one: 'ألبوم أو عمل', icon: 'image', page: 'gallery.html',
      fields: ['title', 'summary', 'category:gallery', 'people', 'date', 'body'] },
    honor: { label: 'لوحة الشرف', one: 'طالبة متميزة', icon: 'crown', page: 'honor.html',
      fields: ['title', 'distinction', 'rank', 'summary', 'date', 'body'] },
  };
  const LABELS = {
    competition: { title: 'اسم المسابقة', summary: 'وصف مختصر', date: 'تاريخ البداية', end_date: 'تاريخ النهاية', body: 'وصف المسابقة التفصيلي' },
    achievement: { title: 'اسم الإنجاز', people: 'اسم الطالبة أو الفريق', body: 'تفاصيل الإنجاز', date: 'تاريخ الإنجاز' },
    participation: { title: 'عنوان المشاركة', people: 'أسماء المشاركات', result: 'النتائج', body: 'تفاصيل المشاركة' },
    event: { title: 'اسم الفعالية', date: 'تاريخ الفعالية', end_date: 'تاريخ الانتهاء (اختياري)', body: 'تفاصيل الفعالية' },
    news: { title: 'عنوان الخبر أو الإعلان', category: 'النوع', body: 'نص الخبر', date: 'تاريخ النشر' },
    gallery: { title: 'عنوان الألبوم أو العمل', people: 'صاحبة العمل (اختياري)', body: 'وصف العمل' },
    honor: { title: 'اسم الطالبة', summary: 'الإنجاز', rank: 'الترتيب', body: 'كلمة تكريم (اختياري)', date: 'تاريخ التكريم' },
  };
  const DEFAULT_LABELS = { title: 'العنوان', summary: 'وصف مختصر', date: 'التاريخ', end_date: 'تاريخ النهاية', time: 'الوقت', location: 'المكان',
    category: 'التصنيف', level: 'المستوى', people: 'الأسماء', result: 'النتيجة', conditions: 'شروط المشاركة', body: 'التفاصيل', winners: 'الفائزات والمراكز',
    status: 'حالة المسابقة', distinction: 'نوع التميّز', rank: 'الترتيب' };
  const LEVELS = { achievement: ['محلي', 'وطني', 'دولي'], participation: ['مدرسية', 'خارجية'] };
  const STATUS_TXT = { open: 'مفتوحة', upcoming: 'قادمة', closed: 'منتهية' };

  // ---------- الاتصال بقاعدة البيانات ----------
  const A = () => window.IbdaaAdmin;
  async function api(path, opts = {}) {
    try { return await A().adminApi(path, opts); }
    catch (e) {
      if (/JWT|session|not authenticated|401/i.test(e.message)) { location.replace('login.html'); }
      throw e;
    }
  }
  const json = (method, body) => ({ method, body: JSON.stringify(body) });

  function toast(msg, type = 'ok') {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'err' ? ' err' : '');
    t.innerHTML = icon(type === 'err' ? 'circle-alert' : 'circle-check') + `<span>${esc(msg)}</span>`;
    box.append(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, 3200);
  }

  function confirmBox(title, text, okLabel = 'حذف', danger = true) {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'confirm';
      el.setAttribute('role', 'alertdialog');
      el.innerHTML = `<div class="confirm-box"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="btns">
        <button class="btn btn-ghost" data-no>إلغاء</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(okLabel)}</button></div></div>`;
      document.body.append(el);
      const done = (v) => { el.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') done(false); };
      document.addEventListener('keydown', onKey);
      $('[data-no]', el).onclick = () => done(false);
      $('[data-yes]', el).onclick = () => done(true);
      el.onclick = (e) => { if (e.target === el) done(false); };
      $('[data-no]', el).focus();
    });
  }

  // ---------- التهيئة ----------
  let overview = null;
  async function boot() {
    const who = await A().currentAdmin();
    if (who.error) { location.replace('login.html' + (who.error === 'not_admin' ? '?denied=1' : '')); return; }
    $('#who-name').textContent = 'نورة المصلح';
    window.IbdaaData.loadSettings().then((s) => { $('#who-name').textContent = s.activity_lead || 'المسؤولة'; }).catch(() => {});
    $('#shell').hidden = false;
    $('#logout').onclick = async () => { await api('/logout', { method: 'POST' }).catch(() => {}); location.replace('login.html'); };
    $('#theme-btn').onclick = () => {
      const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = n;
      try { localStorage.setItem('theme', JSON.stringify(n)); } catch { /* تجاهل */ }
    };
    const side = $('#side');
    $('#side-toggle').onclick = () => {
      side.classList.add('open');
      const s = document.createElement('div'); s.className = 'scrim'; s.onclick = () => { side.classList.remove('open'); s.remove(); }; document.body.append(s);
    };
    side.addEventListener('click', (e) => { if (e.target.closest('a') && side.classList.contains('open')) { side.classList.remove('open'); $('.scrim')?.remove(); } });
    addEventListener('hashchange', route);
    await refreshNav();
    route();
  }

  async function refreshNav() {
    try { overview = await api('/overview'); } catch { return; }
    const cnt = (t) => overview.by_type[t]?.total || 0;
    $('#side-nav').innerHTML = `
      <a href="#overview">${icon('layout-dashboard')} نظرة عامة</a>
      <div class="grp">المحتوى</div>
      ${Object.entries(T).map(([k, v]) => `<a href="#type/${k}">${icon(v.icon)} ${v.label}<span class="cnt">${cnt(k)}</span></a>`).join('')}
      <div class="grp">التواصل والإعداد</div>
      <a href="#messages">${icon('inbox')} الرسائل والاستفسارات<span class="cnt ${overview.unread ? 'hot' : ''}">${overview.unread}</span></a>
      <a href="#settings">${icon('settings')} الإعدادات</a>`;
    markNav();
  }
  function markNav() {
    const h = location.hash || '#overview';
    const key = h.startsWith('#type/') || ['#messages', '#settings'].includes(h) ? h : '#overview';
    $$('#side-nav a').forEach((a) => { if (a.getAttribute('href') === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }

  function route() {
    closeDrawer(true);
    $('#view').onclick = null;
    const h = (location.hash || '#overview').slice(1);
    markNav();
    window.scrollTo(0, 0);
    const [view, arg] = h.split('/');
    if (view === 'type' && T[arg]) return listView(arg);
    if (view === 'messages') return messagesView();
    if (view === 'settings') return settingsView();
    return overviewView();
  }
  const setTitle = (t) => { $('#view-title').textContent = t; document.title = t + ' | لوحة تحكم إبداع الوزية'; };

  // ---------- نظرة عامة ----------
  async function overviewView() {
    setTitle('نظرة عامة');
    const v = $('#view');
    await refreshNav();
    if (!overview) { v.innerHTML = '<p>تعذّر التحميل</p>'; return; }
    const o = overview;
    const s = o.stats;
    v.innerHTML = `
      ${o.demo_count ? `<div class="notice">${icon('circle-alert')}<div><b>تحتوي المنصة على ${o.demo_count} عنصراً تجريبياً</b>
        <p>هذه البيانات للتوضيح فقط وتظهر في الموقع بعلامة «تجريبي». احذفيها قبل نشر المنصة للطالبات وأولياء الأمور.</p>
        <button class="btn btn-sm btn-danger" id="del-demo">${icon('trash-2')} حذف جميع البيانات التجريبية</button></div></div>` : ''}
      ${!o.recent.length ? `<div class="notice" style="background:var(--purple-soft);color:var(--brand)">${icon('sparkles')}<div><b>المنصة جاهزة وفارغة</b>
        <p>ابدئي بإضافة أول مسابقة أو إنجاز. وإن أردتِ استعراض شكل المنصة أولاً، أضيفي بيانات تجريبية (تظهر بعلامة «تجريبي» وتُحذف بضغطة).</p>
        <button class="btn btn-sm btn-primary" id="add-demo">${icon('refresh-cw')} إضافة بيانات تجريبية للاستعراض</button></div></div>` : ''}
      <div class="kpis">
        <div class="kpi navy"><div class="k-top">المسابقات ${icon('trophy')}</div><b>${s.competitions}</b><small>منشورة في الموقع</small></div>
        <div class="kpi"><div class="k-top">الإنجازات ${icon('award')}</div><b>${s.achievements}</b><small>منشورة</small></div>
        <div class="kpi"><div class="k-top">المشاركات ${icon('users')}</div><b>${s.participations}</b><small>منشورة</small></div>
        <div class="kpi"><div class="k-top">الفعاليات ${icon('calendar-days')}</div><b>${s.events}</b><small>منشورة</small></div>
        <div class="kpi"><div class="k-top">الطالبات المشاركات ${icon('graduation-cap')}</div><b>${s.students}</b><small>تُحسب تلقائياً من الأسماء</small></div>
        <div class="kpi"><div class="k-top">رسائل جديدة ${icon('inbox')}</div><b>${o.unread}</b><small><a href="#messages" style="color:var(--brand)">عرض الرسائل</a></small></div>
      </div>
      <div class="box"><h2>${icon('plus')} إضافة سريعة</h2>
        <div class="quick-add">${Object.entries(T).map(([k, t]) => `<button data-add="${k}">${icon(t.icon)} ${t.one}</button>`).join('')}</div></div>
      <div class="box"><h2>${icon('clock')} آخر ما أُضيف</h2><div class="rows">${o.recent.map(rowHTML).join('') || '<p class="hint">لا يوجد محتوى بعد. ابدئي بإضافة مسابقة أو إنجاز.</p>'}</div></div>
      <div class="box"><h2>${icon('database')} التخزين</h2><p class="hint" style="margin-bottom:8px">${o.media.c} ملف مرفوع، استُخدم ${fmtSize(o.media.bytes)} من 1 جيجابايت المجانية.</p>
        <div class="progress"><i style="width:${Math.min(100, o.media.bytes / 1073741824 * 100).toFixed(1)}%"></i></div></div>`;
    $$('[data-add]', v).forEach((b) => b.onclick = () => openEditor(b.dataset.add));
    bindRows(v, overviewView);
    $('#del-demo', v)?.addEventListener('click', deleteDemo);
    $('#add-demo', v)?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = 'جارٍ الإضافة…';
      try { const r = await api('/demo', { method: 'POST' }); toast(`أُضيف ${r.created} عنصراً تجريبياً`); overviewView(); } catch (err) { toast(err.message, 'err'); }
    });
  }

  async function deleteDemo() {
    if (!(await confirmBox('حذف البيانات التجريبية', 'سيتم حذف جميع العناصر المعلّمة «تجريبي» وصورها نهائياً. المحتوى الذي أضفتِه بنفسك لن يتأثر.', 'حذف التجريبي'))) return;
    try { const r = await api('/demo', { method: 'DELETE' }); toast(`تم حذف ${r.deleted} عنصراً تجريبياً`); route(); refreshNav(); }
    catch (e) { toast(e.message, 'err'); }
  }

  // ---------- قائمة المحتوى ----------
  function rowHTML(it) {
    const t = T[it.type];
    const status = it.computed_status && it.type === 'competition' ? `<span class="badge ${it.computed_status === 'open' ? 'ok' : it.computed_status === 'upcoming' ? 'warn' : 'muted'}">${STATUS_TXT[it.computed_status]}</span>` : '';
    return `<div class="row ${it.visible ? '' : 'is-hidden'}" data-id="${it.id}">
      <div class="th">${it.cover ? `<img src="${esc(it.cover)}" alt="" loading="lazy">` : icon(t.icon)}</div>
      <div class="tt"><b>${it.type === 'honor' && it.rank ? `<span style="color:var(--gold)">${it.rank}.</span> ` : ''}${esc(it.title)}</b>
        <div class="tags">
          ${it.is_demo ? '<span class="badge demo">تجريبي</span>' : ''}
          ${!it.visible ? `<span class="badge muted">${icon('eye-off')} مخفي</span>` : ''}
          ${status}
          <span class="badge muted">${t.one}</span>
          ${it.category ? `<span>${esc(it.category)}</span>` : ''}
          ${it.date ? `<span>${fmtDate(it.date)}</span>` : ''}
          ${it.media_count ? `<span>${icon('image')} ${it.media_count}</span>` : ''}
        </div></div>
      <div class="acts">
        <button class="act ${it.featured ? 'on' : ''}" data-act="feature" title="${it.featured ? 'إلغاء التمييز' : 'تمييز في الصفحة الرئيسية'}" aria-label="تمييز" aria-pressed="${it.featured}">${icon('star')}</button>
        <button class="act" data-act="visible" title="${it.visible ? 'إخفاء من الموقع' : 'إظهار في الموقع'}" aria-label="${it.visible ? 'إخفاء' : 'إظهار'}">${icon(it.visible ? 'eye' : 'eye-off')}</button>
        <a class="act" href="${t.page}?id=${it.id}" target="_blank" rel="noopener" title="عرض في الموقع" aria-label="عرض في الموقع" ${it.visible ? '' : 'hidden'}>${icon('external-link')}</a>
        <button class="act" data-act="edit" title="تعديل" aria-label="تعديل">${icon('pencil')}</button>
        <button class="act danger" data-act="delete" title="حذف" aria-label="حذف">${icon('trash-2')}</button>
      </div></div>`;
  }

  function bindRows(container, reload) {
    container.onclick = async (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const row = btn.closest('.row');
      const id = +row.dataset.id;
      const act = btn.dataset.act;
      try {
        if (act === 'edit') return openEditor(null, id, reload);
        if (act === 'delete') {
          const title = $('.tt b', row).textContent;
          if (!(await confirmBox('حذف المحتوى', `سيتم حذف «${title}» مع جميع صوره ومرفقاته نهائياً.`))) return;
          await api('/items/' + id, { method: 'DELETE' });
          toast('تم الحذف'); refreshNav();
        }
        if (act === 'visible') {
          const hidden = row.classList.contains('is-hidden');
          await api('/items/' + id, json('PUT', { visible: hidden }));
          toast(hidden ? 'أصبح ظاهراً في الموقع' : 'تم إخفاؤه من الموقع');
        }
        if (act === 'feature') {
          const on = btn.classList.contains('on');
          await api('/items/' + id, json('PUT', { featured: !on }));
          toast(on ? 'أُلغي التمييز' : 'تم التمييز في الصفحة الرئيسية');
        }
        reload();
      } catch (err) { toast(err.message, 'err'); }
    };
  }

  async function listView(type) {
    const t = T[type];
    setTitle(t.label);
    const v = $('#view');
    v.innerHTML = `<div class="list-tools">
        <label class="search"><span class="sr-only">بحث</span>${icon('search')}<input class="input" type="search" placeholder="بحث في ${t.label}…" id="q"></label>
        <select class="input" id="vis" aria-label="الظهور"><option value="">الكل</option><option value="1">الظاهر فقط</option><option value="0">المخفي فقط</option></select>
        <button class="btn btn-primary" id="add">${icon('plus')} إضافة ${t.one}</button>
      </div><div class="rows" id="rows"><div class="skeleton" style="min-height:80px"></div></div>`;
    let items = [];
    const draw = () => {
      const q = $('#q').value.trim();
      const vis = $('#vis').value;
      const list = items.filter((i) => (!q || (i.title + i.summary + i.people + i.category).includes(q)) && (vis === '' || String(+i.visible) === vis));
      $('#rows').innerHTML = list.length ? list.map(rowHTML).join('') : `<div class="empty">${icon(t.icon)}<h3>${items.length ? 'لا توجد نتائج' : 'لا يوجد محتوى في هذا القسم بعد'}</h3><p>${items.length ? 'جرّبي كلمة أخرى.' : 'اضغطي «إضافة» لنشر أول عنصر.'}</p></div>`;
    };
    const load = async () => { try { items = (await api('/items?type=' + type)).items; draw(); } catch (e) { toast(e.message, 'err'); } };
    $('#q').oninput = draw; $('#vis').onchange = draw;
    $('#add').onclick = () => openEditor(type, null, load);
    bindRows($('#rows'), load);
    await load();
  }

  // ---------- المحرر ----------
  let drawer, editing = null, pending = [], onSaved = null, dirty = false;
  function closeDrawer(force) {
    if (!drawer || !drawer.classList.contains('open')) return true;
    if (!force && dirty && !confirm('لديك تغييرات غير محفوظة. هل تريدين الإغلاق دون حفظ؟')) return false;
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    pending = []; dirty = false;
    return true;
  }

  function fieldHTML(spec, type, it) {
    const [name, opt] = spec.split(':');
    const label = (LABELS[type] && LABELS[type][name]) || DEFAULT_LABELS[name];
    const val = it[name] ?? '';
    const req = name === 'title' ? ' <span class="req">*</span>' : '';
    switch (name) {
      case 'title': return `<label class="field full">${label}${req}<input class="input" name="title" required maxlength="200" value="${esc(val)}"></label>`;
      case 'summary': return `<label class="field full">${label}<span class="help">يظهر على البطاقة</span><input class="input" name="summary" maxlength="300" value="${esc(val)}"></label>`;
      case 'body': return `<label class="field full">${label}<textarea class="input" name="body" rows="6">${esc(val)}</textarea></label>`;
      case 'conditions': return `<label class="field full">${label}<span class="help">كل شرط في سطر مستقل</span><textarea class="input" name="conditions" rows="4">${esc(val)}</textarea></label>`;
      case 'date': case 'end_date': return `<label class="field">${label}<input class="input" type="date" name="${name}" value="${esc(val)}"></label>`;
      case 'time': return `<label class="field">${label}<input class="input" type="time" name="time" value="${esc(val)}"></label>`;
      case 'rank': return `<label class="field">${label}<span class="help">1 = المركز الأول</span><input class="input" type="number" min="1" max="999" name="rank" value="${esc(val)}"></label>`;
      case 'status': return `<label class="field">${label}<select class="input" name="status">
          ${[['auto', 'تلقائي حسب التاريخ'], ['open', 'مفتوحة'], ['upcoming', 'قادمة'], ['closed', 'منتهية']].map(([k, l]) => `<option value="${k}" ${(val || 'auto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
      case 'level': return `<label class="field">${label === 'المستوى' && opt === 'participation' ? 'نوع المشاركة' : label === 'المستوى' ? 'مستوى الإنجاز' : label}<select class="input" name="level"><option value="">— اختاري —</option>
          ${LEVELS[opt].map((l) => `<option ${val === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
      case 'category': {
        const list = CATS[opt] || CATS.general;
        return `<label class="field">${label}<input class="input" name="category" list="cat-${opt}" value="${esc(val)}" placeholder="اختاري أو اكتبي تصنيفاً">
          <datalist id="cat-${opt}">${list.map((c) => `<option value="${c}">`).join('')}</datalist></label>`;
      }
      case 'distinction': return `<label class="field">${label}<input class="input" name="distinction" list="dist" value="${esc(val)}">
          <datalist id="dist">${['التميّز العلمي', 'التميّز الثقافي', 'التميّز الفني', 'التفوق الدراسي', 'المبادرة والتطوع', 'التميّز الرياضي', 'القيادة'].map((c) => `<option value="${c}">`).join('')}</datalist></label>`;
      case 'winners': return `<div class="field full">${label}<div class="winners-ed" id="winners">${(it.winners || []).map(winnerRow).join('')}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="add-winner" style="justify-self:start">${icon('plus')} إضافة فائزة</button></div>`;
      default: return `<label class="field ${name === 'people' || name === 'result' || name === 'location' ? '' : ''}">${label}<input class="input" name="${name}" value="${esc(val)}" maxlength="500"></label>`;
    }
  }
  const winnerRow = (w = {}) => `<div class="w"><input class="input" placeholder="اسم الفائزة" data-w="name" value="${esc(w.name || '')}" aria-label="اسم الفائزة">
    <input class="input" placeholder="المركز" data-w="rank" value="${esc(w.rank || '')}" list="ranks" aria-label="المركز">
    <button type="button" class="act danger" data-rm aria-label="إزالة">${icon('x')}</button></div>`;

  async function openEditor(type, id = null, reload = null) {
    if (drawer?.classList.contains('open') && !closeDrawer()) return;
    onSaved = reload;
    let it = { type, visible: true, featured: false, winners: [], media: [], status: 'auto' };
    if (id) {
      try { it = await api('/items/' + id); } catch (e) { return toast(e.message, 'err'); }
      type = it.type;
    } else if (type !== 'honor') {
      it.date = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
    }
    editing = it;
    pending = [];
    dirty = false;
    const t = T[type];
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'drawer';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      document.body.append(drawer);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open') && !$('.confirm')) closeDrawer(); });
    }
    drawer.innerHTML = `<div class="scrim"></div><div class="drawer-panel">
      <div class="drawer-head">${icon(t.icon)}<h2>${id ? 'تعديل' : 'إضافة'} ${t.one}</h2>
        <button class="act" data-close aria-label="إغلاق">${icon('x')}</button></div>
      <form class="drawer-body" id="ed-form" novalidate>
        ${it.is_demo ? `<div class="notice" style="margin:0">${icon('circle-alert')}<div><b>عنصر تجريبي</b><p>يظهر في الموقع بعلامة «تجريبي». يمكنك حذفه أو استبدال بياناته ببيانات حقيقية ثم حذفه من البيانات التجريبية.</p></div></div>` : ''}
        <div class="fgrid">${t.fields.map((f) => fieldHTML(f, type, it)).join('')}</div>
        <datalist id="ranks"><option value="المركز الأول"><option value="المركز الثاني"><option value="المركز الثالث"><option value="مشاركة متميزة"></datalist>
        <div class="field full">${type === 'honor' ? 'صورة الطالبة أو الشهادة' : type === 'gallery' ? 'الصور والفيديوهات والأعمال' : 'الصور والفيديوهات والشهادات'}
          <label class="drop" id="drop">${icon('upload')}<b>اسحبي الملفات هنا أو اضغطي للاختيار</b>
            <small>صور (تُضغط تلقائياً)، فيديو MP4 حتى 50 ميجابايت، شهادات PDF — يمكن اختيار عدة ملفات</small>
            <input type="file" id="files" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf" hidden></label>
          <div class="progress" id="prog" hidden><i></i></div>
          <div class="media-grid" id="media"></div>
          <small class="help" id="cover-help"></small>
        </div>
        <div class="switches">
          <label class="switch"><input type="checkbox" name="visible" ${it.visible ? 'checked' : ''}> ظاهر في الموقع</label>
          ${['achievement', 'news', 'competition', 'participation', 'event'].includes(type) ? `<label class="switch"><input type="checkbox" name="featured" ${it.featured ? 'checked' : ''}> ${type === 'achievement' ? 'إنجاز مميز في الصفحة الرئيسية' : 'تمييز'}</label>` : ''}
        </div>
      </form>
      <div class="drawer-foot">
        <button class="btn btn-primary" id="save">${icon('check')} ${id ? 'حفظ التعديلات' : 'نشر'}</button>
        <button class="btn btn-ghost" data-close>إلغاء</button>
        <span class="spacer"></span>
        ${id && it.visible ? `<a class="btn btn-ghost btn-sm" href="${t.page}?id=${id}" target="_blank" rel="noopener">${icon('external-link')} عرض في الموقع</a>` : ''}
      </div></div>`;
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    const form = $('#ed-form', drawer);
    $$('[data-close]', drawer).forEach((b) => b.onclick = () => closeDrawer());
    $('.scrim', drawer).onclick = () => closeDrawer();
    form.addEventListener('input', () => { dirty = true; });
    form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
    $('#save', drawer).onclick = save;
    if ($('#add-winner', drawer)) {
      $('#add-winner', drawer).onclick = () => { $('#winners', drawer).insertAdjacentHTML('beforeend', winnerRow()); $('#winners .w:last-child input', drawer).focus(); dirty = true; };
      $('#winners', drawer).addEventListener('click', (e) => { if (e.target.closest('[data-rm]')) { e.target.closest('.w').remove(); dirty = true; } });
    }
    // رفع الملفات
    const drop = $('#drop', drawer), input = $('#files', drawer);
    input.onchange = () => { addPending(input.files); input.value = ''; };
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => addPending(e.dataTransfer.files));
    renderMedia();
    setTimeout(() => form.elements.title.focus(), 50);
  }

  const ACCEPT = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime)|application\/pdf)$/;
  function addPending(fileList) {
    const files = [...fileList];
    const bad = files.filter((f) => !ACCEPT.test(f.type));
    if (bad.length) toast(`تم تجاهل ${bad.length} ملف بصيغة غير مدعومة`, 'err');
    const big = files.filter((x) => ACCEPT.test(x.type) && !x.type.startsWith('image/') && x.size > A().MAX_BYTES);
    if (big.length) toast(`الحد الأقصى للفيديو أو PDF هو 50 ميجابايت: ${big.map((x) => x.name).join('، ')}`, 'err');
    for (const f of files.filter((x) => ACCEPT.test(x.type) && !big.includes(x))) {
      const kind = f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'video' : 'pdf';
      pending.push({ file: f, kind, preview: URL.createObjectURL(f), caption: '' });
    }
    if (files.length) dirty = true;
    renderMedia();
  }

  function renderMedia() {
    const box = $('#media', drawer);
    const it = editing;
    const view = (m, url) => (m.kind === 'image' ? `<img src="${esc(url)}" alt="">` : m.kind === 'video' ? `<video src="${esc(url)}" muted preload="metadata"></video><span class="tag badge">${icon('video')} فيديو</span>` : `${icon('file-text', 'icon')}<span class="tag badge">PDF</span>`);
    const coverId = it.cover_id || (it.media.find((m) => m.kind === 'image') || {}).id;
    box.innerHTML = it.media.map((m) => `<div class="mcard ${m.id === coverId && m.kind === 'image' ? 'cover' : ''}" data-mid="${m.id}">
        <div class="mv">${view(m, m.url)}</div>
        <input value="${esc(m.caption)}" placeholder="وصف الصورة" data-cap aria-label="وصف الملف">
        <div class="mact">${m.kind === 'image' ? `<button type="button" data-cover title="اعتماد كصورة الغلاف">${icon('star')} غلاف</button>` : ''}<button type="button" class="del" data-mdel title="حذف الملف">${icon('trash-2')} حذف</button></div>
      </div>`).join('') +
      pending.map((p, i) => `<div class="mcard pending" data-pi="${i}"><div class="mv">${view(p, p.preview)}</div>
        <input value="${esc(p.caption)}" placeholder="وصف الملف" data-pcap aria-label="وصف الملف"><div class="mact"><button type="button" class="del" data-pdel>${icon('x')} إزالة</button></div></div>`).join('');
    $('#cover-help', drawer).textContent = it.media.length + pending.length ? 'الصورة المحاطة بالذهبي هي صورة الغلاف التي تظهر على البطاقة.' : '';
    $$('[data-pdel]', box).forEach((b) => b.onclick = () => { const i = +b.closest('[data-pi]').dataset.pi; URL.revokeObjectURL(pending[i].preview); pending.splice(i, 1); renderMedia(); });
    $$('[data-pcap]', box).forEach((inp) => inp.oninput = () => { pending[+inp.closest('[data-pi]').dataset.pi].caption = inp.value; });
    $$('[data-cap]', box).forEach((inp) => inp.onchange = async () => {
      try { await api('/media/' + inp.closest('[data-mid]').dataset.mid, json('PATCH', { caption: inp.value })); toast('حُفظ الوصف'); } catch (e) { toast(e.message, 'err'); }
    });
    $$('[data-cover]', box).forEach((b) => b.onclick = async () => {
      const mid = +b.closest('[data-mid]').dataset.mid;
      try { editing = await api('/items/' + editing.id, json('PUT', { cover_id: mid })); renderMedia(); toast('تم تعيين صورة الغلاف'); onSaved?.(); } catch (e) { toast(e.message, 'err'); }
    });
    $$('[data-mdel]', box).forEach((b) => b.onclick = async () => {
      if (!(await confirmBox('حذف الملف', 'سيُحذف هذا الملف من المنصة نهائياً.'))) return;
      try { editing = (await api('/media/' + b.closest('[data-mid]').dataset.mid, { method: 'DELETE' })).item; renderMedia(); toast('تم حذف الملف'); onSaved?.(); } catch (e) { toast(e.message, 'err'); }
    });
  }

  async function upload(id, files) {
    const prog = $('#prog', drawer);
    prog.hidden = false;
    try {
      const r = await A().uploadMedia(id, files, (done, total) => {
        $('i', prog).style.width = (total ? done / total * 100 : 0) + '%';
        $('#save', drawer).innerHTML = `${icon('upload')} جارٍ رفع الملفات ${Math.min(done + 1, total)} من ${total}…`;
      });
      return r;
    } finally { prog.hidden = true; }
  }

  async function save() {
    const form = $('#ed-form', drawer);
    const fd = new FormData(form);
    const body = { type: editing.type };
    for (const f of T[editing.type].fields) {
      const name = f.split(':')[0];
      if (name === 'winners') continue;
      body[name] = (fd.get(name) ?? '').toString();
    }
    body.visible = form.elements.visible.checked;
    if (form.elements.featured) body.featured = form.elements.featured.checked;
    if ($('#winners', drawer)) {
      body.winners = $$('#winners .w', drawer).map((w) => ({ name: $('[data-w=name]', w).value, rank: $('[data-w=rank]', w).value })).filter((w) => w.name.trim());
    }
    if (!body.title.trim()) { form.elements.title.focus(); return toast(`يرجى كتابة ${(LABELS[editing.type] || {}).title || 'العنوان'}`, 'err'); }
    if (body.end_date && body.date && body.end_date < body.date) { form.elements.end_date.focus(); return toast('تاريخ النهاية يجب أن يكون بعد تاريخ البداية', 'err'); }
    const btn = $('#save', drawer);
    btn.disabled = true;
    try {
      let saved = editing.id ? await api('/items/' + editing.id, json('PUT', body)) : await api('/items', json('POST', body));
      editing = saved;
      if (pending.length) {
        const r = await upload(saved.id, pending);
        if (r.rejected.length) toast(`تعذّر رفع ${r.rejected.length} ملف: ${r.rejected.map((x) => x.name + ' (' + x.reason + ')').join('، ')}`, 'err');
        pending.forEach((p) => URL.revokeObjectURL(p.preview));
        pending = [];
      }
      dirty = false;
      toast(body.visible ? 'تم النشر وظهر في الموقع' : 'تم الحفظ (مخفي عن الموقع)');
      closeDrawer(true);
      onSaved?.();
      refreshNav();
      if (!onSaved) route();
    } catch (e) { toast(e.message, 'err'); }
    finally { btn.disabled = false; btn.innerHTML = `${icon('check')} ${editing.id ? 'حفظ التعديلات' : 'نشر'}`; }
  }

  // ---------- الرسائل ----------
  async function messagesView() {
    setTitle('الرسائل والاستفسارات');
    const v = $('#view');
    let items = [];
    try { items = (await api('/messages')).items; } catch (e) { return toast(e.message, 'err'); }
    v.innerHTML = items.length ? `<div class="rows">${items.map((m) => {
      const isEmail = /\S+@\S+\.\S+/.test(m.contact);
      return `<article class="msg ${m.is_read ? '' : 'unread'}" data-id="${m.id}">
        <div class="msg-head"><b>${esc(m.name)}</b>${m.is_read ? '' : '<span class="badge gold">جديدة</span>'}<span class="badge muted">${esc(m.subject || 'بدون موضوع')}</span><small>${fmtDate(m.created_at)}</small>
          <span class="acts">
            ${isEmail ? `<a class="act" href="mailto:${esc(m.contact)}?subject=${encodeURIComponent('رد: ' + (m.subject || 'استفسارك'))}" title="الرد بالبريد" aria-label="الرد بالبريد">${icon('send')}</a>` : ''}
            <button class="act" data-read="${m.is_read ? 0 : 1}" title="${m.is_read ? 'تعليم كغير مقروءة' : 'تعليم كمقروءة'}" aria-label="تغيير حالة القراءة">${icon(m.is_read ? 'mail' : 'check')}</button>
            <button class="act danger" data-del title="حذف" aria-label="حذف">${icon('trash-2')}</button></span></div>
        ${m.contact ? `<small style="color:var(--ink-3)">وسيلة التواصل: <span dir="ltr">${esc(m.contact)}</span></small>` : ''}
        <p class="text">${esc(m.body)}</p></article>`;
    }).join('')}</div>` : `<div class="empty">${icon('inbox')}<h3>لا توجد رسائل</h3><p>تصل هنا الاستفسارات المرسلة من صفحة «تواصل معنا».</p></div>`;
    v.onclick = async (e) => {
      const card = e.target.closest('.msg'); if (!card) return;
      const id = card.dataset.id;
      try {
        if (e.target.closest('[data-read]')) { await api('/messages/' + id, json('PATCH', { is_read: e.target.closest('[data-read]').dataset.read === '1' })); }
        else if (e.target.closest('[data-del]')) { if (!(await confirmBox('حذف الرسالة', 'ستُحذف الرسالة نهائياً.'))) return; await api('/messages/' + id, { method: 'DELETE' }); toast('تم حذف الرسالة'); }
        else return;
        messagesView(); refreshNav();
      } catch (err) { toast(err.message, 'err'); }
    };
  }

  // ---------- الإعدادات ----------
  async function settingsView() {
    setTitle('الإعدادات');
    const v = $('#view');
    let s;
    try { s = await api('/settings'); } catch (e) { return toast(e.message, 'err'); }
    const f = (k, l, help = '') => `<label class="field">${l}${help ? `<span class="help">${help}</span>` : ''}<input class="input" name="${k}" value="${esc(s[k])}"></label>`;
    v.innerHTML = `
      <form class="box" id="set-form"><h2>${icon('school')} بيانات المنصة والمدرسة</h2>
        <div class="fgrid">${f('platform_name', 'اسم المنصة')}${f('school_name', 'اسم المدرسة')}${f('activity_lead', 'مسؤولة النشاط الطلابي')}${f('principal', 'مديرة المدرسة')}
          <label class="field full">العبارة الترحيبية<input class="input" name="tagline" value="${esc(s.tagline)}"></label>
          <label class="field full">عبارة التذييل<input class="input" name="footer_quote" value="${esc(s.footer_quote)}"></label>
          ${f('contact_email', 'البريد الإلكتروني للتواصل', 'اختياري، يظهر في صفحة التواصل')}${f('contact_phone', 'رقم التواصل', 'اختياري')}
          <label class="field full">شريط إعلان أعلى الموقع<span class="help">اتركيه فارغاً لإخفائه</span><input class="input" name="announcement_bar" value="${esc(s.announcement_bar)}"></label>
        </div>
        <h2 style="margin-top:22px">${icon('graduation-cap')} إحصائية الطالبات المشاركات</h2>
        <div class="fgrid"><label class="field">طريقة الحساب<select class="input" name="students_mode">
            <option value="auto" ${s.students_mode !== 'manual' ? 'selected' : ''}>تلقائي من أسماء الطالبات في المحتوى</option>
            <option value="manual" ${s.students_mode === 'manual' ? 'selected' : ''}>رقم يدوي</option></select></label>
          <label class="field">العدد اليدوي<input class="input" type="number" min="0" name="students_count" value="${esc(s.students_count)}"></label></div>
        <p class="hint" style="margin-top:10px">بقية الإحصائيات (المسابقات، الإنجازات، المشاركات، الفعاليات) تُحدَّث تلقائياً عند النشر أو الإخفاء أو الحذف.</p>
        <button class="btn btn-primary">${icon('check')} حفظ الإعدادات</button>
      </form>
      <form class="box" id="pw-form" autocomplete="off"><h2>${icon('key-round')} تغيير كلمة المرور</h2>
        <div class="fgrid">
          <label class="field">كلمة المرور الحالية<input class="input" type="password" name="current" autocomplete="current-password" required dir="ltr"></label><span></span>
          <label class="field">كلمة المرور الجديدة<span class="help">8 أحرف على الأقل</span><input class="input" type="password" name="next" autocomplete="new-password" minlength="8" required dir="ltr"></label>
          <label class="field">تأكيد كلمة المرور الجديدة<input class="input" type="password" name="confirm" autocomplete="new-password" required dir="ltr"></label>
        </div>
        <button class="btn btn-primary" style="margin-top:14px">${icon('lock')} تغيير كلمة المرور</button>
      </form>
      <div class="box"><h2>${icon('database')} البيانات التجريبية</h2>
        <p class="hint">العناصر التجريبية تحمل علامة «تجريبي» في الموقع ولا تمثل إنجازات حقيقية. يمكنك حذفها كلها بضغطة واحدة، أو إعادتها لاستعراض شكل المنصة.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-danger" id="demo-del">${icon('trash-2')} حذف جميع البيانات التجريبية</button>
          <button class="btn btn-ghost" id="demo-add">${icon('refresh-cw')} إعادة البيانات التجريبية</button></div></div>`;
    $('#set-form').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/settings', json('PUT', Object.fromEntries(new FormData(e.target)))); toast('تم حفظ الإعدادات'); } catch (err) { toast(err.message, 'err'); }
    };
    $('#pw-form').onsubmit = async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      if (d.next.length < 8) return toast('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل', 'err');
      if (d.next !== d.confirm) return toast('تأكيد كلمة المرور غير مطابق', 'err');
      try { await api('/password', json('POST', { current: d.current, next: d.next })); e.target.reset(); toast('تم تغيير كلمة المرور'); } catch (err) { toast(err.message, 'err'); }
    };
    $('#demo-del').onclick = deleteDemo;
    $('#demo-add').onclick = async () => {
      try { const r = await api('/demo', { method: 'POST' }); toast(r.created ? `أُضيف ${r.created} عنصراً تجريبياً` : 'البيانات التجريبية موجودة مسبقاً'); refreshNav(); } catch (err) { toast(err.message, 'err'); }
    };
  }

  // روابط "إضافة" القادمة من أي مكان
  document.addEventListener('DOMContentLoaded', boot);
})();
