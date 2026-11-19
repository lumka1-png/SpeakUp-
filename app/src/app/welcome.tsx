import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Logo, Note, Screen, s, T } from '@/components/ui';
import { APP_NAME, IS_BETA } from '@/config';
import { LEVELS } from '@/data/words';
import { useProgress } from '@/store/progress';
import { C, F, LEVEL_COLORS } from '@/theme';

export default function Welcome() {
  const finish = useProgress((p) => p.finishOnboarding);
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: 26 }]}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Logo size={72} />
          <Text style={{ fontFamily: F.displayBold, fontSize: 44, color: C.ink, marginTop: 6 }} accessibilityRole="header">{APP_NAME}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 20, color: C.coral }}>Learn it. Say it. Hear it.</Text>
          <T v="zh" muted>學單字・開口說・用耳聽</T>
        </View>
        <View>
          <T v="h2" accessibilityRole="header">{"What's your English level?"}</T>
          <T muted style={{ marginTop: 4 }}>Pick the closest match. You can change it anytime.</T>
        </View>
        {IS_BETA && (
          <Note>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.sunText }}>
              Welcome to the free beta! If a translation or example looks wrong, tap Report to tell us.{'\n'}
              <Text style={{ fontFamily: F.zh }}>發現翻譯或例句有誤？請按「回報」告訴我們。</Text>
            </Text>
          </Note>
        )}
        {LEVELS.map((l, i) => (
          <Pressable key={l.name} onPress={() => { finish(i); router.replace('/'); }} accessibilityRole="button" accessibilityLabel={`${l.name}, CEFR ${l.cefr}`}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderWidth: 2, borderBottomWidth: 5, borderColor: C.line, borderRadius: 18, padding: 14, transform: [{ translateY: pressed ? 2 : 0 }] })}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: LEVEL_COLORS[i], alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.displayBold, fontSize: 18, color: C.white }}>{l.badge}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <T v="display">{l.name}</T>
              <T v="small">CEFR {l.cefr} · TOEIC {l.toeic}</T>
              <T v="small" style={{ color: C.ink }}>{l.blurb}</T>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
