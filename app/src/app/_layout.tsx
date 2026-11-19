import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlobalUi } from '@/components/GlobalUi';
import { sendReports } from '@/lib/api';
import { loadVoices } from '@/lib/speech';
import { useProgress } from '@/store/progress';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const hydrated = useProgress((p) => p.hydrated);
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => { loadVoices(); }, []);
  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    // Send any word reports that could not be sent earlier (for example, offline).
    const p = useProgress.getState();
    sendReports(p.reports, p.installId, '0.1.0').then((keys) => keys.length && useProgress.getState().markReportsSent(keys));
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="lesson" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
      </Stack>
      <GlobalUi />
    </SafeAreaProvider>
  );
}
