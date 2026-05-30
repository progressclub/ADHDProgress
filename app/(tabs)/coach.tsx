import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Modal,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SaturationFlow from '@/components/SaturationFlow';
import SaturationDiscovery from '@/components/SaturationDiscovery';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2;
type TimeChoice = 'Mode Express' | 'Mode Découverte' | null;

// ─── Colors ───────────────────────────────────────────────────────────────────

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

// ─── Emotion data ─────────────────────────────────────────────────────────────

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
    accroche: "Mes pensées s'emballent.",
    points: [
      "Mes pensées s'emballent et je n'arrive pas à les arrêter.",
      'J\'ai du mal à me concentrer sur une seule chose à la fois.',
      "Mon corps est tendu, comme en état d'alerte permanent.",
      'Je ressens une inquiétude diffuse même sans raison précise.',
      "J'anticipe le pire et j'ai du mal à me rassurer.",
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
      "Le temps défile sans que je m'en rende compte.",
      "J'ai du mal à m'arrêter même quand je le devrais.",
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
      "Mon cerveau reçoit trop d'informations en même temps.",
      "J'ai l'impression que mes pensées s'accumulent sans pouvoir les trier.",
      'Les bruits, les sollicitations, tout me semble trop fort.',
      "Je deviens irritable pour des choses qui normalement ne m'affectent pas.",
      "Je ressens une fatigue qui vient de l'intérieur, pas juste physique.",
      "Je n'arrive plus à décider ce qui est prioritaire.",
    ],
    cta: 'Que faire de ma saturation ?',
  },
  {
    key: 'paralysie',
    label: 'Je me sens paralysé',
    accroche: "Je n'arrive plus à agir.",
    points: [
      "Je sais ce que j'ai à faire mais je n'arrive pas à commencer.",
      'Mon corps et mon esprit semblent figés, comme bloqués.',
      "J'évite les tâches même quand elles sont simples.",
      'Je me sens coupable de ne rien faire mais ça ne change rien.',
      'Chaque action me semble demander un effort disproportionné.',
      "J'ai l'impression d'être spectateur de ma propre immobilité.",
    ],
    cta: 'Que faire de ma paralysie ?',
  },
  {
    key: 'hyperstimulation',
    label: "J'ai besoin d'intensité",
    accroche: "J'ai besoin d'intensité.",
    points: [
      "Je m'ennuie profondément et cet ennui est presque douloureux.",
      "J'ai envie de quelque chose de nouveau, de stimulant, maintenant.",
      'Je prends des décisions impulsives pour ressentir quelque chose.',
      'J\'ai du mal à rester en place, mon corps veut bouger.',
      'Je cherche de la dopamine sans vraiment savoir où la trouver.',
      "Je saute d'une idée à l'autre sans réussir à me fixer.",
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
      "La peur d'être rejeté ou mal compris est très présente en moi.",
      'Ma colère ou ma tristesse arrivent vite et sont difficiles à contenir.',
      "J'ai du mal à raisonner quand je suis dans cet état.",
      'Mes émotions semblent plus fortes que moi.',
    ],
    cta: 'Que faire de ma tempête émotionnelle ?',
  },
  {
    key: 'alignement',
    label: 'Je me sens aligné',
    accroche: 'Je me sens fluide.',
    points: [
      "Mes pensées sont claires et je sais où j'en suis.",
      'Je me sens motivé naturellement, sans avoir à me forcer.',
      'Mes émotions sont stables et je me sens ancré.',
      "Mon énergie est fluide, je passe d'une chose à l'autre sans friction.",
      'Ma créativité fonctionne bien et les idées viennent facilement.',
      'Je me sens capable de prioriser et d\'agir.',
    ],
    cta: 'Profiter de mon alignement ?',
  },
];

// ─── Carousel data ────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get('window');
const PEEK = 18;
const CARD_W = SW - 2 * PEEK;

type CarouselMeta = { mainWord: string; gradient: [string, string] };
type CarouselItem = EmotionData & CarouselMeta;

const CAROUSEL_META: Record<string, CarouselMeta> = {
  saturation:      { mainWord: 'saturé·e',       gradient: ['#F2D4C2', '#E8C4A8'] },
  paralysie:       { mainWord: 'paralysé·e',      gradient: ['#C8D8E8', '#B8C8DC'] },
  anxieux:         { mainWord: 'anxieux·se',      gradient: ['#D4C8E0', '#C4B8D4'] },
  hyperfocus:      { mainWord: 'en hyperfocus',   gradient: ['#C8DDD0', '#B8CEC0'] },
  hyperstimulation:{ mainWord: 'hyperstimulé·e', gradient: ['#E8D8B8', '#DCC8A4'] },
  tempete:         { mainWord: 'en tempête',      gradient: ['#E0C8C8', '#D4B8B8'] },
  alignement:      { mainWord: 'aligné·e',        gradient: ['#D0DCC8', '#C0CEB8'] },
};

const CAROUSEL_ORDER = [
  'saturation', 'paralysie', 'anxieux', 'hyperfocus',
  'hyperstimulation', 'tempete', 'alignement',
];

const CAROUSEL_CARDS: CarouselItem[] = CAROUSEL_ORDER.map(key => ({
  ...EMOTIONS.find(e => e.key === key)!,
  ...CAROUSEL_META[key],
}));

// ─── CarouselCard ─────────────────────────────────────────────────────────────

function CarouselCard({ card, onCta }: { card: CarouselItem; onCta: () => void }) {
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const ctaShown = useRef(false);
  const containerH = useRef(0);
  const contentH = useRef(0);

  const showCta = () => {
    if (ctaShown.current) return;
    ctaShown.current = true;
    Animated.timing(ctaAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const checkReveal = (offsetY = 0) => {
    if (containerH.current === 0 || contentH.current === 0) return;
    if (offsetY + containerH.current >= contentH.current - 20) showCta();
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    checkReveal(e.nativeEvent.contentOffset.y);
  };

  return (
    <LinearGradient
      colors={card.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={cs.card}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={e => { containerH.current = e.nativeEvent.layout.height; checkReveal(); }}
        onContentSizeChange={(_, h) => { contentH.current = h; checkReveal(); }}
        contentContainerStyle={cs.cardScroll}>
        <Text style={cs.cardIntro}>{'Je me sens'}</Text>
        <Text style={cs.cardMainWord}>{card.mainWord}</Text>
        <View style={cs.pointsList}>
          {card.points.map((pt, i) => (
            <View key={i} style={cs.pointRow}>
              <Text style={cs.pointBullet}>{'•'}</Text>
              <Text style={cs.pointText}>{pt}</Text>
            </View>
          ))}
        </View>
        <Animated.View style={{ opacity: ctaAnim, marginTop: 20, marginBottom: 8 }}>
          <TouchableOpacity style={cs.ctaCardBtn} onPress={onCta} activeOpacity={0.8}>
            <Text style={cs.ctaCardBtnText}>{card.cta}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── DiscoveryCarousel ────────────────────────────────────────────────────────

function DiscoveryCarousel({ onCta }: { onCta: (key: string) => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= CAROUSEL_CARDS.length) return;
    scrollRef.current?.scrollTo({ x: idx * CARD_W, animated: true });
    setActiveIdx(idx);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setActiveIdx(Math.round(x / CARD_W));
  };

  return (
    <View style={cs.discoveryWrap}>
      {/* Header */}
      <Text style={cs.discoveryTitle}>{'Découverte'}</Text>
      <Text style={cs.discoverySub}>{'Swipe pour explorer les modes →'}</Text>

      {/* Carousel */}
      <View style={cs.carouselContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: PEEK }}>
          {CAROUSEL_CARDS.map(card => (
            <View key={card.key} style={{ width: CARD_W, flex: 1 }}>
              <CarouselCard card={card} onCta={() => onCta(card.key)} />
            </View>
          ))}
        </ScrollView>

        {/* Arrow gauche */}
        {activeIdx > 0 && (
          <TouchableOpacity
            style={[cs.arrow, cs.arrowLeft]}
            onPress={() => goTo(activeIdx - 1)}
            activeOpacity={0.6}
            hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}>
            <Text style={cs.arrowText}>{'‹'}</Text>
          </TouchableOpacity>
        )}

        {/* Arrow droite */}
        {activeIdx < CAROUSEL_CARDS.length - 1 && (
          <TouchableOpacity
            style={[cs.arrow, cs.arrowRight]}
            onPress={() => goTo(activeIdx + 1)}
            activeOpacity={0.6}
            hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}>
            <Text style={cs.arrowText}>{'›'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dots */}
      <View style={cs.dotsRow}>
        {CAROUSEL_CARDS.map((_, i) => (
          <View key={i} style={[cs.dot, i === activeIdx && cs.dotActive]} />
        ))}
      </View>
    </View>
  );
}

// ─── EmotionCard (accordion — Mode Express) ───────────────────────────────────

function EmotionCard({
  label, accroche, points, cta, expanded, onPress, onCta,
}: {
  label: string; accroche: string; points: string[]; cta: string;
  expanded: boolean; onPress: () => void; onCta: () => void;
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

  const maxHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 400] });
  const opacity = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={[styles.cardChevron, expanded && styles.cardChevronOpen]}>{'›'}</Text>
      </TouchableOpacity>
      <Animated.View style={{ maxHeight, overflow: 'hidden', opacity }}>
        <View style={styles.expandPanel}>
          <Text style={styles.expandAccroche}>{accroche}</Text>
          <View style={styles.expandPointsList}>
            {points.map((point, i) => (
              <View key={i} style={styles.expandPointRow}>
                <Text style={styles.expandBullet}>{'•'}</Text>
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

// ─── CoachScreen ──────────────────────────────────────────────────────────────

export default function CoachScreen() {
  const [step, setStep] = useState<Step>(1);
  const [timeChoice, setTimeChoice] = useState<TimeChoice>(null);
  const [openEmotion, setOpenEmotion] = useState<string | null>(null);
  const [showFlow, setShowFlow] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);

  const handleTimeChoice = (choice: Exclude<TimeChoice, null>) => {
    setTimeChoice(choice);
    setStep(2);
  };

  const handleCta = (key: string) => {
    if (key === 'saturation' && timeChoice) {
      if (timeChoice === 'Mode Express') setShowFlow(true);
      else setShowDiscovery(true);
    }
  };

  const isDiscovery = step === 2 && timeChoice === 'Mode Découverte';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Mode Express / Étape 1 ── */}
      {!isDiscovery && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {step === 1 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepQuestion}>{'Combien de temps avez-vous ?'}</Text>
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => handleTimeChoice('Mode Express')}
                  activeOpacity={0.82}>
                  <Text style={styles.timeBtnText}>{'Mode Express'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => handleTimeChoice('Mode Découverte')}
                  activeOpacity={0.82}>
                  <Text style={styles.timeBtnText}>{'Mode Découverte'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && timeChoice === 'Mode Express' && (
            <View style={styles.stepWrap}>
              <TouchableOpacity
                onPress={() => { setStep(1); setOpenEmotion(null); }}
                style={styles.backBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.65}>
                <Text style={styles.backText}>{'‹ Retour'}</Text>
              </TouchableOpacity>
              <Text style={styles.stepQuestion}>{'Comment vous sentez-vous ?'}</Text>
              <Text style={styles.stepSub}>{'Mode Express'}</Text>
              <View style={styles.cardsWrap}>
                {EMOTIONS.map(e => (
                  <EmotionCard
                    key={e.key}
                    label={e.label}
                    accroche={e.accroche}
                    points={e.points}
                    cta={e.cta}
                    expanded={openEmotion === e.key}
                    onPress={() => setOpenEmotion(prev => prev === e.key ? null : e.key)}
                    onCta={() => handleCta(e.key)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Mode Découverte — carrousel ── */}
      {isDiscovery && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() => { setStep(1); setOpenEmotion(null); }}
            style={styles.backBtnDiscovery}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.65}>
            <Text style={styles.backText}>{'‹ Retour'}</Text>
          </TouchableOpacity>
          <DiscoveryCarousel onCta={handleCta} />
        </View>
      )}

      {/* ── Modals ── */}
      <Modal visible={showFlow} animationType="slide" onRequestClose={() => setShowFlow(false)}>
        {timeChoice && (
          <SaturationFlow
            timeChoice={timeChoice}
            onComplete={() => { setShowFlow(false); setStep(1); setOpenEmotion(null); }}
          />
        )}
      </Modal>

      <Modal visible={showDiscovery} animationType="slide" onRequestClose={() => setShowDiscovery(false)}>
        <SaturationDiscovery
          onBack={() => setShowDiscovery(false)}
          onExpressFlow={() => {
            setShowDiscovery(false);
            setTimeChoice('Mode Express');
            setShowFlow(true);
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles — carousel ────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  discoveryWrap: {
    flex: 1,
    paddingTop: 8,
  },
  discoveryTitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 4,
  },
  discoverySub: {
    fontSize: 11,
    color: '#BBBBBB',
    textAlign: 'center',
    marginBottom: 14,
  },
  carouselContainer: {
    flex: 1,
    position: 'relative',
  },
  // Card
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardScroll: {
    padding: 24,
    paddingBottom: 32,
  },
  cardIntro: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#4A3830',
    marginBottom: 6,
  },
  cardMainWord: {
    fontFamily: 'Georgia',
    fontSize: 42,
    fontWeight: '600',
    color: '#2A1A0A',
    lineHeight: 50,
    marginBottom: 24,
  },
  pointsList: {
    gap: 10,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pointBullet: {
    fontSize: 14,
    color: '#5A4030',
    lineHeight: 22,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    color: '#3A2818',
    lineHeight: 22,
  },
  ctaCardBtn: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  ctaCardBtnText: {
    color: '#7C6CF2',
    fontSize: 14,
    fontWeight: '600',
  },
  // Arrows
  arrow: {
    position: 'absolute',
    top: '40%',
    width: 36,
    height: 56,
    justifyContent: 'center',
  },
  arrowLeft: {
    left: 2,
    alignItems: 'flex-start',
  },
  arrowRight: {
    right: 2,
    alignItems: 'flex-end',
  },
  arrowText: {
    fontSize: 28,
    color: '#F5F0E8',
    opacity: 0.7,
  },
  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D0CCCC',
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C6CF2',
  },
});

// ─── Styles — shared ──────────────────────────────────────────────────────────

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

  // Time buttons
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

  // Back buttons
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backBtnDiscovery: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: C.primary,
    fontWeight: '600',
  },

  // Accordion cards
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
