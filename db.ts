import * as SQLite from 'expo-sqlite';

export type Task = {
  id: number; title: string; notes: string; category_id: number | null; priority: number; status: number;
  due_at: number | null; starred: number; parent_id: number | null; recurrence: string; remind: string;
  repeat_min: number; repeat_max: number; created_at: number; updated_at: number; completed_at: number | null; archived: number;
};
export type Category = { id: number; name: string; sort: number };

const DEFAULT_CATS = ['মাদ্রাসার কাজ', 'ব্যক্তিগত কাজ', 'পড়াশোনা', 'গুরুত্বপূর্ণ তারিখ', 'দৈনিক আমল', 'সাপ্তাহিক পরিকল্পনা', 'অনুষ্ঠান ও মিটিং', 'কেনাকাটা', 'অন্যান্য'];
let dbp: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDb = () => (dbp ??= (async () => {
  const db = await SQLite.openDatabaseAsync('assistant.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const v = row?.user_version ?? 0;
  if (v < 1) {
    await db.execAsync(`
      CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
        category_id INTEGER, priority INTEGER NOT NULL DEFAULT 2, status INTEGER NOT NULL DEFAULT 0,
        due_at INTEGER, starred INTEGER NOT NULL DEFAULT 0, parent_id INTEGER, recurrence TEXT NOT NULL DEFAULT 'none',
        remind TEXT NOT NULL DEFAULT '[0]', repeat_min INTEGER NOT NULL DEFAULT 0, repeat_max INTEGER NOT NULL DEFAULT 5,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, completed_at INTEGER, archived INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE INDEX idx_tasks_due ON tasks(due_at);
    `);
    for (let i = 0; i < DEFAULT_CATS.length; i++) await db.runAsync('INSERT INTO categories (name, sort) VALUES (?, ?)', [DEFAULT_CATS[i], i]);
    await db.execAsync('PRAGMA user_version = 1;');
  }
  if (v < 2) {
    await db.execAsync(`
      CREATE TABLE habits (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]', created_at INTEGER NOT NULL);
      CREATE TABLE habit_logs (habit_id INTEGER NOT NULL, day TEXT NOT NULL, PRIMARY KEY (habit_id, day));
      CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', pinned INTEGER NOT NULL DEFAULT 0, tags TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL);
      CREATE TABLE focus_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at INTEGER NOT NULL, minutes INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'focus');
      CREATE TABLE chat (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, text TEXT NOT NULL, at INTEGER NOT NULL);
    `);
    await db.execAsync('PRAGMA user_version = 2;');
  }
  if (v < 3) {
    await db.execAsync(`ALTER TABLE habits ADD COLUMN remind_min INTEGER;`); // minutes since midnight; NULL = no reminder
    await db.execAsync('PRAGMA user_version = 3;');
  }
  return db;
})());

export const listTasks = async () => (await getDb()).getAllAsync<Task>('SELECT * FROM tasks WHERE archived = 0 ORDER BY COALESCE(due_at, 9e15), id');
export const getTask = async (id: number) => (await getDb()).getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
export const listCategories = async () => (await getDb()).getAllAsync<Category>('SELECT * FROM categories ORDER BY sort, id');

export async function saveTask(t: Partial<Task>): Promise<number> {
  const db = await getDb(); const now = Date.now();
  const { id, ...rest } = t; const data: Record<string, any> = { ...rest, updated_at: now };
  if (id) {
    const keys = Object.keys(data);
    await db.runAsync(`UPDATE tasks SET ${keys.map((k) => k + ' = ?').join(', ')} WHERE id = ?`, [...keys.map((k) => data[k]), id]);
    return id;
  }
  data.created_at = now; const keys = Object.keys(data);
  const r = await db.runAsync(`INSERT INTO tasks (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((k) => data[k]));
  return r.lastInsertRowId;
}
export const deleteTask = async (id: number) => { await (await getDb()).runAsync('DELETE FROM tasks WHERE id = ? OR parent_id = ?', [id, id]); };
export async function restoreTask(t: Task) {
  const db = await getDb(); const keys = Object.keys(t) as (keyof Task)[];
  await db.runAsync(`INSERT OR REPLACE INTO tasks (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((k) => t[k] as any));
}
export async function allSettings() {
  const rows = await (await getDb()).getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}
export const setSetting = async (k: string, v: string) => { await (await getDb()).runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, v]); };

// ---- Habits ----
export type Habit = { id: number; name: string; days: string; created_at: number; remind_min: number | null };
export type Note = { id: number; title: string; body: string; pinned: number; tags: string; updated_at: number };
export const dayKey = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const listHabits = async () => (await getDb()).getAllAsync<Habit>('SELECT * FROM habits ORDER BY id');
export const addHabit = async (name: string, days: number[], remindMin: number | null = null) => { const r = await (await getDb()).runAsync('INSERT INTO habits (name, days, created_at, remind_min) VALUES (?, ?, ?, ?)', [name, JSON.stringify(days), Date.now(), remindMin]); return r.lastInsertRowId; };
export const deleteHabit = async (id: number) => { const db = await getDb(); await db.runAsync('DELETE FROM habits WHERE id = ?', [id]); await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ?', [id]); };
export const listLogs = async () => (await getDb()).getAllAsync<{ habit_id: number; day: string }>('SELECT * FROM habit_logs');
export async function toggleLog(habitId: number, day: string) {
  const db = await getDb();
  const r = await db.getFirstAsync('SELECT 1 FROM habit_logs WHERE habit_id = ? AND day = ?', [habitId, day]);
  if (r) await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ? AND day = ?', [habitId, day]);
  else await db.runAsync('INSERT INTO habit_logs (habit_id, day) VALUES (?, ?)', [habitId, day]);
}
// ---- Notes ----
export const listNotes = async () => (await getDb()).getAllAsync<Note>('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC');
export async function saveNote(n: Partial<Note>) {
  const db = await getDb(); const now = Date.now();
  if (n.id) await db.runAsync('UPDATE notes SET title = ?, body = ?, pinned = ?, tags = ?, updated_at = ? WHERE id = ?', [n.title ?? '', n.body ?? '', n.pinned ?? 0, n.tags ?? '', now, n.id]);
  else await db.runAsync('INSERT INTO notes (title, body, pinned, tags, updated_at) VALUES (?, ?, ?, ?, ?)', [n.title ?? '', n.body ?? '', n.pinned ?? 0, n.tags ?? '', now]);
}
export const deleteNote = async (id: number) => { await (await getDb()).runAsync('DELETE FROM notes WHERE id = ?', [id]); };
// ---- Focus ----
export const addSession = async (minutes: number, kind: string) => { await (await getDb()).runAsync('INSERT INTO focus_sessions (started_at, minutes, kind) VALUES (?, ?, ?)', [Date.now(), minutes, kind]); };
export const listSessions = async () => (await getDb()).getAllAsync<{ id: number; started_at: number; minutes: number; kind: string }>("SELECT * FROM focus_sessions WHERE kind = 'focus' ORDER BY started_at DESC LIMIT 500");
// ---- Chat ----
export const addChat = async (role: string, text: string) => { await (await getDb()).runAsync('INSERT INTO chat (role, text, at) VALUES (?, ?, ?)', [role, text, Date.now()]); };
export const listChat = async () => (await getDb()).getAllAsync<{ id: number; role: string; text: string; at: number }>('SELECT * FROM chat ORDER BY id DESC LIMIT 100');

// ---- Categories management ----
export const addCategory = async (name: string) => { const db = await getDb(); const r = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort) AS m FROM categories'); await db.runAsync('INSERT INTO categories (name, sort) VALUES (?, ?)', [name, (r?.m ?? -1) + 1]); };
export const renameCategory = async (id: number, name: string) => { await (await getDb()).runAsync('UPDATE categories SET name = ? WHERE id = ?', [name, id]); };
export const deleteCategory = async (id: number) => { const db = await getDb(); await db.runAsync('UPDATE tasks SET category_id = NULL WHERE category_id = ?', [id]); await db.runAsync('DELETE FROM categories WHERE id = ?', [id]); };
export async function moveCategory(id: number, dir: -1 | 1) {
  const db = await getDb(); const all = await listCategories(); const i = all.findIndex((c) => c.id === id); const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  const arr = [...all]; [arr[i], arr[j]] = [arr[j], arr[i]];
  for (let k = 0; k < arr.length; k++) await db.runAsync('UPDATE categories SET sort = ? WHERE id = ?', [k, arr[k].id]);
}

// ---- Backup / restore (JSON) ----
const TABLES = ['categories', 'tasks', 'habits', 'habit_logs', 'notes', 'focus_sessions', 'chat'] as const;
export async function exportAll(): Promise<string> {
  const db = await getDb(); const out: Record<string, any> = { app: 'my-personal-assistant', version: 1, exported_at: Date.now() };
  for (const t of TABLES) out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  const s = await allSettings(); delete s.ai_key; // never put the secret API key into a backup
  out.settings = s; return JSON.stringify(out);
}
// Replaces ALL local data. Caller must have asked the user for confirmation. Runs in one transaction: all-or-nothing.
export async function importAll(json: string) {
  const d = JSON.parse(json);
  if (d?.app !== 'my-personal-assistant' || !Array.isArray(d.tasks) || !Array.isArray(d.categories)) throw new Error('এটি বৈধ ব্যাকআপ ফাইল নয়');
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of TABLES) {
      await db.runAsync(`DELETE FROM ${t}`);
      for (const row of (d[t] ?? []) as Record<string, any>[]) {
        const keys = Object.keys(row); if (!keys.length) continue;
        await db.runAsync(`INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((k) => row[k]));
      }
    }
    for (const [k, v] of Object.entries(d.settings ?? {})) if (k !== 'ai_key') await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, String(v)]);
  });
}

export const listArchived = async () => (await getDb()).getAllAsync<Task>('SELECT * FROM tasks WHERE archived = 1 ORDER BY updated_at DESC');
