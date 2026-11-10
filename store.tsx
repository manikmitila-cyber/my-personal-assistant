import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as N from 'expo-notifications';
import * as DB from './db';
import * as R from './reminders';
import { advance } from './bn';
import { palettes, Palette } from './theme';

type Undo = { msg: string; run: () => Promise<void> } | null;
const Ctx = createContext<any>(null);
export const useApp = () => useContext(Ctx);
export const useC = (): Palette => useContext(Ctx).c;

export function Provider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [tasks, setTasks] = useState<DB.Task[]>([]);
  const [cats, setCats] = useState<DB.Category[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [undo, setUndo] = useState<Undo>(null);
  const [editor, setEditor] = useState<number | 'new' | null>(null);
  const [tab, setTab] = useState('home');
  const sRef = useRef(settings); sRef.current = settings;

  const reload = useCallback(async () => {
    const [t, c, s] = await Promise.all([DB.listTasks(), DB.listCategories(), DB.allSettings()]);
    setTasks(t); setCats(c); setSettings(s); sRef.current = s;
  }, []);

  const save = async (t: Partial<DB.Task>) => {
    const id = await DB.saveTask(t); const full = await DB.getTask(id);
    if (full) await R.schedule(full, sRef.current);
    await reload(); return id;
  };
  const remove = async (id: number) => {
    const snap = await DB.getTask(id); if (!snap) return;
    await R.cancel(id); await DB.deleteTask(id); await reload();
    setUndo({ msg: 'কাজটি মুছে ফেলা হয়েছে', run: async () => { await DB.restoreTask(snap); await R.schedule(snap, sRef.current); await reload(); } });
  };
  const toggle = async (t: DB.Task) => {
    const snap = { ...t }; let patch: Partial<DB.Task>;
    if (t.status === 2) patch = { status: 0, completed_at: null };
    else if (t.recurrence !== 'none' && t.due_at) patch = { due_at: advance(t.due_at, t.recurrence), status: 0, completed_at: Date.now() };
    else patch = { status: 2, completed_at: Date.now() };
    await save({ id: t.id, ...patch });
    if (patch.status !== 0 || t.recurrence !== 'none') {
      setUndo({ msg: 'কাজটি সম্পন্ন হয়েছে', run: async () => { await DB.restoreTask(snap); await R.schedule(snap, sRef.current); await reload(); } });
    }
  };
  const setSetting = async (k: string, v: string) => { await DB.setSetting(k, v); await reload(); };

  const act = useRef<any>({}); act.current = { toggle, setEditor, tasks };
  useEffect(() => {
    (async () => { await R.setup(); await reload(); setReady(true); })();
    const handle = async (r: N.NotificationResponse | null | undefined) => {
      if (!r) return;
      const id = r.notification.request.content.data?.taskId as number | undefined; if (!id) return;
      const t = await DB.getTask(id); if (!t) return;
      if (r.actionIdentifier === 'done') { if (t.status !== 2) await act.current.toggle(t); }
      else if (r.actionIdentifier === 'snooze') await R.snooze(t);
      else act.current.setEditor(id);
    };
    N.getLastNotificationResponseAsync().then(handle);
    const sub = N.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [reload]);
  useEffect(() => { if (!undo) return; const h = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(h); }, [undo]);

  const mode = settings.theme ?? 'system';
  const base = palettes[(mode === 'system' ? sys : mode) === 'light' ? 'light' : 'dark'];
  const accent = /^#[0-9A-Fa-f]{6}$/.test(settings.accent ?? '') ? settings.accent : null;
  const c = React.useMemo(() => (accent ? { ...base, primary: accent } : base), [base, accent]);
  return <Ctx.Provider value={{ c, dark: base === palettes.dark, tasks, cats, settings, ready, undo, setUndo, editor, setEditor, tab, setTab, save, remove, toggle, setSetting, reload }}>{children}</Ctx.Provider>;
}
