export const palettes = {
  dark: { bg: '#13101E', card: '#1E1A2F', card2: '#292343', text: '#F4F1FF', sub: '#A29BC0', primary: '#7B5CFA', line: '#2F2948', ok: '#4CC38A', danger: '#FF5C6C' },
  light: { bg: '#F4F1FF', card: '#FFFFFF', card2: '#ECE7FF', text: '#1B1530', sub: '#6B6485', primary: '#6847F0', line: '#E2DCF5', ok: '#2FA56E', danger: '#E5414F' },
};
export type Palette = typeof palettes.dark;
export const PRIORITIES = [
  { k: 0, n: 'জরুরি', c: '#FF5C6C' },
  { k: 1, n: 'উচ্চ', c: '#FF8F6B' },
  { k: 2, n: 'সাধারণ', c: '#F5B54A' },
  { k: 3, n: 'নিম্ন', c: '#4CC38A' },
];
export const STATUSES = ['শুরু হয়নি', 'চলমান', 'সম্পন্ন', 'স্থগিত', 'বাতিল'];
export const RECURRENCES: [string, string][] = [['none', 'একবার'], ['daily', 'প্রতিদিন'], ['weekly', 'প্রতি সপ্তাহ'], ['monthly', 'প্রতি মাস'], ['yearly', 'প্রতি বছর']];
