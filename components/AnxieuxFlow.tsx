import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

type FlowStep = 1 | 2 | 3 | 4 | 5;
type Step1Sub = 1 | 2;
type Step2Choice =
  | 'corps'
  | 'scenarios'
  | 'incertitude'
  | 'verification'
  | 'social'
  | 'evenement'
  | 'sais_pas';
type Step3Path = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
type Step3ASub = 1 | 2;
type Step3BSub = 1 | 2;
type Step3CSub = 1 | 2;
type Step3CChoice = 'info_dispo' | 'pas_encore' | 'impossible' | 'sais_pas';
type Step3DSub = 1 | 2;
type Step3ESub = 1 | 2;
type Step3FSub = 1 | 2;
type Step3FPrep = 'utile' | 'boucle' | 'sais_pas';
type Step3GRoute = 'body' | 'thoughts' | 'both';

const STEP3A_PRESSURES = [
  'Pousser les pieds contre le sol',
  "Presser les paumes l'une contre l'autre",
  'Appuyer le dos contre le dossier',
  'Tenir un objet avec une texture nette',
  'Pousser quelques secondes contre un mur',
];

const STEP3A_AMPLIFIERS = [
  "Je n'ai pas mangé",
  "J'ai peu dormi",
  'Beaucoup de caféine',
  'Un médicament ou substance récemment',
  "J'ai mal quelque part",
  'Non / je ne sais pas',
];

const STEP3C_OPTIONS: { key: Step3CChoice; label: string }[] = [
  { key: 'info_dispo', label: 'Je peux obtenir une information claire' },
  { key: 'pas_encore', label: "La réponse n'existe pas encore" },
  { key: 'impossible', label: 'Personne ne peut me le garantir' },
  { key: 'sais_pas',   label: 'Je ne sais pas' },
];

const STEP3D_BEHAVIORS = [
  'Relire une conversation',
  'Rechercher sur Internet',
  'Vérifier mon corps (symptôme, sensation)',
  'Demander à quelqu\'un si tout va bien',
  'Vérifier un objet ou une action',
  'Refaire mentalement la situation',
];

const STEP3D_STEPS = [
  'Définis ce que tu vérifies',
  'Fais-le une seule fois',
  'Note « vérifié » et passe à autre chose',
];

const STEP3E_ALTERNATIVES = [
  'Elle est occupée',
  'Elle répond vite entre deux choses',
  'Son ton n\'est pas visible par écrit',
  'Elle est fatiguée',
  'Elle n\'a rien d\'autre à ajouter',
];

const STEP3F_PREP_OPTIONS: { key: Step3FPrep; label: string }[] = [
  { key: 'utile',    label: 'Je trouve encore des informations utiles' },
  { key: 'boucle',   label: 'Je répète les mêmes scénarios' },
  { key: 'sais_pas', label: 'Je ne sais pas' },
];

const STEP3F_PREP_TEXTS: Record<Step3FPrep, string> = {
  utile:    'Alors continue — mais limite-toi à trois préparations maximum.',
  boucle:   'Une préparation produit une action ou une information. Une boucle anxieuse produit surtout une nouvelle version du même danger.',
  sais_pas: 'Une préparation produit une action ou une information. Une boucle anxieuse produit surtout une nouvelle version du même danger.',
};

const STEP3F_BACKUPS = [
  'Sortir deux minutes',
  'Demander une pause',
  'Consulter mes notes',
  'Quitter si c\'est nécessaire',
];

const STEP4_ACTIONS = [
  'Faire une seule action concrète (et laisser le reste)',
  'Attendre consciemment (sans vérifier)',
  'Demander une information précise',
  'M\'occuper de mon corps (boire, manger, bouger)',
  'Ne rien faire, et c\'est suffisant pour l\'instant',
];

function choiceToPath(c: Step2Choice): Step3Path {
  switch (c) {
    case 'corps':        return 'A';
    case 'scenarios':    return 'B';
    case 'incertitude':  return 'C';
    case 'verification': return 'D';
    case 'social':       return 'E';
    case 'evenement':    return 'F';
    case 'sais_pas':     return 'G';
  }
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

export default function AnxieuxFlow({ onComplete }: Props) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<FlowStep>(1);
  const [step1Sub, setStep1Sub] = useState<Step1Sub>(1);
  const [step2Choice, setStep2Choice] = useState<Step2Choice | null>(null);
  const [step3Path, setStep3Path] = useState<Step3Path>('A');

  // Step 3A
  const [step3ASub, setStep3ASub] = useState<Step3ASub>(1);
  const [step3APressure, setStep3APressure] = useState<string | null>(null);
  const [step3AAmplifiers, setStep3AAmplifiers] = useState<string[]>([]);

  // Step 3B
  const [step3BSub, setStep3BSub] = useState<Step3BSub>(1);
  const [step3BFear, setStep3BFear] = useState('');
  const [step3BKnown, setStep3BKnown] = useState('');
  const [step3BUnknown, setStep3BUnknown] = useState('');
  const [step3BAdded, setStep3BAdded] = useState('');

  // Step 3C
  const [step3CSub, setStep3CSub] = useState<Step3CSub>(1);
  const [step3CChoice, setStep3CChoice] = useState<Step3CChoice | null>(null);
  const [step3CAction, setStep3CAction] = useState('');

  // Step 3D
  const [step3DSub, setStep3DSub] = useState<Step3DSub>(1);
  const [step3DBehavior, setStep3DBehavior] = useState<string | null>(null);
  const [step3DVerifText, setStep3DVerifText] = useState('');

  // Step 3E
  const [step3ESub, setStep3ESub] = useState<Step3ESub>(1);
  const [step3EReceived, setStep3EReceived] = useState('');
  const [step3ELiteral, setStep3ELiteral] = useState('');
  const [step3EImagined, setStep3EImagined] = useState('');
  const [step3EQuestion, setStep3EQuestion] = useState('');

  // Step 3F
  const [step3FSub, setStep3FSub] = useState<Step3FSub>(1);
  const [step3FPrep, setStep3FPrep] = useState<Step3FPrep | null>(null);
  const [step3FTake, setStep3FTake] = useState('');
  const [step3FKnow, setStep3FKnow] = useState('');
  const [step3FFirstAction, setStep3FFirstAction] = useState('');
  const [step3FBackup, setStep3FBackup] = useState<string | null>(null);

  // Step 3G
  const [step3GRoute, setStep3GRoute] = useState<Step3GRoute | null>(null);

  // Step 4
  const [step4Action, setStep4Action] = useState<string | null>(null);

  // Profil (pour accorder au genre)
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

  const step2Options = useMemo<{ key: Step2Choice; label: string }[]>(
    () => [
      { key: 'corps',       label: 'Mon corps est en alerte (cœur, souffle, tension, nœud)' },
      { key: 'scenarios',   label: 'Mon cerveau imagine tout ce qui pourrait mal se passer' },
      { key: 'incertitude', label: 'Je ne supporte pas de ne pas savoir' },
      {
        key: 'verification',
        label: accorder(
          'Je vérifie ou je demande sans cesse à être rassuré',
          'Je vérifie ou je demande sans cesse à être rassurée',
          'Je vérifie ou je demande sans cesse à être en sécurité',
          genre
        ),
      },
      { key: 'social',    label: "J'analyse une interaction (message, silence, remarque)" },
      { key: 'evenement', label: 'Un événement précis approche et ça monte' },
      { key: 'sais_pas',  label: 'Je ne sais pas — guide-moi' },
    ],
    [genre]
  );

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

  const handleStep2Advance = (choice: Step2Choice) => {
    setStep3Path(choiceToPath(choice));
    setStep3ASub(1);
    setStep3APressure(null);
    setStep3AAmplifiers([]);
    setStep3BSub(1);
    setStep3BFear('');
    setStep3BKnown('');
    setStep3BUnknown('');
    setStep3BAdded('');
    setStep3CSub(1);
    setStep3CChoice(null);
    setStep3CAction('');
    setStep3DSub(1);
    setStep3DBehavior(null);
    setStep3DVerifText('');
    setStep3ESub(1);
    setStep3EReceived('');
    setStep3ELiteral('');
    setStep3EImagined('');
    setStep3EQuestion('');
    setStep3FSub(1);
    setStep3FPrep(null);
    setStep3FTake('');
    setStep3FKnow('');
    setStep3FFirstAction('');
    setStep3FBackup(null);
    setStep3GRoute(null);
    setStep4Action(null);
    advanceTo(3);
  };

  const animatePathChange = (nextPath: Step3Path) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      if (nextPath === 'B') {
        setStep3BSub(1);
      } else if (nextPath === 'A') {
        setStep3ASub(1);
      }
      setStep3Path(nextPath);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleStep3GChoice = (choice: Step3GRoute) => {
    setStep3GRoute(choice);
    setTimeout(() => {
      animatePathChange(choice === 'thoughts' ? 'B' : 'A');
    }, 500);
  };

  const handleStep3BFearContinue = () => {
    if (!step3BAdded.trim() && step3BFear.trim()) {
      setStep3BAdded(step3BFear);
    }
    setStep3BSub(2);
  };

  // ── Renderers ────────────────────────────────────────────────────────────

  const renderStep1 = () => {
    if (step1Sub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>Ton cerveau essaie de te protéger en anticipant.</Text>
          <FadeInDelayed delay={1500}>
            <Text style={styles.narrativeSub}>
              Mais à force de chercher toutes les issues possibles, il maintient lui-même l'alarme allumée.
            </Text>
          </FadeInDelayed>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep1Sub(2)} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <Text style={styles.narrativeBig}>
          Tu n'as pas besoin de résoudre tout l'avenir pour traverser les prochaines minutes.
        </Text>
        <FadeInDelayed delay={1500}>
          <Text style={styles.narrativeSub}>
            Cherchons ce qui est réel, ce qui est possible, et ce que tu peux faire maintenant.
          </Text>
        </FadeInDelayed>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => advanceTo(2)} activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>OK, on y va</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => (
    <View>
      <Text style={styles.bigTitle}>Qu'est-ce qui prend le plus de place en ce moment ?</Text>
      <View style={styles.list}>
        {step2Options.map(opt => {
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
          style={[styles.ctaBtn, { marginTop: 20 }]}
          onPress={() => handleStep2Advance(step2Choice)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep3A = () => {
    if (step3ASub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>
            N'essaie pas de prendre une très grande respiration.
          </Text>
          <FadeInDelayed delay={1500}>
            <Text style={styles.narrativeSub}>
              Laisse simplement ton souffle devenir un peu plus lent.
            </Text>
          </FadeInDelayed>
          <FadeInDelayed delay={2000} style={{ alignSelf: 'stretch' }}>
            <Text style={styles.instructionText}>
              Inspire normalement. Expire doucement. Petite pause. Recommence trois ou quatre fois.
            </Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => advanceTo(4)}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Ça aide un peu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaBtnSecondary}
              onPress={() => setStep3ASub(2)}
              activeOpacity={0.75}>
              <Text style={styles.ctaBtnSecondaryText}>Je préfère autre chose</Text>
            </TouchableOpacity>
          </FadeInDelayed>
        </View>
      );
    }
    const showMedNote = step3AAmplifiers.includes('Un médicament ou substance récemment');
    return (
      <View>
        <Text style={styles.bigTitle}>
          Ton corps reçoit beaucoup de signaux internes. Donnons-lui un signal physique simple et prévisible.
        </Text>
        <View style={styles.list}>
          {STEP3A_PRESSURES.map(p => {
            const isSelected = step3APressure === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setStep3APressure(isSelected ? null : p)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {step3APressure && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.subIntro}>Quelque chose pourrait-il amplifier l'alarme ?</Text>
            <View style={styles.list}>
              {STEP3A_AMPLIFIERS.map(a => {
                const checked = step3AAmplifiers.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    style={[styles.checkRow, checked && styles.checkRowActive]}
                    onPress={() => setStep3AAmplifiers(prev => toggleInArray(prev, a))}
                    activeOpacity={0.75}>
                    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                      {checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{a}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {showMedNote && (
              <Text style={styles.footnote}>
                Si cette réaction apparaît souvent après un médicament ou un changement de dose, note-le et parles-en à un professionnel.
              </Text>
            )}
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 16 }]}
              onPress={() => advanceTo(4)}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          </FadeInDelayed>
        )}
      </View>
    );
  };

  const renderStep3B = () => {
    if (step3BSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>
            Ton cerveau a peut-être transformé « cela pourrait arriver » en « cela va arriver » puis en « je dois agir maintenant ».
          </Text>
          <Text style={styles.stepPara}>Mettons un nom sur ce qui te fait peur.</Text>

          <Text style={styles.fieldLabel}>J'ai peur que…</Text>
          <TextInput
            style={styles.field}
            value={step3BFear}
            onChangeText={setStep3BFear}
            placeholder="ex : je rate mon examen, cette douleur soit grave, cette personne m'en veuille"
            placeholderTextColor={C.primaryMuted}
            autoCapitalize="sentences"
            multiline
          />

          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 16 }]}
            onPress={handleStep3BFearContinue}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>Séparons ce que tu sais de ce que ton anxiété ajoute.</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Ce que je sais</Text>
          <TextInput
            style={styles.knownField}
            value={step3BKnown}
            onChangeText={setStep3BKnown}
            placeholder="ex : Il n'a pas répondu depuis 3 heures"
            placeholderTextColor={C.textSub}
            autoCapitalize="sentences"
            multiline
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Ce que je ne sais pas encore</Text>
          <TextInput
            style={styles.unknownField}
            value={step3BUnknown}
            onChangeText={setStep3BUnknown}
            placeholder="ex : Pourquoi il ne répond pas"
            placeholderTextColor={C.textSub}
            autoCapitalize="sentences"
            multiline
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Ce que mon anxiété ajoute</Text>
          <TextInput
            style={styles.addedField}
            value={step3BAdded}
            onChangeText={setStep3BAdded}
            placeholder="ex : Il est en colère et va m'abandonner"
            placeholderTextColor={C.primaryMuted}
            autoCapitalize="sentences"
            multiline
          />
        </View>

        <Text style={styles.footnote}>
          Le scénario n'est peut-être pas impossible. Mais il n'a pas encore le statut de fait.
        </Text>

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 12 }]}
          onPress={() => advanceTo(4)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3C = () => {
    if (step3CSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>
            {accorder(
              'Quelle réponse cherches-tu exactement pour te sentir enfin rassuré ?',
              'Quelle réponse cherches-tu exactement pour te sentir enfin rassurée ?',
              'Quelle réponse cherches-tu exactement pour te sentir enfin en sécurité ?',
              genre
            )}
          </Text>
          <View style={styles.list}>
            {STEP3C_OPTIONS.map(opt => {
              const isSelected = step3CChoice === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => setStep3CChoice(isSelected ? null : opt.key)}
                  activeOpacity={0.75}>
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                    {isSelected ? '✓ ' : ''}{opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {step3CChoice && (
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 20 }]}
              onPress={() => setStep3CSub(2)}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    // Écran 3C.2 — fermeture provisoire, contenu conditionnel selon step3CChoice
    return (
      <View>
        {step3CChoice === 'info_dispo' && (
          <>
            <Text style={styles.bigTitle}>
              Alors c'est une action, pas une inquiétude. Quelle est cette information ?
            </Text>
            <TextInput
              style={styles.field}
              value={step3CAction}
              onChangeText={setStep3CAction}
              placeholder="ex : Appeler pour confirmer l'heure"
              placeholderTextColor={C.primaryMuted}
              autoCapitalize="sentences"
              multiline
            />
            <Text style={styles.footnote}>Fais cette seule chose. Le reste peut attendre.</Text>
          </>
        )}

        {(step3CChoice === 'pas_encore' || step3CChoice === 'sais_pas') && (
          <>
            <Text style={styles.bigTitle}>Cette question reste ouverte.</Text>
            <Text style={styles.stepPara}>
              Mais tu n'as pas besoin de la maintenir activement dans ta tête.
            </Text>
          </>
        )}

        {step3CChoice === 'impossible' && (
          <>
            <Text style={styles.bigTitle}>
              Ton anxiété cherche une certitude que cette situation ne peut pas fournir.
            </Text>
            <Text style={styles.stepPara}>
              Une possibilité mérite parfois une préparation. Elle ne mérite pas toujours une alarme permanente.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 16 }]}
          onPress={() => advanceTo(4)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3D = () => {
    if (step3DSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>Qu'essaies-tu de faire pour te rassurer ?</Text>
          <View style={styles.list}>
            {STEP3D_BEHAVIORS.map(b => {
              const isSelected = step3DBehavior === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => setStep3DBehavior(isSelected ? null : b)}
                  activeOpacity={0.75}>
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                    {isSelected ? '✓ ' : ''}{b}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {step3DBehavior && (
            <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
              <Text style={styles.stepPara}>
                {accorder(
                  "Est-ce que cela t'a rassuré durablement la dernière fois, ou seulement pendant quelques minutes ?",
                  "Est-ce que cela t'a rassurée durablement la dernière fois, ou seulement pendant quelques minutes ?",
                  'Est-ce que ça a durablement aidé la dernière fois, ou seulement pendant quelques minutes ?',
                  genre
                )}
              </Text>
              <TouchableOpacity
                style={[styles.ctaBtn, { marginTop: 4 }]}
                onPress={() => setStep3DSub(2)}
                activeOpacity={0.82}>
                <Text style={styles.ctaBtnText}>Seulement quelques minutes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaBtnSecondary}
                onPress={() => advanceTo(4)}
                activeOpacity={0.75}>
                <Text style={styles.ctaBtnSecondaryText}>Ça m'a vraiment aidé</Text>
              </TouchableOpacity>
            </FadeInDelayed>
          )}
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>
          Le soulagement rapide peut apprendre à ton cerveau qu'il était nécessaire de vérifier. Ce qui encourage une nouvelle vérification au prochain doute.
        </Text>
        <Text style={styles.stepPara}>Tu peux vérifier une fois, de manière complète.</Text>

        <View style={styles.numberedList}>
          {STEP3D_STEPS.map((s, i) => (
            <View key={i} style={styles.numberedItem}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.numberedText}>{s}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Ce que je vérifie :</Text>
        <TextInput
          style={styles.field}
          value={step3DVerifText}
          onChangeText={setStep3DVerifText}
          placeholder="ex : Relire le message une dernière fois"
          placeholderTextColor={C.primaryMuted}
          autoCapitalize="sentences"
          multiline
        />

        <Text style={styles.footnote}>
          Si ces vérifications sont très fréquentes ou durent longtemps, un professionnel peut t'aider à les réduire.
        </Text>

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 12 }]}
          onPress={() => advanceTo(4)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3E = () => {
    if (step3ESub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>Séparons ce que tu as reçu de ce que ton anxiété en fait.</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Le message reçu</Text>
            <TextInput
              style={styles.unknownField}
              value={step3EReceived}
              onChangeText={setStep3EReceived}
              placeholder="ex : D'accord."
              placeholderTextColor={C.textSub}
              autoCapitalize="sentences"
              multiline
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Ce qu'il dit littéralement</Text>
            <TextInput
              style={styles.knownField}
              value={step3ELiteral}
              onChangeText={setStep3ELiteral}
              placeholder="ex : La personne confirme qu'elle a reçu l'info"
              placeholderTextColor={C.textSub}
              autoCapitalize="sentences"
              multiline
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Ce que mon anxiété imagine</Text>
            <TextInput
              style={styles.addedField}
              value={step3EImagined}
              onChangeText={setStep3EImagined}
              placeholder="ex : Elle est froide et ne veut plus me parler"
              placeholderTextColor={C.primaryMuted}
              autoCapitalize="sentences"
              multiline
            />
          </View>

          <FadeInDelayed delay={0} style={{ marginTop: 8 }}>
            <Text style={styles.subIntro}>Les autres explications possibles :</Text>
            <View style={styles.mutedList}>
              {STEP3E_ALTERNATIVES.map(alt => (
                <View key={alt} style={styles.mutedItem}>
                  <Text style={styles.mutedBullet}>•</Text>
                  <Text style={styles.mutedText}>{alt}</Text>
                </View>
              ))}
            </View>
          </FadeInDelayed>

          <Text style={styles.footnote}>
            L'objectif n'est pas de choisir l'explication la plus rassurante. C'est de rouvrir plusieurs interprétations.
          </Text>

          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 12 }]}
            onPress={() => setStep3ESub(2)}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>Si tu veux vérifier, pose une seule question claire.</Text>
        <Text style={styles.stepPara}>
          Au lieu de tourner autour, formule ce que tu veux vraiment savoir.
        </Text>

        <Text style={styles.fieldLabel}>Ma question :</Text>
        <TextInput
          style={styles.field}
          value={step3EQuestion}
          onChangeText={setStep3EQuestion}
          placeholder="ex : Est-ce que tu es contrarié·e ou simplement occupé·e ?"
          placeholderTextColor={C.primaryMuted}
          autoCapitalize="sentences"
          multiline
        />

        <Text style={styles.footnote}>Pose la question. Laisse ensuite à la réponse le temps d'arriver.</Text>

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 12 }]}
          onPress={() => advanceTo(4)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3F = () => {
    if (step3FSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>
            Est-ce que tu prépares quelque chose de nouveau, ou est-ce que tu répètes mentalement ce que tu sais déjà ?
          </Text>
          <View style={styles.list}>
            {STEP3F_PREP_OPTIONS.map(opt => {
              const isSelected = step3FPrep === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => setStep3FPrep(isSelected ? null : opt.key)}
                  activeOpacity={0.75}>
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                    {isSelected ? '✓ ' : ''}{opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {step3FPrep && (
            <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
              <Text style={styles.stepPara}>{STEP3F_PREP_TEXTS[step3FPrep]}</Text>
              <TouchableOpacity
                style={[styles.ctaBtn, { marginTop: 4 }]}
                onPress={() => setStep3FSub(2)}
                activeOpacity={0.82}>
                <Text style={styles.ctaBtnText}>Continuer</Text>
              </TouchableOpacity>
            </FadeInDelayed>
          )}
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>Les trois seules choses qui amélioreront réellement la situation :</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Ce qu'il faut prendre</Text>
          <TextInput
            style={styles.field}
            value={step3FTake}
            onChangeText={setStep3FTake}
            placeholder="ex : Mon CV, ma carte d'identité"
            placeholderTextColor={C.primaryMuted}
            autoCapitalize="sentences"
            multiline
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Ce qu'il faut savoir</Text>
          <TextInput
            style={styles.field}
            value={step3FKnow}
            onChangeText={setStep3FKnow}
            placeholder="ex : L'adresse, le nom de la personne"
            placeholderTextColor={C.primaryMuted}
            autoCapitalize="sentences"
            multiline
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>La première action sur place</Text>
          <TextInput
            style={styles.field}
            value={step3FFirstAction}
            onChangeText={setStep3FFirstAction}
            placeholder="ex : Dire bonjour et me présenter"
            placeholderTextColor={C.primaryMuted}
            autoCapitalize="sentences"
            multiline
          />
        </View>

        <Text style={styles.stepPara}>Tout le reste peut attendre.</Text>

        <View style={styles.dividerLight} />

        <Text style={styles.subIntro}>
          {accorder(
            'Et si tu te sens trop anxieux sur place ?',
            'Et si tu te sens trop anxieuse sur place ?',
            "Et si l'anxiété devient trop forte sur place ?",
            genre
          )}
        </Text>
        <View style={styles.list}>
          {STEP3F_BACKUPS.map(b => {
            const isSelected = step3FBackup === b;
            return (
              <TouchableOpacity
                key={b}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setStep3FBackup(isSelected ? null : b)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{b}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.footnote}>Tu gardes des choix, même sur place.</Text>

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 12 }]}
          onPress={() => advanceTo(4)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3G = () => (
    <View>
      <Text style={styles.bigTitle}>Pas de souci. Une seule question :</Text>
      <Text style={styles.stepParaLarge}>
        Qu'est-ce qui prend le plus de place, ton corps ou tes pensées ?
      </Text>
      <View style={styles.list}>
        {(['body', 'thoughts', 'both'] as Step3GRoute[]).map(r => {
          const isSelected = step3GRoute === r;
          const label = r === 'body' ? 'Mon corps' : r === 'thoughts' ? 'Mes pensées' : 'Les deux';
          return (
            <TouchableOpacity
              key={r}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() => handleStep3GChoice(r)}
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep3 = () => {
    switch (step3Path) {
      case 'A': return renderStep3A();
      case 'B': return renderStep3B();
      case 'C': return renderStep3C();
      case 'D': return renderStep3D();
      case 'E': return renderStep3E();
      case 'F': return renderStep3F();
      case 'G': return renderStep3G();
    }
  };

  const renderStep4 = () => (
    <View>
      <Text style={styles.bigTitle}>Une possibilité n'est pas encore une urgence.</Text>
      <Text style={styles.stepPara}>
        Qu'est-ce que tu peux réellement faire dans les prochaines minutes ?
      </Text>
      <View style={styles.list}>
        {STEP4_ACTIONS.map(a => {
          const isSelected = step4Action === a;
          return (
            <TouchableOpacity
              key={a}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() => setStep4Action(isSelected ? null : a)}
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{a}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {step4Action && (
        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 16 }]}
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

  const renderStep5 = () => (
    <View style={styles.centered}>
      <Text style={styles.narrativeBig}>Ton anxiété essaie de tout résoudre maintenant.</Text>
      <FadeInDelayed delay={2000}>
        <Text style={styles.narrativeSub}>
          Mais tu viens de faire quelque chose de différent : tu as séparé ce qui est réel de ce qui est construit, et tu as choisi une seule action.
        </Text>
      </FadeInDelayed>
      <Text style={styles.footnoteFinal}>
        Si cette anxiété revient souvent ou t'empêche de fonctionner, un professionnel peut t'aider à la réduire durablement.
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

  // Narrative / centered screens
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
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontStyle: 'italic',
    paddingHorizontal: 8,
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
    marginBottom: 16,
  },
  subIntro: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 22,
    marginBottom: 10,
  },

  list: { gap: 10 },

  // Selectable option cards
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

  // CTA buttons
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
  ctaBtnSecondary: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: 'transparent',
  },
  ctaBtnSecondaryText: { color: C.primary, fontSize: 16, fontWeight: '700' },

  // Fields
  fieldBlock: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSub,
    marginTop: 12,
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
    marginTop: 4,
  },
  // Step 3B.2 — variantes colorées par nature d'info
  knownField: {
    backgroundColor: '#E8EFF7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E1EE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    minHeight: 44,
  },
  unknownField: {
    backgroundColor: '#F1F1F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    minHeight: 44,
  },
  addedField: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.primaryMuted,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    minHeight: 44,
  },

  // Footnote (small, italic, muted, centered)
  footnote: {
    fontSize: 12,
    color: C.textSub,
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },

  // Étape 5 — footnote finale (marge bottom pour respirer avant le bouton Fermer)
  footnoteFinal: {
    fontSize: 12,
    color: C.textSub,
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },

  // Skip link (discret)
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

  // Step 3G — paragraphe légèrement plus grand (question centrale)
  stepParaLarge: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    lineHeight: 24,
    marginBottom: 20,
  },

  // Step 3D.2 — liste numérotée (visuelle, non interactive)
  numberedList: {
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  },
  numberedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.primary,
  },
  numberedText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },

  // Step 3E — liste alternative (non interactive, atténuée)
  mutedList: {
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 4,
    gap: 6,
    opacity: 0.7,
  },
  mutedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  mutedBullet: {
    fontSize: 18,
    color: C.primary,
    lineHeight: 22,
  },
  mutedText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },

  // Step 3F.2 — séparateur léger entre les 3 préparations et le plan B
  dividerLight: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 20,
  },

  // Checkbox rows (amplifiers checklist)
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
});
