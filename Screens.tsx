import React, { useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { MaterialCommunityIcons as I } from '@expo/vector-icons';
import { useApp, useC } from './store';
import { Btn, Card, Chip, T } from './ui';
import { DAY, WEEKDAYS, bd, fmtDate, fmtLongDate, fmtTime, greeting, startOfDay } from './bn';
import { PRIORITIES } from './theme';
import type { Task } from './db';
import * as DB from './db';
import { Share, Alert } from 'react-native';
import { Countdown, Kanban, Matrix, Timeline } from './Tools';
import * as R from './reminders';

const prioColor = (p: number) => PRIORITIES[p]?.c ?? '#999';
const Title = ({ children }: { children: string }) => <T w="b" size={22} style={{ marginBottom: 12 }}>{children}</T>;

export function Soon({ icon, title, note }: { icon: any; title: string; note: string }) {
  const c = useC();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <I name={icon} size={56} color={c.primary} />
      <T w="b" size={20} style={{ marginTop: 12 }}>{title}</T>
      <T color={c.sub} style={{ textAlign: 'center' }}>{note}</T>
    </View>
  );
}

function TaskRow({ t }: { t: Task }) {
  const { c, toggle, setEditor, cats, save, tasks } = useApp(); const done = t.status === 2;
  const subs = tasks.filter((x: Task) => x.parent_id === t.id); const subDone = subs.filter((x: Task) => x.status === 2).length;
  const cat = cats.find((x: any) => x.id === t.category_id)?.name;
  return (
    <Pressable onPress={() => setEditor(t.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 18, padding: 14, marginBottom: 10 }}>
      <Pressable onPress={() => toggle(t)} hitSlop={10}><I name={done ? 'check-circle' : 'checkbox-blank-circle-outline'} size={26} color={done ? c.ok : prioColor(t.priority)} /></Pressable>
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <T w="m" style={{ textDecorationLine: done ? 'line-through' : 'none', opacity: done ? 0.55 : 1 }}>{t.title}</T>
        <T size={12} color={c.sub}>{[t.due_at ? `${fmtDate(t.due_at)} · ${fmtTime(t.due_at)}` : null, cat, t.recurrence !== 'none' ? '↻' : null, subs.length ? `${bd(subDone)}/${bd(subs.length)} উপকাজ` : null].filter(Boolean).join(' · ')}</T>
      </View>
      <Pressable onPress={() => save({ id: t.id, starred: t.starred ? 0 : 1 })} hitSlop={10}><I name={t.starred ? 'star' : 'star-outline'} size={22} color={t.starred ? '#F5B54A' : c.sub} /></Pressable>
    </Pressable>
  );
}

export function Home() {
  const { c, tasks, setEditor, setTab, settings } = useApp();
  const now = Date.now(); const sod = startOfDay(now); const eod = sod + DAY;
  const open = tasks.filter((t: Task) => t.status < 2 && !t.parent_id);
  const today = open.filter((t: Task) => t.due_at && t.due_at >= sod && t.due_at < eod);
  const overdue = open.filter((t: Task) => t.due_at && t.due_at < now);
  const doneToday = tasks.filter((t: Task) => t.completed_at && t.completed_at >= sod).length;
  const upcoming = open.filter((t: Task) => t.due_at && t.due_at >= eod).slice(0, 3);
  const week = Array.from({ length: 7 }, (_, i) => { const s = sod - (6 - i) * DAY; return { d: new Date(s).getDay(), n: tasks.filter((t: Task) => t.completed_at && t.completed_at >= s && t.completed_at < s + DAY).length }; });
  const max = Math.max(1, ...week.map((w) => w.n));
  const Stat = ({ n, l, col }: { n: number; l: string; col: string }) => (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 18, padding: 12, alignItems: 'center' }}><T w="b" size={22} color={col}>{bd(n)}</T><T size={11} color={c.sub}>{l}</T></View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 170 }}>
      <T w="b" size={26}>{greeting()}{settings.profile_name ? `, ${settings.profile_name}` : ''}</T>
      <T color={c.sub} style={{ marginBottom: 16 }}>{fmtLongDate(now)}</T>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <Stat n={today.length} l="আজকের কাজ" col={c.primary} /><Stat n={doneToday} l="সম্পন্ন" col={c.ok} /><Stat n={overdue.length} l="মেয়াদোত্তীর্ণ" col={c.danger} />
      </View>
      <Pressable onPress={() => setTab('secretary')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.primary, borderRadius: 18, padding: 14, marginBottom: 16 }}>
        <I name="account-tie-outline" size={28} color="#fff" /><View style={{ flex: 1, marginLeft: 12 }}><T w="b" color="#fff">আজকের সহকারী</T><T size={12} color="#EDE7FF">আজকের পরিকল্পনা, খালি সময়, সাপ্তাহিক রিভিউ</T></View><I name="chevron-right" size={24} color="#fff" />
      </Pressable>
      <T w="b" size={18} style={{ marginBottom: 10 }}>আজকের সূচি</T>
      {today.length === 0 && <Card style={{ marginBottom: 16 }}><T color={c.sub}>আজকের জন্য কোনো কাজ নেই। নতুন কাজ যোগ করুন।</T></Card>}
      {today.map((t: Task) => (
        <View key={t.id} style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={{ width: 74, justifyContent: 'center' }}><T size={12} color={c.sub}>{fmtTime(t.due_at!)}</T></View>
          <Pressable onPress={() => setEditor(t.id)} style={{ flex: 1, backgroundColor: c.card, borderRadius: 18, padding: 14, borderLeftWidth: 5, borderLeftColor: prioColor(t.priority) }}>
            <T w="m">{t.title}</T><T size={12} color={prioColor(t.priority)}>{PRIORITIES[t.priority].n}</T>
          </Pressable>
        </View>
      ))}
      <Btn label="+ নতুন কাজ" onPress={() => setEditor('new')} />
      {upcoming.length > 0 && <><T w="b" size={18} style={{ marginTop: 22, marginBottom: 10 }}>আসন্ন রিমাইন্ডার</T>{upcoming.map((t: Task) => <TaskRow key={t.id} t={t} />)}</>}
      <T w="b" size={18} style={{ marginTop: 22, marginBottom: 10 }}>এই সপ্তাহের অগ্রগতি</T>
      <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', height: 120, alignItems: 'flex-end' }}>
        {week.map((w, i) => (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ width: 22, height: 90, borderRadius: 11, backgroundColor: c.card2, justifyContent: 'flex-end', overflow: 'hidden' }}>
              <View style={{ height: `${(w.n / max) * 100}%`, backgroundColor: c.primary, borderRadius: 11 }} />
            </View>
            <T size={11} color={c.sub}>{WEEKDAYS[w.d]}</T>
          </View>
        ))}
      </View></Card>
    </ScrollView>
  );
}

const FILTERS: [string, string][] = [['all', 'সব'], ['today', 'আজ'], ['upcoming', 'আসন্ন'], ['overdue', 'মেয়াদোত্তীর্ণ'], ['done', 'সম্পন্ন'], ['star', 'তারকা']];
export function Tasks() {
  const { c } = useApp(); const [view, setView] = useState('list');
  if (view === 'list') return <TaskList views={<Views view={view} setView={setView} />} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 170 }}>
      <Title>কাজ</Title><Views view={view} setView={setView} />
      {view === 'matrix' && <Matrix />}{view === 'kanban' && <Kanban />}{view === 'timeline' && <Timeline />}{view === 'count' && <Countdown />}
    </ScrollView>
  );
}
const Views = ({ view, setView }: { view: string; setView: (v: string) => void }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{[['list', 'তালিকা'], ['matrix', 'আইজেনহাওয়ার'], ['kanban', 'কানবান'], ['timeline', 'টাইমলাইন'], ['count', 'কাউন্টডাউন']].map(([k, l]) => <Chip key={k} label={l} on={view === k} color="#9B7BFF" onPress={() => setView(k)} />)}</View>;
function TaskList({ views }: { views: React.ReactNode }) {
  const { c, tasks, cats } = useApp();
  const [f, setF] = useState('all'); const [cat, setCat] = useState<number | null>(null); const [q, setQ] = useState('');
  const now = Date.now(); const sod = startOfDay(now); const eod = sod + DAY;
  const list = tasks.filter((t: Task) => {
    if (t.parent_id) return false;
    if (cat && t.category_id !== cat) return false;
    if (q && !t.title.includes(q)) return false;
    const open = t.status < 2;
    if (f === 'today') return open && t.due_at && t.due_at >= sod && t.due_at < eod;
    if (f === 'upcoming') return open && t.due_at && t.due_at >= eod;
    if (f === 'overdue') return open && t.due_at && t.due_at < now;
    if (f === 'done') return t.status === 2;
    if (f === 'star') return t.starred === 1;
    return true;
  });
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 170 }}>
      <Title>কাজ</Title>{views}
      <TextInput value={q} onChangeText={setQ} placeholder="কাজ খুঁজুন" placeholderTextColor={c.sub} style={{ fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card, color: c.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{FILTERS.map(([k, l]) => <Chip key={k} label={l} on={f === k} onPress={() => setF(k)} />)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>{cats.map((x: any) => <Chip key={x.id} label={x.name} on={cat === x.id} color="#9B7BFF" onPress={() => setCat(cat === x.id ? null : x.id)} />)}</View>
      {list.length === 0 && <Card><T color={c.sub}>এই তালিকায় কোনো কাজ নেই।</T></Card>}
      {list.map((t: Task) => <TaskRow key={t.id} t={t} />)}
    </ScrollView>
  );
}

export function Settings() {
  const { c, settings, setSetting, cats, reload, tasks } = useApp(); const [newCat, setNewCat] = useState(''); const [restore, setRestore] = useState(''); const [arch, setArch] = useState<Task[]>([]);
  React.useEffect(() => { DB.listArchived().then(setArch); }, [tasks]);
  const row = (l: string, children: React.ReactNode) => <Card style={{ marginBottom: 12 }}><T w="m" style={{ marginBottom: 8 }}>{l}</T><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View></Card>;
  const th = settings.theme ?? 'system'; const rm = settings.repeat_min ?? '0'; const rx = settings.repeat_max ?? '5';
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 170 }}>
      <Title>সেটিংস</Title>
      <Card style={{ marginBottom: 12 }}>
        <T w="m" style={{ marginBottom: 6 }}>প্রোফাইল</T>
        <TextInput defaultValue={settings.profile_name ?? ''} onEndEditing={(e) => setSetting('profile_name', e.nativeEvent.text.trim())} placeholder="আপনার নাম (শুভেচ্ছায় দেখাবে)" placeholderTextColor={c.sub} style={{ fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card2, color: c.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }} />
      </Card>
      {row('থিম', [['system', 'সিস্টেম'], ['light', 'লাইট'], ['dark', 'ডার্ক']].map(([k, l]) => <Chip key={k} label={l} on={th === k} onPress={() => setSetting('theme', k)} />))}
      <Card style={{ marginBottom: 12 }}>
        <T w="m" style={{ marginBottom: 8 }}>অ্যাকসেন্ট রঙ</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[['', '#7B5CFA'], ['#1E88E5', '#1E88E5'], ['#00A67E', '#00A67E'], ['#E8590C', '#E8590C'], ['#D6336C', '#D6336C'], ['#5C7C3A', '#5C7C3A']].map(([k, col]) => {
            const on = (settings.accent ?? '') === k;
            return <Pressable key={col} onPress={() => setSetting('accent', k)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: col, marginRight: 10, marginBottom: 8, borderWidth: on ? 3 : 0, borderColor: c.text, alignItems: 'center', justifyContent: 'center' }}>{on && <T color="#fff" w="b" size={14}>✓</T>}</Pressable>;
          })}
        </View>
      </Card>
      {row('অসমাপ্ত কাজের জন্য পুনরায় মনে করানো (নতুন কাজের ডিফল্ট)', [['0', 'বন্ধ'], ['10', '১০ মিনিট'], ['30', '৩০ মিনিট'], ['60', '১ ঘণ্টা']].map(([k, l]) => <Chip key={k} label={l} on={rm === k} onPress={() => setSetting('repeat_min', k)} />))}
      {row('সর্বোচ্চ বার', [['3', '৩'], ['5', '৫'], ['10', '১০']].map(([k, l]) => <Chip key={k} label={l} on={rx === k} onPress={() => setSetting('repeat_max', k)} />))}
      <Card style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><T w="m">নীরব সময় (রাত ১১টা – ভোর ৫টা)</T><T size={12} color={c.sub}>এই সময়ের রিমাইন্ডার ভোর ৫টায় সরে যাবে</T></View>
          <Switch value={settings.quiet_on === '1'} onValueChange={(v) => setSetting('quiet_on', v ? '1' : '0')} trackColor={{ true: c.primary }} />
        </View>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <T w="m">AI সংযোগ (ঐচ্ছিক)</T>
        <T size={12} color={c.sub} style={{ marginBottom: 8 }}>যেকোনো OpenAI-সামঞ্জস্যপূর্ণ এন্ডপয়েন্ট। চাবি শুধু এই ফোনেই থাকে, অ্যাপের কোডে নয়। সংযোগ না দিলে স্থানীয় বাংলা বিশ্লেষণ কাজ করবে।</T>
        {[['ai_url', 'এন্ডপয়েন্ট URL (…/v1/chat/completions)'], ['ai_model', 'মডেলের নাম'], ['ai_key', 'API কী']].map(([k, ph]) => <TextInput key={k} defaultValue={settings[k] ?? ''} onEndEditing={(e) => setSetting(k, e.nativeEvent.text.trim())} secureTextEntry={k === 'ai_key'} autoCapitalize="none" placeholder={ph} placeholderTextColor={c.sub} style={{ fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card2, color: c.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8 }} />)}
        <T size={12} color={settings.ai_key && settings.ai_url ? c.ok : c.sub}>{settings.ai_key && settings.ai_url ? 'কনফিগার করা আছে' : 'কনফিগার করা নেই'}</T>
      </Card>
      {row('ভয়েস ইনপুটের ভাষা', [['bn-BD', 'বাংলা'], ['en-US', 'English']].map(([k, l]) => <Chip key={k} label={l} on={(settings.speech_lang ?? 'bn-BD') === k} onPress={() => setSetting('speech_lang', k)} />))}
      <Card style={{ marginBottom: 12 }}>
        <T w="m" style={{ marginBottom: 8 }}>ক্যাটাগরি</T>
        {cats.map((x: any, i: number) => (
          <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <TextInput defaultValue={x.name} onEndEditing={async (e) => { const v = e.nativeEvent.text.trim(); if (v && v !== x.name) { await DB.renameCategory(x.id, v); reload(); } }} style={{ flex: 1, fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card2, color: c.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }} />
            <Pressable hitSlop={8} onPress={async () => { await DB.moveCategory(x.id, -1); reload(); }} style={{ opacity: i === 0 ? 0.2 : 1, marginLeft: 6 }}><I name="arrow-up" size={22} color={c.sub} /></Pressable>
            <Pressable hitSlop={8} onPress={async () => { await DB.moveCategory(x.id, 1); reload(); }} style={{ opacity: i === cats.length - 1 ? 0.2 : 1 }}><I name="arrow-down" size={22} color={c.sub} /></Pressable>
            <Pressable hitSlop={8} onPress={() => Alert.alert('ক্যাটাগরি মুছবেন?', `"${x.name}" মুছলে এর কাজগুলো ক্যাটাগরিহীন হয়ে থাকবে (কাজ মুছবে না)।`, [{ text: 'না', style: 'cancel' }, { text: 'মুছুন', style: 'destructive', onPress: async () => { await DB.deleteCategory(x.id); reload(); } }])} style={{ marginLeft: 4 }}><I name="trash-can-outline" size={22} color={c.danger} /></Pressable>
          </View>
        ))}
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <TextInput value={newCat} onChangeText={setNewCat} placeholder="নতুন ক্যাটাগরি" placeholderTextColor={c.sub} style={{ flex: 1, fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card2, color: c.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 }} />
          <Pressable onPress={async () => { if (!newCat.trim()) return; await DB.addCategory(newCat.trim()); setNewCat(''); reload(); }} style={{ backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}><T w="m" color="#fff">যোগ</T></Pressable>
        </View>
      </Card>
      {arch.length > 0 && <Card style={{ marginBottom: 12 }}><T w="m" style={{ marginBottom: 6 }}>আর্কাইভ করা কাজ</T>{arch.map((t) => <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}><T style={{ flex: 1 }}>{t.title}</T><Pressable onPress={async () => { await DB.saveTask({ id: t.id, archived: 0 }); await reload(); }}><T w="m" color={c.primary}>পুনরুদ্ধার</T></Pressable></View>)}</Card>}
      <Card style={{ marginBottom: 12 }}>
        <T w="m">ডেটা ব্যাকআপ</T>
        <T size={12} color={c.sub} style={{ marginBottom: 8 }}>সব কাজ, নোট, অভ্যাস ও সেটিংস একটি টেক্সট (JSON) হিসেবে শেয়ার/সংরক্ষণ করুন (API কী বাদে)। ক্লাউড ব্যাকআপ এখনও যুক্ত হয়নি।</T>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}><Btn label="ব্যাকআপ নিন" onPress={async () => { try { await Share.share({ message: await DB.exportAll(), title: 'আমার সহকারী ব্যাকআপ' }); } catch (e: any) { Alert.alert('ব্যাকআপ ব্যর্থ', String(e?.message ?? e)); } }} /></View>
        <TextInput value={restore} onChangeText={setRestore} multiline placeholder="রিস্টোর করতে ব্যাকআপ টেক্সট এখানে পেস্ট করুন" placeholderTextColor={c.sub} style={{ fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card2, color: c.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 90, marginBottom: 8 }} />
        <View style={{ flexDirection: 'row' }}><Btn kind="danger" label="রিস্টোর করুন" onPress={() => { if (!restore.trim()) return; Alert.alert('সব বর্তমান ডেটা বদলে যাবে', 'রিস্টোর করলে এই ফোনের বর্তমান সব কাজ, নোট ও অভ্যাস মুছে ব্যাকআপের ডেটা বসবে। নিশ্চিত?', [{ text: 'না', style: 'cancel' }, { text: 'হ্যাঁ, রিস্টোর', style: 'destructive', onPress: async () => { try { for (const t of tasks) await R.cancel(t.id); await DB.importAll(restore.trim()); setRestore(''); await reload(); const all = await DB.listTasks(); const st = await DB.allSettings(); for (const t of all) await R.schedule(t, st); for (const h of await DB.listHabits()) await R.scheduleHabit(h); Alert.alert('সম্পন্ন', 'ডেটা রিস্টোর হয়েছে।'); } catch (e: any) { Alert.alert('রিস্টোর ব্যর্থ', String(e?.message ?? e)); } } }]); }} /></View>
      </Card>
      <Card style={{ marginBottom: 12 }}><T w="m">গুগল ইন্টিগ্রেশন</T><T size={12} color={c.sub}>কনফিগার করা নেই। গুগল ক্যালেন্ডার/টাস্কস সিঙ্ক এখনও যুক্ত হয়নি; কোনো সিঙ্ক সফল দেখানো হবে না।</T></Card>
      <Card style={{ marginBottom: 12 }}>
        <T w="m">রিমাইন্ডারের অনুমতি (Android ১২+)</T>
        <T size={12} color={c.sub} style={{ marginBottom: 8 }}>ঠিক সময়ে রিমাইন্ডার পেতে "অ্যালার্ম ও রিমাইন্ডার" অনুমতি চালু থাকতে হবে। ব্যাটারি সেভার রিমাইন্ডার দেরি করতে পারে — অ্যাপটিকে "সীমাহীন"/"অপ্টিমাইজ করবেন না" করুন। (বোতামগুলো আসল ফোনে এখনও পরীক্ষিত নয়)</T>
        <View style={{ flexDirection: 'row', gap: 8 }}><Btn kind="ghost" label="অ্যালার্মের অনুমতি" onPress={() => R.openExactAlarmSettings()} /><Btn kind="ghost" label="ব্যাটারি সেটিংস" onPress={() => R.openBatterySettings()} /></View>
      </Card>
      <Card>
        <T w="m">গোপনীয়তা</T>
        <T size={12} color={c.sub}>আপনার সব কাজ, নোট ও অভ্যাস শুধু এই ফোনের স্থানীয় ডেটাবেসে থাকে; ক্লাউডে কিছু যায় না। শুধু AI সংযোগ চালু করলে আপনার পাঠানো বার্তা সেই এন্ডপয়েন্টে যায়। API কী ব্যাকআপে অন্তর্ভুক্ত হয় না। অ্যাপ-লক এখনও নেই।</T>
      </Card>
    </ScrollView>
  );
}
