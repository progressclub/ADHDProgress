import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

const C = {
  bg: '#F5F3FF',
  card: '#FFFFFF',
  primary: '#7C6CF2',
  primaryLight: '#EDE9FE',
  primaryMuted: '#C4B9FB',
  text: '#1C1B33',
  textSub: '#6B7280',
  border: '#F0EDF8',
};

interface SliderItem {
  id: string;
  label: string;
  emoji: string;
}

const SLIDERS: SliderItem[] = [
  { id: 'sleep',    label: "J'ai bien dormi",                      emoji: '😴' },
  { id: 'emotions', label: 'Je me sens stable avec mes émotions',   emoji: '🧘' },
  { id: 'energy',   label: "J'ai de l'énergie",                    emoji: '⚡' },
  { id: 'anxiety',  label: 'Je me sens anxieux',                    emoji: '😰' },
  { id: 'motivated',label: 'Je suis motivé',                        emoji: '🔥' },
];

function valueLabel(v: number): string {
  if (v <= 2) return 'Faible';
  if (v <= 4) return 'Moyen';
  if (v <= 6) return 'Bien';
  if (v <= 8) return 'Très bien';
  return 'Excellent';
}

export default function RoutineScreen() {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(SLIDERS.map(s => [s.id, 5]))
  );

  const setValue = (id: string, v: number) =>
    setValues(prev => ({ ...prev, [id]: Math.round(v) }));

  const handleGenerate = () => {
    Alert.alert('Routine en cours de génération...');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>Comment je me sens aujourd'hui ?</Text>
        <Text style={styles.subtitle}>
          Ajuste chaque curseur selon ton ressenti ce matin.
        </Text>

        {SLIDERS.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <View style={styles.valueBadge}>
                <Text style={styles.valueNumber}>{values[item.id]}</Text>
              </View>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={values[item.id]}
              onValueChange={v => setValue(item.id, v)}
              minimumTrackTintColor={C.primary}
              maximumTrackTintColor={C.primaryLight}
              thumbTintColor={C.primary}
            />

            <View style={styles.scaleRow}>
              <Text style={styles.scaleText}>0</Text>
              <Text style={styles.scaleHint}>{valueLabel(values[item.id])}</Text>
              <Text style={styles.scaleText}>10</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGenerate}
          activeOpacity={0.85}>
          <Text style={styles.generateBtnText}>Générer ma routine ✨</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: C.textSub,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Slider card
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  cardEmoji: { fontSize: 22 },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 20,
  },
  valueBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: 10,
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
  },
  slider: { width: '100%', height: 36 },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  scaleText: { fontSize: 12, color: C.textSub, fontWeight: '500' },
  scaleHint: { fontSize: 12, color: C.primary, fontWeight: '600' },

  // Generate button
  generateBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  generateBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
