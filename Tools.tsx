import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons as I } from '@expo/vector-icons';
import * as DB from './db';
import { useApp } from './store';
import { Btn, Card, Chip, T } from './ui';
import { DAY, WEEKDAYS, bd, fmtDate, fmtLongDate, fmtTime, startOfDay } from './bn';
import { PRIORITIES, STATUSES } from './theme';
import type { Task } from './db';

const pc = (p: number) => PRIORITIES[p]?.c ?? '#999';
const openTop = (tasks: Task[]) => tasks.filter((t) => t.status < 2 && !t.parent_id && !t.archived);

function MiniTask({ t }: { t: Task }) {
  const { c, setEditor } = useApp();
  return (
    <Pressable onPress={() => setEditor(t.id)} style={{ backgroundColor: c.card2, borderRadius: 12, padding: 10, marginBottom: 6, borderLeftWidth: 4, borderLeftColor: pc(t.priority) }}>
      <T w="m" size={13}>{t.title}</T>
      {t.due_at ? <T size={11} color={c.sub}>{fmtDate(t.due_at)} · {fmtTime(t.due_at)}</T> : null}
    </Pressable>
  );
}

// ---------- Eisenhower matrix ----------
// জরুরি = মেয়াদ ২ দিনের মধ্যে/পার হয়েছে বা অগ্রাধিকার "জরুরি"; গুরুত্বপূর্ণ = অগ্রাধিকার জরুরি/উচ্চ বা তারকা চিহ্নিত।
export function Matrix() {
  const { c, tasks } = useApp(); const now = Date.now();
  const list = openTop(tasks);
  const urgent = (t: Task) => t.priority === 0 || (!!t.due_at && t.due_at < now + 2 * DAY);
  const important = (t: Task) => t.priority <= 1 || t.starred === 1;
  const Q: [string, string, string, (t: Task) => boolean][] = [
    ['এখনই করুন', 'জরুরি + গুরুত্বপূর্ণ', c.danger, (t) => urgent(t) && important(t)],
    ['পরিকল্পনা করুন', 'গুরুত্বপূর্ণ, জরুরি নয়', c.primary, (t) => !urgent(t) && important(t)],
    ['অন্যকে দিন / দ্রুত সারুন', 'জরুরি, গুরুত্বপূর্ণ নয়', '#F5B54A', (t) => urgent(t) && !important(t)],
    ['পরে দেখুন', 'জরুরিও নয়, গুরুত্বপূর্ণও নয়', c.sub, (t) => !urgent(t) && !important(t)],
  ];
  return <>{Q.map(([n, d, col, f]) => { const items = list.filter(f); return (
    <Card key={n} style={{ marginBottom: 12, borderTopWidth: 3, borderTopColor: col }}>
      <T w="b" color={col}>{n} ({bd(items.length)})</T><T size={12} color={c.sub} style={{ marginBottom: 8 }}>{d}</T>
      {items.length === 0 ? <T size={12} color={c.sub}>কিছু নেই</T> : items.map((t) => <MiniTask key={t.id} t={t} />)}
    </Card>); })}</>;
}

// ---------- Kanban ----------
export function Kanban() {
  const { c, tasks, save, setEditor } = useApp();
  const cols = [0, 1, 3, 2];
  const move = (t: Task, dir: -1 | 1) => { const i = cols.indexOf(t.status); const ns = cols[i + dir]; if (ns === undefined) return; save({ id: t.id, status: ns, completed_at: ns === 2 ? Date.now() : null }); };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {cols.map((s) => { const items = tasks.filter((t: Task) => t.status === s && !t.parent_id && !t.archived && (s !== 2 || (t.completed_at ?? 0) > Date.now() - 7 * DAY));
        return (
          <View key={s} style={{ width: 250, marginRight: 12, backgroundColor: c.card, borderRadius: 18, padding: 12 }}>
            <T w="b" style={{ marginBottom: 8 }}>{STATUSES[s]} ({bd(items.length)})</T>
            {items.length === 0 && <T size={12} color={c.sub}>খালি</T>}
            {items.map((t: Task) => (
              <View key={t.id} style={{ backgroundColor: c.card2, borderRadius: 12, padding: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: pc(t.priority) }}>
                <Pressable onPress={() => setEditor(t.id)}><T w="m" size={13}>{t.title}</T></Pressable>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Pressable hitSlop={10} onPress={() => move(t, -1)} style={{ opacity: cols.indexOf(s) === 0 ? 0.2 : 1 }}><I name="arrow-left-circle-outline" size={24} color={c.sub} /></Pressable>
                  <Pressable hitSlop={10} onPress={() => move(t, 1)} style={{ opacity: cols.indexOf(s) === cols.length - 1 ? 0.2 : 1 }}><I name="arrow-right-circle-outline" size={24} color={c.primary} /></Pressable>
                </View>
              </View>
            ))}
          </View>); })}
    </ScrollView>
  );
}

// ---------- Timeline ----------
export function Timeline() {
  const { c, tasks } = useApp(); const sod = startOfDay(Date.now());
  const list = openTop(tasks).filter((t: Task) => t.due_at && t.due_at < sod + 15 * DAY).sort((a: Task, b: Task) => a.due_at! - b.due_at!);
  if (!list.length) return <Card><T color={c.sub}>আগামী ১৪ দিনে কোনো সময়সূচিবদ্ধ কাজ নেই।</T></Card>;
  const groups: [number, Task[]][] = [];
  for (const t of list) { const d = t.due_at! < sod ? sod - DAY : startOfDay(t.due_at!); const g = groups.find((x) => x[0] === d); if (g) g[1].push(t); else groups.push([d, [t]]); }
  return <>{groups.map(([d, ts]) => (
    <View key={d} style={{ flexDirection: 'row', marginBottom: 6 }}>
      <View style={{ width: 22, alignItems: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d < sod ? c.danger : c.primary, marginTop: 6 }} /><View style={{ flex: 1, width: 2, backgroundColor: c.line }} /></View>
      <View style={{ flex: 1, paddingBottom: 12 }}>
        <T w="b" size={14} color={d < sod ? c.danger : c.text}>{d < sod ? 'মেয়াদোত্তীর্ণ' : fmtLongDate(d)}</T>
        {ts.map((t) => <MiniTask key={t.id} t={t} />)}
      </View>
    </View>))}</>;
}

// ---------- Countdown ----------
export function Countdown() {
  const { c, tasks, cats } = useApp(); const sod = startOfDay(Date.now());
  const ids = cats.filter((x: any) => x.name === 'গুরুত্বপূর্ণ তারিখ' || x.name === 'অনুষ্ঠান ও মিটিং').map((x: any) => x.id);
  const list = openTop(tasks).filter((t: Task) => t.due_at && t.due_at >= sod && (ids.includes(t.category_id) || t.starred === 1)).sort((a: Task, b: Task) => a.due_at! - b.due_at!);
  if (!list.length) return <Card><T color={c.sub}>কাউন্টডাউনের জন্য কিছু নেই। "গুরুত্বপূর্ণ তারিখ" বা "অনুষ্ঠান ও মিটিং" ক্যাটাগরিতে অথবা তারকা চিহ্ন দিয়ে ভবিষ্যৎ তারিখের কাজ যোগ করুন।</T></Card>;
  return <>{list.map((t: Task) => { const days = Math.round((startOfDay(t.due_at!) - sod) / DAY); return (
    <Pressable key={t.id} onPress={() => {}} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 18, padding: 14, marginBottom: 10 }}>
      <View style={{ width: 64, alignItems: 'center' }}><T w="b" size={26} color={c.primary} style={{ lineHeight: 34 }}>{bd(days)}</T><T size={11} color={c.sub}>{days === 0 ? 'আজই' : 'দিন বাকি'}</T></View>
      <View style={{ flex: 1 }}><T w="m">{t.title}</T><T size={12} color={c.sub}>{fmtLongDate(t.due_at!)} · {fmtTime(t.due_at!)}</T></View>
    </Pressable>); })}</>;
}

// ---------- আজকের সহকারী (daily secretary + reviews + analytics) ----------
function freeSlots(list: Task[]) {
  const now = Date.now(); const sod = startOfDay(now);
  const from = Math.max(now, sod + 8 * 3600000); const to = sod + 22 * 3600000;
  const busy = list.filter((t) => t.due_at && t.due_at >= sod && t.due_at < sod + DAY).map((t) => [t.due_at!, t.due_at! + 3600000] as [number, number]).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = []; let cur = from;
  for (const [s, e] of busy) { if (s - cur >= 45 * 60000) out.push([cur, s]); cur = Math.max(cur, e); }
  if (to - cur >= 45 * 60000) out.push([cur, to]);
  return out;
}
const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <><T w="b" size={17} style={{ marginTop: 16, marginBottom: 8 }}>{title}</T>{children}</>;

function Today() {
  const { c, tasks, cats, save, setUndo, reload } = useApp(); const now = Date.now(); const sod = startOfDay(now); const eod = sod + DAY;
  const open = openTop(tasks);
  const today = open.filter((t: Task) => t.due_at && t.due_at >= sod && t.due_at < eod);
  const overdue = open.filter((t: Task) => t.due_at && t.due_at < now);
  const noDate = open.filter((t: Task) => !t.due_at);
  const events = open.filter((t: Task) => t.due_at && t.due_at >= eod && t.due_at < eod + 7 * DAY && cats.find((x: any) => x.id === t.category_id)?.name?.match(/অনুষ্ঠান|গুরুত্বপূর্ণ তারিখ/));
  const study = open.filter((t: Task) => cats.find((x: any) => x.id === t.category_id)?.name === 'পড়াশোনা');
  const slots = freeSlots(open); const hour = new Date().getHours();
  const doneToday = tasks.filter((t: Task) => t.completed_at && t.completed_at >= sod).length;
  const list = (a: Task[], empty: string) => a.length ? a.map((t) => <MiniTask key={t.id} t={t} />) : <T size={13} color={c.sub}>{empty}</T>;
  const shiftOverdue = () => Alert.alert('আগামীকালে সরাবেন?', `${bd(overdue.length)}টি মেয়াদোত্তীর্ণ কাজ আগামীকাল একই সময়ে সরানো হবে। পরে "পূর্বাবস্থায় ফেরান" চাপলে আগের অবস্থায় ফিরবে।`, [
    { text: 'না', style: 'cancel' },
    { text: 'হ্যাঁ, সরান', onPress: async () => {
      const snaps = overdue.map((t: Task) => ({ ...t }));
      for (const t of overdue) { const d = new Date(t.due_at!); const n = new Date(sod + DAY); n.setHours(d.getHours(), d.getMinutes(), 0, 0); await save({ id: t.id, due_at: n.getTime() }); }
      setUndo({ msg: 'কাজগুলো আগামীকালে সরানো হয়েছে', run: async () => { for (const s of snaps) await save({ id: s.id, due_at: s.due_at }); await reload(); } });
    } },
  ]);
  return (
    <>
      <Card><T w="m">{greetLine(hour)}</T><T size={13} color={c.sub}>আজ {bd(today.length)}টি কাজ নির্ধারিত, {bd(doneToday)}টি সম্পন্ন, {bd(overdue.length)}টি মেয়াদোত্তীর্ণ।</T></Card>
      <Sec title="আজকের গুরুত্বপূর্ণ কাজ">{list(today.filter((t: Task) => t.priority <= 1 || t.starred), 'গুরুত্বপূর্ণ কাজ নেই')}</Sec>
      <Sec title="আজকের রিমাইন্ডার">{list(today, 'আজ কোনো রিমাইন্ডার নেই')}</Sec>
      <Sec title="মেয়াদোত্তীর্ণ কাজ">
        {list(overdue, 'কোনো মেয়াদোত্তীর্ণ কাজ নেই 🎉')}
        {overdue.length > 0 && <View style={{ flexDirection: 'row', marginTop: 6 }}><Btn kind="ghost" label="সবগুলো আগামীকালে সরানোর প্রস্তাব" onPress={shiftOverdue} /></View>}
      </Sec>
      <Sec title="আসন্ন অনুষ্ঠান ও গুরুত্বপূর্ণ তারিখ (৭ দিন)">{list(events, 'আগামী ৭ দিনে কিছু নেই')}</Sec>
      <Sec title="পড়াশোনার পরিকল্পনা">{list(study, 'পড়াশোনার কোনো কাজ নেই। সহকারীকে বলুন: "আজকের পড়াশোনার পরিকল্পনা করো"')}</Sec>
      <Sec title="খালি সময় (সকাল ৮টা – রাত ১০টা)">
        {slots.length ? slots.map(([a, b], i) => <T key={i} size={13} color={c.sub}>• {fmtTime(a)} থেকে {fmtTime(b)} ({bd(Math.round((b - a) / 60000))} মিনিট)</T>) : <T size={13} color={c.sub}>আজ আর খালি সময় নেই</T>}
        {slots.length > 0 && noDate.length > 0 && <T size={12} color={c.sub} style={{ marginTop: 6 }}>প্রস্তাব: সময়হীন কাজ "{noDate[0].title}" {fmtTime(slots[0][0])}-এ করতে পারেন। (নিজে সময় নির্ধারণ না করলে কিছুই সরানো হবে না।)</T>}
      </Sec>
      <Sec title="অসমাপ্ত কাজ (সময়হীন)">{list(noDate.slice(0, 8), 'নেই')}</Sec>
      {hour >= 18 && <Sec title="সন্ধ্যার রিভিউ"><Card><T size={13}>আজ সম্পন্ন: {bd(doneToday)}টি। বাকি: {bd(today.length + overdue.length)}টি।</T><T size={12} color={c.sub}>বাকি কাজ থাকলে ওপরের তালিকা থেকে নিজে আগামীকালের জন্য ঠিক করে নিন।</T></Card></Sec>}
    </>
  );
}
const greetLine = (h: number) => (h < 12 ? 'সকালের পরিকল্পনা' : h < 18 ? 'দিনের অগ্রগতি' : 'সন্ধ্যার পর্যালোচনা');

function Weekly() {
  const { c, tasks, cats } = useApp(); const sod = startOfDay(Date.now()); const from = sod - 6 * DAY;
  const done = tasks.filter((t: Task) => t.completed_at && t.completed_at >= from);
  const open = openTop(tasks); const overdue = open.filter((t: Task) => t.due_at && t.due_at < Date.now());
  const dueWeek = tasks.filter((t: Task) => t.due_at && t.due_at >= from && t.due_at < sod + DAY && !t.parent_id);
  const rate = dueWeek.length ? Math.round((dueWeek.filter((t: Task) => t.status === 2).length / dueWeek.length) * 100) : 0;
  const byCat = cats.map((x: any) => [x.name, done.filter((t: Task) => t.category_id === x.id).length] as [string, number]).filter((x: [string, number]) => x[1] > 0);
  const perDay = Array.from({ length: 7 }, (_, i) => { const s = from + i * DAY; return [new Date(s).getDay(), done.filter((t: Task) => t.completed_at! >= s && t.completed_at! < s + DAY).length]; });
  const best = perDay.reduce((a, b) => (b[1] > a[1] ? b : a), perDay[0]);
  return (
    <>
      <Card style={{ marginBottom: 12 }}>
        <T w="b" size={17}>গত ৭ দিন</T>
        <T>সম্পন্ন কাজ: {bd(done.length)}টি</T><T>সময়সীমা ছিল এমন কাজে সম্পন্নের হার: {bd(rate)}%</T><T>এখনও মেয়াদোত্তীর্ণ: {bd(overdue.length)}টি</T>
        {best[1] > 0 && <T color={c.sub}>সবচেয়ে উৎপাদনশীল দিন: {WEEKDAYS[best[0]]}বার ({bd(best[1])}টি)</T>}
      </Card>
      <Card style={{ marginBottom: 12 }}><T w="b" style={{ marginBottom: 6 }}>ক্যাটাগরি অনুযায়ী সম্পন্ন</T>
        {byCat.length ? byCat.map(([n, k]) => <View key={n} style={{ marginBottom: 6 }}><T size={13}>{n} — {bd(k)}</T><View style={{ height: 8, borderRadius: 4, backgroundColor: c.card2 }}><View style={{ height: 8, borderRadius: 4, backgroundColor: c.primary, width: `${(k / Math.max(...byCat.map((x) => x[1]))) * 100}%` }} /></View></View>) : <T size={13} color={c.sub}>এই সপ্তাহে কোনো কাজ সম্পন্ন হয়নি</T>}
      </Card>
      <Card><T w="b">আগামী সপ্তাহের জন্য</T><T size={13} color={c.sub}>{overdue.length ? `${bd(overdue.length)}টি মেয়াদোত্তীর্ণ কাজ আগে গুছিয়ে নিন। ` : ''}"আজকের সহকারী" থেকে প্রতিদিনের পরিকল্পনা দেখে নিন এবং গুরুত্বপূর্ণ কাজে তারকা দিন।</T></Card>
    </>
  );
}

export function SecretaryScreen() {
  const { c, setTab } = useApp(); const [sub, setSub] = useState('today');
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 170 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Pressable onPress={() => setTab('home')} hitSlop={12}><I name="arrow-left" size={26} color={c.text} /></Pressable>
        <T w="b" size={22} style={{ marginLeft: 10 }}>আজকের সহকারী</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{[['today', 'আজ'], ['weekly', 'সাপ্তাহিক রিভিউ'], ['count', 'কাউন্টডাউন']].map(([k, l]) => <Chip key={k} label={l} on={sub === k} onPress={() => setSub(k)} />)}</View>
      {sub === 'today' && <Today />}{sub === 'weekly' && <Weekly />}{sub === 'count' && <Countdown />}
    </ScrollView>
  );
}
