/* صفحة التواصل */
document.addEventListener('DOMContentLoaded', async () => {
  const I = window.Ibdaa;
  const { $, esc, icon } = I;
  const root = $('#page-root');
  root.style.paddingTop = '48px';
  root.innerHTML = `<div class="contact-grid">
    <aside class="panel" id="contact-info"></aside>
    <form class="panel" id="contact-form" novalidate>
      <h2 style="font-size:26px;margin-bottom:6px">أرسلي استفسارك</h2>
      <p style="color:var(--ink-2);margin-bottom:20px">تصل رسالتك مباشرة إلى مسؤولة النشاط الطلابي، وسيتم الرد عليك عبر وسيلة التواصل التي تكتبينها.</p>
      <div class="form-grid">
        <label class="field">الاسم *<input class="input" name="name" required maxlength="120" autocomplete="name"></label>
        <label class="field">وسيلة التواصل (جوال أو بريد)<input class="input" name="contact" maxlength="160" autocomplete="email"></label>
        <label class="field full">الموضوع
          <select class="input" name="subject"><option>استفسار عن مسابقة</option><option>استفسار عن فعالية</option><option>اقتراح نشاط</option><option>توثيق إنجاز</option><option>أخرى</option></select></label>
        <label class="field full">نص الرسالة *<textarea class="input" name="body" required minlength="5" maxlength="4000"></textarea></label>
        <label class="hp" aria-hidden="true">اتركي هذا الحقل فارغاً<input name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <p id="form-msg" role="alert" style="margin-top:12px;color:var(--danger);min-height:1.5em"></p>
      <button class="btn btn-primary" type="submit">${icon('send')} إرسال الرسالة</button>
    </form></div>`;

  const s = await I.settings();
  const lines = [
    ['school', 'المدرسة', s.school_name],
    ['star', 'مسؤولة النشاط الطلابي', s.activity_lead],
    ['building-2', 'مديرة المدرسة', s.principal],
  ];
  if (s.contact_email) lines.push(['mail', 'البريد الإلكتروني', `<a href="mailto:${esc(s.contact_email)}">${esc(s.contact_email)}</a>`, true]);
  if (s.contact_phone) lines.push(['message-square', 'الهاتف', `<a href="tel:${esc(s.contact_phone)}" dir="ltr">${esc(s.contact_phone)}</a>`, true]);
  $('#contact-info').innerHTML = `<h2 style="font-size:24px;margin-bottom:8px">${esc(s.platform_name)}</h2>` +
    lines.map(([ic, label, val, raw]) => `<div class="info-line"><span class="qi">${icon(ic)}</span><div><small>${label}</small><b>${raw ? val : esc(val)}</b></div></div>`).join('');

  const form = $('#contact-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#form-msg');
    msg.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    if (!data.name.trim()) { msg.textContent = 'يرجى كتابة الاسم.'; form.elements.name.focus(); return; }
    if (data.body.trim().length < 5) { msg.textContent = 'يرجى كتابة نص الرسالة (5 أحرف على الأقل).'; form.elements.body.focus(); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await I.api('/contact', { method: 'POST', body: JSON.stringify(data) });
      form.innerHTML = `<div class="empty" style="border-style:solid">${icon('circle-check', 'icon')}<h3>تم إرسال رسالتك</h3><p>شكراً لتواصلك، ستطّلع عليها مسؤولة النشاط الطلابي قريباً.</p></div>`;
      form.querySelector('.icon').style.cssText = 'width:54px;height:54px;color:var(--ok);margin:0 auto 12px;display:block';
    } catch (err) {
      msg.textContent = err.message;
      btn.disabled = false;
    }
  });
});
