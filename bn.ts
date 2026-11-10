const D = '০১২৩৪৫৬৭৮৯';
export const bd = (n: number | string) => String(n).replace(/\d/g, (d) => D[+d]);
export const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
export const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const p2 = (n: number) => String(n).padStart(2, '0');
export const fmtDate = (ms: number) => { const d = new Date(ms); return bd(`${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`); };
export const fmtLongDate = (ms: number) => { const d = new Date(ms); return `${WEEKDAYS[d.getDay()]}বার, ${bd(d.getDate())} ${MONTHS[d.getMonth()]} ${bd(d.getFullYear())}`; };
export function period(h: number) { return h >= 4 && h < 6 ? 'ভোর' : h >= 6 && h < 12 ? 'সকাল' : h >= 12 && h < 15 ? 'দুপুর' : h >= 15 && h < 18 ? 'বিকাল' : h >= 18 && h < 20 ? 'সন্ধ্যা' : 'রাত'; }
export const fmtTime = (ms: number) => { const d = new Date(ms); const h = d.getHours(); return `${period(h)} ${bd(h % 12 || 12)}:${bd(p2(d.getMinutes()))}`; };
export const greeting = (h = new Date().getHours()) => (h >= 4 && h < 12 ? 'শুভ সকাল' : h >= 12 && h < 16 ? 'শুভ দুপুর' : h >= 16 && h < 19 ? 'শুভ বিকাল' : h >= 19 || h < 4 ? 'শুভ সন্ধ্যা' : 'শুভ দিন');
export const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const DAY = 86400000;
// recurrence values: none | daily | weekly | monthly | yearly | every:N:d|w|m (every N days/weeks/months) | monthday:D (D-th of every month)
export function advance(due: number, rec: string) {
  const d = new Date(due);
  const ev = rec.match(/^every:(\d+):([dwm])$/); const md = rec.match(/^monthday:(\d+)$/);
  if (ev) { const n = Math.max(1, +ev[1]); if (ev[2] === 'd') d.setDate(d.getDate() + n); else if (ev[2] === 'w') d.setDate(d.getDate() + 7 * n); else { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); } }
  else if (md) { const want = +md[1]; d.setDate(1); d.setMonth(d.getMonth() + 1); d.setDate(Math.min(want, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
  else if (rec === 'daily') d.setDate(d.getDate() + 1);
  else if (rec === 'weekly') d.setDate(d.getDate() + 7);
  else if (rec === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (rec === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
}
export function recLabel(rec: string) {
  const ev = rec.match(/^every:(\d+):([dwm])$/); const md = rec.match(/^monthday:(\d+)$/);
  if (ev) return `প্রতি ${bd(ev[1])} ${ev[2] === 'd' ? 'দিন' : ev[2] === 'w' ? 'সপ্তাহ' : 'মাস'} পরপর`;
  if (md) return `প্রতি মাসের ${bd(md[1])} তারিখ`;
  return ({ none: 'একবার', daily: 'প্রতিদিন', weekly: 'প্রতি সপ্তাহ', monthly: 'প্রতি মাস', yearly: 'প্রতি বছর' } as Record<string, string>)[rec] ?? rec;
}
// Moves a time that falls inside quiet hours (minutes since midnight) to the end of the quiet window.
export function adjustQuiet(ms: number, on: boolean, start: number, end: number) {
  if (!on) return ms;
  const d = new Date(ms); const m = d.getHours() * 60 + d.getMinutes();
  const inside = start > end ? m >= start || m < end : m >= start && m < end;
  if (!inside) return ms;
  d.setHours(Math.floor(end / 60), end % 60, 0, 0);
  if (d.getTime() <= ms) d.setDate(d.getDate() + 1);
  return d.getTime();
}
