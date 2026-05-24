import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SaturationFlow from '@/components/SaturationFlow';

type Step = 1 | 2;
type TimeChoice = 'Mode Express' | 'Mode Découverte' | null;

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

type EmotionData = {
  key: string;
  label: string;
  accroche: string;
  points: string[];
  cta: string;
};

const EMOTIONS: EmotionData[] = [
  {
    key: 'anxieux',
    label: 'Je me sens anxieux',
    accroche: 'Mes pensées s\'emballent.',
    points: [
      'Mes pensées s\'emballent et je n\'arrive pas à les arrêter.',
      'J\'ai du mal à me concentrer sur une seule chose à la fois.',
      'Mon corps est tendu, comme en état d\'alerte permanent.',
      'Je ressens une inquiétude diffuse même sans raison précise.',
      'J\'anticipe le pire et j\'ai du mal à me rassurer.',
      'Je me sens agité, incapable de vraiment me poser.',
    ],
    cta: 'Que faire de mon anxiété ?',
  },
  {
    key: 'hyperfocus',
    label: 'Je me sens hyperfocus',
    accroche: 'Je suis dans ma bulle.',
    points: [
      'Je suis complètement absorbé par ce que je fais.',
      'Le temps défile sans que je m\'en rende compte.',
      'J\'ai du mal à m\'arrêter même quand je le devrais.',
      'Tout ce qui est en dehors de ma tâche disparaît de mon radar.',
      'Je peux oublier de manger, de bouger, de répondre aux autres.',
      'Je me sens dans ma bulle, presque intouchable.',
    ],
    cta: 'Que faire de mon hyperfocus ?',
  },
  {
    key: 'saturation',
    label: 'Je suis en train de saturer',
    accroche: 'Mon cerveau est plein.',
    points: [
      'Mon cerveau reçoit trop d\'informations en même temps.',
      'J\'ai l\'impression que mes pensées s\'accumulent sans pouvoir les trier.',
      'Les bruits, les sollicitations, tout me semble trop fort.',
      'Je deviens irritable pour des choses qui normalement ne m\'affectent pas.',
      'Je ressens une fatigue qui vient de l\'intérieur, pas juste physique.',
      'Je n\'arrive plus à décider ce qui est prioritaire.',
    ],
    cta: 'Que faire de ma saturation ?',
  },
  {
    key: 'paralysie',
    label: 'Je me sens paralysé',
    accroche: 'Je n\'arrive plus à agir.',
    points: [
      'Je sais ce que j\'ai à faire mais je n\'arrive pas à commencer.',
      'Mon corps et mon esprit semblent figés, comme bloqués.',
      'J\'évite les tâches même quand elles sont simples.',
      'Je me sens coupable de ne rien faire mais ça ne change rien.',
      'Chaque action me semble demander un effort disproportionné.',
      'J\'ai l\'impression d\'être spectateur de ma propre immobilité.',
    ],
    cta: 'Que faire de ma paralysie ?',
  },
  {
    key: 'hyperstimulation',
    label: 'J\'ai besoin d\'intensité',
    accroche: 'J\'ai besoin d\'intensité.',
    points: [
      'Je m\'ennuie profondément et cet ennui est presque douloureux.',
      'J\'ai envie de quelque chose de nouveau, de stimulant, maintenant.',
      'Je prends des décisions impulsives pour ressentir quelque chose.',
      'J\'ai du mal à rester en place, mon corps veut bouger.',
      'Je cherche de la dopamine sans vraiment savoir où la trouver.',
      'Je saute d\'une idée à l\'autre sans réussir à me fixer.',
    ],
    cta: 'Que faire de mon hyperstimulation ?',
  },
  {
    key: 'tempete',
    label: 'Mes émotions prennent toute la place',
    accroche: 'Mes émotions sont plus fortes que ma logique.',
    points: [
      'Je ressens les choses beaucoup plus fort que la situation ne le justifie.',
      'Une remarque anodine peut me toucher comme une vraie blessure.',
      'La peur d\'être rejeté ou mal compris est très présente en moi.',
      'Ma colère ou ma tristesse arrivent vite et sont difficiles à contenir.',
      'J\'ai du mal à raisonner quand je suis dans cet état.',
      'Mes émotions semblent plus fortes que moi.',
    ],
    cta: 'Que faire de ma tempête émotionnelle ?',
  },
  {
    key: 'alignement',
    label: 'Je me sens aligné',
    accroche: 'Je me sens fluide.',
    points: [
      'Mes pensées sont claires et je sais où j\'en suis.',
      'Je me sens motivé naturellement, sans avoir à me forcer.',
      'Mes émotions sont stables et je me sens ancré.',
      'Mon énergie est fluide, je passe d\'une chose à l\'autre sans friction.',
      'Ma créativité fonctionne bien et les idées viennent facilement.',
      'Je me sens capable de prioriser et d\'agir.',
    ],
    cta: 'Profiter de mon alignement ?',
  },
];

function EmotionCard({
  label,
  accroche,
  points,
  cta,
  expanded,
  onPress,
  onCta,
}: {
  label: string;
  accroche: string;
  points: string[];
  cta: string;
  expanded: boolean;
  onPress: () => void;
  onCta: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const prevExpanded = useRef(expanded);

  if (prevExpanded.current !== expanded) {
    prevExpanded.current = expanded;
    Animated.spring(anim, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    }).start();
  }

  // maxHeight avoids relying on fixed height — content wraps freely
  const maxHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 400],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onPress}
        activeOpacity={0.75}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={[styles.cardChevron, expanded && styles.cardChevronOpen]}>›</Text>
      </TouchableOpacity>

      <Animated.View style={{ maxHeight, overflow: 'hidden', opacity }}>
        <View style={styles.expandPanel}>
          <Text style={styles.expandAccroche}>{accroche}</Text>
          <View style={styles.expandPointsList}>
            {points.map((point, i) => (
              <View key={i} style={styles.expandPointRow}>
                <Text style={styles.expandBullet}>•</Text>
                <Text style={styles.expandPoints}>{point}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.ctaBtn} onPress={onCta} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>{cta}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

export default function CoachScreen() {
  const [step, setStep] = useState<Step>(1);
  const [timeChoice, setTimeChoice] = useState<TimeChoice>(null);
  const [openEmotion, setOpenEmotion] = useState<string | null>(null);
  const [showFlow, setShowFlow] = useState(false);

  const handleTimeChoice = (choice: Exclude<TimeChoice, null>) => {
    setTimeChoice(choice);
    setStep(2);
  };

  const handleEmotionPress = (key: string) => {
    setOpenEmotion(prev => (prev === key ? null : key));
  };

  const handleCta = (key: string) => {
    if (key === 'saturation' && timeChoice) {
      setShowFlow(true);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Étape 1 ── */}
        {step === 1 && (
          <View style={styles.stepWrap}>
            <Text style={styles.stepQuestion}>Combien de temps avez-vous ?</Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => handleTimeChoice('Mode Express')}
                activeOpacity={0.82}>
                <Text style={styles.timeBtnText}>Mode Express</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => handleTimeChoice('Mode Découverte')}
                activeOpacity={0.82}>
                <Text style={styles.timeBtnText}>Mode Découverte</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Étape 2 ── */}
        {step === 2 && (
          <View style={styles.stepWrap}>
            <TouchableOpacity
              onPress={() => { setStep(1); setOpenEmotion(null); }}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.65}>
              <Text style={styles.backText}>‹ Retour</Text>
            </TouchableOpacity>

            <Text style={styles.stepQuestion}>Comment vous sentez-vous ?</Text>
            <Text style={styles.stepSub}>{timeChoice}</Text>

            <View style={styles.cardsWrap}>
              {EMOTIONS.map(e => (
                <EmotionCard
                  key={e.key}
                  label={e.label}
                  accroche={e.accroche}
                  points={e.points}
                  cta={e.cta}
                  expanded={openEmotion === e.key}
                  onPress={() => handleEmotionPress(e.key)}
                  onCta={() => handleCta(e.key)}
                />
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      <Modal
        visible={showFlow}
        animationType="slide"
        onRequestClose={() => setShowFlow(false)}>
        {timeChoice && (
          <SaturationFlow
            timeChoice={timeChoice}
            onComplete={() => {
              setShowFlow(false);
              setStep(1);
              setOpenEmotion(null);
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },

  // Steps
  stepWrap: {
    flex: 1,
    alignItems: 'center',
  },
  stepQuestion: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  stepSub: {
    fontSize: 14,
    color: C.textSub,
    marginTop: -20,
    marginBottom: 28,
    fontWeight: '500',
  },

  // Step 1 — time buttons
  timeRow: {
    gap: 14,
    width: '100%',
  },
  timeBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  timeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Back button
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: C.primary,
    fontWeight: '600',
  },

  // Step 2 — emotion cards
  cardsWrap: {
    width: '100%',
    gap: 14,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  cardChevron: {
    fontSize: 22,
    color: C.primaryMuted,
    transform: [{ rotate: '0deg' }],
    marginLeft: 8,
  },
  cardChevronOpen: {
    transform: [{ rotate: '90deg' }],
  },

  // Expand panel
  expandPanel: {
    backgroundColor: C.expandBg,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 16,
  },
  expandAccroche: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 10,
  },
  expandPointsList: {
    marginBottom: 14,
    gap: 6,
  },
  expandPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  expandBullet: {
    fontSize: 14,
    color: C.primaryMuted,
    lineHeight: 22,
    marginTop: 0,
  },
  expandPoints: {
    flex: 1,
    fontSize: 14,
    color: C.textSub,
    lineHeight: 22,
  },
  ctaBtn: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  ctaBtnText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
