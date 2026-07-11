import React from 'react';
import { Text, StyleSheet } from 'react-native';

type LogoSize = 'compact' | 'coach' | 'onboarding';

const SIZE_STYLES: Record<LogoSize, { fontSize: number; letterSpacing: number }> = {
  compact:   { fontSize: 20, letterSpacing: -0.3 },
  coach:     { fontSize: 26, letterSpacing: -0.5 },
  onboarding:{ fontSize: 28, letterSpacing: -0.5 },
};

export default function Logo({ size }: { size: LogoSize }) {
  const { fontSize, letterSpacing } = SIZE_STYLES[size];
  return (
    <Text style={[styles.text, { fontSize, letterSpacing }]}>
      {'ADHD'}<Text style={styles.accent}>{'Progress'}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text:   { fontWeight: '800', color: '#1C1B33' },
  accent: { color: '#7C6CF2' },
});
