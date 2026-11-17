/* بوابة الطالبات: الدخول باسم مستخدم، التسجيل في المسابقات والفعاليات، رفع الأعمال */
document.addEventListener('DOMContentLoaded', async () => {
  const I = window.Ibdaa;
  const D = window.IbdaaData;
  const sb = D.sb;
  const { $, $$, esc, icon, fmtDate } = I;
  const root = $('#page-root');
  root.style.paddingTop = '40px';
  const DOMAIN = 'students.ibdaa.invalid';
  const GRADES = ['الأول متوسط', 'الثاني متوسط', 'الثالث متوسط'];
  const params = new URLSearchParams(location.search);
  const joinId = parseInt(params.get('join'), 10) || null;
  const MAX = 50 * 1024 * 1024;

  if (!sb) { root.innerHTML = I.emptyState('البوابة غير متاحة', 'لم يتم ربط المنصة بقاعدة البيانات بعد.'); return; }

  const S = { registrations: 'التسجيل', submissions: 'الأعمال' };
  const STATUS = {
    pending: ['بانتظار المراجعة', 'warn'], accepted: ['مقبول', 'ok'], approved: ['تم النشر', 'ok'], rejected: ['لم يُقبل', 'muted'],
  };
  const badge = (s) => `<span class="badge ${STATUS[s][1]}">${STATUS[s][0]}</span>`;

  async function route() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return authView();
    const { data: me } = await sb.rpc('my_student');
    if (!me) {
      root.innerHTML = `<div class="panel" style="max-width:560px;margin:0 auto;text-align:center">${icon('circle-alert', 'icon big-ic')}
        <h2 style="font-size:24px;margin:8px 0">هذا الحساب ليس حساب طالبة</h2><p style="color:var(--ink-2)">أنتِ مسجّلة الدخول بحساب الإدارة. لوحة التحكم من هنا:</p>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:16px"><a class="btn btn-primary" href="admin.html">لوحة التحكم</a><button class="btn btn-ghost" id="out">تسجيل الخروج</button></div></div>`;
      $('#out').onclick = async () => { await sb.auth.signOut(); route(); };
      return;
    }
    if (me.status !== 'approved') return waitingView(me);
    return portalView(me);
  }

  // ---------- الدخول وإنشاء الحساب ----------
  function authView() {
    root.innerHTML = `<div class="contact-grid">
      <form class="panel" id="login" novalidate>
        <h2 style="font-size:26px;margin-bottom:6px">دخول الطالبة</h2>
        <p style="color:var(--ink-2);margin-bottom:18px">ادخلي باسم المستخدم وكلمة المرور.</p>
        <div class="form-grid" style="grid-template-columns:1fr">
          <label class="field">اسم المستخدم<input class="input" name="username" autocomplete="username" dir="ltr" required></label>
          <label class="field">كلمة المرور<input class="input" name="password" type="password" autocomplete="current-password" dir="ltr" required></label>
        </div>
        <p class="form-msg" role="alert"></p>
        <button class="btn btn-gold" style="width:100%">${icon('lock')} دخول</button>
        <p style="color:var(--ink-3);font-size:14.5px;margin-top:14px">نسيتِ كلمة المرور؟ اطلبي من مسؤولة النشاط تعيين كلمة جديدة لك.</p>
      </form>
      <form class="panel" id="signup" novalidate>
        <h2 style="font-size:26px;margin-bottom:6px">حساب جديد</h2>
        <p style="color:var(--ink-2);margin-bottom:18px">لا تحتاجين بريداً إلكترونياً. بعد التسجيل تراجع مسؤولة النشاط طلبك وتفعّله.</p>
        <div class="form-grid">
          <label class="field full">الاسم الكامل *<input class="input" name="full_name" maxlength="80" required></label>
          <label class="field">الصف *<select class="input" name="grade">${GRADES.map((g) => `<option>${g}</option>`).join('')}</select></label>
          <label class="field">اسم المستخدم *<input class="input" name="username" dir="ltr" maxlength="30" placeholder="مثال: sara.ali" required></label>
          <label class="field">كلمة المرور *<input class="input" name="pw1" type="password" dir="ltr" autocomplete="new-password" minlength="8" required></label>
          <label class="field">تأكيد كلمة المرور *<input class="input" name="pw2" type="password" dir="ltr" autocomplete="new-password" required></label>
        </div>
        <p style="color:var(--ink-3);font-size:14px;margin-top:8px">اسم المستخدم: حروف إنجليزية صغيرة أو أرقام، ويمكن استخدام النقطة. كلمة المرور 8 أحرف على الأقل.</p>
        <p class="form-msg" role="alert"></p>
        <button class="btn btn-primary">${icon('plus')} إنشاء الحساب</button>
      </form></div>`;
    const msg = (f, t, ok) => { const m = $('.form-msg', f); m.textContent = t; m.style.color = ok ? 'var(--ok)' : 'var(--danger)'; };
    const login = $('#login');
    login.onsubmit = async (e) => {
      e.preventDefault();
      const u = login.elements.username.value.trim().toLowerCase();
      const p = login.elements.password.value;
      if (!u || !p) return msg(login, 'اكتبي اسم المستخدم وكلمة المرور.');
      const btn = $('button', login); btn.disabled = true;
      const { error } = await sb.auth.signInWithPassword({ email: `${u}@${DOMAIN}`, password: p });
      btn.disabled = false;
      if (error) return msg(login, /invalid/i.test(error.message) ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : /rate|many/i.test(error.message) ? 'محاولات كثيرة، انتظري قليلاً.' : 'تعذّر الدخول، حاولي مجدداً.');
      route();
    };
    const su = $('#signup');
    su.onsubmit = async (e) => {
      e.preventDefault();
      const f = su.elements;
      const body = { action: 'signup', full_name: f.full_name.value.trim(), grade: f.grade.value, username: f.username.value.trim().toLowerCase(), password: f.pw1.value };
      if (body.full_name.length < 3) return msg(su, 'اكتبي اسمك الكامل.');
      if (!/^[a-z0-9_.]{3,30}$/.test(body.username)) return msg(su, 'اسم المستخدم: من 3 إلى 30 حرفاً إنجليزياً صغيراً أو رقماً، بدون مسافات.');
      if (body.password.length < 8) return msg(su, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      if (body.password !== f.pw2.value) return msg(su, 'تأكيد كلمة المرور غير مطابق.');
      const btn = $('button', su); btn.disabled = true;
      const { data, error } = await sb.functions.invoke('students', { body });
      if (error || data?.error) {
        btn.disabled = false;
        let t = data?.error;
        if (!t && error?.context?.json) { try { t = (await error.context.json()).error; } catch { /* تجاهل */ } }
        return msg(su, t || 'تعذّر إنشاء الحساب، حاولي مجدداً.');
      }
      const { error: e2 } = await sb.auth.signInWithPassword({ email: `${body.username}@${DOMAIN}`, password: body.password });
      btn.disabled = false;
      if (e2) return msg(su, 'تم إنشاء الحساب. ادخلي باسم المستخدم وكلمة المرور.', true);
      route();
    };
  }

  function waitingView(me) {
    const rej = me.status === 'rejected';
    root.innerHTML = `<div class="panel" style="max-width:600px;margin:0 auto;text-align:center">
      ${icon(rej ? 'circle-alert' : 'clock', 'icon big-ic')}
      <h2 style="font-size:26px;margin:10px 0 6px">أهلاً ${esc(me.full_name)}</h2>
      <p style="color:var(--ink-2);font-size:18px">${rej ? 'لم يُقبل طلب حسابك. تواصلي مع مسؤولة النشاط الطلابي.' : 'حسابك بانتظار موافقة مسؤولة النشاط. بعد الموافقة تستطيعين التسجيل في المسابقات ورفع أعمالك.'}</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:18px"><button class="btn btn-primary" id="refresh">${icon('refresh-cw')} تحديث</button><button class="btn btn-ghost" id="out">${icon('log-out')} خروج</button></div></div>`;
    $('#refresh').onclick = route;
    $('#out').onclick = async () => { await sb.auth.signOut(); route(); };
  }

  // ---------- البوابة ----------
  async function portalView(me) {
    root.innerHTML = `<div class="portal-head panel">
        <span class="qi-big">${icon('graduation-cap')}</span>
        <div><h2 style="font-size:26px">أهلاً ${esc(me.full_name)}</h2><p style="color:var(--ink-3)">${esc(me.grade)}<span dir="ltr" style="margin-inline-start:10px">@${esc(me.username)}</span></p></div>
        <button class="btn btn-ghost btn-sm" id="out" style="margin-inline-start:auto">${icon('log-out')} خروج</button>
      </div>
      <div class="chips" role="tablist" style="margin:22px 0">
        <button class="chip" data-tab="open" aria-pressed="true">${icon('trophy')} المسابقات والفعاليات</button>
        <button class="chip" data-tab="mine" aria-pressed="false">${icon('list-checks')} تسجيلاتي</button>
        <button class="chip" data-tab="work" aria-pressed="false">${icon('upload')} أعمالي وإنجازاتي</button>
      </div>
      <div id="tab"></div>`;
    $('#out').onclick = async () => { await sb.auth.signOut(); route(); };
    const tabs = { open: openTab, mine: mineTab, work: workTab };
    const go = (k) => { $$('[data-tab]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.tab === k))); tabs[k](me); };
    $$('[data-tab]').forEach((c) => c.onclick = () => go(c.dataset.tab));
    go('open');
    if (joinId) openJoin(joinId, me);
  }

  async function myRegs() {
    const { data } = await sb.from('registrations').select('id, item_id, status, note, created_at').order('id', { ascending: false });
    return data || [];
  }

  async function openTab(me) {
    const tab = $('#tab');
    tab.innerHTML = '<div class="skeleton" style="min-height:120px"></div>';
    const [all, regs] = await Promise.all([D.loadAll(true), myRegs()]);
    const list = all.filter((i) => i.visible && ['competition', 'event'].includes(i.type) && i.computed_status !== 'closed')
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const byItem = Object.fromEntries(regs.map((r) => [r.item_id, r]));
    tab.innerHTML = list.length ? `<div class="join-list">${list.map((it) => {
      const r = byItem[it.id];
      return `<div class="join-row">
        <div class="th">${it.cover ? `<img src="${esc(it.cover)}" alt="">` : icon(it.type === 'event' ? 'calendar-days' : 'trophy')}</div>
        <div class="tt"><div style="display:flex;gap:6px;flex-wrap:wrap">${I.demoBadge(it)}${I.statusBadge(it)}<span class="badge muted">${it.type === 'event' ? 'فعالية' : 'مسابقة'}</span></div>
          <b>${esc(it.title)}</b><small>${it.date ? fmtDate(it.date) : ''}${it.end_date && it.end_date !== it.date ? ' – ' + fmtDate(it.end_date) : ''}</small></div>
        <div class="acts">${r ? badge(r.status) : `<button class="btn btn-primary btn-sm" data-join="${it.id}">${icon('plus')} سجّليني</button>`}
          <button class="btn btn-ghost btn-sm" data-open="${it.id}">التفاصيل</button></div></div>`;
    }).join('')}</div>` : I.emptyState('لا توجد مسابقات أو فعاليات مفتوحة الآن', 'ستظهر هنا فور الإعلان عنها.');
    I.remember(list);
    $$('[data-join]', tab).forEach((b) => b.onclick = () => openJoin(+b.dataset.join, me));
  }

  function openJoin(id, me) {
    D.loadAll().then((all) => {
      const it = all.find((x) => x.id === id && x.visible);
      if (!it) return I.toast('هذه المسابقة غير متاحة', 'err');
      const box = document.createElement('div');
      box.className = 'modal open';
      box.innerHTML = `<div class="modal-box" style="width:min(520px,100%);padding:28px"><h2 style="font-size:24px;margin-bottom:6px">التسجيل في: ${esc(it.title)}</h2>
        <p style="color:var(--ink-2);margin-bottom:14px">سيصل طلبك إلى مسؤولة النشاط باسمك (${esc(me.full_name)} – ${esc(me.grade)}).</p>
        ${it.conditions ? `<div class="info" style="margin-bottom:14px"><small>شروط المشاركة</small><span style="white-space:pre-line">${esc(it.conditions)}</span></div>` : ''}
        <label class="field">ملاحظة (اختياري)<textarea class="input" id="note" maxlength="500" style="min-height:90px" placeholder="مثال: سأشارك بقصيدة من تأليفي"></textarea></label>
        <div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-primary" id="ok">${icon('send')} إرسال الطلب</button><button class="btn btn-ghost" id="cancel">إلغاء</button></div></div>`;
      document.body.append(box);
      const close = () => { box.remove(); history.replaceState(null, '', location.pathname); };
      $('#cancel', box).onclick = close;
      box.onclick = (e) => { if (e.target === box) close(); };
      $('#ok', box).onclick = async () => {
        $('#ok', box).disabled = true;
        const { error } = await sb.from('registrations').insert({ item_id: id, note: $('#note', box).value.trim() });
        if (error) { $('#ok', box).disabled = false; return I.toast(/duplicate|unique/i.test(error.message) ? 'سجّلتِ في هذه المسابقة مسبقاً' : 'تعذّر إرسال الطلب', 'err'); }
        close(); I.toast('وصل طلبك لمسؤولة النشاط'); openTab(me);
      };
    });
  }

  async function mineTab() {
    const tab = $('#tab');
    const [all, regs] = await Promise.all([D.loadAll(), myRegs()]);
    const byId = Object.fromEntries(all.map((i) => [i.id, i]));
    tab.innerHTML = regs.length ? `<div class="join-list">${regs.map((r) => {
      const it = byId[r.item_id];
      return `<div class="join-row"><div class="th">${it?.cover ? `<img src="${esc(it.cover)}" alt="">` : icon('trophy')}</div>
        <div class="tt"><b>${esc(it ? it.title : 'مسابقة لم تعد متاحة')}</b><small>أُرسل ${fmtDate(r.created_at)}${r.note ? ' — ' + esc(r.note) : ''}</small></div>
        <div class="acts">${badge(r.status)}${r.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-cancel="${r.id}">إلغاء</button>` : ''}</div></div>`;
    }).join('')}</div>` : I.emptyState('لم تسجّلي في أي مسابقة بعد', 'سجّلي من تبويب «المسابقات والفعاليات».');
    $$('[data-cancel]', tab).forEach((b) => b.onclick = async () => {
      const { error } = await sb.from('registrations').delete().eq('id', +b.dataset.cancel);
      if (error) return I.toast('تعذّر الإلغاء', 'err');
      I.toast('أُلغي التسجيل'); mineTab();
    });
  }

  // ---------- رفع الأعمال ----------
  async function compress(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
    try {
      const bmp = await createImageBitmap(file);
      const s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
      return blob && blob.size < file.size ? new File([blob], 'image.jpg', { type: 'image/jpeg' }) : file;
    } catch { return file; }
  }
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'application/pdf': 'pdf' };

  async function workTab(me) {
    const tab = $('#tab');
    tab.innerHTML = `<form class="panel" id="up" novalidate style="margin-bottom:24px">
        <h3 style="font-size:22px;margin-bottom:12px">${icon('upload')} ارفعي عملاً أو إنجازاً</h3>
        <div class="form-grid">
          <label class="field">النوع<select class="input" name="kind"><option value="work">عمل إبداعي (رسم، تصميم، مشروع…)</option><option value="achievement">إنجاز أو شهادة</option></select></label>
          <label class="field">التصنيف<input class="input" name="category" list="cats" maxlength="80" placeholder="مثال: فنية"><datalist id="cats"><option>فنية</option><option>علمية</option><option>ثقافية</option><option>تقنية</option><option>رياضية</option></datalist></label>
          <label class="field full">العنوان *<input class="input" name="title" maxlength="200" required></label>
          <label class="field full">وصف قصير<textarea class="input" name="description" maxlength="3000" style="min-height:90px"></textarea></label>
          <label class="field full">الملفات (صور، فيديو حتى 50 ميجابايت، أو PDF)<input class="input" type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf"></label>
        </div>
        <p class="form-msg" role="alert" style="min-height:1.4em;margin-top:8px"></p>
        <button class="btn btn-primary">${icon('send')} إرسال للمراجعة</button>
      </form><h3 style="font-size:22px;margin-bottom:12px">ما أرسلتِه</h3><div id="subs" class="join-list"></div>`;
    const f = $('#up');
    const msg = (t, ok) => { const m = $('.form-msg', f); m.textContent = t; m.style.color = ok ? 'var(--ok)' : 'var(--danger)'; };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const title = f.elements.title.value.trim();
      const files = [...f.elements.files.files];
      if (title.length < 2) return msg('اكتبي عنوان العمل.');
      if (!files.length) return msg('أرفقي ملفاً واحداً على الأقل.');
      const bad = files.find((x) => !EXT[x.type]);
      if (bad) return msg(`صيغة غير مدعومة: ${bad.name}`);
      const big = files.find((x) => !x.type.startsWith('image/') && x.size > MAX);
      if (big) return msg(`الملف أكبر من 50 ميجابايت: ${big.name}`);
      const btn = $('button', f); btn.disabled = true;
      const { data: sub, error } = await sb.from('submissions').insert({ kind: f.elements.kind.value, title, description: f.elements.description.value.trim(), category: f.elements.category.value.trim() }).select('id').single();
      if (error) { btn.disabled = false; return msg('تعذّر الإرسال، حاولي مجدداً.'); }
      let done = 0;
      for (const raw of files) {
        msg(`جارٍ رفع الملفات ${done + 1} من ${files.length}…`, true);
        const file = await compress(raw);
        const path = `submissions/${me.id}/${sub.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT[file.type]}`;
        const up = await sb.storage.from('media').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
        if (!up.error) {
          const url = sb.storage.from('media').getPublicUrl(path).data.publicUrl;
          await sb.from('submission_files').insert({ submission_id: sub.id, url, path, mime: file.type, kind: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'pdf', size: file.size });
        }
        done++;
      }
      btn.disabled = false; f.reset(); msg('وصل عملك لمسؤولة النشاط للمراجعة.', true);
      loadSubs();
    };
    loadSubs();
  }
  async function loadSubs() {
    const box = $('#subs'); if (!box) return;
    const { data } = await sb.from('submissions').select('*, submission_files(*)').order('id', { ascending: false });
    const list = data || [];
    box.innerHTML = list.length ? list.map((s) => {
      const img = (s.submission_files || []).find((x) => x.kind === 'image');
      return `<div class="join-row"><div class="th">${img ? `<img src="${esc(img.url)}" alt="">` : icon(s.kind === 'achievement' ? 'award' : 'palette')}</div>
        <div class="tt"><b>${esc(s.title)}</b><small>${s.kind === 'achievement' ? 'إنجاز' : 'عمل إبداعي'} — ${fmtDate(s.created_at)}${s.admin_note ? ` — ملاحظة المسؤولة: ${esc(s.admin_note)}` : ''}</small></div>
        <div class="acts">${badge(s.status)}${s.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-del="${s.id}">حذف</button>` : ''}</div></div>`;
    }).join('') : '<p style="color:var(--ink-3)">لم ترسلي أعمالاً بعد.</p>';
    $$('[data-del]', box).forEach((b) => b.onclick = async () => {
      const s = list.find((x) => x.id === +b.dataset.del);
      const paths = (s.submission_files || []).map((x) => x.path);
      const { error } = await sb.from('submissions').delete().eq('id', s.id);
      if (error) return I.toast('تعذّر الحذف', 'err');
      if (paths.length) await sb.storage.from('media').remove(paths);
      I.toast('حُذف'); loadSubs();
    });
  }

  route();
});
