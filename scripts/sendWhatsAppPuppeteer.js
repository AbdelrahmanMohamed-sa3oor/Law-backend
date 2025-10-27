// scripts/sendWhatsAppPuppeteer.js
import mongoose from "mongoose";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = process.env.MONGO_URI;
const USER_DATA_DIR = process.env.PUPPETEER_USER_DATA_DIR || path.join(__dirname, "../puppeteer_data");
const MESSAGE_DELAY_MS = parseInt(process.env.MESSAGE_DELAY_MS || "2500", 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "5", 10);

// === موديلات Mongoose — عدل المسار لو موديلاتك في مكان تاني ===
import Case from "../models/Case.js";
import Lawyer from "../models/Lawyer.js";

// === دوال مساعدة ===
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function openWhatsAppAndWaitForLogin(browser, page) {
  await page.goto("https://web.whatsapp.com", { waitUntil: "networkidle2" });
  console.log("⏳ افتح WhatsApp Web وسجل الدخول بالـ QR إذا لم تكن مسجلًا مسبقًا...");
  try {
    await page.waitForSelector('div[role="textbox"], div[contenteditable="true"]', { timeout: 120000 });
    console.log("✅ تم تسجيل الدخول في WhatsApp Web (أو الجلسة محفوظة).");
  } catch (err) {
    console.warn("⚠️ لم يتم اكتشاف تسجيل دخول خلال 120 ثانية. تأكد من مسح QR والتسجيل يدوياً.");
  }
}

async function sendViaUrlNavigation(page, phone, message) {
  const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    await page.waitForSelector('div[contenteditable="true"]', { timeout: 15000 });
    await sleep(800);
    await page.keyboard.press("Enter");
    await sleep(1200);
    return true;
  } catch (err) {
    try {
      const sendBtn = await page.$('button span[data-icon="send"]');
      if (sendBtn) {
        await sendBtn.click();
        await sleep(1000);
        return true;
      }
    } catch (e) {
      console.error("⛔ فشل كل محاولات الإرسال:", e.message || e);
    }
    return false;
  }
}

async function sendRemindersForTomorrow() {
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI غير موجود في .env");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ متصل بقاعدة البيانات");

  // تحديد يوم الغد
  const today = new Date();
  const reminderDate = new Date(today);
  reminderDate.setDate(today.getDate() + 1);
  const startOfDay = new Date(reminderDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(reminderDate.setHours(23, 59, 59, 999));

  // جلب القضايا التي تحتوي على أي موعد غدًا في dateSession
  const cases = await Case.find({
    "dateSession.date": { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  if (!cases.length) {
    console.log("🚫 لا توجد جلسات غدًا. انتهى.");
    await mongoose.connection.close();
    return;
  }

  // جلب المحامين
  const lawyers = await Lawyer.find({}, "name phone").lean();
  if (!lawyers.length) {
    console.log("🚫 لا يوجد محامين مسجلين.");
    await mongoose.connection.close();
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: USER_DATA_DIR,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  await openWhatsAppAndWaitForLogin(browser, page);

  let sentCount = 0;
  let batchCounter = 0;

  for (const c of cases) {
    // إيجاد الموعد الذي يقع غدًا
    const tomorrowSession = c.dateSession.find(ds => {
      const d = new Date(ds.date);
      return d >= startOfDay && d <= endOfDay;
    });
    if (!tomorrowSession) continue;

    const caseNumber = c.caseNumber ?? c._id;
    const year = c.year ? `لسنة ${c.year}` : "";
    const clientName = c.clientName || "-";
    const dateStr = new Date(tomorrowSession.date).toLocaleDateString("ar-EG");

    const message = `📢 تذكير هام:
غدًا موعد جلسة للقضية رقم ${caseNumber} ${year}.
👤 العميل: ${clientName}
📅 التاريخ: ${dateStr}
📍 يرجى المراجعة.`.trim();

    for (const lawyer of lawyers) {
      if (!lawyer.phone) continue;

      const cleaned = lawyer.phone.replace(/\D/g, "");
      if (!cleaned) continue;

      const ok = await sendViaUrlNavigation(page, cleaned, message);

      if (ok) {
        sentCount++;
        batchCounter++;
        console.log(`✅ أرسل إلى ${lawyer.name || cleaned} (${cleaned}) — قضية ${caseNumber}`);
      } else {
        console.warn(`⚠️ فشل الإرسال إلى ${lawyer.name || cleaned} (${cleaned})`);
      }

      await sleep(MESSAGE_DELAY_MS);

      if (batchCounter >= BATCH_SIZE) {
        console.log(`⏸️ وصلت دفعة ${BATCH_SIZE} رسائل — انتظار 10 ثواني قبل المتابعة...`);
        await sleep(10000);
        batchCounter = 0;
      }
    }
  }

  console.log(`✅ الانتهاء: أرسلت ${sentCount} رسالة.`);
  await browser.close();
  await mongoose.connection.close();
}

// تشغيل السكريبت مباشرة
if (process.argv[1] && process.argv[1].endsWith("sendWhatsAppPuppeteer.js")) {
  sendRemindersForTomorrow().catch((err) => {
    console.error("❌ خطأ أثناء التشغيل:", err);
    process.exit(1);
  });
}

// لتصدير الدالة واستخدامها من route
export { sendRemindersForTomorrow };