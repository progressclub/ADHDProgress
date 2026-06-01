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

// ─── Carousel dimensions ──────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');
const PEEK = 22;
const CARD_W = SW - 2 * PEEK;
const CARD_H = Math.max(380, Math.min(Math.round(SH * 0.64), 550));

// ─── Carousel metadata ────────────────────────────────────────────────────────

type CarouselMeta = { mainWord: string; gradient: string[] };
type CarouselItem = EmotionData & CarouselMeta;

const CAROUSEL_META: Record<string, CarouselMeta> = {
  saturation:      { mainWord: 'saturé·e',       gradient: ['#FDE8D2', '#F5CFA8', '#EBB884'] },
  paralysie:       { mainWord: 'paralysé·e',      gradient: ['#D8E9F5', '#BECFE8', '#A8BDD8'] },
  anxieux:         { mainWord: 'anxieux·se',      gradient: ['#EDE0F5', '#DDD0EE', '#CCC0E4'] },
  hyperfocus:      { mainWord: 'en hyperfocus',   gradient: ['#CBE8D8', '#B5D8C8', '#9EC8B4'] },
  hyperstimulation:{ mainWord: 'hyperstimulé·e', gradient: ['#FEF0C2', '#FBE0A0', '#F5CC7A'] },
  tempete:         { mainWord: 'en tempête',      gradient: ['#F5D4D4', '#EAC0C0', '#DEACAC'] },
  alignement:      { mainWord: 'aligné·e',        gradient: ['#DCE9D4', '#C8D8C0', '#B4C9AB'] },
};

const CAROUSEL_ORDER = [
  'saturation', 'paralysie', 'anxieux', 'hyperfocus',
  'hyperstimulation', 'tempete', 'alignement',
];

const CAROUSEL_CARDS: CarouselItem[] = CAROUSEL_ORDER.map(key => ({
  ...EMOTIONS.find(e => e.key === key)!,
  ...CAROUSEL_META[key],
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mainWordFontSize(word: string): number {
  if (word.length <= 8) return 66;
  if (word.length <= 12) return 56;
  return 46;
}

// ─── CarouselCard ─────────────────────────────────────────────────────────────

function CarouselCard({ card, onCta }: { card: CarouselItem; onCta: () => void }) {
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const ctaShown = useRef(false);
  const containerH = useRef(0);
  const contentH = useRef(0);

  const showCta = () => {
    if (ctaShown.current) return;
    ctaShown.current = true;
    Animated.timing(ctaAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  };

  const checkReveal = (offsetY = 0) => {
    if (containerH.current === 0 || contentH.current === 0) return;
    if (offsetY + containerH.current >= contentH.current - 24) showCta();
  };

  const wordSize = mainWordFontSize(card.mainWord);

  return (
    <LinearGradient
      colors={card.gradient as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.25, y: 1 }}
      style={cs.card}>

      {/* Halos décoratifs */}
      <View style={cs.cardHalo} />
      <View style={cs.cardHalo2} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => checkReveal(e.nativeEvent.contentOffset.y)}
        onLayout={e => { containerH.current = e.nativeEvent.layout.height; checkReveal(); }}
        onContentSizeChange={(_, h) => { contentH.current = h; checkReveal(); }}
        contentContainerStyle={cs.cardScroll}>

        {/* Zone 1 — en-tête émotionnel */}
        <Text style={cs.cardIntro}>{'Je me sens'}</Text>
        <Text style={[cs.cardMainWord, { fontSize: wordSize, lineHeight: Math.round(wordSize * 1.06) }]}>
          {card.mainWord}
        </Text>

        {/* Zone 2 — accroche */}
        <View style={cs.accrocheWrap}>
          <Text style={cs.accrocheText}>{card.accroche}</Text>
        </View>

        {/* Zone 3 — ressentis */}
        <View style={cs.pointsList}>
          {card.points.map((pt, i) => (
            <View key={i} style={cs.pointRow}>
              <Text style={cs.pointBullet}>{'–'}</Text>
              <Text style={cs.pointText}>{pt}</Text>
            </View>
          ))}
        </View>

        {/* Zone 4 — CTA fade-in */}
        <Animated.View style={[cs.ctaWrap, { opacity: ctaAnim }]}>
          <TouchableOpacity style={cs.ctaCardBtn} onPress={onCta} activeOpacity={0.8}>
            <Text style={cs.ctaCardBtnText}>{card.cta}</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </LinearGradient>
  );
}

// ─── DiscoveryCarousel ────────────────────────────────────────────────────────

function DiscoveryCarousel({ onCta, onBack }: { onCta: (key: string) => void; onBack: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIdx, setActiveIdx] = useState(0);

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= CAROUSEL_CARDS.length) return;
    scrollRef.current?.scrollTo({ x: idx * CARD_W, animated: true });
    setActiveIdx(idx);
  };

  return (
    <View style={cs.discoveryWrap}>

      {/* ── Header ── */}
      <View style={cs.discoveryHeader}>
        <TouchableOpacity
          onPress={onBack}
          style={cs.discoveryBackBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.65}>
          <Text style={cs.discoveryBackText}>{'‹ Retour'}</Text>
        </TouchableOpacity>
        <View style={cs.discoveryTitleWrap}>
          <Text style={cs.discoveryTitleText}>{'Découverte'}</Text>
          <Text style={cs.discoverySubText}>{'Explore les modes internes, un par un'}</Text>
        </View>
      </View>

      {/* ── Carousel ── */}
      <View style={cs.carouselContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={e => {
            setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / CARD_W));
          }}
          contentContainerStyle={{ paddingHorizontal: PEEK }}>
          {CAROUSEL_CARDS.map((card, i) => {
            const inputRange = [(i - 1) * CARD_W, i * CARD_W, (i + 1) * CARD_W];
            const scale = scrollX.interpolate({ inputRange, outputRange: [0.93, 1, 0.93], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.60, 1, 0.60], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={card.key}
                style={[cs.cardWrapper, { transform: [{ scale }], opacity }]}>
                <CarouselCard card={card} onCta={() => onCta(card.key)} />
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Pagination ── */}
      <View style={cs.dotsRow}>
        {CAROUSEL_CARDS.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => goTo(i)}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            activeOpacity={0.6}>
            <View style={[cs.dot, i === activeIdx && cs.dotActive]} />
          </TouchableOpacity>
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
        <DiscoveryCarousel
          onCta={handleCta}
          onBack={() => { setStep(1); setOpenEmotion(null); }}
        />
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

  // ── Wrap ────────────────────────────────────────────────────────────────────
  discoveryWrap: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  discoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
    gap: 12,
  },
  discoveryBackBtn: {
    paddingVertical: 6,
    paddingRight: 4,
  },
  discoveryBackText: {
    fontSize: 16,
    color: '#7B61FF',
    fontWeight: '600',
  },
  discoveryTitleWrap: {
    flex: 1,
  },
  discoveryTitleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1733',
    letterSpacing: -0.4,
  },
  discoverySubText: {
    fontSize: 12,
    color: '#8B879A',
    marginTop: 2,
    letterSpacing: 0.1,
  },

  // ── Carousel container ───────────────────────────────────────────────────────
  carouselContainer: {
    height: CARD_H,
  },

  // ── Card wrapper (porte l'ombre + la scale animation) ───────────────────────
  cardWrapper: {
    width: CARD_W,
    height: CARD_H,
    shadowColor: '#3D2880',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    borderRadius: 40,
    overflow: 'hidden',
  },

  // ── Halos décoratifs ────────────────────────────────────────────────────────
  cardHalo: {
    position: 'absolute',
    top: -90,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  cardHalo2: {
    position: 'absolute',
    bottom: -70,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },

  // ── Contenu de la carte ─────────────────────────────────────────────────────
  cardScroll: {
    paddingHorizontal: 32,
    paddingTop: 38,
    paddingBottom: 40,
  },

  // Zone 1 — en-tête émotionnel
  cardIntro: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontStyle: 'italic',
    color: 'rgba(28, 16, 8, 0.52)',
    marginBottom: 2,
  },
  cardMainWord: {
    fontFamily: 'Georgia',
    fontWeight: '600',
    color: '#1A1208',
    letterSpacing: -1.5,
    marginBottom: 8,
  },

  // Zone 2 — accroche
  accrocheWrap: {
    marginBottom: 32,
  },
  accrocheText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(28, 16, 8, 0.42)',
    letterSpacing: 0.3,
  },

  // Zone 3 — ressentis
  pointsList: {
    gap: 14,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pointBullet: {
    fontSize: 15,
    color: 'rgba(28, 16, 8, 0.30)',
    lineHeight: 24,
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    color: '#2E200E',
    lineHeight: 24,
    letterSpacing: 0.1,
  },

  // Zone 4 — CTA
  ctaWrap: {
    marginTop: 44,
    marginBottom: 4,
  },
  ctaCardBtn: {
    height: 58,
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  ctaCardBtnText: {
    color: '#6854E0',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Pagination ───────────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingTop: 18,
    paddingBottom: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#CDC9E4',
  },
  dotActive: {
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7B61FF',
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
