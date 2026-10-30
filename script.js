// عدّل رقم واتساب والهاتف هنا قبل نشر الموقع.
// اكتب رقم الدولة ثم الرقم بدون + أو مسافات، مثال السعودية: 9665XXXXXXXX
const WHATSAPP_NUMBER = "9665XXXXXXXX";
const PHONE_NUMBER = "+9665XXXXXXXX";
document.getElementById("year").textContent = new Date().getFullYear();
const wa = document.getElementById("whatsappLink");
const phone = document.getElementById("phoneLink");
wa.href = "https://wa.me/" + WHATSAPP_NUMBER;
phone.href = "tel:" + PHONE_NUMBER.replace(/\s/g, "");
