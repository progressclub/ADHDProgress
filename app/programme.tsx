import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OBJECTIF_KEY = 'adhd_objectif_v1';

const C = {
  bg: '#F5F3FF',
  card: '#FFFFFF',
  primary: '#7C6CF2',
  primaryLight: '#EDE9FE',
  text: '#1C1B33',
  textSub: '#6B7280',
  border: '#F0EDF8',
};

interface Programme {
  id: string;
  emoji: string;
  title: string;
  objectif: string;
  description: string;
}

const PROGRAMMES: Programme[] = [
  {
    id: 'ecran',
    emoji: '📵',
    title: 'Programme désintoxication digitale',
    objectif: "Moins d'écran",
    description: 'Réduire le temps d\'écran et reprendre le contrôle de ton attention.',
  },
  {
    id: 'sommeil',
    emoji: '😴',
    title: 'Programme sommeil & récupération',
    objectif: 'Mieux dormir',
    description: 'Améliorer la qualité du sommeil pour recharger ton cerveau ADHD.',
  },
  {
    id: 'mouvement',
    emoji: '🏃',
    title: 'Programme mouvement quotidien',
    objectif: 'Bouger plus',
    description: 'Intégrer du mouvement dans ta journée pour booster ta dopamine.',
  },
  {
    id: 'focus',
    emoji: '🎯',
    title: 'Programme focus & concentration',
    objectif: 'Moins de distractions',
    description: 'Travailler en blocs courts avec moins d\'interruptions.',
  },
  {
    id: 'alimentation',
    emoji: '🥗',
    title: 'Programme alimentation consciente',
    objectif: 'Mieux manger',
    description: 'Stabiliser ton énergie et ta concentration grâce à l\'alimentation.',
  },
];

export default function ProgrammeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  // Pre-select the currently saved programme
  useEffect(() => {
    AsyncStorage.getItem(OBJECTIF_KEY).then(val => {
      if (val) {
        const match = PROGRAMMES.find(p => p.objectif === val);
        if (match) setSelected(match.id);
      }
    });
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    const prog = PROGRAMMES.find(p => p.id === selected)!;
    await AsyncStorage.setItem(OBJECTIF_KEY, prog.objectif);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.subtitle}>
          Choisis le programme qui correspond le mieux à tes besoins cette semaine.
        </Text>

        <View style={styles.list}>
          {PROGRAMMES.map(prog => {
            const isSelected = selected === prog.id;
            return (
              <TouchableOpacity
                key={prog.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(prog.id)}
                activeOpacity={0.75}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>{prog.emoji}</Text>
                  <View style={styles.cardTextBlock}>
                    <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                      {prog.title}
                    </Text>
                    <View style={styles.objectifRow}>
                      <Text style={[styles.objectifTag, isSelected && styles.objectifTagSelected]}>
                        {prog.objectif}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>
                {isSelected && (
                  <Text style={styles.cardDescription}>{prog.description}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={!selected}>
          <Text style={styles.confirmBtnText}>Confirmer mon programme ✓</Text>
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

  subtitle: {
    fontSize: 15,
    color: C.textSub,
    lineHeight: 22,
    marginBottom: 24,
  },

  list: { gap: 12, marginBottom: 28 },

  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: C.primary,
    backgroundColor: '#FDFCFF',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  cardTextBlock: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  cardTitleSelected: { color: C.primary },
  objectifRow: { flexDirection: 'row' },
  objectifTag: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textSub,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  objectifTagSelected: {
    color: C.primary,
    backgroundColor: C.primaryLight,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: C.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  cardDescription: {
    fontSize: 13,
    color: C.textSub,
    lineHeight: 19,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  confirmBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmBtnDisabled: {
    backgroundColor: '#C4B9FB',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
