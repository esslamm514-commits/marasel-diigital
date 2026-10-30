// بيانات التواصل والمحتوى تُدار الآن من لوحة التحكم (/admin).
document.getElementById("year").textContent = new Date().getFullYear();
const wa = document.getElementById("whatsappLink");
const phone = document.getElementById("phoneLink");
const serviceGrid = document.getElementById("serviceGrid");
const serviceSelect = document.getElementById("serviceSelect");

function fillServiceOptions(titles) {
  serviceSelect.length = 1;
  [...titles, "أخرى"].forEach((t) => serviceSelect.add(new Option(t, t)));
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function applyContent(c) {
  document.querySelectorAll("[data-content]").forEach((node) => {
    const v = c[node.dataset.content];
    if (v) node.textContent = v;
  });
  if (c.whatsapp) wa.href = "https://wa.me/" + c.whatsapp; else wa.style.display = "none";
  if (c.phone) phone.href = "tel:" + c.phone; else phone.style.display = "none";
  if (c.email) {
    const mail = el("a", "btn btn-outline", "البريد الإلكتروني");
    mail.href = "mailto:" + c.email;
    phone.after(mail);
  }
  if (Array.isArray(c.services) && c.services.length) {
    serviceGrid.replaceChildren(...c.services.map((s) => {
      const card = el("article", "service-card");
      card.append(el("div", "icon", s.icon), el("h3", "", s.title), el("p", "", s.text));
      return card;
    }));
    fillServiceOptions(c.services.map((s) => s.title));
  }
}

fillServiceOptions([...serviceGrid.querySelectorAll("h3")].map((h) => h.textContent));

fetch("/api/content").then((r) => (r.ok ? r.json() : null)).then((c) => c && applyContent(c)).catch(() => {});

fetch("/api/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ path: location.pathname, referrer: document.referrer }),
  keepalive: true,
}).catch(() => {});

const form = document.getElementById("requestForm");
const msg = document.getElementById("formMsg");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button");
  btn.disabled = true;
  msg.className = "form-msg full";
  msg.textContent = "جارٍ الإرسال...";
  try {
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "تعذّر إرسال الطلب");
    form.reset();
    msg.classList.add("ok");
    msg.textContent = "تم استلام طلبك بنجاح، سنتواصل معك قريبًا.";
  } catch (err) {
    msg.classList.add("err");
    msg.textContent = err.message || "تعذّر إرسال الطلب، حاول مرة أخرى.";
  } finally {
    btn.disabled = false;
  }
});
