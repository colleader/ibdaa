// منصة إبداع الوزية — دالة حسابات الطالبات (Supabase Edge Function)
// signup: إنشاء حساب طالبة باسم مستخدم بلا بريد (يبقى بانتظار موافقة المسؤولة)
// delete / reset: للمسؤولة أو من لها صلاحية "students" فقط
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const DOMAIN = "students.ibdaa.invalid";
const firstKey = (multi: string | undefined) => { try { const o = JSON.parse(multi || "{}"); return Object.values(o)[0] as string | undefined; } catch { return undefined; } };
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstKey(Deno.env.get("SUPABASE_SECRET_KEYS")) || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || firstKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")) || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "طلب غير صالح" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, SERVICE_KEY, { auth: { persistSession: false } });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "طلب غير صالح" }, 400); }

  if (body.action === "signup") {
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.full_name || "").trim().replace(/\s+/g, " ").slice(0, 80);
    const grade = String(body.grade || "").trim().slice(0, 40);
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) return json({ error: "اسم المستخدم من 3 إلى 30 حرفاً إنجليزياً أو رقماً بدون مسافات" }, 400);
    if (password.length < 8) return json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, 400);
    if (fullName.length < 3) return json({ error: "اكتبي اسمك الكامل" }, 400);
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin.from("students").select("id", { count: "exact", head: true }).gte("created_at", since);
    if ((count || 0) >= 40) return json({ error: "طلبات كثيرة الآن، حاولي بعد قليل" }, 429);
    const { data: taken } = await admin.from("students").select("id").eq("username", username).maybeSingle();
    if (taken) return json({ error: "اسم المستخدم محجوز، اختاري اسماً آخر" }, 409);
    const email = `${username}@${DOMAIN}`;
    let userId: string | null = null;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: "student" } });
    if (created.error) {
      // حساب قديم حُذف من قائمة الطالبات: نعيد استخدامه
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const old = list?.users.find((u) => u.email === email);
      if (!old) return json({ error: "تعذّر إنشاء الحساب" }, 400);
      const upd = await admin.auth.admin.updateUserById(old.id, { password });
      if (upd.error) return json({ error: "تعذّر إنشاء الحساب" }, 400);
      userId = old.id;
    } else userId = created.data.user!.id;
    const ins = await admin.from("students").insert({ id: userId, username, full_name: fullName, grade });
    if (ins.error) return json({ error: "تعذّر إنشاء الحساب" }, 500);
    return json({ ok: true, email });
  }

  // إجراءات الإدارة: التحقق من صلاحية المتصل
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const caller = createClient(url, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  });
  const { data: allowed } = await caller.rpc("can_do", { p: "students" });
  if (!allowed) return json({ error: "ليست لديك صلاحية" }, 403);
  const id = String(body.id || "");
  const { data: st } = await admin.from("students").select("id, username").eq("id", id).maybeSingle();
  if (!st) return json({ error: "الطالبة غير موجودة" }, 404);

  if (body.action === "reset") {
    const password = String(body.password || "");
    if (password.length < 8) return json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, 400);
    const r = await admin.auth.admin.updateUserById(id, { password });
    return r.error ? json({ error: "تعذّر تغيير كلمة المرور" }, 500) : json({ ok: true });
  }
  if (body.action === "delete") {
    const { data: files } = await admin.from("submission_files").select("path, submissions!inner(student_id, status)")
      .eq("submissions.student_id", id).neq("submissions.status", "approved");
    const paths = (files || []).map((f: { path: string }) => f.path);
    if (paths.length) await admin.storage.from("media").remove(paths);
    const r = await admin.auth.admin.deleteUser(id);
    if (r.error) await admin.from("students").delete().eq("id", id);
    return json({ ok: true });
  }
  return json({ error: "إجراء غير معروف" }, 400);
});
