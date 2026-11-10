import * as N from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { Task } from './db';
import { adjustQuiet } from './bn';

const CHANNEL = 'reminders';
export async function setup() {
  N.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CHANNEL, { name: 'কাজের রিমাইন্ডার', importance: N.AndroidImportance.HIGH, vibrationPattern: [0, 300, 200, 300], sound: 'default' });
  }
  await N.setNotificationCategoryAsync('task', [
    { identifier: 'done', buttonTitle: 'সম্পন্ন', options: { opensAppToForeground: true } },
    { identifier: 'snooze', buttonTitle: 'পরে মনে করিয়ে দাও', options: { opensAppToForeground: true } },
    { identifier: 'open', buttonTitle: 'কাজটি দেখুন', options: { opensAppToForeground: true } },
  ]);
  const cur = await N.getPermissionsAsync();
  if (!cur.granted) await N.requestPermissionsAsync();
}
export const permissionGranted = async () => (await N.getPermissionsAsync()).granted;

export async function cancel(taskId: number) {
  const all = await N.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith(`t${taskId}-`)).map((n) => N.cancelScheduledNotificationAsync(n.identifier)));
}
async function fire(id: string, at: number, title: string, body: string, taskId: number) {
  await N.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, data: { taskId }, categoryIdentifier: 'task', sound: 'default' },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: CHANNEL },
  });
}
// Schedules OS-level alarms (they fire even if the app is closed): before-deadline reminders, then repeated nags until completion.
export async function schedule(t: Task, s: Record<string, string>) {
  await cancel(t.id);
  if (t.status >= 2 || t.archived || !t.due_at) return;
  const quiet = s.quiet_on === '1'; const qs = +(s.quiet_start ?? 1380); const qe = +(s.quiet_end ?? 300);
  const adj = (ms: number) => adjustQuiet(ms, quiet, qs, qe);
  const now = Date.now(); let offsets: number[] = [0];
  try { offsets = JSON.parse(t.remind); } catch {}
  for (const off of offsets) {
    const at = adj(t.due_at - off * 60000);
    if (at > now) await fire(`t${t.id}-r${off}`, at, t.title, off === 0 ? 'কাজের সময় হয়েছে' : 'কাজটির সময় ঘনিয়ে আসছে', t.id);
  }
  if (t.repeat_min > 0) {
    for (let i = 1; i <= Math.min(t.repeat_max, 20); i++) {
      const at = adj(t.due_at + i * t.repeat_min * 60000);
      if (at > now) await fire(`t${t.id}-n${i}`, at, t.title, 'কাজটি এখনও সম্পন্ন হয়নি', t.id);
    }
  }
}
export const snooze = (t: { id: number; title: string }, minutes = 10) => fire(`t${t.id}-snz`, Date.now() + minutes * 60000, t.title, 'আপনার অনুরোধে আবার মনে করিয়ে দেওয়া হলো', t.id);

// ---- Habit reminders: one repeating weekly OS-level notification per scheduled weekday (fires with the app closed).
export async function cancelHabit(habitId: number) {
  const all = await N.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith(`h${habitId}-`)).map((n) => N.cancelScheduledNotificationAsync(n.identifier)));
}
export async function scheduleHabit(h: { id: number; name: string; days: string; remind_min: number | null }) {
  await cancelHabit(h.id);
  if (h.remind_min == null) return;
  let days: number[] = []; try { days = JSON.parse(h.days); } catch {}
  for (const d of days) {
    await N.scheduleNotificationAsync({
      identifier: `h${h.id}-${d}`,
      content: { title: 'অভ্যাসের সময়', body: h.name, sound: 'default', data: { habitId: h.id } },
      trigger: { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday: d + 1, hour: Math.floor(h.remind_min / 60), minute: h.remind_min % 60, channelId: CHANNEL },
    });
  }
}
// ---- Android system settings shortcuts (opening them is untested on real devices; falls back to the app settings page).
export async function openExactAlarmSettings() {
  try { await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM'); } catch { try { await Linking.openSettings(); } catch {} }
}
export async function openBatterySettings() {
  try { await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'); } catch { try { await Linking.openSettings(); } catch {} }
}
