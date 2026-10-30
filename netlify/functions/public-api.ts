import type { Config, Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import { pageViews, serviceRequests } from "../../db/schema.js";
import { getContent } from "../lib/content.js";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export default async (req: Request, context: Context) => {
  const { route } = context.params;

  if (route === "content" && req.method === "GET") {
    return Response.json(await getContent(), { headers: { "Cache-Control": "public, max-age=60" } });
  }

  if (route === "requests" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (str(body?.website, 200)) return Response.json({ ok: true }); // حقل فخ لمنع الرسائل المزعجة
    const name = str(body?.name, 120);
    const phone = str(body?.phone, 30);
    const service = str(body?.service, 120);
    if (!name || !phone || !service) {
      return Response.json({ error: "الرجاء تعبئة الاسم ورقم الجوال ونوع الخدمة" }, { status: 400 });
    }
    await db.insert(serviceRequests).values({
      name,
      phone,
      service,
      location: str(body?.location, 200),
      details: str(body?.details, 2000),
    });
    return Response.json({ ok: true }, { status: 201 });
  }

  if (route === "track" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    await db.insert(pageViews).values({ path: str(body?.path, 200) || "/", referrer: str(body?.referrer, 300) });
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
};

export const config: Config = {
  path: "/api/:route(content|requests|track)",
};
