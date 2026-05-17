import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen
          name="programme"
          options={{
            title: 'Mon programme de la semaine',
            headerBackTitle: 'Retour',
            headerTintColor: '#7C6CF2',
            headerStyle: { backgroundColor: '#F5F3FF' },
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: '#1C1B33' },
          }}
        />
        <Stack.Screen
          name="routine"
          options={{
            title: 'Ma routine adaptée',
            headerBackTitle: 'Retour',
            headerTintColor: '#7C6CF2',
            headerStyle: { backgroundColor: '#F5F3FF' },
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700', color: '#1C1B33' },
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
