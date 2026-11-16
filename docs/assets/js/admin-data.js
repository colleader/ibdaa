/* طبقة بيانات لوحة التحكم: تنفيذ عمليات الإدارة على Supabase بنفس واجهة الخادم السابقة */
(() => {
  'use strict';
  const D = window.IbdaaData;
  const sb = D.sb;
  const BUCKET = 'media';
  const MAX_BYTES = 50 * 1024 * 1024;
  const FIELDS = ['title', 'summary', 'body', 'date', 'end_date', 'time', 'category', 'level', 'status', 'conditions',
    'winners', 'people', 'location', 'result', 'distinction', 'rank', 'visible', 'featured', 'cover_id'];

  const must = ({ data, error }) => { if (error) throw D.fail(error); return data; };

  function sanitize(input) {
    const out = {};
    for (const f of FIELDS) {
      if (!(f in input)) continue;
      let v = input[f];
      if (f === 'winners') {
        v = (Array.isArray(v) ? v : []).filter((w) => w && typeof w.name === 'string' && w.name.trim()).slice(0, 50)
          .map((w) => ({ name: String(w.name).trim().slice(0, 200), rank: String(w.rank || '').trim().slice(0, 60) }));
      } else if (f === 'visible' || f === 'featured') v = !!v;
      else if (f === 'rank' || f === 'cover_id') { v = v === '' || v == null ? null : parseInt(v, 10); if (Number.isNaN(v)) v = null; }
      else if (f === 'date' || f === 'end_date') v = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
      else if (f === 'status') v = ['auto', 'open', 'upcoming', 'closed'].includes(v) ? v : 'auto';
      else v = typeof v === 'string' ? v.trim().slice(0, f === 'body' ? 20000 : 2000) : '';
      out[f] = v;
    }
    return out;
  }

  async function allItems() {
    const rows = must(await sb.from('items').select('*, media(*)'));
    return rows.map(D.shape);
  }
  async function getItem(id) {
    const row = must(await sb.from('items').select('*, media(*)').eq('id', id).maybeSingle());
    if (!row) throw new Error('هذا العنصر غير موجود');
    return D.shape(row);
  }
  const sortKey = (it) => it.date || (it.created_at || '').slice(0, 10);
  const byDateDesc = (a, b) => sortKey(b).localeCompare(sortKey(a)) || (b.id - a.id);
  const byRank = (a, b) => ((a.rank == null) - (b.rank == null)) || ((a.rank || 0) - (b.rank || 0)) || byDateDesc(a, b);

  async function removeStorage(paths) {
    const list = paths.filter(Boolean);
    if (list.length) await sb.storage.from(BUCKET).remove(list);
  }

  // ---------- ضغط الصور قبل الرفع لتوفير المساحة ----------
  async function compressImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
    try {
      const bmp = await createImageBitmap(file);
      const MAX = 2000;
      const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (file.type === 'image/png') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch { return file; }
  }

  const KIND = (mime) => (mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'pdf');
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'application/pdf': 'pdf' };
  const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');

  // رفع مجموعة ملفات لعنصر، مع إبلاغ التقدم onProgress(done, total)
  async function uploadMedia(itemId, pending, onProgress) {
    const existing = must(await sb.from('media').select('sort').eq('item_id', itemId));
    let sort = existing.reduce((m, r) => Math.max(m, r.sort), 0);
    const rejected = [];
    let done = 0;
    for (const p of pending) {
      onProgress?.(done, pending.length);
      const file = p.kind === 'image' ? await compressImage(p.file) : p.file;
      if (!EXT[file.type]) { rejected.push({ name: p.file.name, reason: 'صيغة غير مدعومة' }); done++; continue; }
      if (file.size > MAX_BYTES) { rejected.push({ name: p.file.name, reason: 'أكبر من 50 ميجابايت' }); done++; continue; }
      const path = `${itemId}/${Date.now()}-${rand()}.${EXT[file.type]}`;
      const up = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
      if (up.error) { rejected.push({ name: p.file.name, reason: up.error.message }); done++; continue; }
      const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const ins = await sb.from('media').insert({ item_id: itemId, url, path, original: p.file.name.slice(0, 200), mime: file.type,
        kind: KIND(file.type), caption: (p.caption || '').slice(0, 300), size: file.size, sort: ++sort });
      if (ins.error) { await removeStorage([path]); rejected.push({ name: p.file.name, reason: ins.error.message }); }
      done++;
    }
    onProgress?.(done, pending.length);
    return { item: await getItem(itemId), rejected };
  }

  // ---------- البيانات التجريبية ----------
  async function seedDemo() {
    const { DEMO, SEED_FILES } = window.IBDAA_DEMO;
    const existing = must(await sb.from('items').select('id').eq('is_demo', true).limit(1));
    if (existing.length) return 0;
    const base = new URL('seed-media/', location.href).href;
    for (const it of DEMO) {
      const row = { ...it, is_demo: true, featured: !!it.featured, winners: it.winners || [] };
      delete row.images;
      const created = must(await sb.from('items').insert(row).select('id').single());
      const media = (it.images || []).map((key, i) => {
        const f = SEED_FILES.find((x) => x.includes(key));
        return f && { item_id: created.id, url: base + f, path: null, original: f, mime: 'image/jpeg', kind: 'image',
          caption: key.includes('cert') ? 'شهادة تجريبية' : 'صورة تجريبية', size: 0, sort: i + 1 };
      }).filter(Boolean);
      if (media.length) must(await sb.from('media').insert(media));
    }
    return DEMO.length;
  }

  // ---------- واجهة متوافقة مع لوحة التحكم ----------
  async function adminApi(path, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const body = opts.body ? JSON.parse(opts.body) : {};
    const url = new URL(path, 'http://x');
    const p = url.pathname;
    let m;

    if (p === '/overview') {
      const [items, unread, settings] = await Promise.all([
        allItems(),
        sb.from('messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
        D.loadSettings(),
      ]);
      const byType = {};
      D.TYPES.forEach((t) => {
        const of = items.filter((i) => i.type === t);
        byType[t] = { total: of.length, visible: of.filter((i) => i.visible).length };
      });
      const media = items.flatMap((i) => i.media);
      return {
        stats: D.computeStats(items.filter((i) => i.visible), settings),
        by_type: byType,
        unread: unread.count || 0,
        demo_count: items.filter((i) => i.is_demo).length,
        media: { c: media.filter((x) => x.path).length, bytes: media.reduce((s, x) => s + (x.path ? Number(x.size) || 0 : 0), 0) },
        recent: items.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id).slice(0, 8),
      };
    }
    if (p === '/items' && method === 'GET') {
      const type = url.searchParams.get('type');
      let items = await allItems();
      if (type) items = items.filter((i) => i.type === type);
      items.sort(type === 'honor' ? byRank : byDateDesc);
      return { total: items.length, items };
    }
    if (p === '/items' && method === 'POST') {
      if (!D.TYPES.includes(body.type)) throw new Error('نوع المحتوى غير صحيح');
      const data = sanitize(body);
      if (!data.title) throw new Error('العنوان مطلوب');
      const row = must(await sb.from('items').insert({ type: body.type, ...data }).select('id').single());
      return getItem(row.id);
    }
    if ((m = p.match(/^\/items\/(\d+)$/))) {
      const id = +m[1];
      if (method === 'GET') return getItem(id);
      if (method === 'PUT') {
        const data = sanitize(body);
        if ('title' in data && !data.title) throw new Error('العنوان مطلوب');
        if (Object.keys(data).length) must(await sb.from('items').update(data).eq('id', id));
        return getItem(id);
      }
      if (method === 'DELETE') {
        const files = must(await sb.from('media').select('path').eq('item_id', id)).map((r) => r.path);
        must(await sb.from('items').delete().eq('id', id));
        await removeStorage(files);
        return { ok: true };
      }
    }
    if ((m = p.match(/^\/media\/(\d+)$/))) {
      const id = +m[1];
      if (method === 'PATCH') {
        must(await sb.from('media').update({ caption: String(body.caption || '').trim().slice(0, 300) }).eq('id', id));
        return { ok: true };
      }
      if (method === 'DELETE') {
        const row = must(await sb.from('media').select('item_id, path').eq('id', id).single());
        must(await sb.from('media').delete().eq('id', id));
        await sb.from('items').update({ cover_id: null }).eq('cover_id', id);
        await removeStorage([row.path]);
        return { item: await getItem(row.item_id) };
      }
    }
    if (p === '/messages') return { items: must(await sb.from('messages').select('*').order('id', { ascending: false }).limit(500)) };
    if ((m = p.match(/^\/messages\/(\d+)$/))) {
      if (method === 'PATCH') must(await sb.from('messages').update({ is_read: !!body.is_read }).eq('id', +m[1]));
      if (method === 'DELETE') must(await sb.from('messages').delete().eq('id', +m[1]));
      return { ok: true };
    }
    if (p === '/settings' && method === 'GET') {
      const rows = must(await sb.from('settings').select('key, value'));
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    }
    if (p === '/settings' && method === 'PUT') {
      const keys = ['platform_name', 'school_name', 'activity_lead', 'principal', 'tagline', 'footer_quote', 'students_mode', 'students_count', 'contact_email', 'contact_phone', 'announcement_bar'];
      const rows = keys.filter((k) => typeof body[k] === 'string' || typeof body[k] === 'number').map((k) => ({ key: k, value: String(body[k]).trim().slice(0, 1000) }));
      must(await sb.from('settings').upsert(rows));
      return adminApi('/settings');
    }
    if (p === '/demo' && method === 'DELETE') {
      const ids = must(await sb.from('items').select('id').eq('is_demo', true)).map((r) => r.id);
      if (ids.length) {
        const files = must(await sb.from('media').select('path').in('item_id', ids)).map((r) => r.path);
        must(await sb.from('items').delete().in('id', ids));
        await removeStorage(files);
      }
      return { ok: true, deleted: ids.length };
    }
    if (p === '/demo' && method === 'POST') return { ok: true, created: await seedDemo() };
    if (p === '/password' && method === 'POST') {
      const { data: { user } } = await sb.auth.getUser();
      const check = await sb.auth.signInWithPassword({ email: user.email, password: body.current || '' });
      if (check.error) throw new Error('كلمة المرور الحالية غير صحيحة');
      if (!body.next || body.next.length < 8) throw new Error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      const r = await sb.auth.updateUser({ password: body.next });
      if (r.error) throw new Error(/weak|short|characters/i.test(r.error.message) ? 'كلمة المرور ضعيفة، استخدمي حروفاً وأرقاماً' : r.error.message);
      return { ok: true };
    }
    if (p === '/logout') { await sb.auth.signOut(); return { ok: true }; }
    throw new Error('عملية غير معروفة: ' + method + ' ' + p);
  }

  // التحقق من الجلسة وصلاحية الإدارة
  async function currentAdmin() {
    if (!sb) return { error: 'config' };
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { error: 'login' };
    const { data, error } = await sb.rpc('is_admin');
    if (error) return { error: 'login' };
    if (!data) return { error: 'not_admin', email: session.user.email };
    return { user: session.user };
  }

  window.IbdaaAdmin = { adminApi, uploadMedia, currentAdmin, seedDemo, MAX_BYTES };
})();
