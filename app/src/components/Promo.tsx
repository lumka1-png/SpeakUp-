import { Image, Linking, Pressable, Text, View } from 'react-native';

import { AUTHOR, BOOK, SERVICES } from '../data/promos';
import { C, F } from '../theme';
import { Button, Card, Icon, LinkButton, Row, T } from './ui';

const open = (url: string) => { Linking.openURL(url).catch(() => {}); };
const email = () => open(`mailto:${AUTHOR.email}?subject=${encodeURIComponent('Communication coaching (from SpeakUp!)')}`);

function BookCover({ width = 76 }: { width?: number }) {
  return (
    <Pressable onPress={() => open(BOOK.url)} accessibilityRole="link" accessibilityLabel={`${BOOK.title} by ${BOOK.author} on Amazon`}>
      <Image source={BOOK.cover} style={{ width, height: width * 1.5, borderRadius: 6, borderWidth: 1, borderColor: C.line }} resizeMode="cover" />
    </Pressable>
  );
}

/** Small "From the creator" label, so it is clear this is the app maker's own work. */
function Eyebrow({ text }: { text: string }) {
  return <Text style={{ fontFamily: F.bodyHeavy, fontSize: 12.5, color: C.teal }}>{text}</Text>;
}

export function BookCard() {
  return (
    <Card style={{ gap: 12 }}>
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <BookCover />
        <View style={{ flex: 1, gap: 3 }}>
          <Eyebrow text="From the creator of SpeakUp!" />
          <T v="h3">{BOOK.title}</T>
          <T v="small">{BOOK.subtitle}, by {BOOK.author}. {BOOK.blurb}</T>
          <T v="zh" muted style={{ fontSize: 13.5 }}>{BOOK.blurbZh}</T>
        </View>
      </Row>
      <Button small kind="secondary" title="See the book on Amazon" iconRight="right" onPress={() => open(BOOK.url)} label={`See ${BOOK.title} on Amazon (opens in a new tab)`} />
    </Card>
  );
}

export function CoachingCard() {
  return (
    <Card style={{ gap: 12 }}>
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <Image source={AUTHOR.photo} style={{ width: 60, height: 60, borderRadius: 30 }} accessibilityLabel={`Photo of ${AUTHOR.name}`} />
        <View style={{ flex: 1, gap: 3 }}>
          <Eyebrow text="From the creator of SpeakUp!" />
          <T v="h3">Want to speak with confidence at work?</T>
          <T v="small">{AUTHOR.name} offers 1-on-1 business communication training and executive coaching. {AUTHOR.role.split(' · ')[1] ? `Based in ${AUTHOR.role.split(' · ')[1]}.` : ''}</T>
          <T v="zh" muted style={{ fontSize: 13.5 }}>一對一商務溝通訓練與主管溝通教練。</T>
        </View>
      </Row>
      <Button small kind="secondary" title="Work with Derick" iconRight="right" onPress={() => open(AUTHOR.page)} label="Work with Derick (opens his website in a new tab)" />
    </Card>
  );
}

/** Full section for the Profile tab. */
export function CreatorSection() {
  return (
    <View style={{ gap: 12 }}>
      <T v="h2" accessibilityRole="header">From the creator</T>
      <Card style={{ gap: 12 }}>
        <Row gap={14} style={{ alignItems: 'center' }}>
          <Image source={AUTHOR.photo} style={{ width: 72, height: 72, borderRadius: 36 }} accessibilityLabel={`Photo of ${AUTHOR.name}`} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3">{AUTHOR.name}</T>
            <T v="small">{AUTHOR.role}</T>
          </View>
        </Row>
        <T v="body">{AUTHOR.intro}</T>
        <T v="zh" muted>{AUTHOR.introZh}</T>
        <View style={{ gap: 10, marginTop: 4 }}>
          {SERVICES.map((sv) => (
            <Row key={sv.title} gap={10} style={{ alignItems: 'flex-start' }}>
              <Icon name="check" size={18} color={C.teal} />
              <View style={{ flex: 1 }}>
                <T v="bodyBold" style={{ fontSize: 15 }}>{sv.title}</T>
                <T v="small">{sv.body}</T>
              </View>
            </Row>
          ))}
        </View>
        <Button kind="teal" title="Work with Derick" iconRight="right" onPress={() => open(AUTHOR.page)} label="Work with Derick (opens his website in a new tab)" />
        <LinkButton title={`Email ${AUTHOR.email}`} icon="mail" onPress={email} />
      </Card>
      <BookCard />
    </View>
  );
}
