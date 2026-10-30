const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const STATUS = { new: "جديد", in_progress: "قيد التنفيذ", done: "مكتمل", cancelled: "ملغي" };
const fmtNum = new Intl.NumberFormat("ar-SA-u-nu-latn");
const fmtDate = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { dateStyle: "medium", timeStyle: "short" });
const fmtDay = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { day: "numeric", month: "short", timeZone: "UTC" });

let requests = [];
let statusFilter = "";

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return e;
}

async function api(path, opts = {}) {
  const res = await fetch("/api/admin/" + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "login") {
    showLogin();
    throw new Error(data.error || "انتهت الجلسة");
  }
  if (!res.ok) throw new Error(data.error || "حدث خطأ غير متوقع");
  return data;
}

let toastTimer;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------- الدخول ---------- */
function showLogin() {
  $("#appView").hidden = true;
  $("#loginView").hidden = false;
}

async function showApp() {
  $("#loginView").hidden = true;
  $("#appView").hidden = false;
  await Promise.all([loadRequests(), loadStats()]);
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("button", e.target);
  btn.disabled = true;
  $("#loginMsg").textContent = "";
  try {
    await api("login", { method: "POST", body: { password: e.target.password.value } });
    e.target.reset();
    await showApp();
  } catch (err) {
    $("#loginMsg").textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  await api("logout", { method: "POST" }).catch(() => {});
  showLogin();
});

/* ---------- التبويبات ---------- */
let contentLoaded = false;
$$(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    $$(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".tab").forEach((t) => (t.hidden = t.id !== "tab-" + b.dataset.tab));
    if (b.dataset.tab === "overview") loadStats();
    if (b.dataset.tab === "requests") loadRequests();
    if (b.dataset.tab === "content" && !contentLoaded) loadContent();
  }),
);

/* ---------- نظرة عامة ---------- */
function lastDays(n, sinceIso) {
  const start = new Date(sinceIso);
  return Array.from({ length: n }, (_, i) => new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10));
}

function renderDailyChart(days, views, reqs) {
  const box = $("#dailyChart");
  const W = 800, H = 220, P = { t: 10, r: 8, b: 26, l: 34 };
  const max = Math.max(4, ...views, ...reqs);
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const slot = iw / days.length, bw = Math.max(2, (slot - 4) / 2);
  const x = (i) => P.l + i * slot + 2;
  const y = (v) => P.t + ih - (v / top) * ih;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("direction", "ltr");
  const add = (tag, a, text) => {
    const n = document.createElementNS(ns, tag);
    for (const k in a) n.setAttribute(k, a[k]);
    if (text !== undefined) n.textContent = text;
    svg.append(n);
    return n;
  };
  for (let g = 0; g <= 4; g++) {
    const v = g * step;
    add("line", { x1: P.l, x2: W - P.r, y1: y(v), y2: y(v), class: "grid" });
    add("text", { x: P.l - 6, y: y(v) + 3, "text-anchor": "end", class: "axis" }, fmtNum.format(v));
  }
  // الأيام بالترتيب من اليسار (الأقدم) إلى اليمين (الأحدث)
  days.forEach((d, i) => {
    add("rect", { x: x(i), y: y(views[i]), width: bw, height: Math.max(0, y(0) - y(views[i])), rx: 2, fill: "var(--views)" });
    add("rect", { x: x(i) + bw, y: y(reqs[i]), width: bw, height: Math.max(0, y(0) - y(reqs[i])), rx: 2, fill: "var(--req)" });
    if (i % 5 === 0 || i === days.length - 1)
      add("text", { x: x(i) + bw, y: H - 8, "text-anchor": "middle", class: "axis" }, fmtDay.format(new Date(d)));
    const hit = add("rect", { x: P.l + i * slot, y: P.t, width: slot, height: ih, fill: "transparent" });
    hit.addEventListener("mouseenter", () => {
      tip.hidden = false;
      tip.textContent = `${fmtDay.format(new Date(d))} — الزيارات: ${fmtNum.format(views[i])} · الطلبات: ${fmtNum.format(reqs[i])}`;
      const r = box.getBoundingClientRect();
      tip.style.left = ((P.l + i * slot + slot / 2) / W) * r.width + "px";
      tip.style.top = (y(Math.max(views[i], reqs[i])) / H) * r.height + "px";
    });
    hit.addEventListener("mouseleave", () => (tip.hidden = true));
  });
  const tip = el("div", { class: "tip", hidden: true });
  box.replaceChildren(svg, tip);
}

async function loadStats() {
  let s;
  try {
    s = await api("stats");
  } catch (err) {
    return toast(err.message);
  }
  const by = Object.fromEntries(s.byStatus.map((r) => [r.status, Number(r.total)]));
  const totalReq = Object.values(by).reduce((a, b) => a + b, 0);
  const days = lastDays(30, s.since);
  const vMap = Object.fromEntries(s.viewsDaily.map((r) => [r.day, Number(r.total)]));
  const rMap = Object.fromEntries(s.requestsDaily.map((r) => [r.day, Number(r.total)]));
  const views = days.map((d) => vMap[d] || 0);
  const reqs = days.map((d) => rMap[d] || 0);
  const views30 = views.reduce((a, b) => a + b, 0);
  const reqs30 = reqs.reduce((a, b) => a + b, 0);

  const kpi = (label, value, note, accent) =>
    el("div", { class: "kpi" + (accent ? " accent" : "") }, el("span", {}, label), el("strong", {}, fmtNum.format(value)), note && el("small", {}, note));
  $("#kpis").replaceChildren(
    kpi("طلبات جديدة", by.new || 0, "بانتظار المراجعة", true),
    kpi("قيد التنفيذ", by.in_progress || 0),
    kpi("مكتملة", by.done || 0),
    kpi("إجمالي الطلبات", totalReq, `${fmtNum.format(reqs30)} خلال 30 يومًا`),
    kpi("الزيارات (30 يومًا)", views30, `الإجمالي ${fmtNum.format(Number(s.viewsTotal))}`),
    kpi("نسبة التحويل", views30 ? Math.round((reqs30 / views30) * 1000) / 10 : 0, "٪ من الزيارات أصبحت طلبات"),
  );

  renderDailyChart(days, views, reqs);

  const svcMax = Math.max(1, ...s.byService.map((r) => Number(r.total)));
  $("#serviceChart").replaceChildren(
    ...(s.byService.length
      ? s.byService.slice(0, 8).map((r) =>
          el("div", { class: "hbar" }, el("span", {}, r.service),
            el("div", { class: "track" }, el("div", { class: "fill", style: `width:${(Number(r.total) / svcMax) * 100}%` })),
            el("b", {}, fmtNum.format(Number(r.total)))))
      : [el("p", { class: "empty" }, "لا توجد طلبات بعد")]),
  );
}

function renderLatest() {
  const items = requests.slice(0, 5);
  $("#latestList").replaceChildren(
    ...(items.length
      ? items.map((r) =>
          el("div", { class: "latest" },
            el("div", {}, el("strong", {}, r.name), el("small", {}, `${r.service} · ${fmtDate.format(new Date(r.createdAt))}`)),
            el("span", { class: "pill st-" + r.status }, STATUS[r.status] || r.status)))
      : [el("p", { class: "empty" }, "لا توجد طلبات بعد")]),
  );
}

/* ---------- الطلبات ---------- */
async function loadRequests() {
  try {
    requests = await api("requests");
  } catch (err) {
    return toast(err.message);
  }
  const n = requests.filter((r) => r.status === "new").length;
  $("#newBadge").hidden = !n;
  $("#newBadge").textContent = n;
  renderLatest();
  renderRequests();
}

function renderRequests() {
  const q = $("#searchInput").value.trim().toLowerCase();
  const list = requests.filter(
    (r) =>
      (!statusFilter || r.status === statusFilter) &&
      (!q || [r.name, r.phone, r.service, r.location, r.details].join(" ").toLowerCase().includes(q)),
  );
  $("#requestsList").replaceChildren(
    ...(list.length ? list.map(requestCard) : [el("div", { class: "card empty" }, "لا توجد طلبات مطابقة")]),
  );
}

function requestCard(r) {
  const status = el("select", {}, Object.entries(STATUS).map(([k, v]) => el("option", { value: k, selected: k === r.status }, v)));
  const notes = el("textarea", { rows: 2, placeholder: "ملاحظات داخلية..." });
  notes.value = r.notes || "";
  const waPhone = r.phone.replace(/\D/g, "");
  return el("article", { class: "req" + (r.status === "new" ? " is-new" : "") },
    el("div", {},
      el("h3", {}, r.name, el("span", { class: "pill st-" + r.status }, STATUS[r.status] || r.status)),
      el("div", { class: "meta" },
        el("span", {}, "⚡ " + r.service),
        el("a", { href: "tel:" + r.phone, dir: "ltr" }, r.phone),
        waPhone && el("a", { href: "https://wa.me/" + waPhone, target: "_blank", rel: "noopener" }, "واتساب"),
        r.location && el("span", {}, "📍 " + r.location),
        el("span", {}, fmtDate.format(new Date(r.createdAt)))),
      r.details ? el("p", { class: "details" }, r.details) : null),
    el("div", { class: "side" },
      el("label", {}, "الحالة", status),
      notes,
      el("div", { class: "row" },
        el("button", {
          class: "save",
          onclick: async (e) => {
            e.target.disabled = true;
            try {
              const updated = await api("requests/" + r.id, { method: "PATCH", body: { status: status.value, notes: notes.value } });
              Object.assign(r, updated);
              toast("تم حفظ الطلب");
              loadRequests();
            } catch (err) {
              toast(err.message);
            } finally {
              e.target.disabled = false;
            }
          },
        }, "حفظ"),
        el("button", {
          class: "del",
          onclick: async () => {
            if (!confirm(`حذف طلب "${r.name}" نهائيًا؟`)) return;
            try {
              await api("requests/" + r.id, { method: "DELETE" });
              toast("تم حذف الطلب");
              loadRequests();
            } catch (err) {
              toast(err.message);
            }
          },
        }, "حذف"))));
}

$("#searchInput").addEventListener("input", renderRequests);
$$("#statusFilters button").forEach((b) =>
  b.addEventListener("click", () => {
    statusFilter = b.dataset.status;
    $$("#statusFilters button").forEach((x) => x.classList.toggle("active", x === b));
    renderRequests();
  }),
);

/* ---------- المحتوى ---------- */
function serviceRow(s = { icon: "ϟ", title: "", text: "" }) {
  const row = el("div", { class: "svc" },
    el("input", { class: "icon", value: s.icon, maxlength: 4, "aria-label": "الأيقونة" }),
    el("input", { class: "title", value: s.title, placeholder: "اسم الخدمة", "aria-label": "اسم الخدمة" }),
    el("textarea", { class: "text", rows: 2, placeholder: "وصف مختصر", "aria-label": "وصف الخدمة" }),
    el("button", { type: "button", title: "حذف", onclick: () => row.remove() }, "✕"));
  $(".text", row).value = s.text;
  return row;
}

async function loadContent() {
  try {
    const c = await api("content");
    const f = $("#contentForm");
    for (const k of ["whatsapp", "phone", "email", "heroText", "aboutTitle", "aboutText"]) f.elements[k].value = c[k] || "";
    $("#servicesEditor").replaceChildren(...c.services.map(serviceRow));
    contentLoaded = true;
  } catch (err) {
    toast(err.message);
  }
}

$("#addService").addEventListener("click", () => {
  const row = serviceRow();
  $("#servicesEditor").append(row);
  $(".title", row).focus();
});

$("#contentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = $(".save-bar .btn", f);
  const body = Object.fromEntries(["whatsapp", "phone", "email", "heroText", "aboutTitle", "aboutText"].map((k) => [k, f.elements[k].value]));
  body.services = $$(".svc", f).map((row) => ({ icon: $(".icon", row).value, title: $(".title", row).value, text: $(".text", row).value }));
  btn.disabled = true;
  try {
    await api("content", { method: "PUT", body });
    $("#contentMsg").className = "msg ok";
    $("#contentMsg").textContent = "تم الحفظ ✓";
    await loadContent();
  } catch (err) {
    $("#contentMsg").className = "msg err";
    $("#contentMsg").textContent = err.message;
  } finally {
    btn.disabled = false;
    setTimeout(() => ($("#contentMsg").textContent = ""), 3000);
  }
});

/* ---------- البدء ---------- */
api("session").then(showApp).catch(() => showLogin());
