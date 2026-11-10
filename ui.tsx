import React from 'react';
import { Pressable, Text, TextProps, View, ViewStyle } from 'react-native';
import { useC } from './store';

export const F = { r: 'NotoSansBengali_400Regular', m: 'NotoSansBengali_500Medium', b: 'NotoSansBengali_700Bold' };
export function T({ w = 'r', size = 15, color, style, ...p }: TextProps & { w?: 'r' | 'm' | 'b'; size?: number; color?: string }) {
  const c = useC();
  return <Text {...p} style={[{ fontFamily: F[w], fontSize: size, color: color ?? c.text, lineHeight: size * 1.55 }, style]} />;
}
export function Card({ style, children }: { style?: ViewStyle; children: React.ReactNode }) {
  const c = useC();
  return <View style={[{ backgroundColor: c.card, borderRadius: 20, padding: 16 }, style]}>{children}</View>;
}
export function Chip({ label, on, onPress, color }: { label: string; on?: boolean; onPress?: () => void; color?: string }) {
  const c = useC(); const bg = on ? color ?? c.primary : c.card2;
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, marginBottom: 8 }}>
      <T w="m" size={13} color={on ? '#fff' : c.sub}>{label}</T>
    </Pressable>
  );
}
export function Btn({ label, onPress, kind = 'primary' }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger' }) {
  const c = useC(); const bg = kind === 'primary' ? c.primary : 'transparent';
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: bg, borderRadius: 16, paddingVertical: 12, alignItems: 'center', flex: 1, borderWidth: kind === 'primary' ? 0 : 1, borderColor: kind === 'danger' ? c.danger : c.line }}>
      <T w="m" color={kind === 'primary' ? '#fff' : kind === 'danger' ? c.danger : c.text}>{label}</T>
    </Pressable>
  );
}
