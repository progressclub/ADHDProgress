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
import {
  filterActivities,
  pickRandom,
  EXIT_COST_LABEL,
  type StimCategory,
  type StimChannel,
  type StimConstraint,
  type StimActivity,
  type StimExitCost,
} from '@/constants/stimulationLibrary';

type FilterCriteria = {
  category: StimCategory;
  channel?: StimChannel;
  subtype?: string;
};

const ASYNC_KEY_FORGOTTEN = 'stimulation_interets_oublies';
const PRESET_MESSAGE =
  "Je tourne un peu en rond et j'ai besoin de présence. Tu serais dispo pour un appel court, ou pour faire un truc chacun de notre côté ?";

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
  | 'mouvement'
  | 'nouveaute'
  | 'tache'
  | 'sensation'
  | 'connexion'
  | 'defi'
  | 'impulsion'
  | 'rien'
  | 'sais_pas';
type Step3Path = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
type Step3BSub = 1 | 2;
type Step3BSonChoice = 'tache_intel' | 'seul';
type Step3BGoutChoice = 'sensation' | 'besoin';
type Step3FSub = 1 | 2;
type Step3FDifficulty = 'trop_facile' | 'juste' | 'trop_dur';
type Step3GSub = 1 | 2;
type Step3GSearch = 'nouveaute' | 'pause' | 'social' | 'ennui' | 'evitement' | 'auto';
type Step3HSub = 1 | 2;
type Step3HState = 'plat' | 'epuise' | 'sature' | 'anhedonie' | 'flou' | 'sais_pas';
type Step4Sub = 1 | 2;
type Step4Feedback = 'oui' | 'pas_assez' | 'trop' | 'autre';

const STEP3A_TYPES: { label: string; subtype: string }[] = [
  { label: 'Un micro-mouvement, là tout de suite', subtype: 'micro' },
  { label: 'Bouger sur une chanson',               subtype: 'chanson' },
  { label: 'Sortir avec une petite mission',       subtype: 'destination' },
  { label: 'Un mouvement qui demande de réagir',   subtype: 'reactif' },
  { label: "Juste changer d'air",                  subtype: 'contexte' },
];

const STEP3B_CHANNELS: { key: string; label: string; channel?: StimChannel }[] = [
  { key: 'son',       label: 'Le son',              channel: 'son' },
  { key: 'gout',      label: 'Le goût',             channel: 'gout' },
  { key: 'toucher',   label: 'Le toucher',          channel: 'toucher' },
  { key: 'vision',    label: 'La vision',           channel: 'vision' },
  { key: 'plusieurs', label: 'Plusieurs à la fois', channel: undefined },
];

const STEP3C_TYPES: { label: string; subtype: string }[] = [
  { label: 'Une micro-aventure dehors ou autour de moi', subtype: 'micro_aventure' },
  { label: 'Apprendre un truc en cinq minutes',          subtype: 'apprentissage' },
  { label: "Tester sans m'engager à rien",               subtype: 'sans_engagement' },
];

const STEP3D_TYPES: { label: string; subtype: string }[] = [
  { label: 'Quelque chose de simple et rapide',        subtype: 'minimal' },
  { label: 'Faire quelque chose pour quelqu\'un',      subtype: 'positif' },
  { label: 'Un truc à faire à deux, chacun de son côté', subtype: 'partage' },
];

const STEP3F_LACKS: { key: string; label: string; subtype: string }[] = [
  { key: 'mouvement',  label: 'Plus de mouvement',                          subtype: 'variable' },
  { key: 'rythme',     label: 'Plus de rythme ou de son',                   subtype: 'side' },
  { key: 'defi',       label: 'Plus de défi',                                subtype: 'jeu' },
  { key: 'retour',     label: 'Plus de retour visible sur ce qui avance',   subtype: 'retour' },
  { key: 'recompense', label: 'Une récompense plus proche',                  subtype: 'recompense' },
  { key: 'nouveaute',  label: 'Plus de nouveauté dans la façon de faire',   subtype: 'variable' },
  { key: 'presence',   label: 'Plus de présence, ne pas être seul avec ça', subtype: 'side' },
];

const STEP3F_DIFFICULTIES: { key: Step3FDifficulty; label: string }[] = [
  { key: 'trop_facile', label: 'Trop facile et répétitive' },
  { key: 'juste',       label: "Juste assez engageante, c'est mon attention qui décroche" },
  { key: 'trop_dur',    label: 'Trop difficile et frustrante' },
];

const STEP3G_SEARCHES: { key: Step3GSearch; label: string; criteria: FilterCriteria }[] = [
  { key: 'nouveaute', label: 'Quelque chose de nouveau',      criteria: { category: 'nouveaute' } },
  { key: 'pause',     label: 'Une pause',                      criteria: { category: 'sensation' } },
  { key: 'social',    label: 'Un contact humain',              criteria: { category: 'connexion', subtype: 'minimal' } },
  { key: 'ennui',     label: "Éviter l'ennui",                 criteria: { category: 'defi' } },
  { key: 'evitement', label: 'Éviter une tâche',               criteria: { category: 'tache' } },
  { key: 'auto',      label: "Je l'ai ouvert sans réfléchir",  criteria: { category: 'mouvement', subtype: 'micro' } },
];

const STEP3G_COSTS = [
  "De l'argent",
  'Du sommeil',
  'Beaucoup de temps',
  'Une transition difficile pour en sortir',
  'Encore plus de stimulation pour continuer',
  'Rien de particulier',
];

const STEP3G_EXIT_STRATEGIES = [
  'Je décide maintenant combien de temps',
  'Je pose un minuteur avant de commencer',
  "Je définis où ça s'arrête",
  "J'essaie autre chose pendant cinq minutes d'abord",
];

const STEP3H_RESOURCES = [
  "Je n'ai pas mangé",
  "Je n'ai pas bu",
  "J'ai peu dormi",
  "Je n'ai pas bougé depuis longtemps",
  'Beaucoup de caféine ou une substance',
  'Non, rien de tout ça',
];

const STEP3H_SATURE_LIST = [
  'Sortir',
  'Marcher',
  'Voir quelqu\'un',
  'Cuisiner',
  'Fabriquer quelque chose',
  'M\'occuper d\'un animal',
  'Jardiner',
  'Observer un lieu réel',
];

const STEP3H_REPOS_LIST = [
  "Faire quelque chose de familier sans chercher l'excitation",
  'Réduire les écrans',
  'Me reposer sans objectif',
  'Manger ou boire',
  'Dormir',
  'Contacter quelqu\'un',
  'Reporter la recherche de stimulation',
];

const STEP3I_OPTIONS: { key: string; label: string; path: Step3Path }[] = [
  { key: 'bouger',    label: 'Bouger',        path: 'A' },
  { key: 'sensation', label: 'Une sensation', path: 'B' },
  { key: 'nouveau',   label: 'Du nouveau',    path: 'C' },
  { key: 'quelqu_un', label: "Quelqu'un",     path: 'D' },
];

const STEP4_CONSTRAINTS: { label: string; key: StimConstraint }[] = [
  { label: 'Je dois rester silencieux·se',       key: 'silencieux' },
  { label: 'Je ne peux pas me lever',            key: 'assis' },
  { label: 'Je suis dehors',                     key: 'dehors' },
  { label: "Je suis avec d'autres personnes",    key: 'avec_gens' },
  { label: "Je n'ai pas d'argent à dépenser",    key: 'sans_argent' },
  { label: "J'ai moins de cinq minutes",         key: 'moins_5min' },
  { label: 'Je dois rester sur ma tâche',        key: 'reste_sur_tache' },
];

const STEP4_FEEDBACK: { key: Step4Feedback; label: string }[] = [
  { key: 'oui',       label: 'Oui' },
  { key: 'pas_assez', label: 'Pas assez' },
  { key: 'trop',      label: "C'est trop" },
  { key: 'autre',     label: 'Je ressens autre chose' },
];

function choiceToPath(c: Step2Choice): Step3Path {
  switch (c) {
    case 'mouvement':  return 'A';
    case 'sensation':  return 'B';
    case 'nouveaute':  return 'C';
    case 'connexion':  return 'D';
    case 'defi':       return 'E';
    case 'tache':      return 'F';
    case 'impulsion':  return 'G';
    case 'rien':       return 'H';
    case 'sais_pas':   return 'I';
  }
}

function pathLabel(p: Step3Path): string {
  switch (p) {
    case 'A': return 'mouvement';
    case 'B': return 'sensation';
    case 'C': return 'nouveauté';
    case 'D': return 'connexion';
    case 'E': return 'défi';
    case 'F': return 'tâche';
    case 'G': return 'impulsion';
    case 'H': return 'anhédonie';
    case 'I': return 'sans mots';
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

type Props = {
  onComplete: () => void;
  onRedirectToParalyse?: () => void;
};

export default function StimulationFlow({ onComplete, onRedirectToParalyse }: Props) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<FlowStep>(1);
  const [step1Sub, setStep1Sub] = useState<Step1Sub>(1);
  const [step2Choice, setStep2Choice] = useState<Step2Choice | null>(null);
  const [step3Path, setStep3Path] = useState<Step3Path>('A');

  // State partagé — critères de filtrage transmis à l'étape 4
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria | null>(null);

  // Step 3B
  const [step3BSub, setStep3BSub] = useState<Step3BSub>(1);
  const [step3BSonChoice, setStep3BSonChoice] = useState<Step3BSonChoice | null>(null);
  const [step3BGoutChoice, setStep3BGoutChoice] = useState<Step3BGoutChoice | null>(null);

  // Step 3C — champ optionnel "intérêt oublié"
  const [step3CForgottenOpen, setStep3CForgottenOpen] = useState(false);
  const [step3CForgotten, setStep3CForgotten] = useState('');

  // Step 3D — bloc dépliable "message pré-écrit"
  const [step3DHelperOpen, setStep3DHelperOpen] = useState(false);

  // Step 3F
  const [step3FSub, setStep3FSub] = useState<Step3FSub>(1);
  const [step3FTaskLack, setStep3FTaskLack] = useState<string | null>(null);
  const [step3FDifficulty, setStep3FDifficulty] = useState<Step3FDifficulty | null>(null);

  // Step 3G
  const [step3GSub, setStep3GSub] = useState<Step3GSub>(1);
  const [step3GSearch, setStep3GSearch] = useState<Step3GSearch | null>(null);
  const [step3GCosts, setStep3GCosts] = useState<string[]>([]);
  const [step3GExitStrategy, setStep3GExitStrategy] = useState<string | null>(null);

  // Step 3H
  const [step3HSub, setStep3HSub] = useState<Step3HSub>(1);
  const [step3HState, setStep3HState] = useState<Step3HState | null>(null);
  const [step3HResources, setStep3HResources] = useState<string[]>([]);

  // Step 3I
  const [step3IChoice, setStep3IChoice] = useState<string | null>(null);

  // Step 4
  const [step4Sub, setStep4Sub] = useState<Step4Sub>(1);
  const [constraints, setConstraints] = useState<StimConstraint[]>([]);
  const [currentProposals, setCurrentProposals] = useState<StimActivity[]>([]);
  const [alreadyShownIds, setAlreadyShownIds] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<StimActivity | null>(null);
  const [currentMin, setCurrentMin] = useState(1);
  const [currentMax, setCurrentMax] = useState(3);
  const [exhaustedNotice, setExhaustedNotice] = useState(false);

  // Step 5
  const [pickedActivity, setPickedActivity] = useState<StimActivity | null>(null);

  function toggleInArray<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

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

  const step3HStates = useMemo<{ key: Step3HState; label: string }[]>(
    () => [
      { key: 'plat',      label: 'Tout semble plat' },
      { key: 'epuise',    label: accorder('Je suis épuisé', 'Je suis épuisée', 'Je suis à plat', genre) },
      { key: 'sature',    label: "J'ai déjà consommé énormément de contenus aujourd'hui" },
      { key: 'anhedonie', label: 'Même mes activités préférées ne me donnent plus de plaisir' },
      { key: 'flou',      label: "J'ai envie de quelque chose mais je ne sais pas quoi" },
      { key: 'sais_pas',  label: 'Je ne sais pas' },
    ],
    [genre]
  );

  const step2Options = useMemo<{ key: Step2Choice; label: string }[]>(
    () => [
      {
        key: 'mouvement',
        label: accorder(
          'Mon corps a besoin de bouger — je me sens agité ou enfermé',
          'Mon corps a besoin de bouger — je me sens agitée ou enfermée',
          "Mon corps a besoin de bouger — trop d'immobilité",
          genre
        ),
      },
      { key: 'nouveaute', label: 'Mon cerveau veut quelque chose de nouveau, tout me paraît plat' },
      { key: 'tache',     label: 'Ce que je dois faire est trop peu stimulant, mon attention glisse' },
      { key: 'sensation', label: "J'ai besoin d'une sensation plus forte (son, goût, texture, lumière)" },
      {
        key: 'connexion',
        label: accorder(
          "J'ai besoin de contact humain, je me sens seul",
          "J'ai besoin de contact humain, je me sens seule",
          "J'ai besoin de contact humain",
          genre
        ),
      },
      { key: 'defi',      label: "J'ai besoin d'un défi, de sentir mon cerveau vraiment engagé" },
      { key: 'impulsion', label: "Je cherche automatiquement quelque chose d'intense (téléphone, achat, nourriture)" },
      { key: 'rien',      label: 'Plus rien ne semble intéressant, même mes activités habituelles' },
      { key: 'sais_pas',  label: 'Je ne sais pas — trouve quelque chose pour moi' },
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
    const path = choiceToPath(choice);
    setStep3Path(path);
    // Reset shared filter + sub-states
    setFilterCriteria(path === 'E' ? { category: 'defi' } : null);
    setStep3BSub(1);
    setStep3BSonChoice(null);
    setStep3BGoutChoice(null);
    setStep3CForgottenOpen(false);
    setStep3CForgotten('');
    setStep3DHelperOpen(false);
    setStep3FSub(1);
    setStep3FTaskLack(null);
    setStep3FDifficulty(null);
    setStep3GSub(1);
    setStep3GSearch(null);
    setStep3GCosts([]);
    setStep3GExitStrategy(null);
    setStep3HSub(1);
    setStep3HState(null);
    setStep3HResources([]);
    setStep3IChoice(null);
    advanceTo(3);
  };

  const animatePathChange = (nextPath: Step3Path) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      // Fresh start dans la branche cible : reset filterCriteria + sub-states pertinents
      setFilterCriteria(null);
      setStep3BSub(1);
      setStep3Path(nextPath);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleStep3IChoice = (key: string, path: Step3Path) => {
    setStep3IChoice(key);
    setTimeout(() => animatePathChange(path), 500);
  };

  const goToParalyseFallback = () => {
    if (onRedirectToParalyse) onRedirectToParalyse();
    else onComplete();
  };

  const goToStep4 = () => {
    setStep4Sub(1);
    setConstraints([]);
    setCurrentProposals([]);
    setAlreadyShownIds([]);
    setSelectedActivity(null);
    setPickedActivity(null);
    setCurrentMin(1);
    setCurrentMax(3);
    setExhaustedNotice(false);
    advanceTo(4);
  };

  const computeProposals = (min: number, max: number, excludeIds: string[]) => {
    const filtered = filterActivities({
      category: filterCriteria?.category,
      channel: filterCriteria?.channel,
      subtype: filterCriteria?.subtype,
      constraints,
      minIntensity: min,
      maxIntensity: max,
    });
    let pool = filtered.filter(a => !excludeIds.includes(a.id));
    let notice = false;
    if (pool.length === 0 && filtered.length > 0) {
      pool = filtered;
      notice = true;
    }
    const picks = pickRandom(pool, 3);
    return { picks, notice };
  };

  const handleGoToProposals = () => {
    const { picks, notice } = computeProposals(1, 3, []);
    setCurrentProposals(picks);
    setAlreadyShownIds(picks.map(p => p.id));
    setCurrentMin(1);
    setCurrentMax(3);
    setSelectedActivity(null);
    setExhaustedNotice(notice);
    setStep4Sub(2);
  };

  const regenerate = (nextMin: number, nextMax: number) => {
    const { picks, notice } = computeProposals(nextMin, nextMax, alreadyShownIds);
    setCurrentProposals(picks);
    setAlreadyShownIds(notice ? picks.map(p => p.id) : [...alreadyShownIds, ...picks.map(p => p.id)]);
    setCurrentMin(nextMin);
    setCurrentMax(nextMax);
    setSelectedActivity(null);
    setExhaustedNotice(notice);
  };

  const handleFeedback = (key: Step4Feedback) => {
    if (key === 'oui') {
      setPickedActivity(selectedActivity);
      advanceTo(5);
    } else if (key === 'pas_assez') {
      regenerate(2, 3);
    } else if (key === 'trop') {
      regenerate(1, 1);
    } else if (key === 'autre') {
      setFilterCriteria(null);
      setStep2Choice(null);
      setConstraints([]);
      setCurrentProposals([]);
      setAlreadyShownIds([]);
      setSelectedActivity(null);
      setPickedActivity(null);
      setStep4Sub(1);
      advanceTo(2);
    }
  };

  const handleStep3CContinue = async () => {
    const text = step3CForgotten.trim();
    if (text) {
      try {
        const raw = await AsyncStorage.getItem(ASYNC_KEY_FORGOTTEN);
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) {
          arr.push({ text, timestamp: Date.now() });
          await AsyncStorage.setItem(ASYNC_KEY_FORGOTTEN, JSON.stringify(arr));
        }
      } catch {
        // stockage silencieux — pas critique
      }
    }
    goToStep4();
  };

  // ── Renderers ────────────────────────────────────────────────────────────

  const renderStep1 = () => {
    if (step1Sub === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>
            Tu n'as peut-être pas besoin d'une activité complètement différente.
          </Text>
          <FadeInDelayed delay={1500}>
            <Text style={styles.narrativeSub}>
              Tu as peut-être besoin de quelque chose qui donne plus de rythme, de nouveauté ou de retour à ce que tu fais déjà.
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
        <Text style={styles.narrativeBig}>L'ennui peut ressembler à du vide.</Text>
        <FadeInDelayed delay={1500}>
          <Text style={styles.narrativeSub}>
            Mais il peut aussi ressembler à de l'agitation, de l'irritation, ou une urgence de faire n'importe quoi pour que quelque chose change.
          </Text>
        </FadeInDelayed>
        <FadeInDelayed delay={2500}>
          <Text style={styles.footnote}>
            Quand le besoin devient urgent, l'option la plus immédiate devient très visible. Ce n'est pas toujours celle qui répondra vraiment au besoin.
          </Text>
        </FadeInDelayed>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => advanceTo(2)} activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Trouver ce qui manque</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => (
    <View>
      <Text style={styles.bigTitle}>De quoi as-tu besoin en ce moment ?</Text>
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

  const renderStep3Placeholder = (name: string) => (
    <View style={styles.centered}>
      <Text style={styles.narrativeBig}>Branche {name} — à venir</Text>
      <TouchableOpacity style={styles.ctaBtn} onPress={goToStep4} activeOpacity={0.82}>
        <Text style={styles.ctaBtnText}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3A = () => (
    <View>
      <Text style={styles.bigTitle}>Ton corps n'a peut-être pas besoin d'une séance de sport.</Text>
      <Text style={styles.stepPara}>
        Il a peut-être besoin d'un signal plus fort que l'immobilité actuelle.
      </Text>
      <Text style={styles.subIntro}>Quel type de mouvement ?</Text>
      <View style={styles.list}>
        {STEP3A_TYPES.map(t => {
          const isSelected =
            filterCriteria?.category === 'mouvement' && filterCriteria.subtype === t.subtype;
          return (
            <TouchableOpacity
              key={t.subtype}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() =>
                setFilterCriteria(isSelected ? null : { category: 'mouvement', subtype: t.subtype })
              }
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {filterCriteria?.category === 'mouvement' && (
        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 20 }]}
          onPress={goToStep4}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep3B = () => {
    if (step3BSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>Quel canal semble trop vide ?</Text>
          <View style={styles.list}>
            {STEP3B_CHANNELS.map(c => {
              const isSelected =
                filterCriteria?.category === 'sensation' && filterCriteria.channel === c.channel;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() =>
                    setFilterCriteria(
                      isSelected ? null : { category: 'sensation', channel: c.channel }
                    )
                  }
                  activeOpacity={0.75}>
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                    {isSelected ? '✓ ' : ''}{c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {filterCriteria?.category === 'sensation' && (
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 20 }]}
              onPress={() => setStep3BSub(2)}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    const channel = filterCriteria?.channel;
    return (
      <View>
        {channel === 'son' && (
          <>
            <Text style={styles.bigTitle}>Une question avant de choisir.</Text>
            <Text style={styles.stepPara}>
              Tu veux du son pour accompagner une tâche, ou pour lui-même ?
            </Text>
            <View style={styles.list}>
              {(
                [
                  { key: 'tache_intel' as const, label: 'Pour accompagner une tâche' },
                  { key: 'seul' as const,        label: 'Pour lui-même' },
                ]
              ).map(o => {
                const isSelected = step3BSonChoice === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setStep3BSonChoice(isSelected ? null : o.key)}
                    activeOpacity={0.75}>
                    <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                      {isSelected ? '✓ ' : ''}{o.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {step3BSonChoice === 'tache_intel' && (
              <FadeInDelayed delay={0} style={{ marginTop: 14 }}>
                <Text style={styles.stepPara}>
                  Alors privilégie quelque chose de familier, instrumental, à volume modéré — sinon la musique prend la place de la tâche au lieu de la soutenir.
                </Text>
              </FadeInDelayed>
            )}
          </>
        )}

        {channel === 'toucher' && (
          <>
            <Text style={styles.bigTitle}>Une chose à surveiller.</Text>
            <Text style={styles.stepPara}>
              Un objet à manipuler aide quand il occupe les mains sans prendre l'attention entière.
            </Text>
            <Text style={styles.stepPara}>
              Si tu remarques que ton attention est complètement partie dans l'objet, c'est qu'il est devenu l'activité au lieu de l'accompagner.
            </Text>
          </>
        )}

        {channel === 'gout' && (
          <>
            <Text style={styles.bigTitle}>Une question rapide.</Text>
            <Text style={styles.stepPara}>
              Cherches-tu une sensation, ou ton corps a-t-il réellement faim ou soif ?
            </Text>
            <View style={styles.list}>
              {(
                [
                  { key: 'sensation' as const, label: 'Une sensation' },
                  { key: 'besoin' as const,    label: "J'ai vraiment faim ou soif" },
                ]
              ).map(o => {
                const isSelected = step3BGoutChoice === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setStep3BGoutChoice(isSelected ? null : o.key)}
                    activeOpacity={0.75}>
                    <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                      {isSelected ? '✓ ' : ''}{o.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {step3BGoutChoice === 'besoin' && (
              <FadeInDelayed delay={0} style={{ marginTop: 14 }}>
                <Text style={styles.stepPara}>
                  Alors commence par ça. Le manque de ressources et le manque de stimulation produisent une agitation très semblable.
                </Text>
              </FadeInDelayed>
            )}
          </>
        )}

        {(channel === 'vision' || channel === undefined) && (
          <>
            <Text style={styles.bigTitle}>Un changement perceptible, pas une réorganisation.</Text>
            <Text style={styles.stepPara}>
              Le but n'est pas de redécorer la pièce. C'est de produire un changement visible et limité.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 20 }]}
          onPress={goToStep4}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3C = () => (
    <View>
      <Text style={styles.bigTitle}>Ton cerveau veut peut-être découvrir quelque chose.</Text>
      <Text style={styles.stepPara}>
        Ça ne veut pas dire commencer un nouveau projet, acheter du matériel ou réorganiser ta vie.
      </Text>
      <Text style={styles.subIntro}>Quel type de nouveauté ?</Text>
      <View style={styles.list}>
        {STEP3C_TYPES.map(t => {
          const isSelected =
            filterCriteria?.category === 'nouveaute' && filterCriteria.subtype === t.subtype;
          return (
            <TouchableOpacity
              key={t.subtype}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() =>
                setFilterCriteria(isSelected ? null : { category: 'nouveaute', subtype: t.subtype })
              }
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filterCriteria?.category === 'nouveaute' && (
        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 20 }]}
          onPress={handleStep3CContinue}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      )}

      {!step3CForgottenOpen && (
        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => setStep3CForgottenOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}>
          <Text style={styles.skipLinkText}>
            Il y a une chose que j'aimais et que je ne fais plus
          </Text>
        </TouchableOpacity>
      )}

      {step3CForgottenOpen && (
        <FadeInDelayed delay={0} style={{ marginTop: 12 }}>
          <TextInput
            style={styles.field}
            value={step3CForgotten}
            onChangeText={setStep3CForgotten}
            placeholder="ex : Je dessinais, j'avais un instrument, je lisais…"
            placeholderTextColor={C.primaryMuted}
            autoCapitalize="sentences"
            multiline
          />
          <Text style={styles.footnote}>Note-le ici, tu pourras le retrouver plus tard.</Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 4 }]}
            onPress={handleStep3CContinue}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </FadeInDelayed>
      )}
    </View>
  );

  const renderStep3D = () => (
    <View>
      <Text style={styles.bigTitle}>Tu n'as pas forcément besoin d'une soirée entière.</Text>
      <Text style={styles.stepPara}>Une présence courte suffit parfois.</Text>
      <Text style={styles.subIntro}>Quelle forme de contact ?</Text>
      <View style={styles.list}>
        {STEP3D_TYPES.map(t => {
          const isSelected =
            filterCriteria?.category === 'connexion' && filterCriteria.subtype === t.subtype;
          return (
            <TouchableOpacity
              key={t.subtype}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() =>
                setFilterCriteria(isSelected ? null : { category: 'connexion', subtype: t.subtype })
              }
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {filterCriteria?.category === 'connexion' && (
        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 20 }]}
          onPress={goToStep4}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      )}

      {!step3DHelperOpen && (
        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => setStep3DHelperOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}>
          <Text style={styles.skipLinkText}>
            J'ai besoin de présence mais je ne sais pas quoi écrire
          </Text>
        </TouchableOpacity>
      )}

      {step3DHelperOpen && (
        <FadeInDelayed delay={0} style={{ marginTop: 12 }}>
          <View style={styles.presetBox}>
            <Text selectable style={styles.presetText}>{PRESET_MESSAGE}</Text>
          </View>
          <Text style={styles.footnote}>Tu peux le copier tel quel.</Text>
        </FadeInDelayed>
      )}
    </View>
  );

  const renderStep3E = () => (
    <View>
      <Text style={styles.bigTitle}>Tu ne cherches pas forcément du plaisir.</Text>
      <Text style={styles.stepPara}>
        Tu veux sentir ton cerveau ou ton corps réellement engagé.
      </Text>
      <TouchableOpacity
        style={[styles.ctaBtn, { marginTop: 24 }]}
        onPress={goToStep4}
        activeOpacity={0.82}>
        <Text style={styles.ctaBtnText}>Voir des défis</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3F = () => {
    if (step3FSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>
            Tu peux faire cette tâche, mais ton attention ne reste pas avec elle.
          </Text>
          <Text style={styles.stepPara}>Qu'est-ce qui lui manque ?</Text>
          <View style={styles.list}>
            {STEP3F_LACKS.map(l => {
              const isSelected = step3FTaskLack === l.key;
              return (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => {
                    if (isSelected) {
                      setStep3FTaskLack(null);
                      setFilterCriteria(null);
                    } else {
                      setStep3FTaskLack(l.key);
                      setFilterCriteria({ category: 'tache', subtype: l.subtype });
                    }
                  }}
                  activeOpacity={0.75}>
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                    {isSelected ? '✓ ' : ''}{l.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.footnote}>
            La tâche n'a pas toujours besoin de devenir intéressante. Elle peut être accompagnée par quelque chose qui l'est.
          </Text>
          {step3FTaskLack && (
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 4 }]}
              onPress={() => setStep3FSub(2)}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.bigTitle}>Dernière vérification.</Text>
        <Text style={styles.stepPara}>Cette tâche est actuellement…</Text>
        <View style={styles.list}>
          {STEP3F_DIFFICULTIES.map(d => {
            const isSelected = step3FDifficulty === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.optionCard, isSelected && styles.optionCardActive]}
                onPress={() => setStep3FDifficulty(isSelected ? null : d.key)}
                activeOpacity={0.75}>
                <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                  {isSelected ? '✓ ' : ''}{d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {step3FDifficulty === 'trop_facile' && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.stepPara}>
              Alors on peut ajouter une contrainte : accélérer légèrement, viser un objectif, ou en faire un jeu.
            </Text>
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 4 }]}
              onPress={goToStep4}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          </FadeInDelayed>
        )}

        {step3FDifficulty === 'juste' && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.stepPara}>Alors une stimulation d'accompagnement devrait suffire.</Text>
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 4 }]}
              onPress={goToStep4}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          </FadeInDelayed>
        )}

        {step3FDifficulty === 'trop_dur' && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.stepPara}>
              Ce n'est peut-être pas un manque de stimulation. Quand une tâche est trop difficile, le problème ressemble davantage à un blocage qu'à de l'ennui.
            </Text>
            <Text style={styles.stepPara}>
              Le protocole « Je n'arrive plus à agir » est probablement plus adapté.
            </Text>
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 4 }]}
              onPress={goToParalyseFallback}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Aller vers ce protocole</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 10 }]}
              onPress={goToStep4}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Rester ici quand même</Text>
            </TouchableOpacity>
          </FadeInDelayed>
        )}
      </View>
    );
  };

  const renderStep3G = () => {
    if (step3GSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>
            Tu étais peut-être sur le point d'ouvrir quelque chose sans vraiment le décider.
          </Text>
          <Text style={styles.stepPara}>Que cherches-tu, en fait ?</Text>
          <View style={styles.list}>
            {STEP3G_SEARCHES.map(s => {
              const isSelected = step3GSearch === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => {
                    if (isSelected) {
                      setStep3GSearch(null);
                      setFilterCriteria(null);
                    } else {
                      setStep3GSearch(s.key);
                      setFilterCriteria(s.criteria);
                    }
                  }}
                  activeOpacity={0.75}>
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                    {isSelected ? '✓ ' : ''}{s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {step3GSearch === 'evitement' && (
            <FadeInDelayed delay={0} style={{ marginTop: 14 }}>
              <Text style={styles.stepPara}>
                Si c'est une tâche que tu repousses, le protocole « Je n'arrive plus à agir » est peut-être plus adapté.
              </Text>
              <TouchableOpacity
                style={styles.skipLink}
                onPress={goToParalyseFallback}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}>
                <Text style={styles.skipLinkText}>Aller vers ce protocole</Text>
              </TouchableOpacity>
            </FadeInDelayed>
          )}

          {step3GSearch && (
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 12 }]}
              onPress={() => setStep3GSub(2)}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    const hasRealCost = step3GCosts.some(c => c !== 'Rien de particulier');
    return (
      <View>
        <Text style={styles.bigTitle}>Avant de choisir.</Text>
        <Text style={styles.stepPara}>
          Qu'est-ce que cette stimulation risque de te demander après ?
        </Text>
        <View style={styles.list}>
          {STEP3G_COSTS.map(item => {
            const checked = step3GCosts.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.checkRow, checked && styles.checkRowActive]}
                onPress={() => setStep3GCosts(prev => toggleInArray(prev, item))}
                activeOpacity={0.75}>
                <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {hasRealCost && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.stepPara}>
              Tu n'as pas besoin d'y renoncer. Préparons juste la sortie avant qu'elle ne devienne invisible.
            </Text>
            <View style={styles.list}>
              {STEP3G_EXIT_STRATEGIES.map(s => {
                const isSelected = step3GExitStrategy === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setStep3GExitStrategy(isSelected ? null : s)}
                    activeOpacity={0.75}>
                    <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                      {isSelected ? '✓ ' : ''}{s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FadeInDelayed>
        )}

        <Text style={styles.footnote}>Tu gardes le choix. On ajoute juste une seconde de conscience.</Text>

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 4 }]}
          onPress={goToStep4}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3H = () => {
    if (step3HSub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>Ce qui ressemble le plus à ton état ?</Text>
          <View style={styles.list}>
            {step3HStates.map(s => {
              const isSelected = step3HState === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.optionCard, isSelected && styles.optionCardActive]}
                  onPress={() => setStep3HState(isSelected ? null : s.key)}
                  activeOpacity={0.75}>
                  <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                    {isSelected ? '✓ ' : ''}{s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {step3HState && (
            <TouchableOpacity
              style={[styles.ctaBtn, { marginTop: 20 }]}
              onPress={() => setStep3HSub(2)}
              activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    const hasResource = step3HResources.some(r => r !== 'Non, rien de tout ça');
    const state = step3HState;
    const isReposCase = state === 'plat' || state === 'epuise' || state === 'flou' || state === 'sais_pas';
    return (
      <View>
        <Text style={styles.bigTitle}>
          Le manque de stimulation et le manque de ressources produisent une agitation très semblable.
        </Text>
        <View style={styles.list}>
          {STEP3H_RESOURCES.map(item => {
            const checked = step3HResources.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.checkRow, checked && styles.checkRowActive]}
                onPress={() => setStep3HResources(prev => toggleInArray(prev, item))}
                activeOpacity={0.75}>
                <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {hasResource && (
          <Text style={styles.footnote}>Commence peut-être par là.</Text>
        )}

        {state === 'sature' && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.stepPara}>
              Ton cerveau a peut-être déjà reçu beaucoup de stimulation rapide aujourd'hui.
            </Text>
            <Text style={styles.stepPara}>
              Essaie quelque chose qui implique ton corps, ton environnement ou une autre personne — pas un écran de plus.
            </Text>
            <View style={styles.mutedList}>
              {STEP3H_SATURE_LIST.map(item => (
                <View key={item} style={styles.mutedItem}>
                  <Text style={styles.mutedBullet}>•</Text>
                  <Text style={styles.mutedText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {isReposCase && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.stepPara}>
              {accorder(
                "Tu n'as pas échoué à trouver la bonne activité.",
                "Tu n'as pas échoué à trouver la bonne activité.",
                "Ce n'est pas un échec à trouver la bonne activité.",
                genre
              )}
            </Text>
            <Text style={styles.stepPara}>
              Ton système manque peut-être de repos, de ressources ou de récupération.
            </Text>
            <View style={styles.mutedList}>
              {STEP3H_REPOS_LIST.map(item => (
                <View key={item} style={styles.mutedItem}>
                  <Text style={styles.mutedBullet}>•</Text>
                  <Text style={styles.mutedText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {state === 'anhedonie' && (
          <View style={[styles.warningBox, { marginTop: 20 }]}>
            <Text style={styles.warningTitle}>
              Ce que tu décris ressemble peut-être à quelque chose de plus profond qu'un besoin ponctuel de stimulation.
            </Text>
            <Text style={styles.warningText}>
              Une perte durable d'intérêt ou de plaisir — surtout avec de la tristesse, une grande fatigue, des changements de sommeil — mérite d'être regardée par un professionnel.
            </Text>
            <Text style={styles.warningTextSecondary}>
              Tu mérites une aide qui ne consiste pas seulement à chercher une nouvelle activité.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.ctaBtn, { marginTop: 20 }]}
          onPress={onComplete}
          activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3I = () => (
    <View>
      <Text style={styles.bigTitle}>Pas de souci.</Text>
      <Text style={styles.stepPara}>
        Une seule question : qu'est-ce qui te manque le plus, là ?
      </Text>
      <View style={styles.list}>
        {STEP3I_OPTIONS.map(o => {
          const isSelected = step3IChoice === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.optionCard, isSelected && styles.optionCardActive]}
              onPress={() => handleStep3IChoice(o.key, o.path)}
              activeOpacity={0.75}>
              <Text style={[styles.optionCardLabel, isSelected && styles.optionCardLabelActive]}>
                {isSelected ? '✓ ' : ''}{o.label}
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
      case 'H': return renderStep3H();
      case 'I': return renderStep3I();
    }
  };

  const renderBadge = (exitCost: StimExitCost) => {
    const boxStyle = [
      styles.badge,
      exitCost === 'absorbant' && styles.badgeAbsorbant,
      exitCost === 'limite_requise' && styles.badgeLimite,
    ];
    const textStyle = [
      styles.badgeText,
      exitCost === 'absorbant' && styles.badgeAbsorbantText,
      exitCost === 'limite_requise' && styles.badgeLimiteText,
    ];
    return (
      <View style={boxStyle}>
        <Text style={textStyle}>{EXIT_COST_LABEL[exitCost]}</Text>
      </View>
    );
  };

  const renderStep4 = () => {
    if (step4Sub === 1) {
      return (
        <View>
          <Text style={styles.bigTitle}>Qu'est-ce qui est possible maintenant ?</Text>
          <Text style={styles.stepPara}>Pour ne pas te proposer un truc impossible.</Text>
          <View style={styles.list}>
            {STEP4_CONSTRAINTS.map(c => {
              const checked = constraints.includes(c.key);
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.checkRow, checked && styles.checkRowActive]}
                  onPress={() => setConstraints(prev => toggleInArray(prev, c.key))}
                  activeOpacity={0.75}>
                  <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                    {checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 20 }]}
            onPress={handleGoToProposals}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 4.2 — Proposition
    if (currentProposals.length === 0) {
      return (
        <View>
          <Text style={styles.bigTitle}>Avec ces contraintes, je n'ai rien de pertinent à proposer.</Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 20 }]}
            onPress={() => setStep4Sub(1)}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Assouplir les contraintes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: 10 }]}
            onPress={() => advanceTo(5)}
            activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Passer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.bigTitle}>Voilà trois pistes.</Text>
        <Text style={styles.stepPara}>
          Teste-en une pendant trente secondes. Pas besoin de t'engager plus loin.
        </Text>
        {exhaustedNotice && (
          <Text style={styles.footnote}>
            Je recommence avec les mêmes pistes, le choix est limité avec ces contraintes.
          </Text>
        )}
        <View style={styles.list}>
          {currentProposals.map(a => {
            const isSelected = selectedActivity?.id === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.proposalCard, isSelected && styles.proposalCardActive]}
                onPress={() => setSelectedActivity(isSelected ? null : a)}
                activeOpacity={0.75}>
                <Text style={[styles.proposalLabel, isSelected && styles.proposalLabelActive]}>
                  {isSelected ? '✓ ' : ''}{a.label}
                </Text>
                {renderBadge(a.exitCost)}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedActivity && (
          <FadeInDelayed delay={0} style={{ marginTop: 18 }}>
            <Text style={styles.subIntro}>Ton cerveau accroche un peu plus ?</Text>
            <View style={styles.list}>
              {STEP4_FEEDBACK.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={styles.optionCard}
                  onPress={() => handleFeedback(f.key)}
                  activeOpacity={0.75}>
                  <Text style={styles.optionCardLabel}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </FadeInDelayed>
        )}

        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => advanceTo(5)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}>
          <Text style={styles.skipLinkText}>Aucune ne me parle</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep5 = () => {
    const hasPicked = pickedActivity !== null;
    const heavyExit =
      hasPicked &&
      (pickedActivity!.exitCost === 'absorbant' || pickedActivity!.exitCost === 'limite_requise');

    if (hasPicked) {
      return (
        <View style={styles.centered}>
          <Text style={styles.narrativeBig}>Tu as trouvé une prise.</Text>
          <FadeInDelayed delay={2000}>
            <Text style={styles.narrativeSub}>
              Une stimulation utile te rend plus {accorder('présent', 'présente', 'présent à ce que tu fais', genre)}. Une distraction automatique te fait souvent disparaître de ce que tu étais en train de vivre.
            </Text>
          </FadeInDelayed>
          {heavyExit && (
            <Text style={styles.footnote}>Rappelle-toi la sortie que tu avais prévue.</Text>
          )}
          <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <Text style={styles.narrativeBig}>Ça arrive.</Text>
        <FadeInDelayed delay={2000}>
          <Text style={styles.narrativeSub}>
            Ton cerveau ne réclame pas forcément « plus ». Il réclame peut-être un type précis de stimulation qui n'est pas disponible là, maintenant.
          </Text>
        </FadeInDelayed>
        <Text style={styles.footnote}>Tu peux revenir quand le contexte aura changé.</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    );
  };

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

  // Generic step titles
  bigTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    lineHeight: 30,
    marginTop: 8,
    marginBottom: 12,
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

  // CTA
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

  // Footnote (small, italic, muted, centered)
  footnote: {
    fontSize: 12,
    color: C.textSub,
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Page-style paragraph (left-aligned, muted)
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
    textAlign: 'center',
  },

  // Step 3D — preset message box (fond teinté, texte sélectionnable)
  presetBox: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.primaryMuted,
  },
  presetText: {
    fontSize: 15,
    color: C.text,
    lineHeight: 22,
  },

  // Checkbox rows (Step 3G costs + Step 3H resources)
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

  // Muted non-interactive list (Step 3H suggestions)
  mutedList: {
    marginTop: 6,
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

  // Step 4.2 — proposal card (activité proposée avec badge exitCost)
  proposalCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  proposalCardActive: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  proposalLabel: { fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 20 },
  proposalLabelActive: { color: C.primary },

  // Step 4.2 — badge exitCost (visuel léger, plus soutenu si absorbant/limite)
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#F1F0F5',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  badgeAbsorbant: { backgroundColor: '#FEF3C7' },
  badgeAbsorbantText: { color: '#92400E' },
  badgeLimite: { backgroundColor: '#FED7AA' },
  badgeLimiteText: { color: '#9A3412' },

  // Step 3H — encadré sécurité pour l'anhédonie (visuellement distinct)
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78350F',
    lineHeight: 22,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    marginBottom: 10,
  },
  warningTextSecondary: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
