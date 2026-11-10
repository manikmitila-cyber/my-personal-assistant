// Local Bengali natural-language parser. Works offline with no AI provider configured.
import { DAY, startOfDay } from './bn';

const DIG: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
const WORDS: [string, number][] = [['এগারো', 11], ['বারো', 12], ['দশ', 10], ['নয়', 9], ['আট', 8], ['সাত', 7], ['ছয়', 6], ['পাঁচ', 5], ['চার', 4], ['তিন', 3], ['দুই', 2], ['দুই', 2], ['এক', 1]];
const WD: [string, number][] = [['রবিবার', 0], ['সোমবার', 1], ['মঙ্গলবার', 2], ['বুধবার', 3], ['বৃহস্পতিবার', 4], ['শুক্রবার', 5], ['শনিবার', 6], ['রবি', 0], ['সোম', 1], ['মঙ্গল', 2], ['বুধ', 3], ['বৃহস্পতি', 4], ['শুক্র', 5], ['শনি', 6]];
const TOMORROW = /(^|\s)(আগামীকাল|কাল)(ের|কের)?(?=\s|$)/; // standalone word only: "সকাল" must not match
const MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

export function norm(s: string) {
  let t = s.replace(/[০-৯]/g, (d) => DIG[d]);
  for (const [w, n] of WORDS) t = t.split(w).join(String(n));
  return t.replace(/\s+/g, ' ').trim();
}

export type Parsed =
  | { intent: 'create'; title: string; due_at: number | null; recurrence: string; remind: number[]; priority: number }
  | { intent: 'list'; scope: 'today' | 'tomorrow' | 'week' | 'overdue' | 'important' }
  | { intent: 'report' }
  | { intent: 'move_overdue' }
  | { intent: 'study_plan'; day: number }
  | { intent: 'unknown' };

function parseTime(t: string): { h: number; m: number; matched: string } | null {
  const m = t.match(/(ভোর|সকাল|দুপুর|বিকাল|সন্ধ্যা|রাত)?\s*(\d{1,2})(?::(\d{2}))?\s*(টা(?:\u09DF|\u09AF\u09BC|\u09AF)?|টার)/);
  if (!m) return null;
  let h = +m[2]; const min = m[3] ? +m[3] : 0; const p = m[1];
  if (p === 'দুপুর') h = h < 6 ? h + 12 : h; // দুপুর ১টা => 13
  else if (p === 'বিকাল' || p === 'সন্ধ্যা') h = h < 12 ? h + 12 : h;
  else if (p === 'রাত') h = h === 12 ? 0 : h < 6 ? h + 12 : h < 12 ? h + 12 : h; // রাত ৮টা => 20, রাত ১২টা => 0
  if (h > 23) return null;
  return { h, m: min, matched: m[0] };
}

export function parse(raw: string, now = Date.now()): Parsed {
  const t = norm(raw); const sod = startOfDay(now);
  if (/(সংক্ষিপ্ত )?রিপোর্ট/.test(t)) return { intent: 'report' };
  if (/(অসমাপ্ত|বাকি).*(সরিয়ে|সরাও)/.test(t) || /সরিয়ে দাও/.test(t) && /অসমাপ্ত/.test(t)) return { intent: 'move_overdue' };
  if (/(পড়াশোনা|পড়ার).*(রুটিন|পরিকল্পনা)/.test(t) && /(তৈরি|বানাও|করো)/.test(t)) {
    const wd = WD.find(([w]) => t.includes(w)); let day = sod;
    if (TOMORROW.test(t)) day = sod + DAY;
    if (wd) { const d = new Date(sod); const diff = (wd[1] - d.getDay() + 7) % 7 || 7; day = sod + diff * DAY; }
    return { intent: 'study_plan', day };
  }
  const asksList = /(দেখাও|দেখাও|তালিকা|কী কী|কি কি|দেখি)/.test(t) && !/মনে করিয়ে/.test(t);
  if (asksList) {
    if (/গুরুত্বপূর্ণ/.test(t)) return { intent: 'list', scope: 'important' };
    if (/মেয়াদোত্তীর্ণ|অসমাপ্ত/.test(t) && /সপ্তাহ/.test(t)) return { intent: 'list', scope: 'week' };
    if (/সপ্তাহ/.test(t)) return { intent: 'list', scope: 'week' };
    if (TOMORROW.test(t)) return { intent: 'list', scope: 'tomorrow' };
    if (/মেয়াদোত্তীর্ণ/.test(t)) return { intent: 'list', scope: 'overdue' };
    return { intent: 'list', scope: 'today' };
  }
  const isCreate = /(মনে করিয়ে|মনে করাবে|মনে করাও|আছে|হবে|যোগ করো)/.test(t);
  if (!isCreate) return { intent: 'unknown' };

  // recurrence
  let recurrence = 'none'; let recDay: number | null = null; let recMonthDay: number | null = null;
  const ev = t.match(/প্রতি\s*(\d+)\s*(দিন|সপ্তাহ|মাস)/);
  if (ev) recurrence = `every:${Math.max(1, +ev[1])}:${ev[2] === 'দিন' ? 'd' : ev[2] === 'সপ্তাহ' ? 'w' : 'm'}`;
  else if (/প্রতিদিন|প্রতি দিন/.test(t)) recurrence = 'daily';
  else if (/প্রতি মাসের?/.test(t)) { recurrence = 'monthly'; const m = t.match(/প্রতি মাসের?\s*(\d{1,2})\s*তারিখ/); if (m) { recMonthDay = +m[1]; recurrence = `monthday:${recMonthDay}`; } }
  else if (/প্রতি বছর/.test(t)) recurrence = 'yearly';
  else { const w = t.match(/প্রতি\s*(রবিবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার|শুক্রবার|শনিবার|রবি|সোম|মঙ্গল|বুধ|বৃহস্পতি|শুক্র|শনি)/); if (w) { recurrence = 'weekly'; recDay = WD.find(([n]) => n === w[1])![1]; } }

  // date
  const base = new Date(sod); let date = new Date(sod); let found = false;
  const mm = t.match(/(\d{1,2})\s*(জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)/);
  if (mm) { date = new Date(base.getFullYear(), MON.indexOf(mm[2]), +mm[1]); if (date.getTime() < sod) date.setFullYear(date.getFullYear() + 1); found = true; }
  else if (/আগামী মাসের\s*\d{1,2}\s*তারিখ/.test(t)) { const d = +t.match(/আগামী মাসের\s*(\d{1,2})\s*তারিখ/)![1]; date = new Date(base.getFullYear(), base.getMonth() + 1, d); found = true; }
  else if (recMonthDay) { const dim = (y: number, mo: number) => new Date(y, mo + 1, 0).getDate(); const y0 = base.getFullYear(), m0 = base.getMonth(); date = new Date(y0, m0, Math.min(recMonthDay, dim(y0, m0))); if (date.getTime() < sod) { const nm = new Date(y0, m0 + 1, 1); date = new Date(nm.getFullYear(), nm.getMonth(), Math.min(recMonthDay, dim(nm.getFullYear(), nm.getMonth()))); } found = true; }
  else if (/পরশু/.test(t)) { date = new Date(sod + 2 * DAY); found = true; }
  else if (TOMORROW.test(t)) { date = new Date(sod + DAY); found = true; }
  else if (/আজ/.test(t)) { found = true; }
  else {
    const wdn = recDay ?? (() => { const w = WD.find(([n]) => t.includes(n) && n.length > 3 || t.includes('আগামী ' + n)); return w ? w[1] : null; })();
    if (wdn != null) { const diff = (wdn - base.getDay() + 7) % 7 || 7; date = new Date(sod + diff * DAY); found = true; }
    else if (recurrence === 'daily' || recurrence.startsWith('every:')) found = true;
  }
  const tm = parseTime(t);
  if (tm) date.setHours(tm.h, tm.m, 0, 0); else if (found) date.setHours(9, 0, 0, 0);
  if (tm && tm.h === 0 && date.getTime() < now) date.setDate(date.getDate() + 1); // রাত ১২টা => আসন্ন মধ্যরাত
  let due: number | null = found || tm ? date.getTime() : null;
  if (due && !found && tm && due < now) due += DAY; // time only, already passed today => tomorrow

  // remind-before: "তিন দিন আগে" / "2 ঘণ্টা আগে"
  const remind: number[] = [0];
  const rb = t.match(/(\d+)\s*(দিন|ঘণ্টা|ঘন্টা|মিনিট)\s*আগে/);
  if (rb) remind.push(+rb[1] * (rb[2] === 'দিন' ? 1440 : rb[2] === 'মিনিট' ? 1 : 60));

  // title: strip scheduling words
  let title = raw.trim();
  const strip = [/প্রতি\s*[০-৯0-9]+\s*(দিন|সপ্তাহ|মাস)\s*(পরপর|পর)?/g, /(আগামী মাসের|প্রতি মাসের)?\s*[০-৯0-9]{1,2}\s*তারিখে?/g, /আগামী\s*[০-৯0-9]{1,2}\s*(জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)/g, /(ভোর|সকাল|দুপুর|বিকাল|সন্ধ্যা|রাত)?\s*[০-৯0-9]{1,2}(:[০-৯0-9]{2})?\s*(টা(?:\u09DF|\u09AF\u09BC|\u09AF)?|টার)/g, /(^|\s)(আগামীকাল|আগামী|আজ|কাল|পরশু)(?=\s|$)/g, /প্রতি\s*(দিন|মাস|বছর|রবিবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার|শুক্রবার|শনিবার)/g, /প্রতিদিন/g, /[০-৯0-9একদুইতিনচারপাঁচছয়সাতআটনয়দশ]+\s*(দিন|ঘণ্টা|ঘন্টা|মিনিট)\s*আগে/g, /(আমাকে|আমার)/g, /(মনে করিয়ে দিও|মনে করিয়ে দেবে|মনে করিয়ে দাও|মনে করাবে|মনে করাও|আছে|করতে হবে|যোগ করো)/g, /(একটি|একটা)/g, /[।!?]/g];
  for (const r of strip) title = title.replace(r, ' ');
  for (const [w] of WD) title = title.replace(new RegExp(`(^|\\s)${w}(\\s|$)`, 'g'), ' ');
  title = title.replace(/\s+/g, ' ').replace(/^(এর|র|ের|-|,)\s*/, '').trim();
  title = title.replace(/^[\u09DF\u09AF\u09BC]+\s*/, '').trim();
  if (!title) title = raw.trim();
  const priority = /(জরুরি)/.test(t) ? 0 : /(গুরুত্বপূর্ণ)/.test(t) ? 1 : 2;
  return { intent: 'create', title, due_at: due, recurrence, remind, priority };
}
