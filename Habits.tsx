import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as N from 'expo-notifications';
import * as DB from './db';
import { useApp } from './store';
import { Btn, Card, Chip, T } from './ui';
import { DAY, WEEKDAYS, bd, startOfDay } from './bn';
import * as R from './reminders';

const HREM: [number | null, string][] = [[null, 'রিমাইন্ডার বন্ধ'], [300, 'ভোর ৫:০০'], [420, 'সকাল ৭:০০'], [780, 'দুপুর ১:০০'], [1020, 'বিকাল ৫:০০'], [1260, 'রাত ৯:০০']];

const input = (c: any) => ({ fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card, color: c.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12 } as const);

function streak(logs: Set<string>, days: number[]) {
  let n = 0; let d = startOfDay(Date.now());
  if (!logs.has(DB.dayKey(d))) d -= DAY; // today not yet done does not break the streak
  for (let i = 0; i < 400; i++, d -= DAY) { const sched = days.includes(new Date(d).getDay()); if (!sched) continue; if (logs.has(DB.dayKey(d))) n++; else break; }
  return n;
}

function HabitList() {
  const { c } = useApp();
  const [habits, setHabits] = useState<DB.Habit[]>([]); const [logs, setLogs] = useState<{ habit_id: number; day: string }[]>([]);
  const [name, setName] = useState(''); const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); const [rem, setRem] = useState<number | null>(null);
  const load = async () => { setHabits(await DB.listHabits()); setLogs(await DB.listLogs()); };
  useEffect(() => { load(); }, []);
  const today = DB.dayKey(Date.now());
  const add = async () => { if (!name.trim() || !days.length) return; const id = await DB.addHabit(name.trim(), days, rem); if (rem != null) await R.scheduleHabit({ id, name: name.trim(), days: JSON.stringify(days), remind_min: rem }); setName(''); setRem(null); load(); };
  const setHabitRem = async (h: DB.Habit, m: number | null) => { await (await DB.getDb()).runAsync('UPDATE habits SET remind_min = ? WHERE id = ?', [m, h.id]); await R.scheduleHabit({ ...h, remind_min: m }); load(); };
  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <TextInput value={name} onChangeText={setName} placeholder="নতুন অভ্যাসের নাম (যেমন: ফজরের পর তিলাওয়াত)" placeholderTextColor={c.sub} style={input(c)} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{WEEKDAYS.map((w, i) => <Chip key={i} label={w} on={days.includes(i)} onPress={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])} />)}</View>
        <T size={12} color={c.sub} style={{ marginBottom: 4 }}>রিমাইন্ডারের সময়</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{HREM.map(([m, l]) => <Chip key={String(m)} label={l} on={rem === m} onPress={() => setRem(m)} />)}</View>
        <View style={{ flexDirection: 'row' }}><Btn label="অভ্যাস যোগ করুন" onPress={add} /></View>
      </Card>
      {habits.length === 0 && <Card><T color={c.sub}>এখনও কোনো অভ্যাস যোগ করা হয়নি।</T></Card>}
      {habits.map((h) => {
        const set = new Set(logs.filter((l) => l.habit_id === h.id).map((l) => l.day)); const sd: number[] = JSON.parse(h.days);
        const last30 = Array.from({ length: 28 }, (_, i) => startOfDay(Date.now()) - (27 - i) * DAY);
        const sched = last30.filter((d) => sd.includes(new Date(d).getDay())); const rate = sched.length ? Math.round((sched.filter((d) => set.has(DB.dayKey(d))).length / sched.length) * 100) : 0;
        return (
          <Card key={h.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={async () => { await DB.toggleLog(h.id, today); load(); }} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: c.primary, backgroundColor: set.has(today) ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{set.has(today) && <T color="#fff" w="b">✓</T>}</Pressable>
              <View style={{ flex: 1, marginHorizontal: 12 }}><T w="m">{h.name}</T><T size={12} color={c.sub}>ধারাবাহিকতা {bd(streak(set, sd))} দিন · ২৮ দিনে {bd(rate)}%</T></View>
              <Pressable onPress={() => Alert.alert('অভ্যাস মুছবেন?', h.name, [{ text: 'না' }, { text: 'মুছুন', style: 'destructive', onPress: async () => { await R.cancelHabit(h.id); await DB.deleteHabit(h.id); load(); } }])}><T color={c.danger} size={13}>মুছুন</T></Pressable>
            </View>
            {(() => { const now = new Date(); let due = 0, done = 0; for (let i = 1; i <= now.getDate(); i++) { const d = new Date(now.getFullYear(), now.getMonth(), i); if (sd.includes(d.getDay())) { due++; if (set.has(DB.dayKey(d.getTime()))) done++; } } return <T size={12} color={c.sub} style={{ marginTop: 6 }}>এই মাসে {bd(done)}/{bd(due)} দিন সম্পন্ন</T>; })()}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>{HREM.map(([m, l]) => <Chip key={String(m)} label={l} on={(h.remind_min ?? null) === m} onPress={() => setHabitRem(h, m)} />)}</View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 4 }}>{last30.map((d) => <View key={d} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: set.has(DB.dayKey(d)) ? c.ok : sd.includes(new Date(d).getDay()) ? c.card2 : 'transparent' }} />)}</View>
          </Card>
        );
      })}
    </>
  );
}

const PRESETS: [string, number][] = [['ফোকাস ২৫ মি.', 25], ['ছোট বিরতি ৫ মি.', 5], ['দীর্ঘ বিরতি ১৫ মি.', 15]];
function Pomodoro() {
  const { c } = useApp();
  const [mins, setMins] = useState(25); const [custom, setCustom] = useState(''); const [endAt, setEndAt] = useState<number | null>(null); const [left, setLeft] = useState(0);
  const [sessions, setSessions] = useState<{ started_at: number; minutes: number }[]>([]); const nid = useRef<string | null>(null);
  const kind = useRef('focus');
  const load = async () => setSessions(await DB.listSessions());
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!endAt) return;
    const h = setInterval(async () => { const l = endAt - Date.now(); setLeft(Math.max(0, l)); if (l <= 0) { clearInterval(h); await DB.addSession(mins, kind.current); setEndAt(null); load(); } }, 500);
    return () => clearInterval(h);
  }, [endAt]);
  const start = async () => {
    const at = Date.now() + mins * 60000; kind.current = mins >= 20 || custom ? 'focus' : 'break'; setLeft(mins * 60000); setEndAt(at);
    // OS-level alarm so the timer completes even if the app is backgrounded.
    nid.current = await N.scheduleNotificationAsync({ content: { title: kind.current === 'focus' ? 'ফোকাস সেশন শেষ' : 'বিরতি শেষ', body: 'চমৎকার! এবার পরের ধাপে যান।', sound: 'default' }, trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: 'reminders' } });
  };
  const stop = async () => { setEndAt(null); if (nid.current) await N.cancelScheduledNotificationAsync(nid.current); };
  const sod = startOfDay(Date.now()); const todayMin = sessions.filter((s) => s.started_at >= sod).reduce((a, s) => a + s.minutes, 0); const weekMin = sessions.filter((s) => s.started_at >= sod - 6 * DAY).reduce((a, s) => a + s.minutes, 0);
  const sec = Math.ceil(left / 1000); const mm = Math.floor(sec / 60); const ss = sec % 60;
  return (
    <>
      <Card style={{ alignItems: 'center', marginBottom: 14 }}>
        <T w="b" size={56} style={{ lineHeight: 80 }}>{endAt ? `${bd(String(mm).padStart(2, '0'))}:${bd(String(ss).padStart(2, '0'))}` : `${bd(String(mins).padStart(2, '0'))}:০০`}</T>
        {!endAt && <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginVertical: 8 }}>{PRESETS.map(([l, m]) => <Chip key={m} label={l} on={mins === m && !custom} onPress={() => { setMins(m); setCustom(''); }} />)}</View>}
        {!endAt && <TextInput value={custom} onChangeText={(v) => { setCustom(v); const n = parseInt(v.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString()), 10); if (n > 0 && n < 300) setMins(n); }} placeholder="কাস্টম মিনিট" keyboardType="numeric" placeholderTextColor={c.sub} style={[input(c), { width: 160, textAlign: 'center' }]} />}
        <View style={{ flexDirection: 'row', width: '100%' }}>{endAt ? <Btn kind="danger" label="থামান" onPress={stop} /> : <Btn label="শুরু করুন" onPress={start} />}</View>
      </Card>
      <Card><T w="b">ফোকাস পরিসংখ্যান</T><T color={c.sub}>আজ: {bd(todayMin)} মিনিট · ৭ দিনে: {bd(weekMin)} মিনিট · মোট সেশন: {bd(sessions.length)}</T></Card>
    </>
  );
}

function NotesScreen() {
  const { c, save, cats } = useApp();
  const [notes, setNotes] = useState<DB.Note[]>([]); const [q, setQ] = useState(''); const [ed, setEd] = useState<Partial<DB.Note> | null>(null);
  const load = async () => setNotes(await DB.listNotes()); useEffect(() => { load(); }, []);
  if (ed) return (
    <>
      <TextInput value={ed.title} onChangeText={(v) => setEd({ ...ed, title: v })} placeholder="শিরোনাম" placeholderTextColor={c.sub} style={input(c)} />
      <TextInput value={ed.body} onChangeText={(v) => setEd({ ...ed, body: v })} placeholder={'নোট লিখুন। চেকলিস্টের জন্য লাইনের শুরুতে "- " দিন।'} placeholderTextColor={c.sub} multiline style={[input(c), { minHeight: 180, textAlignVertical: 'top' }]} />
      <TextInput value={ed.tags} onChangeText={(v) => setEd({ ...ed, tags: v })} placeholder="ট্যাগ (কমা দিয়ে আলাদা করুন)" placeholderTextColor={c.sub} style={input(c)} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Btn label="সংরক্ষণ" onPress={async () => { await DB.saveNote(ed); setEd(null); load(); }} />
        <Btn kind="ghost" label={ed.pinned ? 'আনপিন' : 'পিন করুন'} onPress={() => setEd({ ...ed, pinned: ed.pinned ? 0 : 1 })} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Btn kind="ghost" label="চেকলিস্ট আইটেম → কাজ" onPress={async () => { const items = (ed.body ?? '').split('\n').filter((l) => l.trim().startsWith('- ')).map((l) => l.trim().slice(2).trim()).filter(Boolean); if (!items.length) { Alert.alert('কোনো চেকলিস্ট আইটেম নেই', 'লাইনের শুরুতে "- " দিন।'); return; } for (const t of items) await save({ title: t, category_id: cats[1]?.id ?? null, priority: 2, status: 0, due_at: null, recurrence: 'none', remind: '[0]', repeat_min: 0, repeat_max: 5, notes: '', starred: 0 }); Alert.alert('হয়েছে', `${bd(items.length)}টি কাজ তৈরি হয়েছে।`); }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn kind="ghost" label="বন্ধ করুন" onPress={() => setEd(null)} />
        {ed.id ? <Btn kind="danger" label="মুছুন" onPress={() => Alert.alert('নোট মুছবেন?', '', [{ text: 'না' }, { text: 'মুছুন', style: 'destructive', onPress: async () => { await DB.deleteNote(ed.id!); setEd(null); load(); } }])} /> : null}
      </View>
    </>
  );
  const list = notes.filter((n) => !q || (n.title + n.body + n.tags).includes(q));
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}><TextInput value={q} onChangeText={setQ} placeholder="নোট খুঁজুন" placeholderTextColor={c.sub} style={[input(c), { flex: 1 }]} /><Pressable onPress={() => setEd({ title: '', body: '', tags: '', pinned: 0 })} style={{ backgroundColor: c.primary, borderRadius: 16, paddingHorizontal: 18, justifyContent: 'center', marginBottom: 12 }}><T color="#fff" w="b">+ নতুন</T></Pressable></View>
      {list.length === 0 && <Card><T color={c.sub}>কোনো নোট নেই।</T></Card>}
      {list.map((n) => <Pressable key={n.id} onPress={() => setEd(n)}><Card style={{ marginBottom: 10 }}><T w="m">{n.pinned ? '📌 ' : ''}{n.title || 'শিরোনামহীন'}</T><T size={13} color={c.sub} numberOfLines={2}>{n.body}</T>{n.tags ? <T size={12} color={c.primary}>#{n.tags.split(',').map((x) => x.trim()).filter(Boolean).join(' #')}</T> : null}</Card></Pressable>)}
    </>
  );
}

export function HabitsScreen() {
  const { c } = useApp(); const [sub, setSub] = useState('habit');
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 170 }} keyboardShouldPersistTaps="handled">
      <T w="b" size={22} style={{ marginBottom: 12 }}>অভ্যাস</T>
      <View style={{ flexDirection: 'row' }}>{[['habit', 'অভ্যাস'], ['pomo', 'পোমোডোরো'], ['notes', 'নোট']].map(([k, l]) => <Chip key={k} label={l} on={sub === k} onPress={() => setSub(k)} />)}</View>
      {sub === 'habit' && <HabitList />}{sub === 'pomo' && <Pomodoro />}{sub === 'notes' && <NotesScreen />}
    </ScrollView>
  );
}
