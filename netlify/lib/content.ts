import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { siteSettings } from "../../db/schema.js";

export type Service = { icon: string; title: string; text: string };
export type SiteContent = {
  whatsapp: string;
  phone: string;
  email: string;
  heroText: string;
  aboutTitle: string;
  aboutText: string;
  services: Service[];
};

export const DEFAULT_CONTENT: SiteContent = {
  whatsapp: "",
  phone: "",
  email: "",
  heroText: "نقدم خدمات كهربائية وصيانة باهتمام بالتفاصيل، وجودة في التنفيذ، وحرص على السلامة.",
  aboutTitle: "نضع الجودة والسلامة في مقدمة أولوياتنا",
  aboutText:
    "مراسيل الرقمية مؤسسة تقدم خدمات في مجال الكهرباء والصيانة. نسعى إلى تقديم تجربة واضحة للعميل من أول تواصل وحتى متابعة الطلب، مع الاهتمام بجودة التنفيذ والالتزام بالمواعيد.",
  services: [
    { icon: "ϟ", title: "صيانة الأعطال الكهربائية", text: "فحص الأعطال وتحديد أسبابها والمساعدة في معالجتها بأمان." },
    { icon: "▤", title: "اللوحات الكهربائية", text: "خدمات فحص وتجهيز وصيانة اللوحات الكهربائية." },
    { icon: "◉", title: "العدادات الكهربائية", text: "فحص مبدئي ومتابعة الملاحظات المتعلقة بالعدادات." },
    { icon: "⌁", title: "التمديدات والكابلات", text: "خدمات التمديدات والكابلات حسب نطاق العمل والمتطلبات." },
    { icon: "☼", title: "إنارة المواقع", text: "خدمات مرتبطة بالإنارة والمعدات الكهربائية للمواقع." },
    { icon: "⚙", title: "الصيانة العامة", text: "حلول صيانة ومتابعة للملاحظات الفنية في الموقع." },
  ],
};

const KEY = "content";

export async function getContent(): Promise<SiteContent> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY));
  return { ...DEFAULT_CONTENT, ...((row?.value as Partial<SiteContent>) ?? {}) };
}

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function sanitizeContent(input: any): SiteContent {
  const services = Array.isArray(input?.services)
    ? input.services
        .slice(0, 24)
        .map((s: any) => ({ icon: str(s?.icon, 4) || "ϟ", title: str(s?.title, 120), text: str(s?.text, 400) }))
        .filter((s: Service) => s.title)
    : DEFAULT_CONTENT.services;
  return {
    whatsapp: str(input?.whatsapp, 20).replace(/\D/g, ""),
    phone: str(input?.phone, 25).replace(/[^\d+]/g, ""),
    email: str(input?.email, 120),
    heroText: str(input?.heroText, 400) || DEFAULT_CONTENT.heroText,
    aboutTitle: str(input?.aboutTitle, 160) || DEFAULT_CONTENT.aboutTitle,
    aboutText: str(input?.aboutText, 1500) || DEFAULT_CONTENT.aboutText,
    services,
  };
}

export async function saveContent(content: SiteContent) {
  await db
    .insert(siteSettings)
    .values({ key: KEY, value: content })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: content, updatedAt: new Date() } });
}
