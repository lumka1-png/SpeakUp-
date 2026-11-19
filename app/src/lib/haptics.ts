import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS === 'ios' || Platform.OS === 'android';
export const buzzGood = () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };
export const buzzBad = () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); };
export const tap = () => { if (on) Haptics.selectionAsync().catch(() => {}); };
