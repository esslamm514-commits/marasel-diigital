import type { Config, Context } from "@netlify/functions";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pageViews, serviceRequests } from "../../db/schema.js";
import { checkPassword, clearCookie, isAuthenticated, isConfigured, sessionCookie } from "../lib/auth.js";
import { getContent, sanitizeContent, saveContent } from "../lib/content.js";

const STATUSES = ["new", "in_progress", "done", "cancelled"];
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });

export default async (req: Request, context: Context) => {
  const route = context.params["0"] ?? "";

  if (route === "login" && req.method === "POST") {
    if (!isConfigured()) return json({ error: "لم يتم ضبط كلمة مرور لوحة التحكم بعد (ADMIN_PASSWORD)" }, 503);
    const body = await req.json().catch(() => ({}));
    if (!checkPassword(String(body?.password ?? ""))) return json({ error: "كلمة المرور غير صحيحة" }, 401);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie() });
  }

  if (route === "logout") return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });

  if (!isAuthenticated(req)) return json({ error: "غير مصرح", configured: isConfigured() }, 401);

  if (route === "session") return json({ ok: true });

  // طلبات الخدمة
  if (route === "requests" && req.method === "GET") {
    const rows = await db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt)).limit(500);
    return json(rows);
  }

  const reqMatch = route.match(/^requests\/(\d+)$/);
  if (reqMatch) {
    const id = Number(reqMatch[1]);
    if (req.method === "PATCH") {
      const body = await req.json().catch(() => ({}));
      const set: Partial<typeof serviceRequests.$inferInsert> = { updatedAt: new Date() };
      if (STATUSES.includes(body?.status)) set.status = body.status;
      if (typeof body?.notes === "string") set.notes = body.notes.slice(0, 2000);
      const [row] = await db.update(serviceRequests).set(set).where(eq(serviceRequests.id, id)).returning();
      return row ? json(row) : json({ error: "الطلب غير موجود" }, 404);
    }
    if (req.method === "DELETE") {
      await db.delete(serviceRequests).where(eq(serviceRequests.id, id));
      return json({ ok: true });
    }
  }

  // محتوى الموقع
  if (route === "content") {
    if (req.method === "GET") return json(await getContent());
    if (req.method === "PUT") {
      const content = sanitizeContent(await req.json().catch(() => ({})));
      await saveContent(content);
      return json(content);
    }
  }

  // الإحصائيات
  if (route === "stats" && req.method === "GET") {
    const since = new Date(Date.now() - 29 * 86400000);
    since.setUTCHours(0, 0, 0, 0);
    const day = (col: any) => sql<string>`to_char(date_trunc('day', ${col}), 'YYYY-MM-DD')`;

    const [byStatus, byService, requestsDaily, viewsDaily, [viewsTotal]] = await Promise.all([
      db.select({ status: serviceRequests.status, total: count() }).from(serviceRequests).groupBy(serviceRequests.status),
      db
        .select({ service: serviceRequests.service, total: count() })
        .from(serviceRequests)
        .groupBy(serviceRequests.service)
        .orderBy(desc(count())),
      db
        .select({ day: day(serviceRequests.createdAt), total: count() })
        .from(serviceRequests)
        .where(gte(serviceRequests.createdAt, since))
        .groupBy(sql`1`),
      db
        .select({ day: day(pageViews.createdAt), total: count() })
        .from(pageViews)
        .where(gte(pageViews.createdAt, since))
        .groupBy(sql`1`),
      db.select({ total: count() }).from(pageViews),
    ]);

    return json({
      since: since.toISOString(),
      byStatus,
      byService,
      requestsDaily,
      viewsDaily,
      viewsTotal: viewsTotal?.total ?? 0,
    });
  }

  return json({ error: "Not found" }, 404);
};

export const config: Config = {
  path: "/api/admin/*",
};
