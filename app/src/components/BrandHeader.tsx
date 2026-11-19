import { Text, View } from 'react-native';

import { APP_NAME, IS_BETA } from '../config';
import { useProgress } from '../store/progress';
import { C, F } from '../theme';
import { Icon, Logo, Pill, PillText, Row } from './ui';

export function BrandHeader() {
  const stats = useProgress((p) => p.stats);
  return (
    <Row style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
      <Logo />
      <Text style={{ fontFamily: F.displayBold, fontSize: 22, color: C.ink }} accessibilityRole="header">{APP_NAME}</Text>
      {IS_BETA && <View style={{ backgroundColor: C.ink, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: C.white, fontFamily: F.bodyHeavy, fontSize: 10, letterSpacing: 0.8 }}>BETA</Text></View>}
      <View style={{ flex: 1 }} />
      <Pill label={`${stats.streak} day streak`}><Icon name="flame" size={16} color={C.coral} /><PillText>{stats.streak}</PillText></Pill>
      <Pill label={`${stats.xp} experience points`}><Icon name="bolt" size={16} color="#B7791F" /><PillText>{stats.xp} XP</PillText></Pill>
    </Row>
  );
}
