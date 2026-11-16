/* صفحة دخول لوحة التحكم */
document.addEventListener('DOMContentLoaded', async () => {
  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = JSON.parse(t); } catch { /* تجاهل */ }
  const D = window.IbdaaData;
  const sb = D.sb;
  const form = document.getElementById('login-form');
  const resetForm = document.getElementById('reset-form');
  const err = document.getElementById('err');
  const pw = form.elements.password;
  const show = (msg) => { err.textContent = msg; };

  if (!sb) { show('لم يتم ربط المنصة بقاعدة البيانات بعد. أضيفي بيانات Supabase في ملف config.js.'); form.querySelector('[type=submit]').disabled = true; return; }

  // رابط استعادة كلمة المرور من البريد
  let recovering = /type=recovery/.test(location.hash);
  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') { recovering = true; showReset(); }
  });
  function showReset() {
    form.hidden = true; document.getElementById('forgot').hidden = true; resetForm.hidden = false;
    resetForm.elements.pw1.focus();
  }
  if (recovering) showReset();

  if (new URLSearchParams(location.search).get('denied')) {
    await sb.auth.signOut();
    show('هذا الحساب ليس له صلاحية إدارة المنصة.');
  } else if (!recovering) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) { location.replace('admin.html'); return; }
  }

  form.querySelector('.pw-toggle').addEventListener('click', (e) => {
    const vis = pw.type === 'password';
    pw.type = vis ? 'text' : 'password';
    e.currentTarget.setAttribute('aria-label', vis ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    e.currentTarget.querySelector('use').setAttribute('href', 'assets/icons.svg#i-' + (vis ? 'eye-off' : 'eye'));
  });
  if (!recovering) form.elements.email.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    show('');
    const email = form.elements.email.value.trim();
    if (!email || !pw.value) { show('يرجى إدخال البريد الإلكتروني وكلمة المرور.'); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email, password: pw.value });
    if (error) {
      btn.disabled = false;
      show(/invalid/i.test(error.message) ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
        : /rate|many/i.test(error.message) ? 'محاولات كثيرة، انتظري قليلاً ثم حاولي مجدداً.'
        : /confirm/i.test(error.message) ? 'لم يتم تأكيد هذا البريد بعد.' : 'تعذّر تسجيل الدخول: ' + error.message);
      pw.select();
      return;
    }
    const { data: isAdmin } = await sb.rpc('is_admin');
    if (!isAdmin) { await sb.auth.signOut(); btn.disabled = false; show('هذا الحساب ليس له صلاحية إدارة المنصة.'); return; }
    location.replace('admin.html');
  });

  document.getElementById('forgot').addEventListener('click', async () => {
    const email = form.elements.email.value.trim();
    if (!email) { show('اكتبي بريدك الإلكتروني أولاً ثم اضغطي «نسيتِ كلمة المرور؟».'); form.elements.email.focus(); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: new URL('login.html', location.href).href });
    err.style.color = error ? '' : 'var(--ok)';
    show(error ? 'تعذّر الإرسال، حاولي بعد قليل.' : 'أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.');
  });

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const e2 = document.getElementById('err2');
    const a = resetForm.elements.pw1.value, b = resetForm.elements.pw2.value;
    if (a.length < 8) { e2.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'; return; }
    if (a !== b) { e2.textContent = 'التأكيد غير مطابق.'; return; }
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { e2.textContent = 'تعذّر الحفظ: ' + error.message; return; }
    location.replace('admin.html');
  });
});
