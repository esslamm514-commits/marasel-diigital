import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 12; // 12 ساعة

const password = () => Netlify.env.get("ADMIN_PASSWORD") ?? "";
const sign = (payload: string) => createHmac("sha256", "marasil:" + password()).update(payload).digest("hex");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const isConfigured = () => password().length > 0;

export const checkPassword = (input: string) => isConfigured() && safeEqual(sign(input), sign(password()));

export function sessionCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function isAuthenticated(req: Request) {
  if (!isConfigured()) return false;
  const match = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return false;
  const [exp, sig] = match[1].split(".");
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}
