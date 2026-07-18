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
  | 'flou'
  | 'immobilite'
  | 'trop_grand'
  | 'perfectionnisme'
  | 'ennui'
  | 'decision'
  | 'epuisement';
type Step3Path = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
type Step3ASub = 1 | 2;
type Step3BSub = 1 | 2;
type Step3CSub = 1 | 2;
type Step3CSize = 'faisable' | 'un_peu' | 'beaucoup';
type Step3FSub = 1 | 2;
type Step3FDecision =
  | 'par_quoi'
  | 'ordre'
  | 'temps'
  | 'outil'
  | 'reponse'
  | 'option'
  | 'assez_bien';
type Step3GSub = 1 | 2;
type Step5Choice = 'continue' | 'stop' | 'proche' | 'bloque' | 'epuise' | 'aide';

const STEP3A_EXAMPLES: [string, string][] = [
  ['Faire ma dissertation', 'Écrire le titre du document'],
  ['Ranger ma chambre', 'Prendre un sac-poubelle'],
  ['Répondre au mail', 'Écrire « Bonjour »'],
  ['Faire ma valise', 'Poser la valise ouverte'],
  ['Me laver', 'Entrer dans la salle de bain'],
  ['Faire mes comptes', "Ouvrir l'application bancaire"],
  ['Réviser', 'Trouver la page du cours'],
  ['Cuisiner', 'Sortir un ingrédient'],
];

const STEP3B_MOVEMENTS = [
  'Poser les pieds au sol',
  'Me redresser',
  'Me lever sans rien faire d\'autre',
  'Faire trois pas',
  'Mettre mes chaussures',
  'Prendre l\'objet nécessaire dans ma main',
  'Changer de pièce',
];

const STEP3D_VERSIONS = [
  'Écrire un brouillon volontairement mauvais',
  'Faire une version incomplète',
  'Nettoyer seulement ce qui gêne',
  'Envoyer un message simple plutôt que parfait',
  'Préparer quelque chose de mangeable plutôt que cuisiner correctement',
  'Faire seulement 10 % de la tâche',
];

const STEP3E_STIMS = [
  'Du mouvement (faire la tâche debout, marcher)',
  'Du son (musique, podcast, bruit de fond)',
  'Une présence (appeler quelqu\'un, aller dans une pièce occupée)',
  'Un défi (me chronométrer, battre un record)',
  'De la nouveauté (changer d\'endroit, utiliser un autre outil)',
  'Alterner avec autre chose (faire deux petites tâches en alternance)',
  'Une petite récompense immédiate (boire quelque chose, grignoter)',
];

const STEP3F_DECISIONS: { key: Step3FDecision; label: string }[] = [
  { key: 'par_quoi',   label: 'Par quoi commencer' },
  { key: 'ordre',      label: 'Dans quel ordre le faire' },
  { key: 'temps',      label: 'Combien de temps y consacrer' },
  { key: 'outil',      label: 'Quel outil utiliser' },
  { key: 'reponse',    label: 'Quelle réponse donner' },
  { key: 'option',     label: 'Quelle option choisir' },
  { key: 'assez_bien', label: 'Ce qui est « assez bien »' },
];

const STEP3F_HELPS: Record<Step3FDecision, string> = {
  par_quoi:   'Commence par la partie la plus visible.',
  ordre:      'Commence par ce qui te prendra le moins de temps.',
  temps:      'Donne-toi 10 minutes, et c\'est tout.',
  outil:      'Prends celui qui est le plus proche de toi.',
  reponse:    'Envoie la version la plus courte.',
  option:     'Choisis celle que tu pourrais changer après si besoin.',
  assez_bien: 'La version qui existe vaut mieux que celle qui n\'existe pas.',
};

const STEP3G_NEEDS = [
  'Boire',
  'Manger',
  'Prendre mon traitement (si c\'est le moment)',
  'Me reposer ou dormir',
  'Demander de l\'aide',
  'Reporter consciemment cette tâche',
];

const STEP4_ENGAGEMENTS = [
  'Une minute',
  'Trois minutes',
  'Jusqu\'à la fin d\'une chanson',
  'Une seule action',
  'Juste ouvrir l\'endroit où ça commence',
];

function choiceToPath(c: Step2Choice): Step3Path {
  switch (c) {
    case 'flou':            return 'A';
    case 'immobilite':      return 'B';
    case 'trop_grand':      return 'C';
    case 'perfectionnisme': return 'D';
    case 'ennui':           return 'E';
    case 'decision':        return 'F';
    case 'epuisement':      return 'G';
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

export default function ParalyseFlow({ onComplete }: Props) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<FlowStep>(1);
  const [step1Sub, setStep1Sub] = useState<Step1Sub>(1);
  const [step2Choice, setStep2Choice] = useState<Step2Choice | null>(null);
  const [step3Path, setStep3Path] = useState<Step3Path>('A');

  // Step 3A
  const [step3ASub, setStep3ASub] = useState<Step3ASub>(1);

  // Step 3B
  const [step3BSub, setStep3BSub] = useState<Step3BSub>(1);
  const [step3BMovement, setStep3BMovement] = useState<string | null>(null);

  // Step 3C
  const [step3CSub, setStep3CSub] = useState<Step3CSub>(1);
  const [step3CSize, setStep3CSize] = useState<Step3CSize | null>(null);
  const [step3CReduce, setStep3CReduce] = useState('');
  const [step3CTiny, setStep3CTiny] = useState('');

  // Step 3D
  const [step3DVersion, setStep3DVersion] = useState<string | null>(null);

  // Step 3E
  const [step3EStim, setStep3EStim] = useState<string | null>(null);

  // Step 3F
  const [step3FSub, setStep3FSub] = useState<Step3FSub>(1);
  const [step3FDecision, setStep3FDecision] = useState<Step3FDecision | null>(null);
  const [step3FShowHelp, setStep3FShowHelp] = useState(false);

  // Step 3G
  const [step3GSub, setStep3GSub] = useState<Step3GSub>(1);
  const [step3GNeeds, setStep3GNeeds] = useState<string[]>([]);

  // Step 4
  const [step4Engagement, setStep4Engagement] = useState<string | null>(null);

  // Step 5
  const [step5Choice, setStep5Choice] = useState<Step5Choice | null>(null);
  const [step5StopNote, setStep5StopNote] = useState('');

  const toggleInArray = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  // Profil (pour accorder au genre en étape 2)
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
      { key: 'flou',            label: 'Je ne sais pas par où commencer' },
      { key: 'immobilite',      label: "Je sais par où commencer, mais je n'arrive pas à bouger" },
      { key: 'trop_grand',      label: "Il y a trop d'étapes, ou la tâche paraît trop grande" },
      { key: 'perfectionnisme', label: 'Je veux la faire correctement et ça me bloque' },
      { key: 'ennui',           label: "C'est trop ennuyeux, aucune stimulation" },
      { key: 'decision',        label: "Je dois d'abord prendre une décision et je n'y arrive pas" },
      {
        key: 'epuisement',
        label: accorder(
          "Je n'ai pas l'énergie, je suis vraiment épuisé",
          "Je n'ai pas l'énergie, je suis vraiment épuisée",
          "Je n'ai pas l'énergie, je suis vraiment à plat",
          genre
        ),
      },
    ],
    [genre]
  );

  const step5Options = useMemo<{ key: Step5Choice; label: string }[]>(
    () => [
      { key: 'continue', label: "J'ai commencé et je peux continuer" },
      { key: 'stop',     label: "J'ai commencé mais je veux m'arrêter" },
      { key: 'proche',   label: 'Je suis plus proche, mais pas encore dedans' },
      {
        key: 'bloque',
        label: accorder(
          'Je suis toujours bloqué',
          'Je suis toujours bloquée',
          'Je suis toujours au même point',
          genre
        ),
      },
      {
        key: 'epuise',
        label: accorder(
          'Je suis surtout épuisé',
          'Je suis surtout épuisée',
          'Je suis surtout à plat',
          genre
        ),
      },
      { key: 'aide',     label: "J'ai besoin de quelqu'un" },
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

  const handleStep2Advance = (choice: Step2Choice) => {
    setStep3Path(choiceToPath(choice));
    setStep3ASub(1);
    setStep3BSub(1);
    setStep3CSub(1);
    setStep3CSize(null);
    setStep3DVersion(null);
    setStep3EStim(null);
    setStep3FSub(1);
    setStep3FDecision(null);
    setStep3FShowHelp(false);
    setStep3GSub(1);
    setStep3GNeeds([]);
    setStep4Engagement(null);
    setStep5Choice(null);
    setStep5StopNote('');
    advanceTo(3);
  };

  const goBackToStep2 = () => {
    setStep2Choice(null);
    setStep5Choice(null);
    setStep5StopNote('');
    advanceTo(2);
  };

  const pickStep3FDecision = (key: Step3FDecision) => {
    const isSelected = step3FDecision === key;
    setStep3FDecision(isSelected ? null : key);
    setStep3FShowHelp(false);
  };

  const pickSize = (size: Step3CSize) => {
    setStep3CSize(size);
    if (size === 'faisable') {
      setTimeout(() => advanceTo(4), 500);
    }
  };

  // ── Renderers ────────────────────────────────────────────────────────────

  const renderStep1 = () => {
    if (step1Sub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>
            Tu sais peut-être exactement ce que tu devrais faire.
          </Text>
          <FadeInDelayed delay={1500}>
            <Text style={styles.narrativeSub}>
              Mais savoir quoi faire ne déclenche pas toujours l'action.
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
          Tu n'as pas besoin de te convaincre davantage.
        </Text>
        <FadeInDelayed delay={1500}>
          <Text style={styles.narrativeSub}>
            Tu as besoin de rendre le premier mouvement plus accessible.
          </Text>
        </FadeInDelayed>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => advanceTo(2)} activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>OK, on cherche</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => (
    <View>
      <Text style={styles.bigTitle}>Qu'est-ce qui te bloque le plus en ce moment ?</Text>
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
      <TouchableOpacity
        style={styles.skipLink}
        onPress={() => handleStep2Advance('flou')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}>
        <Text style={styles.skipLinkText}>Je ne sais pas</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3A = () => {
    if (step3ASub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>La tâche n'est pas encore ton objectif.</Text>
          <FadeInDelayed delay={1500}>
            <Text style={styles.narrativeSub}>
              Ton objectif, c'est de trouver sa porte d'entrée.
            </Text>
          </FadeInDelayed>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep3ASub(2)} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>
          Pour l'instant, tu ne vas pas faire la tâche. Tu vas seulement ouvrir l'endroit où elle commence.
        </Text>
        <Text style={styles.stepPara}>Tu as le droit de t'arrêter juste après.</Text>

        <View style={styles.exampleTable}>
          <View style={styles.exampleHeader}>
            <Text style={[styles.exampleCell, styles.exampleHeaderCell]}>Tâche</Text>
            <Text style={[styles.exampleCell, styles.exampleHeaderCell]}>Porte d'entrée</Text>
          </View>
          {STEP3A_EXAMPLES.map(([task, door], i) => (
            <View key={i} style={styles.exampleRow}>
              <Text style={styles.exampleCell}>{task}</Text>
              <Text style={styles.exampleCell}>{door}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 20 }]}
          onPress={() => advanceTo(4)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Me rapprocher de la tâche</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3B = () => {
    if (step3BSub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>Ne commence pas encore la tâche.</Text>
          <FadeInDelayed delay={1500}>
            <Text style={styles.narrativeSub}>Change seulement la position de ton corps.</Text>
          </FadeInDelayed>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep3BSub(2)} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>Choisis un seul mouvement.</Text>
        <Text style={styles.stepPara}>
          L'action ne commence pas toujours par la tâche. Elle peut commencer par un changement de posture.
        </Text>
        <View style={styles.list}>
          {STEP3B_MOVEMENTS.map(m => {
            const isSelected = step3BMovement === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setStep3BMovement(isSelected ? null : m)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {step3BMovement && (
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 20 }]}
            onPress={() => advanceTo(4)}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>C'est fait</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStep3C = () => {
    if (step3CSub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>
            Parfois, même la première étape fait penser à tout ce qui vient après.
          </Text>
          <Text style={styles.narrativeSub}>
            Pour l'instant, tu n'as pas besoin de connaître la suite.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep3CSub(2)} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>Cette action paraît encore…</Text>
        <View style={styles.list}>
          {(['faisable', 'un_peu', 'beaucoup'] as Step3CSize[]).map(size => {
            const isSelected = step3CSize === size;
            const label =
              size === 'faisable' ? 'Faisable' :
              size === 'un_peu' ? 'Un peu trop grande' :
              'Beaucoup trop grande';
            return (
              <TouchableOpacity
                key={size}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => pickSize(size)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {step3CSize === 'un_peu' && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.stepPara}>
              Qu'est-ce qui peut être retiré ? Une étape, une exigence, une finition, le fait de tout faire aujourd'hui ?
            </Text>
            <TextInput
              style={styles.field}
              value={step3CReduce}
              onChangeText={setStep3CReduce}
              placeholder="ex : Je fais juste la première partie"
              placeholderTextColor={C.primaryMuted}
              autoCapitalize="sentences"
              multiline
            />
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 16 }]}
              onPress={() => advanceTo(4)}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          </FadeInDelayed>
        )}

        {step3CSize === 'beaucoup' && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.stepPara}>
              Rétrécissons encore. Quelle est l'action la plus petite que tu pourrais faire — même si elle te paraît ridicule ?
            </Text>
            <TextInput
              style={styles.field}
              value={step3CTiny}
              onChangeText={setStep3CTiny}
              placeholder="ex : Ouvrir le document, écrire trois mots, poser l'objet devant moi"
              placeholderTextColor={C.primaryMuted}
              autoCapitalize="sentences"
              multiline
            />
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

  const renderStep3D = () => (
    <View>
      <Text style={styles.bigTitle}>Peut-être que ton cerveau ne refuse pas de commencer.</Text>
      <FadeInDelayed delay={1500}>
        <Text style={styles.stepPara}>
          Peut-être qu'il refuse de commencer d'une manière qui pourrait être mauvaise.
        </Text>
      </FadeInDelayed>
      <FadeInDelayed delay={2000} style={{ marginTop: 8 }}>
        <Text style={styles.subIntro}>Choisis ta version provisoire :</Text>
        <View style={styles.list}>
          {STEP3D_VERSIONS.map(v => {
            const isSelected = step3DVersion === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setStep3DVersion(isSelected ? null : v)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{v}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.footnote}>
          La première version n'a pas besoin de mériter d'être gardée. Elle doit seulement exister.
        </Text>
        {step3DVersion && (
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 12 }]}
            onPress={() => advanceTo(4)}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>C'est mon plan</Text>
          </TouchableOpacity>
        )}
      </FadeInDelayed>
    </View>
  );

  const renderStep3E = () => (
    <View>
      <Text style={styles.bigTitle}>La tâche n'a pas toujours besoin de devenir intéressante.</Text>
      <FadeInDelayed delay={1500}>
        <Text style={styles.stepPara}>
          Elle a parfois besoin d'être accompagnée par quelque chose qui l'est.
        </Text>
      </FadeInDelayed>
      <FadeInDelayed delay={2000} style={{ marginTop: 8 }}>
        <Text style={styles.subIntro}>De quoi ton cerveau a-t-il besoin pour rester avec cette tâche ?</Text>
        <View style={styles.list}>
          {STEP3E_STIMS.map(s => {
            const isSelected = step3EStim === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setStep3EStim(isSelected ? null : s)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {step3EStim && (
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 16 }]}
            onPress={() => advanceTo(4)}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>C'est mon plan</Text>
          </TouchableOpacity>
        )}
      </FadeInDelayed>
    </View>
  );

  const renderStep3F = () => {
    if (step3FSub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>Tu n'as peut-être pas besoin de motivation.</Text>
          <FadeInDelayed delay={1500}>
            <Text style={styles.narrativeSub}>Tu as peut-être une décision de trop à prendre.</Text>
          </FadeInDelayed>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep3FSub(2)} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>Quelle décision te retient ?</Text>
        <View style={styles.list}>
          {STEP3F_DECISIONS.map(opt => {
            const isSelected = step3FDecision === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => pickStep3FDecision(opt.key)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {step3FDecision && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.stepPara}>
              Tu n'as pas besoin de la meilleure décision pour commencer. Tu as besoin d'une décision suffisamment sûre pour continuer.
            </Text>
            {!step3FShowHelp && (
              <TouchableOpacity
                style={[styles.ctaBtn, { marginTop: 8 }]}
                onPress={() => setStep3FShowHelp(true)}
                activeOpacity={0.82}>
                <Text style={styles.ctaBtnText}>L'app choisit pour moi</Text>
              </TouchableOpacity>
            )}
            {step3FShowHelp && (
              <FadeInDelayed delay={0} style={{ marginTop: 8 }}>
                <View style={styles.helpBox}>
                  <Text style={styles.helpBoxText}>{STEP3F_HELPS[step3FDecision]}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.ctaBtn, { marginTop: 12 }]}
                  onPress={() => advanceTo(4)}
                  activeOpacity={0.82}>
                  <Text style={styles.ctaBtnText}>Continuer</Text>
                </TouchableOpacity>
              </FadeInDelayed>
            )}
            <TouchableOpacity
              style={styles.skipLink}
              onPress={() => advanceTo(4)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}>
              <Text style={styles.skipLinkText}>Continuer sans aide</Text>
            </TouchableOpacity>
          </FadeInDelayed>
        )}
      </View>
    );
  };

  const renderStep3GChecklist = () => (
    <View>
      <Text style={styles.bigTitle}>De quoi as-tu besoin maintenant ?</Text>
      <View style={styles.list}>
        {STEP3G_NEEDS.map(item => {
          const checked = step3GNeeds.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.checkRow, checked && styles.checkRowActive]}
              onPress={() => setStep3GNeeds(prev => toggleInArray(prev, item))}
              activeOpacity={0.75}>
              <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.footnote}>
        Reporter consciemment, ce n'est pas abandonner. C'est éviter que la tâche reste ouverte dans ta tête sans point de retour.
      </Text>
      <TouchableOpacity
        style={[styles.ctaBtn, { marginTop: 16 }]}
        onPress={onComplete}
        activeOpacity={0.82}>
        <Text style={styles.ctaBtnText}>Fermer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3G = () => {
    if (step3GSub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>
            Avant de te pousser à commencer, vérifions quelque chose.
          </Text>
          <Text style={styles.narrativeSub}>
            Peut-être que tu n'as pas besoin d'une meilleure méthode. Peut-être que ton corps manque réellement de ressources.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setStep3GSub(2)} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return renderStep3GChecklist();
  };

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
      <Text style={styles.bigTitle}>Tu ne t'engages pas à terminer.</Text>
      <Text style={styles.stepPara}>Tu t'engages seulement à essayer.</Text>
      <View style={styles.list}>
        {STEP4_ENGAGEMENTS.map(e => {
          const isSelected = step4Engagement === e;
          return (
            <TouchableOpacity
              key={e}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() => setStep4Engagement(isSelected ? null : e)}
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{e}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.footnote}>Tu auras le droit de t'arrêter après. Pour de vrai.</Text>
      {step4Engagement && (
        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 12 }]}
          onPress={() => advanceTo(5)}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>C'est parti</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text style={styles.bigTitle}>Où en es-tu maintenant ?</Text>
      <View style={styles.list}>
        {step5Options.map(opt => {
          const isSelected = step5Choice === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() => setStep5Choice(isSelected ? null : opt.key)}
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {step5Choice === 'continue' && (
        <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
          <Text style={styles.stepPara}>L'action a commencé. Garde le mouvement.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Fermer</Text>
          </TouchableOpacity>
        </FadeInDelayed>
      )}

      {step5Choice === 'stop' && (
        <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
          <Text style={styles.stepPara}>
            Tu n'as pas terminé, mais tu n'es plus au même endroit.
          </Text>
          <Text style={styles.fieldLabel}>Note ta prochaine action pour la reprise</Text>
          <TextInput
            style={styles.field}
            value={step5StopNote}
            onChangeText={setStep5StopNote}
            placeholder="ex : Reprendre au paragraphe 3"
            placeholderTextColor={C.primaryMuted}
            autoCapitalize="sentences"
            multiline
          />
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 12 }]}
            onPress={onComplete}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Fermer</Text>
          </TouchableOpacity>
        </FadeInDelayed>
      )}

      {step5Choice === 'proche' && (
        <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
          <Text style={styles.stepPara}>
            C'est déjà un mouvement. Choisis un dernier geste physique : te lever, changer de pièce, ou prendre l'objet dans ta main.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Fermer</Text>
          </TouchableOpacity>
        </FadeInDelayed>
      )}

      {step5Choice === 'bloque' && (
        <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
          <Text style={styles.stepPara}>Changeons de stratégie, pas de niveau de pression.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={goBackToStep2} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Essayer une autre approche</Text>
          </TouchableOpacity>
        </FadeInDelayed>
      )}

      {step5Choice === 'epuise' && (
        <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
          {renderStep3GChecklist()}
        </FadeInDelayed>
      )}

      {step5Choice === 'aide' && (
        <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
          <Text style={styles.stepPara}>
            C'est une vraie réponse. Envoie un message, appelle, ou va simplement dans une pièce où quelqu'un est présent.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Fermer</Text>
          </TouchableOpacity>
        </FadeInDelayed>
      )}
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
    marginBottom: 16,
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

  // Field label (e.g. "Note ta prochaine action pour la reprise")
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSub,
    marginTop: 12,
    marginBottom: 6,
  },

  // Text field
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

  // Skip link (discreet)
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

  // Sub-intro text (e.g. "Choisis ta version provisoire :")
  subIntro: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 22,
    marginBottom: 10,
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

  // Step 3F — helper box (contextual advice from the app)
  helpBox: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },
  helpBoxText: {
    fontSize: 15,
    color: C.primary,
    fontWeight: '600',
    lineHeight: 22,
  },

  // Step 3G — checkbox rows
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

  // Step 3A — example table (visuel, non interactif)
  exampleTable: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    overflow: 'hidden',
    opacity: 0.7,
  },
  exampleHeader: {
    flexDirection: 'row',
    backgroundColor: C.expandBg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  exampleHeaderCell: {
    fontWeight: '700',
    color: C.textSub,
  },
  exampleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  exampleCell: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
