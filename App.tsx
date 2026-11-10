import React from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as I } from '@expo/vector-icons';
import {
  useFonts,
  NotoSansBengali_400Regular,
  NotoSansBengali_500Medium,
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold,
} from '@expo-google-fonts/noto-sans-bengali';
import { Provider, useApp } from './store';
import { Home, Settings, Tasks } from './Screens';
import { Editor } from './Editor';
import { CalendarScreen } from './Calendar';
import { HabitsScreen } from './Habits';
import { Assistant } from './Assistant';
import { SecretaryScreen } from './Tools';
import { T } from './ui';

const TABS: { key: string; label: string; icon: any; Comp: any }[] = [
  { key: 'home', label: 'হোম', icon: 'home-outline', Comp: Home },
  { key: 'tasks', label: 'কাজ', icon: 'format-list-checks', Comp: Tasks },
  { key: 'calendar', label: 'ক্যালেন্ডার', icon: 'calendar-month-outline', Comp: CalendarScreen },
  { key: 'habits', label: 'অভ্যাস', icon: 'repeat', Comp: HabitsScreen },
  { key: 'assistant', label: 'সহকারী', icon: 'microphone-outline', Comp: Assistant },
  { key: 'secretary', label: 'সচিব', icon: 'account-tie-outline', Comp: SecretaryScreen },
  { key: 'settings', label: 'সেটিংস', icon: 'cog-outline', Comp: Settings },
];

function Shell() {
  const { c, dark, ready, tab, setTab, editor, undo, setUndo } = useApp();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg ?? '#0F0F14' }} />;
  const Current: any = TABS.find((t) => t.key === tab)?.Comp ?? Home;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg ?? '#0F0F14' }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <Current />
      </View>
      {undo && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 80, backgroundColor: c.card, borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T>{undo.msg}</T>
          <Pressable onPress={async () => { const u = undo; setUndo(null); await u.run(); }}>
            <T w="b" color={c.primary}>পূর্বাবস্থা</T>
          </Pressable>
        </View>
      )}
      <View style={{ flexDirection: 'row', backgroundColor: c.card, paddingVertical: 6 }}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, alignItems: 'center' }}>
            <I name={t.icon} size={22} color={tab === t.key ? c.primary : c.sub} />
            <T size={9} color={tab === t.key ? c.primary : c.sub}>{t.label}</T>
          </Pressable>
        ))}
      </View>
      {editor !== null && <Editor />}
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded] = useFonts({
    NotoSansBengali_400Regular,
    NotoSansBengali_500Medium,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <Provider>
        <Shell />
      </Provider>
    </SafeAreaProvider>
  );
}
