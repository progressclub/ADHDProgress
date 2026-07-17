import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { accorder } from '@/utils/accorder';
import { PROFIL_KEY } from '@/components/Onboarding';

const C = {
  bg: '#F5F3FF',
  surface: '#FFFFFF',
  primary: '#7C6CF2',
  primaryLight: '#EDE9FE',
  primaryMuted: '#C4B9FB',
  text: '#1C1B33',
  textSub: '#6B7280',
  border: '#F0EDF8',
  expandBg: '#F8F6FF',
};

const SAUV_KEY = 'hyperfocus_sauvegarde';

type FlowStep = 1 | 2 | 3 | 4 | 5;
type Step1Sub = 1 | 2 | 3;
type Step2Choice = 'peur_oubli' | 'finir' | 'temps' | 'flow' | 'sais_pas';
type Step3Path = 'A' | 'B' | 'C';
type Step3ASub = 1 | 2;
type Step3BSub = 1 | 2;

const STEP2_OPTIONS: { key: Step2Choice; label: string }[] = [
  { key: 'peur_oubli', label: "J'ai peur d'oublier où j'en suis" },
  { key: 'finir',      label: 'Je veux juste finir ce truc' },
  { key: 'temps',      label: 'Je ne vois pas le temps passer' },
  { key: 'flow',       label: "J'ai enfin réussi à me concentrer, j'ai pas envie de perdre ça" },
  { key: 'sais_pas',   label: 'Je ne sais pas' },
];

const STEP3A_LOOP_ITEMS = [
  'Sauvegarder mon fichier',
  'Envoyer le message',
  'Finir ma phrase',
  'Ranger un outil',
];

const STEP3B_DURATIONS = ['15 min', '30 min', '1h', '2h', '4h'];

const STEP3C_BESOIN_ITEMS = ['Boire', 'Manger', 'Aller aux toilettes', "Bouger / s'étirer", 'Dormir'];
const STEP3C_AUTOUR_ITEMS = ["Répondre à quelqu'un", 'Un rendez-vous', 'Une tâche en attente', 'Autre'];

const STEP4_OPTIONS = [
  "Aller boire un verre d'eau",
  'Mettre une musique',
  'Aller au balcon / à la fenêtre',
  'Prendre une douche',
  'Marcher 2 minutes',
  'Parler à quelqu’un',
  'Changer de pièce',
];

function choiceToPath(c: Step2Choice | null): Step3Path {
  if (c === 'peur_oubli' || c === 'finir') return 'A';
  if (c === 'temps') return 'B';
  return 'C';
}

function FadeInDelayed({
  delay,
  children,
  style,
}: {
  delay: number;
  children: React.ReactNode;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity]);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}

type Props = { onComplete: () => void };

export default function HyperfocusFlow({ onComplete }: Props) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<FlowStep>(1);
  const [step1Sub, setStep1Sub] = useState<Step1Sub>(1);
  const [step2Choice, setStep2Choice] = useState<Step2Choice | null>(null);
  const [step3Path, setStep3Path] = useState<Step3Path>('A');

  // Step 3A
  const [step3ASub, setStep3ASub] = useState<Step3ASub>(1);
  const [sauvOu, setSauvOu] = useState('');
  const [sauvSuite, setSauvSuite] = useState('');
  const [sauvOubli, setSauvOubli] = useState('');
  const [loopChecks, setLoopChecks] = useState<string[]>([]);
  const [loopOtherChecked, setLoopOtherChecked] = useState(false);
  const [loopOtherText, setLoopOtherText] = useState('');

  // Step 3B
  const [step3BSub, setStep3BSub] = useState<Step3BSub>(1);
  const [duration, setDuration] = useState<string | null>(null);

  // Step 3C (state partagé — accessible aussi à l'étape 4)
  const [step3Checked, setStep3Checked] = useState<string[]>([]);

  // Step 4
  const [step4Choice, setStep4Choice] = useState<string | null>(null);

  // Profil (pour accorder au genre en étape 5)
  const [genre, setGenre] = useState('');
  useEffect(() => {
    AsyncStorage.getItem(PROFIL_KEY).then(profil => {
      if (profil) {
        try {
          setGenre(JSON.parse(profil).genre ?? '');
        } catch {
          // profil illisible — on reste sur masculin par défaut
        }
      }
    });
  }, []);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const advanceTo = useCallback((newStep: FlowStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(newStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const toggleInArray = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const handleStep2Continue = () => {
    if (!step2Choice) return;
    setStep3Path(choiceToPath(step2Choice));
    setStep3ASub(1);
    setStep3BSub(1);
    advanceTo(3);
  };

  const handleStep3ASauvContinue = async () => {
    try {
      await AsyncStorage.setItem(
        SAUV_KEY,
        JSON.stringify({
          where: sauvOu.trim(),
          next: sauvSuite.trim(),
          dontForget: sauvOubli.trim(),
          timestamp: Date.now(),
        })
      );
    } catch {
      // silencieux — la sauvegarde locale n'est pas critique en contexte hyperfocus
    }
    setStep3ASub(2);
  };

  const pickDuration = (d: string) => {
    setDuration(d);
    setTimeout(() => setStep3BSub(2), 500);
  };

  const renderStep1 = () => {
    if (step1Sub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>
            Tu n'es probablement pas en train de manquer de volonté.
          </Text>
          <FadeInDelayed delay={1500}>
            <Text style={styles.narrativeSub}>Au contraire.</Text>
          </FadeInDelayed>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep1Sub(2)} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (step1Sub === 2) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>
            Ton cerveau est tellement engagé dans une seule activité qu'il a cessé de donner de l'importance au reste.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep1Sub(3)} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <Text style={styles.narrativeBig}>
          Le problème n'est pas de réussir à te concentrer.
        </Text>
        <FadeInDelayed delay={1500}>
          <Text style={styles.narrativeSub}>C'est de réussir à changer de concentration.</Text>
        </FadeInDelayed>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => advanceTo(2)} activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>OK, et maintenant ?</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => (
    <View>
      <Text style={styles.bigTitle}>Pourquoi est-ce difficile de t'arrêter en ce moment ?</Text>
      <View style={styles.list}>
        {STEP2_OPTIONS.map(opt => {
          const isSelected = step2Choice === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() => setStep2Choice(isSelected ? null : opt.key)}
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {step2Choice && (
        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 24 }]}
          onPress={handleStep2Continue}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep3A = () => {
    if (step3ASub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>Sauvegardons ton cerveau.</Text>
          <Text style={styles.stepPara}>Comme ça, tu pourras décrocher sans rien perdre.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Où j'en suis</Text>
            <TextInput
              style={styles.field}
              value={sauvOu}
              onChangeText={setSauvOu}
              placeholder="ex : J'étais en train de modifier la page d'accueil"
              placeholderTextColor={C.primaryMuted}
              autoCapitalize="sentences"
              multiline
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Ma prochaine étape</Text>
            <TextInput
              style={styles.field}
              value={sauvSuite}
              onChangeText={setSauvSuite}
              placeholder="ex : Finir le header et tester sur mobile"
              placeholderTextColor={C.primaryMuted}
              autoCapitalize="sentences"
              multiline
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Ce que je ne veux pas oublier</Text>
            <TextInput
              style={styles.field}
              value={sauvOubli}
              onChangeText={setSauvOubli}
              placeholder="ex : Le bug d'affichage sur la liste"
              placeholderTextColor={C.primaryMuted}
              autoCapitalize="sentences"
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 12 }]}
            onPress={handleStep3ASauvContinue}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.bigTitle}>Avant de sortir, ferme juste une boucle.</Text>
        <Text style={styles.stepPara}>
          Le cerveau accepte mieux une transition quand le geste en cours est terminé.
        </Text>

        <View style={styles.list}>
          {STEP3A_LOOP_ITEMS.map(item => {
            const checked = loopChecks.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.checkRow, checked && styles.checkRowActive]}
                onPress={() => setLoopChecks(prev => toggleInArray(prev, item))}
                activeOpacity={0.75}>
                <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.checkRow, loopOtherChecked && styles.checkRowActive]}
            onPress={() => setLoopOtherChecked(v => !v)}
            activeOpacity={0.75}>
            <View style={[styles.checkbox, loopOtherChecked && styles.checkboxActive]}>
              {loopOtherChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkLabel, loopOtherChecked && styles.checkLabelActive]}>Autre</Text>
          </TouchableOpacity>

          {loopOtherChecked && (
            <TextInput
              style={[styles.field, { marginTop: 4 }]}
              value={loopOtherText}
              onChangeText={setLoopOtherText}
              placeholder="ex : Fermer l'onglet en cours"
              placeholderTextColor={C.primaryMuted}
              autoCapitalize="sentences"
            />
          )}
        </View>

        <Text style={styles.microHelp}>
          Coche ce que tu fais, puis continue. Pas besoin de tout cocher.
        </Text>

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 16 }]}
          onPress={() => advanceTo(4)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>C'est fait</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3B = () => {
    if (step3BSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>Depuis combien de temps penses-tu être dessus ?</Text>
          <View style={styles.durationRow}>
            {STEP3B_DURATIONS.map(d => {
              const isSelected = duration === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.durationBtn, isSelected && styles.durationBtnActive]}
                  onPress={() => pickDuration(d)}
                  activeOpacity={0.75}>
                  <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <Text style={styles.narrativeBig}>Maintenant, regarde l'heure.</Text>
        <FadeInDelayed delay={3000}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => advanceTo(4)}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </FadeInDelayed>
      </View>
    );
  };

  const renderStep3C = () => (
    <View>
      <Text style={styles.bigTitle}>Qu'est-ce qui est en train de t'attendre en ce moment ?</Text>
      <Text style={styles.stepPara}>
        Le simple fait de les revoir remet le monde extérieur dans ton champ de vision.
      </Text>

      <Text style={styles.sectionLabel}>Besoins physiques</Text>
      <View style={styles.list}>
        {STEP3C_BESOIN_ITEMS.map(item => {
          const checked = step3Checked.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.checkRow, checked && styles.checkRowActive]}
              onPress={() => setStep3Checked(prev => toggleInArray(prev, item))}
              activeOpacity={0.75}>
              <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Autour de toi</Text>
      <View style={styles.list}>
        {STEP3C_AUTOUR_ITEMS.map(item => {
          const checked = step3Checked.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.checkRow, checked && styles.checkRowActive]}
              onPress={() => setStep3Checked(prev => toggleInArray(prev, item))}
              activeOpacity={0.75}>
              <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.ctaBtn, { marginTop: 20 }]}
        onPress={() => advanceTo(4)}
        activeOpacity={0.82}>
        <Text style={styles.ctaBtnText}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => {
    if (step3Path === 'A') return renderStep3A();
    if (step3Path === 'B') return renderStep3B();
    return renderStep3C();
  };

  const renderStep4 = () => {
    const hasChecks = step3Checked.length > 0;
    const n = step3Checked.length;

    return (
      <View>
        {hasChecks && (
          <>
            <Text style={styles.bigTitle}>
              {n === 1
                ? "1 chose t'attend dehors."
                : `${n} choses t'attendent dehors.`}
            </Text>
            <View style={styles.awaitList}>
              {step3Checked.map(item => (
                <View key={item} style={styles.awaitItem}>
                  <Text style={styles.awaitBullet}>•</Text>
                  <Text style={styles.awaitText}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={styles.section2Divider} />
            <Text style={styles.section2Intro}>
              Et si tu veux, choisis un premier geste de sortie :
            </Text>
          </>
        )}

        {!hasChecks && (
          <>
            <Text style={styles.bigTitle}>Tu n'as pas besoin de tout arrêter d'un coup.</Text>
            <Text style={styles.stepPara}>Choisis juste un premier geste de sortie.</Text>
          </>
        )}

        <View style={styles.list}>
          {STEP4_OPTIONS.map(opt => {
            const isSelected = step4Choice === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setStep4Choice(isSelected ? null : opt)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {step4Choice && (
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 20 }]}
            onPress={() => advanceTo(5)}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>C'est mon plan</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => advanceTo(5)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}>
          <Text style={styles.skipLinkText}>Passer cette étape</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep5 = () => (
    <View style={styles.centered}>
      <Text style={styles.narrativeBig}>
        {accorder(
          "Tu n'es pas obligé de résoudre ça maintenant.",
          "Tu n'es pas obligée de résoudre ça maintenant.",
          "Pas besoin de résoudre ça maintenant.",
          genre
        )}
      </Text>
      <FadeInDelayed delay={2000}>
        <Text style={styles.narrativeSub}>
          Ton cerveau continuera souvent d'y réfléchir, même quand tu ne seras plus devant.
        </Text>
      </FadeInDelayed>
      <Text style={styles.step5Footnote}>
        Beaucoup de personnes TDAH ont leurs meilleures idées en marchant ou sous la douche.
      </Text>
      <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
        <Text style={styles.ctaBtnText}>Fermer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableOnAndroid
        extraScrollHeight={80}
        enableResetScrollToCoords={false}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20 },

  // Narrative / centered screens (Step 1, Step 3B.2, placeholders)
  centered: {
    minHeight: 500,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  narrativeBig: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 20,
  },
  narrativeSub: {
    fontSize: 16,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Generic step titles / paragraphs
  bigTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    lineHeight: 30,
    marginTop: 8,
    marginBottom: 12,
  },
  stepPara: {
    fontSize: 15,
    color: C.textSub,
    lineHeight: 22,
    marginBottom: 20,
  },

  list: { gap: 10 },

  // Step 2 selectable option cards
  optionCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  optionCardActive: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  optionCardLabel: { fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 20 },
  optionCardLabelActive: { color: C.primary },

  // CTA button
  ctaBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 20,
    alignSelf: 'stretch',
  },
  ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Step 3A.1 fields
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSub,
    marginBottom: 6,
  },
  field: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    minHeight: 44,
  },

  // Checklist rows (Step 3A.2 + Step 3C)
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  checkRowActive: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 15, color: C.text },
  checkLabelActive: { color: C.primary, fontWeight: '600' },

  microHelp: {
    fontSize: 12,
    color: C.textSub,
    fontStyle: 'italic',
    marginTop: 14,
    textAlign: 'center',
  },

  // Step 3B durations
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  durationBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  durationBtnActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  durationText: { fontSize: 15, fontWeight: '600', color: C.text },
  durationTextActive: { color: C.primary },

  // Step 3C section labels
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textSub,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },

  // Step 4 — "Ce qui t'attend" list
  awaitList: {
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 4,
    gap: 6,
  },
  awaitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  awaitBullet: {
    fontSize: 18,
    color: C.primary,
    lineHeight: 22,
  },
  awaitText: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
  },
  section2Divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 20,
  },
  section2Intro: {
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
    marginBottom: 14,
  },

  // Step 4 — skip link (discreet)
  skipLink: {
    alignSelf: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  skipLinkText: {
    fontSize: 14,
    color: C.textSub,
    textDecorationLine: 'underline',
  },

  // Step 5 — footnote
  step5Footnote: {
    fontSize: 12,
    color: C.textSub,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
});
