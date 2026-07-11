import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DayTasksProvider } from '@/contexts/DayTasksContext';
import { CoffreProvider } from '@/contexts/CoffreContext';
import Onboarding, { PROFIL_KEY } from '@/components/Onboarding';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [profilVérifié, setProfilVérifié] = useState(false);
  const [profilExiste, setProfilExiste] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PROFIL_KEY).then(val => {
      setProfilExiste(val !== null);
      setProfilVérifié(true);
    });
  }, []);

  if (!profilVérifié) return null;

  if (!profilExiste) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Onboarding onComplete={() => setProfilExiste(true)} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <DayTasksProvider>
    <CoffreProvider>
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
    </CoffreProvider>
    </DayTasksProvider>
    </GestureHandlerRootView>
  );
}
