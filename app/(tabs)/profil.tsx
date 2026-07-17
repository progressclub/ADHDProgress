import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, DevSettings } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PROFIL_KEY } from '@/components/Onboarding';

export default function ProfilScreen() {
  const handleDevReset = () => {
    Alert.alert(
      'Réinitialiser l\'onboarding ?',
      'Cette action va effacer ton profil local et te renvoyer sur l\'écran d\'onboarding. Cette opération est réservée au développement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(PROFIL_KEY);
            DevSettings.reload();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.subtitle}>Personnalisez votre expérience et vos préférences</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Bientôt disponible</Text>
        </View>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.devBtn}
            onPress={handleDevReset}
            activeOpacity={0.75}>
            <Text style={styles.devBtnText}>🔧 DEV — Réinitialiser l'onboarding</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F3FF' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1B33',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  badge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#7C6CF2',
    fontSize: 14,
    fontWeight: '600',
  },
  devBtn: {
    marginTop: 40,
    backgroundColor: '#FEF2E7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  devBtnText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
