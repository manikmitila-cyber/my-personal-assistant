import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { MaterialCommunityIcons as I } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DB from './db';
import { useApp } from './store';
import { Btn, Card, T } from './ui';
import { DAY, bd, fmtDate, fmtLongDate, fmtTime, startOfDay } from './bn';
import { PRIORITIES, RECURRENCES } from './theme';
import { Parsed, parse } from './parser';

// Optional native speech module (needs a dev/release build, not Expo Go). Missing module => voice button explains why.
let Speech: any = null;
try { Speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule; } catch {}

type Msg = { role: 'user' | 'bot'; text: string; pending?: () => Promise<void>; card?: string[] };
const line = (t: DB.Task) => `• ${t.title}${t.due_at ? ` — ${fmtDate(t.due_at)} ${fmtTime(t.due_at)}` : ''}`;

// Optional interchangeable AI provider: any OpenAI-compatible endpoint configured by the user in Settings.
async function askProvider(q: string, s: Record<string, string>, ctx: string): Promise<string | null> {
  if (!s.ai_url || !s.ai_key) return null;
  try {
    const r = await fetch(s.ai_url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.ai_key}` },
      body: JSON.stringify({ model: s.ai_model || 'gpt-4o-mini', messages: [{ role: 'system', content: 'তুমি একজন বাংলাভাষী ব্যক্তিগত সহকারী। সংক্ষিপ্ত ও স্পষ্ট বাংলায় উত্তর দাও। ব্যবহারকারীর কাজের তথ্য:\n' + ctx }, { role: 'user', content: q }] }) });
    const j = await r.json(); return j.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}

export function Assistant() {
  const { c, tasks, cats, save, settings, setTab, reload } = useApp(); const ins = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: 'আসসালামু আলাইকুম! আমি আপনার সহকারী। যেমন বলুন: "আগামীকাল সকাল ৮টায় মাদ্রাসার মিটিং মনে করিয়ে দিও।"' }]);
  const [text, setText] = useState(''); const [rec, setRec] = useState(false); const ref = useRef<ScrollView>(null);
  useEffect(() => { DB.listChat().then((h) => { if (h.length) setMsgs((m) => [...h.reverse().map((x) => ({ role: x.role as any, text: x.text })), ...m.slice(0, 0)]); }); }, []);
  useEffect(() => { ref.current?.scrollToEnd({ animated: true }); }, [msgs]);
  useEffect(() => {
    if (!Speech) return;
    const a = Speech.addListener('result', (e: any) => setText(e.results?.[0]?.transcript ?? ''));
    const b = Speech.addListener('end', () => setRec(false));
    const d = Speech.addListener('error', () => setRec(false));
    return () => { a.remove(); b.remove(); d.remove(); };
  }, []);

  const mic = async () => {
    if (!Speech) { Alert.alert('ভয়েস ইনপুট', 'এই বিল্ডে স্পিচ মডিউল নেই। expo-speech-recognition সহ বিল্ড করুন (README দেখুন)।'); return; }
    if (rec) { Speech.stop(); return; }
    const p = await Speech.requestPermissionsAsync(); if (!p.granted) { Alert.alert('অনুমতি প্রয়োজন', 'মাইক্রোফোনের অনুমতি দিন।'); return; }
    setRec(true); Speech.start({ lang: (settings.speech_lang || 'bn-BD'), interimResults: true });
  };
  const say = async (m: Msg) => { setMsgs((x) => [...x, m]); await DB.addChat(m.role, m.text); };
  const defaultCat = cats[1]?.id ?? null;

  const handle = async (q: string) => {
    await say({ role: 'user', text: q });
    const p: Parsed = parse(q); const now = Date.now(); const sod = startOfDay(now);
    const open = tasks.filter((t: DB.Task) => t.status < 2 && !t.parent_id);
    const between = (a: number, b: number) => open.filter((t: DB.Task) => t.due_at && t.due_at >= a && t.due_at < b);
    const listMsg = (title: string, l: DB.Task[]) => say({ role: 'bot', text: l.length ? `${title} (${bd(l.length)}টি):\n${l.map(line).join('\n')}` : `${title}: কোনো কাজ নেই।` });
    if (p.intent === 'list') {
      if (p.scope === 'today') return listMsg('আজকের বাকি কাজ', between(sod, sod + DAY));
      if (p.scope === 'tomorrow') return listMsg('আগামীকালের কাজ', between(sod + DAY, sod + 2 * DAY));
      if (p.scope === 'week') return listMsg('এই সপ্তাহের অসমাপ্ত কাজ', between(sod, sod + 7 * DAY).concat(open.filter((t: DB.Task) => t.due_at && t.due_at < sod)));
      if (p.scope === 'overdue') return listMsg('মেয়াদোত্তীর্ণ কাজ', open.filter((t: DB.Task) => t.due_at && t.due_at < now));
      const ic = cats.find((x: any) => x.name === 'গুরুত্বপূর্ণ তারিখ')?.id; const ev = cats.find((x: any) => x.name === 'অনুষ্ঠান ও মিটিং')?.id;
      return listMsg('গুরুত্বপূর্ণ অনুষ্ঠান ও তারিখ', open.filter((t: DB.Task) => t.category_id === ic || t.category_id === ev || t.priority <= 1));
    }
    if (p.intent === 'report') {
      const todayAll = tasks.filter((t: DB.Task) => !t.parent_id && t.due_at && t.due_at >= sod && t.due_at < sod + DAY);
      const done = todayAll.filter((t: DB.Task) => t.status === 2).length; const od = open.filter((t: DB.Task) => t.due_at && t.due_at < now).length;
      return say({ role: 'bot', text: `${fmtLongDate(now)}\nআজকের মোট কাজ: ${bd(todayAll.length)}\nসম্পন্ন: ${bd(done)}\nবাকি: ${bd(todayAll.length - done)}\nমেয়াদোত্তীর্ণ: ${bd(od)}` });
    }
    if (p.intent === 'move_overdue') {
      const l = open.filter((t: DB.Task) => t.due_at && t.due_at < now);
      if (!l.length) return say({ role: 'bot', text: 'সরানোর মতো অসমাপ্ত কাজ নেই।' });
      return say({ role: 'bot', text: `${bd(l.length)}টি কাজ আগামীকালে সরানো হবে:\n${l.map(line).join('\n')}\n\nনিশ্চিত করলে সরানো হবে।`, pending: async () => {
        for (const t of l) { const d = new Date(t.due_at!); const n = new Date(sod + DAY); n.setHours(d.getHours(), d.getMinutes(), 0, 0); await save({ id: t.id, due_at: n.getTime() }); }
      } });
    }
    if (p.intent === 'study_plan') {
      const plan: [number, number, string][] = [[8, 0, 'কুরআন ও হিফজ পুনরাবৃত্তি'], [10, 0, 'মূল পাঠ্য বিষয় (৪৫ মিনিট)'], [16, 0, 'অনুশীলন ও লিখিত কাজ'], [21, 0, 'দিনের পাঠ পর্যালোচনা']];
      const cat = cats.find((x: any) => x.name === 'পড়াশোনা')?.id ?? defaultCat;
      return say({ role: 'bot', text: `${fmtDate(p.day)} তারিখের প্রস্তাবিত পড়াশোনার রুটিন:\n${plan.map(([h, m, n]) => `• ${fmtTime(p.day + (h * 60 + m) * 60000)} — ${n}`).join('\n')}\n\nনিশ্চিত করলে এগুলো কাজ হিসেবে সংরক্ষিত হবে।`, pending: async () => {
        for (const [h, m, n] of plan) await save({ title: n, category_id: cat, priority: 2, status: 0, due_at: p.day + (h * 60 + m) * 60000, recurrence: 'none', remind: '[0]', repeat_min: 0, repeat_max: 5, notes: '', starred: 0 });
      } });
    }
    if (p.intent === 'create') {
      const when = p.due_at ? `${fmtDate(p.due_at)} · ${fmtTime(p.due_at)}` : 'সময় নির্ধারিত নয়';
      const rec = RECURRENCES.find(([k]) => k === p.recurrence)?.[1];
      return say({ role: 'bot', text: 'এই কাজটি সংরক্ষণ করবো?', card: [`কাজ: ${p.title}`, `সময়: ${when}`, `পুনরাবৃত্তি: ${rec}`, `অগ্রাধিকার: ${PRIORITIES[p.priority].n}`, p.remind.length > 1 ? `অতিরিক্ত রিমাইন্ডার: ${bd(p.remind[1] / 1440 >= 1 ? p.remind[1] / 1440 : p.remind[1])} ${p.remind[1] >= 1440 ? 'দিন' : 'মিনিট'} আগে` : ''].filter(Boolean),
        pending: async () => { await save({ title: p.title, category_id: defaultCat, priority: p.priority, status: 0, due_at: p.due_at, recurrence: p.recurrence, remind: JSON.stringify(p.remind), repeat_min: +(settings.repeat_min ?? 0), repeat_max: +(settings.repeat_max ?? 5), notes: '', starred: 0 }); } });
    }
    const ctx = open.slice(0, 40).map(line).join('\n');
    const ai = await askProvider(q, settings, ctx);
    return say({ role: 'bot', text: ai ?? 'আমি এটি বুঝতে পারিনি। সময় ও কাজের নামসহ লিখুন, যেমন: "কাল বিকাল ৪টায় ডাক্তারের কাছে যাওয়া মনে করিয়ে দিও"। উন্নত উত্তরের জন্য সেটিংসে AI সংযোগ দিন।' });
  };
  const send = async () => { const q = text.trim(); if (!q) return; setText(''); await handle(q); };
  const confirm = async (i: number) => { const m = msgs[i]; await m.pending?.(); await reload(); setMsgs((x) => x.map((y, j) => (j === i ? { ...y, pending: undefined, text: 'সংরক্ষণ করা হয়েছে ✓' } : y))); await DB.addChat('bot', 'সংরক্ষণ করা হয়েছে ✓'); };
  const cancel = (i: number) => setMsgs((x) => x.map((y, j) => (j === i ? { ...y, pending: undefined, text: 'বাতিল করা হয়েছে।' } : y)));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => setTab('home')} hitSlop={10}><I name="arrow-left" size={26} color={c.text} /></Pressable>
        <T w="b" size={20} style={{ marginLeft: 12 }}>AI সহকারী</T>
      </View>
      <ScrollView ref={ref} contentContainerStyle={{ padding: 16 }}>
        {msgs.map((m, i) => (
          <View key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', marginBottom: 10 }}>
            <View style={{ backgroundColor: m.role === 'user' ? c.primary : c.card, borderRadius: 18, padding: 12 }}>
              <T color={m.role === 'user' ? '#fff' : c.text}>{m.text}</T>
              {m.card && <Card style={{ backgroundColor: c.card2, marginTop: 8, padding: 10 }}>{m.card.map((x, k) => <T key={k} size={14}>{x}</T>)}</Card>}
            </View>
            {m.pending && <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}><Btn label="নিশ্চিত করুন" onPress={() => confirm(i)} /><Btn kind="ghost" label="বাতিল" onPress={() => cancel(i)} /></View>}
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 12 + ins.bottom, gap: 8 }}>
        <TextInput value={text} onChangeText={setText} placeholder={rec ? 'শুনছি…' : 'এখানে লিখুন বা বলুন'} placeholderTextColor={c.sub} onSubmitEditing={send} style={{ flex: 1, fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card, color: c.text, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 }} />
        <Pressable onPress={mic} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: rec ? c.danger : c.card2, alignItems: 'center', justifyContent: 'center' }}><I name={rec ? 'stop' : 'microphone'} size={22} color={rec ? '#fff' : c.primary} /></Pressable>
        <Pressable onPress={send} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><I name="send" size={20} color="#fff" /></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
