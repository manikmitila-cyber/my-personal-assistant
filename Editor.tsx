import React, { useEffect, useState } from 'react';
import { Alert, Share, Modal, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from './store';
import { Btn, Chip, T } from './ui';
import { bd, fmtDate, fmtTime, recLabel } from './bn';
import { PRIORITIES, RECURRENCES, STATUSES } from './theme';
import type { Task } from './db';

const OFFSETS: [number, string][] = [[0, 'সময়মতো'], [10, '১০ মিনিট আগে'], [60, '১ ঘণ্টা আগে'], [1440, '১ দিন আগে']];

export function Editor() {
  const { c, editor, setEditor, tasks, cats, save, remove, settings, toggle } = useApp(); const [sub, setSub] = useState('');
  const ins = useSafeAreaInsets();
  const [f, setF] = useState<Partial<Task> | null>(null);
  const [pick, setPick] = useState<'date' | 'time' | null>(null);
  useEffect(() => {
    if (editor == null) { setF(null); return; }
    const ex = typeof editor === 'number' ? tasks.find((t: Task) => t.id === editor) : null;
    setF(ex ? { ...ex } : { title: '', notes: '', category_id: cats[1]?.id ?? null, priority: 2, status: 0, due_at: null, starred: 0, recurrence: 'none', remind: '[0]', repeat_min: +(settings.repeat_min ?? 0), repeat_max: +(settings.repeat_max ?? 5) });
  }, [editor]);
  if (!f) return null;
  const set = (p: Partial<Task>) => setF({ ...f, ...p });
  const offs: number[] = (() => { try { return JSON.parse(f.remind ?? '[0]'); } catch { return [0]; } })();
  const input = { fontFamily: 'NotoSansBengali_400Regular', backgroundColor: c.card, color: c.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12 } as const;
  const lbl = (s: string) => <T w="m" size={13} color={c.sub} style={{ marginBottom: 6, marginTop: 6 }}>{s}</T>;
  const onSave = async () => {
    if (!f.title?.trim()) { Alert.alert('শিরোনাম লিখুন', 'কাজের একটি নাম দিন।'); return; }
    await save({ ...f, title: f.title.trim() }); setEditor(null);
  };
  return (
    <Modal visible animationType="slide" onRequestClose={() => setEditor(null)}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <T w="b" size={22} style={{ marginBottom: 12 }}>{typeof editor === 'number' ? 'কাজ সম্পাদনা' : 'নতুন কাজ'}</T>
          <TextInput value={f.title} onChangeText={(v) => set({ title: v })} placeholder="কাজের নাম" placeholderTextColor={c.sub} style={input} />
          <TextInput value={f.notes} onChangeText={(v) => set({ notes: v })} placeholder="নোট" placeholderTextColor={c.sub} multiline style={[input, { minHeight: 70 }]} />
          {lbl('সময়সীমা')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label={f.due_at ? `${fmtDate(f.due_at)} · ${fmtTime(f.due_at)}` : 'তারিখ ও সময় বাছুন'} on={!!f.due_at} onPress={() => setPick('date')} />
            {f.due_at ? <Chip label="মুছুন" onPress={() => set({ due_at: null })} /> : null}
          </View>
          {pick && <DateTimePicker value={new Date(f.due_at ?? Date.now())} mode={pick} onChange={(e, d) => {
            if (e.type !== 'set' || !d) { setPick(null); return; }
            const base = new Date(f.due_at ?? Date.now());
            if (pick === 'date') { base.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); set({ due_at: base.getTime() }); setPick('time'); }
            else { base.setHours(d.getHours(), d.getMinutes(), 0, 0); set({ due_at: base.getTime() }); setPick(null); }
          }} />}
          {lbl('অগ্রাধিকার')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{PRIORITIES.map((p) => <Chip key={p.k} label={p.n} color={p.c} on={f.priority === p.k} onPress={() => set({ priority: p.k })} />)}</View>
          {lbl('ক্যাটাগরি')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{cats.map((x: any) => <Chip key={x.id} label={x.name} on={f.category_id === x.id} onPress={() => set({ category_id: x.id })} />)}</View>
          {lbl('অবস্থা')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{STATUSES.map((s, i) => <Chip key={i} label={s} on={f.status === i} onPress={() => set({ status: i, completed_at: i === 2 ? Date.now() : null })} />)}</View>
          {lbl('পুনরাবৃত্তি')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{RECURRENCES.map(([k, l]) => <Chip key={k} label={l} on={f.recurrence === k} onPress={() => set({ recurrence: k })} />)}</View>
          {(() => {
            const rec = f.recurrence ?? 'none'; const ev = rec.match(/^every:(\d+):([dwm])$/); const md = rec.match(/^monthday:(\d+)$/);
            const n = ev ? +ev[1] : 2; const u = ev ? ev[2] : 'd'; const day = md ? +md[1] : (f.due_at ? new Date(f.due_at).getDate() : 5);
            const stepBtn = (lab: string, fn: () => void) => <Pressable onPress={fn} style={{ backgroundColor: c.card2, borderRadius: 12, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}><T w="b" size={18}>{lab}</T></Pressable>;
            return (<View style={{ marginBottom: 6 }}>
              <T size={12} color={c.sub} style={{ marginBottom: 4 }}>কাস্টম পুনরাবৃত্তি{ev || md ? ` — ${recLabel(rec)}` : ''}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label="প্রতি N দিন/সপ্তাহ/মাস" on={!!ev} onPress={() => set({ recurrence: `every:${n}:${u}` })} />
                <Chip label="প্রতি মাসের নির্দিষ্ট তারিখ" on={!!md} onPress={() => set({ recurrence: `monthday:${day}` })} />
              </View>
              {ev && <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                {stepBtn('−', () => set({ recurrence: `every:${Math.max(1, n - 1)}:${u}` }))}<T w="b" size={18} style={{ marginHorizontal: 14 }}>{bd(n)}</T>{stepBtn('+', () => set({ recurrence: `every:${Math.min(60, n + 1)}:${u}` }))}
                <View style={{ flexDirection: 'row', marginLeft: 14 }}>{[['d', 'দিন'], ['w', 'সপ্তাহ'], ['m', 'মাস']].map(([k, l]) => <Chip key={k} label={l} on={u === k} onPress={() => set({ recurrence: `every:${n}:${k}` })} />)}</View>
              </View>}
              {md && <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                {stepBtn('−', () => set({ recurrence: `monthday:${Math.max(1, day - 1)}` }))}<T w="b" size={18} style={{ marginHorizontal: 14 }}>{bd(day)} তারিখ</T>{stepBtn('+', () => set({ recurrence: `monthday:${Math.min(31, day + 1)}` }))}
              </View>}
            </View>);
          })()}
          {lbl('রিমাইন্ডার (একাধিক বাছা যায়)')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{OFFSETS.map(([m, l]) => <Chip key={m} label={l} on={offs.includes(m)} onPress={() => set({ remind: JSON.stringify(offs.includes(m) ? offs.filter((x) => x !== m) : [...offs, m]) })} />)}</View>
          {lbl('সম্পন্ন না হলে পুনরায় মনে করানো')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{[[0, 'বন্ধ'], [10, '১০ মিনিট'], [30, '৩০ মিনিট'], [60, '১ ঘণ্টা']].map(([m, l]) => <Chip key={m} label={String(l)} on={f.repeat_min === m} onPress={() => set({ repeat_min: m as number })} />)}</View>
          {(f.repeat_min ?? 0) > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{[3, 5, 10].map((n) => <Chip key={n} label={`সর্বোচ্চ ${n === 3 ? '৩' : n === 5 ? '৫' : '১০'} বার`} on={f.repeat_max === n} onPress={() => set({ repeat_max: n })} />)}</View>}
          {typeof editor === 'number' && (() => { const subs = tasks.filter((x: Task) => x.parent_id === editor); const d = subs.filter((x: Task) => x.status === 2).length; return (<>
            {lbl(`উপকাজ${subs.length ? ` (${d}/${subs.length} সম্পন্ন)` : ''}`)}
            {subs.map((x: Task) => <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Pressable onPress={() => toggle(x)} hitSlop={8}><T size={20} color={x.status === 2 ? c.ok : c.sub}>{x.status === 2 ? '☑' : '☐'}</T></Pressable>
              <T style={{ flex: 1, marginLeft: 8, textDecorationLine: x.status === 2 ? 'line-through' : 'none' }}>{x.title}</T>
              <Pressable onPress={() => remove(x.id)} hitSlop={8}><T color={c.danger} size={13}>মুছুন</T></Pressable>
            </View>)}
            <View style={{ flexDirection: 'row' }}>
              <TextInput value={sub} onChangeText={setSub} placeholder="নতুন উপকাজ" placeholderTextColor={c.sub} style={[input, { flex: 1, marginRight: 8, marginBottom: 0 }]} />
              <Pressable onPress={async () => { if (!sub.trim()) return; await save({ title: sub.trim(), notes: '', parent_id: editor, category_id: f.category_id ?? null, priority: 3, status: 0, due_at: null, starred: 0, recurrence: 'none', remind: '[]', repeat_min: 0, repeat_max: 0 }); setSub(''); }} style={{ backgroundColor: c.primary, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center' }}><T w="m" color="#fff">যোগ</T></Pressable>
            </View></>); })()}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 }}>
            <T w="m">তারকা চিহ্নিত</T><Switch value={f.starred === 1} onValueChange={(v) => set({ starred: v ? 1 : 0 })} trackColor={{ true: c.primary }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Btn kind="ghost" label="বাতিল" onPress={() => setEditor(null)} />
            <Btn label="সংরক্ষণ" onPress={onSave} />
          </View>
          {typeof editor === 'number' && <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Btn kind="ghost" label="কপি করুন" onPress={async () => { const { id, created_at, updated_at, completed_at, ...rest } = f as Task; await save({ ...rest, title: `${f.title} (কপি)`, status: 0 }); setEditor(null); }} />
            <Btn kind="ghost" label="শেয়ার" onPress={() => Share.share({ message: `${f.title}${f.due_at ? `\n${fmtDate(f.due_at)} ${fmtTime(f.due_at)}` : ''}${f.notes ? `\n${f.notes}` : ''}` })} />
            <Btn kind="ghost" label="আর্কাইভ" onPress={async () => { await save({ id: editor, archived: 1 }); setEditor(null); }} />
          </View>}
          {typeof editor === 'number' && <View style={{ flexDirection: 'row', marginTop: 10 }}><Btn kind="danger" label="কাজটি মুছুন" onPress={async () => { await remove(editor); setEditor(null); }} /></View>}
        </ScrollView>
      </View>
    </Modal>
  );
}
