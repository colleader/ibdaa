/* الصفحة الرئيسية */
document.addEventListener('DOMContentLoaded', async () => {
  const I = window.Ibdaa;
  const { $, $$, esc, icon, fmtDate } = I;

  $$('[data-star]').forEach((h) => h.insertAdjacentHTML('afterbegin', I.STAR));

  I.settings().then((s) => {
    if (s.tagline) $('#tagline').textContent = s.tagline;
    if (s.school_name) $('#hero-school').textContent = 'النشاط الطلابي في ' + s.school_name;
  });

  let data;
  try { data = await I.api('/home'); }
  catch (e) {
    $('#home-news').innerHTML = I.emptyState('تعذّر تحميل المحتوى', e.message);
    return;
  }
  const all = [...data.news, ...data.events, ...data.featured_achievements, ...data.participations, ...data.competitions, ...data.honor];
  I.remember(all);

  // الإحصائيات
  for (const [k, v] of Object.entries(data.stats)) {
    const el = $(`#stats [data-key="${k}"]`);
    if (el) el.dataset.count = v;
  }
  I.observeCounters($('#stats'));

  // الأخبار
  $('#home-news').innerHTML = data.news.length ? data.news.map((n) => `
    <button class="news-row" type="button" data-open="${n.id}">
      <div class="thumb">${n.cover ? `<img src="${esc(n.cover)}" alt="" loading="lazy">` : `<div class="card-media" style="height:100%"><div class="placeholder">${icon('newspaper')}</div></div>`}</div>
      <div>
        <div style="display:flex;gap:6px;margin-bottom:4px">${I.demoBadge(n)}${n.category ? `<span class="badge">${esc(n.category)}</span>` : ''}</div>
        <h3>${esc(n.title)}</h3>
        ${n.summary ? `<p>${esc(n.summary)}</p>` : ''}
        <div class="meta" style="margin-top:6px"><span>${icon('clock')}${fmtDate(n.date || n.created_at)}</span></div>
      </div>
    </button>`).join('') : I.emptyState('لا توجد أخبار بعد', 'ستظهر الأخبار والإعلانات هنا فور نشرها.');

  // الفعاليات القادمة
  const evs = data.events;
  $('#home-events').innerHTML = evs.length ? evs.map((e) => {
    const d = e.date ? new Date(e.date + 'T12:00:00') : null;
    return `<button class="event-row" type="button" data-open="${e.id}">
      <span class="date-chip">${d ? `<b>${d.getDate()}</b><small>${fmtDate(e.date, { month: 'long' })}</small>` : '<b>—</b>'}</span>
      <span style="display:grid;gap:2px">
        <span style="display:flex;gap:6px">${I.demoBadge(e)}${I.statusBadge(e)}</span>
        <h3>${esc(e.title)}</h3>
        <span class="meta">${e.time ? `<span>${icon('clock')}${I.fmtTime(e.time)}</span>` : ''}${e.location ? `<span>${icon('map-pin')}${esc(e.location)}</span>` : ''}</span>
      </span></button>`;
  }).join('') : I.emptyState('لا توجد فعاليات قادمة', 'تابعي التقويم لمعرفة المواعيد الجديدة.');

  // المسابقات المفتوحة/القادمة
  if (data.competitions.length) {
    $('#home-comps').innerHTML = `<div class="section-head" style="margin-bottom:14px"><h2 style="font-size:24px">${I.STAR}مسابقات مفتوحة وقادمة</h2><a class="link-more" href="competitions.html">كل المسابقات</a></div>
      <div class="event-list">${data.competitions.map((c) => `<button class="event-row" type="button" data-open="${c.id}">
        <span class="date-chip" style="background:var(--purple)">${icon('trophy', 'icon')}</span>
        <span style="display:grid;gap:2px"><span style="display:flex;gap:6px">${I.demoBadge(c)}${I.statusBadge(c)}</span><h3>${esc(c.title)}</h3>
        <span class="meta"><span>${icon('calendar-days')}${fmtDate(c.date)}${c.end_date ? ' – ' + fmtDate(c.end_date) : ''}</span></span></span></button>`).join('')}</div>`;
    $$('#home-comps .date-chip .icon').forEach((s) => { s.style.cssText = 'width:28px;height:28px;color:var(--gold);margin:6px auto'; });
  }

  // الإنجازات المميزة
  $('#home-achievements').innerHTML = data.featured_achievements.length
    ? data.featured_achievements.slice(0, 5).map(I.card).join('')
    : `<div style="grid-column:1/-1">${I.emptyState('لا توجد إنجازات منشورة بعد', 'وثّقي أول إنجاز من لوحة التحكم ليظهر هنا.')}</div>`;

  // المشاركات
  $('#home-participations').innerHTML = data.participations.length
    ? data.participations.map(I.card).join('')
    : `<div style="color:rgba(255,255,255,.7)">لا توجد مشاركات منشورة بعد.</div>`;

  // لوحة الشرف
  if (data.honor.length) {
    $('#home-honor-wrap').hidden = false;
    $('#home-honor').innerHTML = data.honor.map(honorRow).join('');
  }

  function honorRow(h) {
    return `<button class="honor-row" type="button" data-open="${h.id}">
      <span class="rk">${h.rank ?? '—'}</span>
      <span class="av">${h.cover ? `<img src="${esc(h.cover)}" alt="" loading="lazy">` : icon('graduation-cap')}</span>
      <span><b style="font-family:var(--display);font-size:19px">${esc(h.title)}</b><br><small style="color:var(--ink-3)">${esc(h.summary)}</small></span>
      <span class="badge gold">${esc(h.distinction || 'تميّز')}</span></button>`;
  }
});
