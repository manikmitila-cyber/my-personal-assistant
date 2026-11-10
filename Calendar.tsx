import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons as I } from '@expo/vector-icons';
import { useApp } from './store';
import { Card, Chip, T } from './ui';
import { DAY, MONTHS, WEEKDAYS, bd, fmtDate, fmtTime, startOfDay } from './bn';
import { PRIORITIES } from './theme';
import type { Task } from './db';

const VIEWS: [string, string][] = [['day', 'দিন'], ['week', 'সপ্তাহ'], ['month', 'মাস'], ['year', 'বছর'], ['agenda', 'এজেন্ডা']];
const same = (a: number, b: number) => startOfDay(a) === startOfDay(b);

export function CalendarScreen() {
  const { c, tasks, setEditor } = useApp();
  const [view, setView] = useState('month'); const [sel, setSel] = useState(startOfDay(Date.now()));
  const live = tasks.filter((t: Task) => t.due_at && !t.parent_id && t.status !== 4);
  const on = (day: number) => live.filter((t: Task) => same(t.due_at!, day));
  const d = new Date(sel);
  const shift = (n: number) => { const x = new Date(sel); if (view === 'day') x.setDate(x.getDate() + n); else if (view === 'week') x.setDate(x.getDate() + 7 * n); else if (view === 'year') x.setFullYear(x.getFullYear() + n); else x.setMonth(x.getMonth() + n); setSel(startOfDay(x.getTime())); };
  const Row = ({ t }: { t: Task }) => (
    <Pressable onPress={() => setEditor(t.id)} style={{ flexDirection: 'row', backgroundColor: c.card, borderRadius: 16, padding: 12, marginBottom: 8, borderLeftWidth: 5, borderLeftColor: PRIORITIES[t.priority].c, opacity: t.status === 2 ? 0.5 : 1 }}>
      <T size={12} color={c.sub} style={{ width: 72 }}>{fmtTime(t.due_at!)}</T><T w="m" style={{ flex: 1 }}>{t.title}</T>{t.recurrence !== 'none' && <T color={c.sub}>↻</T>}
    </Pressable>
  );
  const DayList = ({ day }: { day: number }) => { const l = on(day).sort((a: Task, b: Task) => a.due_at! - b.due_at!); return l.length ? <>{l.map((t: Task) => <Row key={t.id} t={t} />)}</> : <T color={c.sub} style={{ marginVertical: 8 }}>এই দিনে কোনো কাজ নেই।</T>; };
  const monthGrid = (y: number, m: number, small = false) => {
    const first = new Date(y, m, 1).getDay(); const n = new Date(y, m + 1, 0).getDate(); const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(small ? [] : WEEKDAYS).map((w) => <View key={w} style={{ width: '14.28%', alignItems: 'center' }}><T size={11} color={c.sub}>{w}</T></View>)}
        {cells.map((day, i) => { const ms = day ? new Date(y, m, day).getTime() : 0; const cnt = day ? on(ms).length : 0; const isSel = day && same(ms, sel); const today = day && same(ms, Date.now());
          return <Pressable key={i} disabled={!day || small} onPress={() => setSel(ms)} style={{ width: '14.28%', alignItems: 'center', paddingVertical: small ? 2 : 6 }}>
            {day ? <><View style={{ width: small ? 20 : 34, height: small ? 20 : 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? c.primary : 'transparent', borderWidth: today && !isSel ? 1 : 0, borderColor: c.primary }}><T size={small ? 10 : 14} w={cnt ? 'b' : 'r'} color={isSel ? '#fff' : c.text} style={{ lineHeight: small ? 14 : 22 }}>{bd(day)}</T></View>{!small && <View style={{ height: 5, width: 5, borderRadius: 3, backgroundColor: cnt ? c.primary : 'transparent' }} />}</> : null}
          </Pressable>; })}
      </View>
    );
  };
  const title = view === 'year' ? bd(d.getFullYear()) : view === 'day' ? `${WEEKDAYS[d.getDay()]}বার, ${fmtDate(sel)}` : `${MONTHS[d.getMonth()]} ${bd(d.getFullYear())}`;
  const weekStart = sel - d.getDay() * DAY;
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 170 }}>
      <T w="b" size={22} style={{ marginBottom: 12 }}>ক্যালেন্ডার</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{VIEWS.map(([k, l]) => <Chip key={k} label={l} on={view === k} onPress={() => setView(k)} />)}</View>
      {view !== 'agenda' && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
        <Pressable onPress={() => shift(-1)} hitSlop={12}><I name="chevron-left" size={28} color={c.text} /></Pressable><T w="b" size={17}>{title}</T><Pressable onPress={() => shift(1)} hitSlop={12}><I name="chevron-right" size={28} color={c.text} /></Pressable>
      </View>}
      {view === 'month' && <><Card>{monthGrid(d.getFullYear(), d.getMonth())}</Card><T w="b" style={{ marginTop: 16, marginBottom: 8 }}>{fmtDate(sel)}</T><DayList day={sel} /></>}
      {view === 'day' && <DayList day={sel} />}
      {view === 'week' && Array.from({ length: 7 }, (_, i) => weekStart + i * DAY).map((day) => <View key={day} style={{ marginBottom: 10 }}><T w="b" color={same(day, Date.now()) ? c.primary : c.text}>{WEEKDAYS[new Date(day).getDay()]} · {fmtDate(day)}</T><DayList day={day} /></View>)}
      {view === 'year' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>{MONTHS.map((mn, m) => <Pressable key={m} onPress={() => { setSel(new Date(d.getFullYear(), m, 1).getTime()); setView('month'); }} style={{ width: '31%', marginBottom: 14 }}><T w="m" size={13}>{mn}</T>{monthGrid(d.getFullYear(), m, true)}</Pressable>)}</View>}
      {view === 'agenda' && (() => { const up = live.filter((t: Task) => t.due_at! >= startOfDay(Date.now()) && t.status < 2).sort((a: Task, b: Task) => a.due_at! - b.due_at!).slice(0, 60); let last = 0; return up.length ? up.map((t: Task) => { const h = !same(t.due_at!, last); last = t.due_at!; return <View key={t.id}>{h && <T w="b" color={c.sub} style={{ marginTop: 10, marginBottom: 6 }}>{WEEKDAYS[new Date(t.due_at!).getDay()]}বার · {fmtDate(t.due_at!)}</T>}<Row t={t} /></View>; }) : <T color={c.sub}>আসন্ন কোনো কাজ বা ইভেন্ট নেই।</T>; })()}
    </ScrollView>
  );
}
