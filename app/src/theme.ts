import { Platform } from 'react-native';

export const C = {
  ink: '#1E2140',
  muted: '#575B76',
  bg: '#FFF9F2',
  card: '#FFFFFF',
  line: '#EADFD1',
  lineDark: '#CFC3B3',
  track: '#EFE5D8',
  coral: '#D24A22',
  coralDark: '#9E3415',
  coralTint: '#FDE7DF',
  teal: '#0E7C74',
  tealDark: '#075049',
  tealTint: '#DDF1EE',
  sun: '#FFC94A',
  sunDark: '#C98A00',
  sunTint: '#FFF3D1',
  sunText: '#5A3E00',
  ok: '#1E7A45',
  okDark: '#0F5530',
  okTint: '#DFF3E6',
  bad: '#B3261E',
  badDark: '#7A1A14',
  badTint: '#FBE3E1',
  violet: '#5B4BC4',
  white: '#FFFFFF',
} as const;

export const F = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
  /** System fonts with good Traditional Chinese coverage. */
  zh: Platform.select({ ios: 'PingFang TC', android: 'sans-serif', default: "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif" }),
} as const;

export const R = { sm: 12, md: 16, lg: 22, xl: 26, pill: 999 } as const;
export const LEVEL_COLORS = [C.teal, C.violet, C.coral, C.ink] as const;
