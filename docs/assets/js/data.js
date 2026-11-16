/* طبقة البيانات المشتركة: الاتصال بـ Supabase وتجهيز المحتوى للعرض */
(() => {
  'use strict';
  const cfg = window.IBDAA_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !/YOUR|ضعي/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY);
  window.IBDAA_INITIAL_HASH = location.hash; // يُقرأ قبل أن تستهلكه مكتبة الدخول (روابط الدعوة واستعادة كلمة المرور)
  const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ibdaa-auth', flowType: 'implicit', detectSessionInUrl: true },
  }) : null;

  const TYPES = ['competition', 'achievement', 'participation', 'event', 'news', 'gallery', 'honor'];

  const today = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10); // توقيت الرياض

  function computeStatus(it) {
    if (it.type !== 'competition' && it.type !== 'event') return null;
    if (it.status && it.status !== 'auto') return it.status;
    const t = today();
    const start = it.date || null;
    const end = it.end_date || it.date || null;
    if (!start) return 'open';
    if (start > t) return 'upcoming';
    if (end && end < t) return 'closed';
    return 'open';
  }

  // رابط الملف: إما رابط كامل من التخزين أو مسار داخل الموقع (صور البيانات التجريبية)
  const mediaUrl = (m) => m.url;

  function shape(r) {
    const media = (r.media || []).slice().sort((a, b) => (a.sort - b.sort) || (a.id - b.id))
      .map((m) => ({ ...m, url: mediaUrl(m) }));
    const cover = media.find((m) => m.id === r.cover_id && m.kind === 'image') || media.find((m) => m.kind === 'image') || null;
    return {
      ...r,
      winners: Array.isArray(r.winners) ? r.winners : [],
      visible: !!r.visible, featured: !!r.featured, is_demo: !!r.is_demo,
      computed_status: computeStatus(r),
      cover: cover ? cover.url : null,
      media_count: media.length,
      has_video: media.some((m) => m.kind === 'video'),
      media,
    };
  }

  const sortKey = (it) => it.date || (it.created_at || '').slice(0, 10);
  const byDateDesc = (a, b) => (sortKey(b).localeCompare(sortKey(a))) || (b.id - a.id);
  const byDateAsc = (a, b) => (sortKey(a).localeCompare(sortKey(b))) || (a.id - b.id);
  const byRank = (a, b) => ((a.rank == null) - (b.rank == null)) || ((a.rank || 0) - (b.rank || 0)) || byDateDesc(a, b);

  function filterItems(all, { type, q, year, category, level, status, featured }) {
    const needle = (q || '').trim();
    return all.filter((it) => {
      if (type && it.type !== type) return false;
      if (year && sortKey(it).slice(0, 4) !== String(year)) return false;
      if (category && it.category !== category) return false;
      if (level && it.level !== level) return false;
      if (featured && !it.featured) return false;
      if (status && it.computed_status !== status) return false;
      if (needle) {
        const hay = [it.title, it.summary, it.body, it.people, it.category, it.distinction, it.location, ...(it.winners || []).map((w) => w.name)].join(' ');
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }

  function splitNames(s) { return String(s || '').split(/[،,\n؛;]/).map((x) => x.trim()).filter((x) => x.length > 1); }

  function computeStats(all, settings) {
    const c = (t) => all.filter((i) => i.type === t).length;
    let students = parseInt(settings.students_count, 10) || 0;
    if (settings.students_mode !== 'manual') {
      const names = new Set();
      all.filter((i) => ['competition', 'achievement', 'participation', 'honor'].includes(i.type)).forEach((r) => {
        splitNames(r.people).forEach((n) => { if (!/فريق/.test(n)) names.add(n); });
        (r.winners || []).forEach((w) => w && w.name && names.add(String(w.name).trim()));
      });
      students = names.size;
    }
    return { competitions: c('competition'), achievements: c('achievement'), participations: c('participation'), events: c('event'), students };
  }

  function fail(error) {
    const msg = error && error.message ? error.message : String(error || '');
    if (/fetch|network/i.test(msg)) return new Error('تعذّر الاتصال بالإنترنت، حاولي مرة أخرى');
    if (/paused|restor/i.test(msg)) return new Error('قاعدة البيانات متوقفة مؤقتاً، يرجى إبلاغ مسؤولة النشاط');
    return new Error(msg || 'حدث خطأ غير متوقع');
  }
  function notConfigured() { return new Error('لم يتم ربط المنصة بقاعدة البيانات بعد (ملف config.js)'); }

  // ---------- قراءة البيانات ----------
  let allPromise = null;
  function loadAll(force = false) {
    if (!sb) return Promise.reject(notConfigured());
    if (!allPromise || force) {
      allPromise = sb.from('items').select('*, media(*)').then(({ data, error }) => {
        if (error) throw fail(error);
        return data.map(shape);
      });
      allPromise.catch(() => { allPromise = null; });
    }
    return allPromise;
  }

  let settingsPromise = null;
  function loadSettings() {
    if (!sb) return Promise.reject(notConfigured());
    if (!settingsPromise) {
      settingsPromise = sb.from('settings').select('key, value').then(({ data, error }) => {
        if (error) throw fail(error);
        const s = {};
        data.forEach((r) => { s[r.key] = r.value; });
        return s;
      });
      settingsPromise.catch(() => { settingsPromise = null; });
    }
    return settingsPromise;
  }

  const publicOnly = (all) => all.filter((i) => i.visible);

  // واجهة متوافقة مع مسارات الخادم السابقة
  async function api(path, opts = {}) {
    const url = new URL(path, 'http://x');
    const p = url.pathname;
    const q = Object.fromEntries(url.searchParams);

    if (p === '/settings') {
      const [s, all] = await Promise.all([loadSettings(), loadAll().catch(() => [])]);
      return { ...s, demo_count: all.filter((i) => i.is_demo).length };
    }
    if (p === '/home') {
      const [all, s] = await Promise.all([loadAll().then(publicOnly), loadSettings()]);
      const ofType = (t) => all.filter((i) => i.type === t);
      let featured = ofType('achievement').filter((i) => i.featured).sort(byDateDesc);
      if (featured.length < 3) featured = ofType('achievement').sort(byDateDesc);
      return {
        stats: computeStats(all, s),
        news: ofType('news').sort(byDateDesc).slice(0, 4),
        events: ofType('event').sort(byDateAsc).filter((e) => e.computed_status !== 'closed').slice(0, 4),
        featured_achievements: featured.slice(0, 6),
        participations: ofType('participation').sort(byDateDesc).slice(0, 6),
        competitions: ofType('competition').sort(byDateDesc).filter((c) => c.computed_status !== 'closed').slice(0, 3),
        honor: ofType('honor').sort(byRank).slice(0, 4),
      };
    }
    if (p === '/items') {
      if (q.type && !TYPES.includes(q.type)) throw new Error('نوع غير معروف');
      const all = publicOnly(await loadAll());
      let list = filterItems(all, q);
      list.sort(q.sort === 'rank' ? byRank : q.sort === 'date_asc' ? byDateAsc : byDateDesc);
      const ofType = q.type ? all.filter((i) => i.type === q.type) : all;
      const years = [...new Set(ofType.map((i) => sortKey(i).slice(0, 4)).filter(Boolean))].sort().reverse();
      const categories = [...new Set(ofType.map((i) => i.category).filter(Boolean))].sort();
      const offset = parseInt(q.offset, 10) || 0;
      const limit = Math.min(parseInt(q.limit, 10) || 24, 500);
      return { total: list.length, items: list.slice(offset, offset + limit), years, categories };
    }
    const m = p.match(/^\/items\/(\d+)$/);
    if (m) {
      const all = publicOnly(await loadAll());
      const it = all.find((i) => i.id === +m[1]);
      if (!it) throw new Error('هذا المحتوى غير موجود أو تم إخفاؤه');
      return it;
    }
    if (p === '/announcements') {
      const all = publicOnly(await loadAll());
      return { items: all.filter((i) => i.type === 'news').sort(byDateDesc).slice(0, 8)
        .map(({ id, title, summary, date, created_at, is_demo }) => ({ id, title, summary, date, created_at, is_demo })) };
    }
    if (p === '/contact' && opts.method === 'POST') {
      if (!sb) throw notConfigured();
      const b = JSON.parse(opts.body || '{}');
      if (b.website) return { ok: true }; // حقل مصيدة للرسائل الآلية
      const clean = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
      const row = { name: clean(b.name, 120), contact: clean(b.contact, 160), subject: clean(b.subject, 200), body: clean(b.body, 4000) };
      if (row.name.length < 2) throw new Error('يرجى كتابة الاسم');
      if (row.body.length < 5) throw new Error('يرجى كتابة نص الاستفسار');
      const { error } = await sb.from('messages').insert(row);
      if (error) throw (/limit|كثير/i.test(error.message) ? new Error('تم إرسال رسائل كثيرة مؤخراً، حاولي بعد قليل') : fail(error));
      return { ok: true };
    }
    throw new Error('مسار غير معروف: ' + p);
  }

  window.IbdaaData = { sb, configured, api, loadAll, loadSettings, shape, computeStats, computeStatus, today, TYPES, fail };
})();
