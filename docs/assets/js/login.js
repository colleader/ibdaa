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
  const initialHash = window.IBDAA_INITIAL_HASH || location.hash;
  const invited = /type=invite/.test(initialHash);
  let recovering = invited || /type=recovery/.test(initialHash);
  if (/error_code=otp_expired|error=access_denied/.test(initialHash)) show('انتهت صلاحية الرابط. اكتبي بريدك واضغطي «نسيتِ كلمة المرور؟» ليصلك رابط جديد.');
  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY' || (invited && event === 'SIGNED_IN')) { recovering = true; showReset(); }
  });
  function showReset() {
    form.hidden = true; document.getElementById('forgot').hidden = true; resetForm.hidden = false;
    if (invited) resetForm.querySelector('p').textContent = 'مرحباً بكِ في لوحة تحكم إبداع الوزية. اختاري كلمة مرور لحسابك.';
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

  // ---------- إنشاء حساب معلمة ----------
  const signupForm = document.getElementById('signup-form');
  const toggle = document.getElementById('signup-toggle');
  toggle.addEventListener('click', () => {
    const open = signupForm.hidden;
    signupForm.hidden = !open; form.hidden = open;
    document.getElementById('forgot').hidden = open;
    toggle.textContent = open ? 'لديكِ حساب؟ سجّلي الدخول' : 'معلمة جديدة؟ أنشئي حسابك';
    (open ? signupForm.elements.email : form.elements.email).focus();
  });
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const e3 = document.getElementById('err3');
    e3.style.color = ''; e3.textContent = '';
    const email = signupForm.elements.email.value.trim().toLowerCase();
    const a = signupForm.elements.pw1.value, b = signupForm.elements.pw2.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { e3.textContent = 'اكتبي بريداً إلكترونياً صحيحاً.'; return; }
    if (a.length < 8) { e3.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'; return; }
    if (a !== b) { e3.textContent = 'التأكيد غير مطابق.'; return; }
    const btn = signupForm.querySelector('[type=submit]');
    btn.disabled = true;
    const { data: ok } = await sb.rpc('is_invited', { e: email });
    if (!ok) { btn.disabled = false; e3.textContent = 'هذا البريد غير مضاف بعد. اطلبي من مسؤولة النشاط إضافتك من «المعلمات والصلاحيات».'; return; }
    const { data, error } = await sb.auth.signUp({ email, password: a, options: { emailRedirectTo: new URL('login.html', location.href).href } });
    btn.disabled = false;
    if (error) {
      e3.textContent = /registered|exists/i.test(error.message) ? 'هذا البريد له حساب مسبقاً. سجّلي الدخول، أو استخدمي «نسيتِ كلمة المرور؟».'
        : /rate|many/i.test(error.message) ? 'محاولات كثيرة، انتظري ساعة تقريباً ثم حاولي مجدداً.'
        : /weak|password/i.test(error.message) ? 'كلمة المرور ضعيفة، استخدمي حروفاً وأرقاماً.' : 'تعذّر إنشاء الحساب: ' + error.message;
      return;
    }
    if (data.session) { location.replace('admin.html'); return; }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      e3.textContent = 'هذا البريد له حساب مسبقاً. سجّلي الدخول، أو استخدمي «نسيتِ كلمة المرور؟».'; return;
    }
    signupForm.reset();
    e3.style.color = 'var(--ok)';
    e3.textContent = 'تم إنشاء الحساب. أرسلنا رسالة تأكيد إلى بريدك، افتحيها واضغطي الرابط ثم تدخلين مباشرة.';
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
