import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '@/components/Logo';

export const PROFIL_KEY = 'profil';

export type Profil = {
  prenom: string;
  trancheAge: string;
  genre: string;
};

const C = {
  bg: '#F5F3FF',
  primary: '#7C6CF2',
  primaryLight: '#EDE9FE',
  text: '#1C1B33',
  textSub: '#6B7280',
  card: '#FFFFFF',
  border: '#E5E1F8',
  inactive: '#D1C9F8',
};

const TRANCHES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const GENRES = ['Masculin', 'Féminin', 'Neutre'];

type Props = {
  onComplete: () => void;
};

export default function Onboarding({ onComplete }: Props) {
  const [etape, setEtape] = useState(0);
  const [prenom, setPrenom] = useState('');
  const [trancheAge, setTrancheAge] = useState('');
  const [genre, setGenre] = useState('');

  const sauvegarderEtTerminer = async () => {
    const profil: Profil = { prenom: prenom.trim(), trancheAge, genre };
    await AsyncStorage.setItem(PROFIL_KEY, JSON.stringify(profil));
    onComplete();
  };

  if (etape === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centeredScreen}>
          <View style={styles.logoContainer}>
            <Logo size="onboarding" />
          </View>
          <Text style={styles.titre}>Bienvenue sur ADHDProgress</Text>
          <Text style={styles.sousTitre}>
            Avant de commencer, on a juste quelques questions pour personnaliser ton expérience
          </Text>
          <View style={styles.bottomFixed}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setEtape(1)} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>C'est parti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (etape === 1) {
    const prenomValide = prenom.trim().length > 0;
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.screen}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setEtape(0)}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <View style={styles.content}>
              <Text style={styles.titre}>Comment on t'appelle ?</Text>
              <TextInput
                style={styles.input}
                placeholder="Ton prénom"
                placeholderTextColor={C.inactive}
                value={prenom}
                onChangeText={setPrenom}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
            <View style={styles.bottomFixed}>
              <TouchableOpacity
                style={[styles.btnPrimary, !prenomValide && styles.btnDisabled]}
                onPress={() => prenomValide && setEtape(2)}
                activeOpacity={prenomValide ? 0.85 : 1}>
                <Text style={styles.btnPrimaryText}>Suivant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (etape === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.screen}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setEtape(1)}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.content}>
            <Text style={styles.titre}>Quelle est ta tranche d'âge ?</Text>
            <View style={styles.choixRow}>
              {TRANCHES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.choixBtn, trancheAge === t && styles.choixBtnActif]}
                  onPress={() => setTrancheAge(t)}
                  activeOpacity={0.8}>
                  <Text style={[styles.choixBtnText, trancheAge === t && styles.choixBtnTextActif]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.bottomFixed}>
            <TouchableOpacity
              style={[styles.btnPrimary, !trancheAge && styles.btnDisabled]}
              onPress={() => trancheAge && setEtape(3)}
              activeOpacity={trancheAge ? 0.85 : 1}>
              <Text style={styles.btnPrimaryText}>Suivant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (etape === 3) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.screen}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setEtape(2)}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.content}>
            <Text style={styles.titre}>Pour bien s'accorder avec toi</Text>
            <View style={styles.choixColonne}>
              {GENRES.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.choixBtnLarge, genre === g && styles.choixBtnActif]}
                  onPress={() => setGenre(g)}
                  activeOpacity={0.8}>
                  <Text style={[styles.choixBtnText, genre === g && styles.choixBtnTextActif]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.bottomFixed}>
            <TouchableOpacity
              style={[styles.btnPrimary, !genre && styles.btnDisabled]}
              onPress={() => genre && setEtape(4)}
              activeOpacity={genre ? 0.85 : 1}>
              <Text style={styles.btnPrimaryText}>Suivant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Étape 4 — Confirmation
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centeredScreen}>
        <View style={styles.logoContainer}>
          <Logo size="onboarding" />
        </View>
        <Text style={styles.titre}>Ravi de te rencontrer, {prenom.trim()} !</Text>
        <Text style={styles.sousTitre}>Ton expérience est maintenant personnalisée</Text>
        <View style={styles.bottomFixed}>
          <TouchableOpacity style={styles.btnPrimary} onPress={sauvegarderEtTerminer} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Découvrir l'app</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  centeredScreen: { flex: 1, paddingHorizontal: 24, paddingTop: 16, alignItems: 'center', justifyContent: 'center' },

  backBtn: { marginBottom: 24, alignSelf: 'flex-start' },
  backBtnText: { fontSize: 26, color: C.primary, fontWeight: '500' },

  content: { flex: 1, justifyContent: 'center' },

  logoContainer: { marginBottom: 32 },

  titre: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  sousTitre: {
    fontSize: 16,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },

  input: {
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    paddingVertical: 12,
    marginTop: 32,
  },

  choixRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 32,
    justifyContent: 'center',
  },
  choixColonne: {
    gap: 14,
    marginTop: 32,
  },
  choixBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    minWidth: 90,
  },
  choixBtnLarge: {
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  choixBtnActif: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  choixBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textSub,
  },
  choixBtnTextActif: {
    color: C.primary,
  },

  bottomFixed: {
    paddingBottom: 24,
    paddingTop: 12,
  },
  btnPrimary: {
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
  btnDisabled: {
    opacity: 0.4,
  },
  btnPrimaryText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
