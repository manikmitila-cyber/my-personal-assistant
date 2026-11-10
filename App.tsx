import React from 'react';
import { Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as I } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, NotoSansBengali_400Regular, NotoSansBengali_500Medium, NotoSansBengali_700Bold } from '@expo-google-fonts/noto-sans-bengali';
import { Provider, useApp } from './src/store';
import { Home, Settings, Tasks } from './src/Screens';
import { Editor } from './src/Editor';
import { CalendarScreen } from './src/Calendar';
import { HabitsScreen } from './src/Habits';
import { Assistant } from './src/Assistant';
import { SecretaryScreen } from './src/Tools';
import { T } from './src/ui';

const TABS: [string, string, any][] = [['home', 'হোম', 'home-variant-outline'], ['tasks', 'কাজ', 'format-list-checks'], ['calendar', 'ক্যালেন্ডার', 'calendar-month-outline'], ['habits', 'অভ্যাস', 'repeat'], ['settings', 'সেটিংস', 'cog-outline']];

function Shell() {
  const { c, dark, tab, setTab, ready, undo, setUndo } = useApp(); const ins = useSafeAreaInsets();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const barH = 64 + ins.bottom;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: ins.top }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {tab === 'home' && <Home />}
      {tab === 'tasks' && <Tasks />}
      {tab === 'calendar' && <CalendarScreen />}
      {tab === 'habits' && <HabitsScreen />}
      {tab === 'settings' && <Settings />}
      {tab === 'secretary' && <SecretaryScreen />}
      {tab === 'assistant' && <View style={{ flex: 1, paddingBottom: barH }}><Assistant /></View>}
      {undo && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: barH + 84, backgroundColor: c.card2, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <T w="m">{undo.msg}</T>
          <Pressable onPress={async () => { const u = undo; setUndo(null); await u.run(); }}><T w="b" color={c.primary}>পূর্বাবস্থায় ফেরান</T></Pressable>
        </View>
      )}
      {tab !== 'assistant' && <Pressable onPress={() => setTab('assistant')} style={{ position: 'absolute', right: 20, bottom: barH + 16, width: 58, height: 58, borderRadius: 29, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', elevation: 8 }}>
        <I name="robot-happy-outline" size={30} color="#fff" />
      </Pressable>}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: barH, backgroundColor: c.card, flexDirection: 'row', paddingBottom: ins.bottom, borderTopWidth: 1, borderTopColor: c.line }}>
        {TABS.map(([k, l, icon]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <I name={icon} size={24} color={tab === k ? c.primary : c.sub} />
            <T w={tab === k ? 'b' : 'm'} size={11} color={tab === k ? c.primary : c.sub}>{l}</T>
          </Pressable>
        ))}
      </View>
      <Editor />
    </View>
  );
}

export default function App() {
  const [ok] = useFonts({ NotoSansBengali_400Regular, NotoSansBengali_500Medium, NotoSansBengali_700Bold });
  if (!ok) return null;
  return <SafeAreaProvider><Provider><Shell /></Provider></SafeAreaProvider>;
}
