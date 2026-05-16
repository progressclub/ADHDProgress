import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function ProgressionScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.emoji}>📈</Text>
        <Text style={styles.title}>Progression</Text>
        <Text style={styles.subtitle}>Visualisez votre évolution semaine après semaine</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Bientôt disponible</Text>
        </View>
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
});
