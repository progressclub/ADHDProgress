import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SaturationFlow from '@/components/SaturationFlow';
import SaturationDiscovery from '@/components/SaturationDiscovery';
import HyperfocusFlow from '@/components/HyperfocusFlow';
import ParalyseFlow from '@/components/ParalyseFlow';
import ProtocoleNeutre from '@/components/ProtocoleNeutre';
import Logo from '@/components/Logo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { accorder } from '@/utils/accorder';
import { PROFIL_KEY } from '@/components/Onboarding';

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

function buildEmotions(genre: string): EmotionData[] {
  return [
  {
    key: 'saturation',
    label: 'Je suis en train de saturer',
    accroche: 'Tout devient trop.',
    points: [
      'Trop de choses arrivent en même temps.',
      "Je n'arrive plus à trier mes pensées ni à décider.",
      'Les bruits, les demandes ou les imprévus deviennent difficiles à supporter.',
    ],
    cta: "M'aider à faire redescendre la saturation",
  },
  {
    key: 'paralysie',
    label: "Je n'arrive plus à agir",
    accroche: "Je sais quoi faire, mais je n'arrive pas à commencer.",
    points: [
      'Même une petite tâche me paraît énorme.',
      "Je reste immobile, j'évite ou je passe d'une chose à l'autre.",
      "Je culpabilise, mais cela ne m'aide pas à démarrer.",
    ],
    cta: "M'aider à commencer",
  },
  {
    key: 'anxieux',
    label: 'Mon anxiété monte',
    accroche: 'Mes pensées et mon corps restent en alerte.',
    points: [
      'Mes pensées tournent vite et anticipent ce qui pourrait mal se passer.',
      accorder(
        'Je me sens tendu, agité ou incapable de me poser.',
        'Je me sens tendue, agitée ou incapable de me poser.',
        "Je ressens de la tension, de l'agitation ou une difficulté à me poser.",
        genre,
      ),
      "J'ai du mal à concentrer mon attention sur ce qui se passe maintenant.",
    ],
    cta: "M'aider à faire baisser la pression",
  },
  {
    key: 'hyperfocus',
    label: "Je n'arrive plus à décrocher",
    accroche: 'Toute mon attention est prise par une seule chose.',
    points: [
      'Je ne vois plus le temps passer.',
      "J'oublie ce qui existe autour de moi, y compris mes besoins.",
      "Je sais que je devrais m'arrêter, mais changer d'activité me semble très difficile.",
    ],
    cta: "M'aider à décrocher",
  },
  {
    key: 'besoin_stimulation',
    label: "J'ai besoin de stimulation",
    accroche: "L'ennui devient difficile à supporter.",
    points: [
      "J'ai besoin que quelque chose se passe maintenant.",
      "Je cherche à bouger, changer d'activité ou découvrir quelque chose de nouveau.",
      "Je risque d'agir impulsivement simplement pour sortir de cet état.",
    ],
    cta: "Trouver une stimulation qui m'aide",
  },
  {
    key: 'submerge',
    label: 'Mes émotions prennent toute la place',
    accroche: "Je n'arrive plus à prendre de recul.",
    points: [
      'Une émotion est arrivée très vite et très fort.',
      `Une remarque, un conflit ou ${accorder("la peur d'être rejeté", "la peur d'être rejetée", 'la peur du rejet', genre)} me touche profondément.`,
      "J'ai du mal à réfléchir tant que l'intensité ne redescend pas.",
    ],
    cta: "M'aider à traverser ce moment",
  },
  {
    key: 'alignement',
    label: 'Je me sens aligné',
    accroche: 'Je me sens fluide.',
    points: [
      "Mes pensées sont claires et je sais où j'en suis.",
      accorder(
        'Je me sens motivé naturellement, sans avoir à me forcer.',
        'Je me sens motivée naturellement, sans avoir à me forcer.',
        'Ma motivation vient naturellement, sans avoir à me forcer.',
        genre,
      ),
      `Mes émotions sont stables et ${accorder('je me sens ancré', 'je me sens ancrée', 'je ressens un bon ancrage', genre)}.`,
      "Mon énergie est fluide, je passe d'une chose à l'autre sans friction.",
      'Ma créativité fonctionne bien et les idées viennent facilement.',
      "Je me sens capable de prioriser et d'agir.",
    ],
    cta: 'Profiter de mon alignement ?',
  },
  ];
}

// ─── Carousel dimensions ──────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = Math.round(SW * 0.855);
const PEEK = Math.round((SW - CARD_W) / 2);
const CARD_H = Math.min(Math.round(SH * 0.64), 530);

// ─── Carousel metadata ────────────────────────────────────────────────────────

type CarouselMeta = {
  mainWord: string;
  gradient: string[];
  gStart: { x: number; y: number };
  gEnd: { x: number; y: number };
  mirror: string;
  signs: [string, string, string];
  ctaLabel: string;
  textDark: string;
  textMid: string;
  textPale: string;
  ctaBg: string;
  ctaBorder: string;
  ctaText: string;
};

type CarouselItem = EmotionData & CarouselMeta;

function buildCarouselMeta(genre: string): Record<string, CarouselMeta> {
  return {
  saturation: {
    mainWord: accorder('saturé', 'saturée', 'en saturation', genre),
    gradient: ['#FEE8D0', '#F6C898', '#EEA868'],
    gStart: { x: 0.1, y: 0 }, gEnd: { x: 0.9, y: 1 },
    mirror: 'Tout arrive en même temps.',
    signs: [
      "J'ai trop de pensées qui arrivent en même temps.",
      'Les bruits, messages ou demandes me semblent trop forts.',
      "Je n'arrive plus à savoir ce qui est prioritaire.",
    ],
    ctaLabel: 'Que faire de ma saturation ?',
    textDark: '#3B1A06', textMid: 'rgba(59,26,6,0.72)', textPale: 'rgba(59,26,6,0.30)',
    ctaBg: 'rgba(255,255,255,0.30)', ctaBorder: 'rgba(255,255,255,0.55)', ctaText: '#4A2004',
  },
  paralysie: {
    mainWord: accorder('paralysé', 'paralysée', 'en paralysie', genre),
    gradient: ['#DDE9F6', '#C6D8EE', '#B0C8E2'],
    gStart: { x: 0.15, y: 0 }, gEnd: { x: 0.85, y: 1 },
    mirror: "Je sais quoi faire, mais je n'arrive pas à commencer.",
    signs: [
      `Je reste ${accorder('bloqué', 'bloquée', 'en blocage', genre)} devant des tâches pourtant simples.`,
      "Chaque action me paraît demander un effort énorme.",
      "Je culpabilise de ne rien faire, mais ça ne me débloque pas.",
    ],
    ctaLabel: 'Que faire de ma paralysie ?',
    textDark: '#0D1E30', textMid: 'rgba(13,30,48,0.72)', textPale: 'rgba(13,30,48,0.30)',
    ctaBg: 'rgba(255,255,255,0.32)', ctaBorder: 'rgba(255,255,255,0.55)', ctaText: '#18304A',
  },
  anxieux: {
    mainWord: accorder('anxieux', 'anxieuse', 'en anxiété', genre),
    gradient: ['#EEE2F6', '#E0D0EE', '#D2BEE6'],
    gStart: { x: 0.05, y: 0 }, gEnd: { x: 0.95, y: 1 },
    mirror: 'Mes pensées partent trop vite.',
    signs: [
      "J'imagine tout ce qui pourrait mal se passer.",
      "J'ai du mal à rester sur une seule pensée à la fois.",
      "Mon corps reste tendu, même quand rien n'est urgent.",
    ],
    ctaLabel: 'Que faire de mon anxiété ?',
    textDark: '#280D3C', textMid: 'rgba(40,13,60,0.72)', textPale: 'rgba(40,13,60,0.30)',
    ctaBg: 'rgba(255,255,255,0.28)', ctaBorder: 'rgba(255,255,255,0.52)', ctaText: '#3C1858',
  },
  hyperfocus: {
    mainWord: accorder('en hyperfocus', 'en hyperfocus', 'en immersion totale', genre),
    gradient: ['#CCE8DC', '#B5D8C8', '#9DC8B2'],
    gStart: { x: 0.15, y: 0 }, gEnd: { x: 0.85, y: 1 },
    mirror: accorder('Je suis totalement absorbé.', 'Je suis totalement absorbée.', 'Je suis en immersion totale.', genre),
    signs: [
      "Le temps passe sans que je m'en rende compte.",
      "Tout ce qui n'est pas ma tâche disparaît de mon radar.",
      "J'ai du mal à m'arrêter, même quand je le devrais.",
    ],
    ctaLabel: 'Que faire de mon hyperfocus ?',
    textDark: '#0C2A1E', textMid: 'rgba(12,42,30,0.72)', textPale: 'rgba(12,42,30,0.30)',
    ctaBg: 'rgba(255,255,255,0.30)', ctaBorder: 'rgba(255,255,255,0.52)', ctaText: '#164030',
  },
  besoin_stimulation: {
    mainWord: accorder('sous-stimulé', 'sous-stimulée', 'en sous-stimulation', genre),
    gradient: ['#FEF0C2', '#FAD888', '#F4C060'],
    gStart: { x: 0.1, y: 0 }, gEnd: { x: 0.9, y: 1 },
    mirror: "J'ai besoin que quelque chose se passe.",
    signs: [
      "Je cherche quelque chose de nouveau ou stimulant.",
      "Je passe vite d'une idée, d'une envie ou d'une app à l'autre.",
      "Je risque d'agir impulsivement pour sortir de cet état.",
    ],
    ctaLabel: "Trouver une stimulation qui m'aide",
    textDark: '#3A2004', textMid: 'rgba(58,32,4,0.72)', textPale: 'rgba(58,32,4,0.30)',
    ctaBg: 'rgba(255,255,255,0.32)', ctaBorder: 'rgba(255,255,255,0.60)', ctaText: '#4A2800',
  },
  submerge: {
    mainWord: accorder('submergé', 'submergée', "sous l'eau", genre),
    gradient: ['#F6D5E2', '#EEC0D2', '#E4AABF'],
    gStart: { x: 0.1, y: 0 }, gEnd: { x: 0.9, y: 1 },
    mirror: "Beaucoup d'émotions arrivent en même temps.",
    signs: [
      "Une émotion prend le dessus d'un coup.",
      "Je réagis plus fort que je ne voudrais.",
      "J'ai du mal à retrouver du recul sur ce que je ressens.",
    ],
    ctaLabel: `Explorer ce que je vis ${accorder('submergé', 'submergée', "sous l'eau", genre)}`,
    textDark: '#380C18', textMid: 'rgba(56,12,24,0.72)', textPale: 'rgba(56,12,24,0.30)',
    ctaBg: 'rgba(255,255,255,0.30)', ctaBorder: 'rgba(255,255,255,0.52)', ctaText: '#4A1428',
  },
  alignement: {
    mainWord: accorder('aligné', 'alignée', 'en alignement', genre),
    gradient: ['#DAE8D4', '#C4D8BA', '#AECAA0'],
    gStart: { x: 0.15, y: 0 }, gEnd: { x: 0.85, y: 1 },
    mirror: accorder('Je me sens plus clair.', 'Je me sens plus claire.', "J'ai les idées plus claires.", genre),
    signs: [
      "J'arrive à choisir une chose sans me disperser.",
      "Mon énergie est plus stable et plus fluide.",
      "Je peux avancer sans me forcer brutalement.",
    ],
    ctaLabel: 'Préserver cet état',
    textDark: '#0E2410', textMid: 'rgba(14,36,16,0.72)', textPale: 'rgba(14,36,16,0.30)',
    ctaBg: 'rgba(255,255,255,0.32)', ctaBorder: 'rgba(255,255,255,0.55)', ctaText: '#1A3A1C',
  },
  };
}

const CAROUSEL_ORDER = [
  'saturation', 'paralysie', 'anxieux', 'hyperfocus',
  'besoin_stimulation', 'submerge', 'alignement',
];

function buildCarouselCards(genre: string): CarouselItem[] {
  const emotions = buildEmotions(genre);
  const meta = buildCarouselMeta(genre);
  return CAROUSEL_ORDER.map(key => ({
    ...emotions.find(e => e.key === key)!,
    ...meta[key],
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mainWordFontSize(word: string): number {
  const len = word.length;
  if (len <= 8) return 54;
  if (len <= 10) return 46;
  if (len <= 13) return 38;
  return 32;
}

// ─── CarouselCard ─────────────────────────────────────────────────────────────

function CarouselCard({ card, onCta }: { card: CarouselItem; onCta: () => void }) {
  const wordSize = mainWordFontSize(card.mainWord);

  return (
    <LinearGradient
      colors={card.gradient as [string, string, ...string[]]}
      start={card.gStart}
      end={card.gEnd}
      style={cs.card}>

      {/* Formes d'ambiance organiques (non-circulaires) */}
      <View style={cs.cardBlob1} />
      <View style={cs.cardBlob2} />

      <View style={cs.cardContent}>

        {/* ── Zone haute : identité émotionnelle ── */}
        <View>
          <Text style={[cs.cardIntro, { color: card.textMid }]}>{'Je me sens'}</Text>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.6}
            style={[cs.cardMainWord, { fontSize: wordSize, lineHeight: Math.round(wordSize * 1.06), color: card.textDark }]}>
            {card.mainWord}
          </Text>
          <Text style={[cs.cardMirror, { color: card.textMid }]}>{card.mirror}</Text>
        </View>

        {/* ── Zone basse : signes + CTA (ancrés en bas) ── */}
        <View>
          <View style={[cs.cardSep, { backgroundColor: card.textPale }]} />
          <View style={cs.signsList}>
            {card.signs.map((sign, i) => (
              <View key={i} style={cs.signRow}>
                <Text style={[cs.signNum, { color: card.textPale }]}>{`0${i + 1}`}</Text>
                <Text style={[cs.signText, { color: card.textMid }]}>{sign}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[cs.ctaCardBtn, { backgroundColor: card.ctaBg, borderColor: card.ctaBorder }]}
            onPress={onCta}
            activeOpacity={0.82}>
            <Text style={[cs.ctaCardBtnText, { color: card.ctaText }]} numberOfLines={2}>
              {card.ctaLabel}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </LinearGradient>
  );
}

// ─── DiscoveryCarousel ────────────────────────────────────────────────────────

function DiscoveryCarousel({ cards, onCta, onBack }: { cards: CarouselItem[]; onCta: (key: string) => void; onBack: () => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIdx, setActiveIdx] = useState(0);

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= cards.length) return;
    scrollRef.current?.scrollTo({ x: idx * CARD_W, animated: true });
    setActiveIdx(idx);
  };

  return (
    <View style={cs.discoveryWrap}>

      {/* ── Header ── */}
      <View style={cs.discoveryHeader}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.65}>
          <Text style={cs.discoveryBackText}>{'‹ Retour'}</Text>
        </TouchableOpacity>
        <View style={cs.discoveryTitleBlock}>
          <Text style={cs.discoveryTitleText}>{'Découverte'}</Text>
          <Text style={cs.discoverySubText}>{'Explore les modes internes, un par un.'}</Text>
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
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={e => {
            setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / CARD_W));
          }}
          contentContainerStyle={{ paddingHorizontal: PEEK }}>
          {cards.map((card, i) => {
            const inputRange = [(i - 1) * CARD_W, i * CARD_W, (i + 1) * CARD_W];
            const scale = scrollX.interpolate({ inputRange, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.50, 1, 0.50], extrapolate: 'clamp' });
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
        {cards.map((_, i) => {
          const inputRange = [(i - 1) * CARD_W, i * CARD_W, (i + 1) * CARD_W];
          const width = scrollX.interpolate({
            inputRange,
            outputRange: [7, 22, 7],
            extrapolate: 'clamp',
          });
          const backgroundColor = scrollX.interpolate({
            inputRange,
            outputRange: ['#C4C0D8', '#7B61FF', '#C4C0D8'],
            extrapolate: 'clamp',
          });
          return (
            <TouchableOpacity
              key={i}
              onPress={() => goTo(i)}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              activeOpacity={0.6}>
              <Animated.View style={[cs.dot, { width, backgroundColor }]} />
            </TouchableOpacity>
          );
        })}
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
  const [showHyperfocus, setShowHyperfocus] = useState(false);
  const [showParalyse, setShowParalyse] = useState(false);
  const [showNeutre, setShowNeutre] = useState(false);
  const [genre, setGenre] = useState('');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(PROFIL_KEY).then(profil => {
        if (profil) setGenre(JSON.parse(profil).genre ?? '');
      });
    }, [])
  );

  const emotions = useMemo(() => buildEmotions(genre), [genre]);
  const carouselCards = useMemo(() => buildCarouselCards(genre), [genre]);

  const handleTimeChoice = (choice: Exclude<TimeChoice, null>) => {
    setTimeChoice(choice);
    setStep(2);
  };

  const handleCta = (key: string) => {
    if (key === 'saturation' && timeChoice) {
      if (timeChoice === 'Mode Express') setShowFlow(true);
      else setShowDiscovery(true);
    }
    if (key === 'hyperfocus' && timeChoice === 'Mode Express') {
      setShowHyperfocus(true);
    }
    if (key === 'paralysie' && timeChoice === 'Mode Express') {
      setShowParalyse(true);
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
            <View style={styles.step1Wrap}>
              <View style={styles.step1Header}>
                <Text style={styles.step1TagLine}>{'Consultez ici le Coach de'}</Text>
                <Logo size="coach" />
              </View>
              <View style={styles.step1Content}>
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
                {emotions.filter(e => e.key !== 'alignement').map(e => (
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
                {/* Option de secours — pas de contenu dépliable */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardLabel}>{'Je ne sais pas ce que je ressens'}</Text>
                  </View>
                  <View style={styles.expandPanel}>
                    <TouchableOpacity
                      style={styles.ctaBtn}
                      onPress={() => setShowNeutre(true)}
                      activeOpacity={0.82}>
                      <Text style={styles.ctaBtnText}>{"Aide-moi sans avoir à choisir"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Mode Découverte — carrousel ── */}
      {isDiscovery && (
        <DiscoveryCarousel
          cards={carouselCards}
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

      <Modal visible={showHyperfocus} animationType="slide" onRequestClose={() => setShowHyperfocus(false)}>
        <HyperfocusFlow
          onComplete={() => { setShowHyperfocus(false); setStep(1); setOpenEmotion(null); }}
        />
      </Modal>

      <Modal visible={showParalyse} animationType="slide" onRequestClose={() => setShowParalyse(false)}>
        <ParalyseFlow
          onComplete={() => { setShowParalyse(false); setStep(1); setOpenEmotion(null); }}
        />
      </Modal>

      <Modal visible={showNeutre} animationType="slide" onRequestClose={() => setShowNeutre(false)}>
        <ProtocoleNeutre onBack={() => setShowNeutre(false)} />
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles — carousel ────────────────────────────────────────────────────────

const cs = StyleSheet.create({

  // ── Wrap ─────────────────────────────────────────────────────────────────────
  discoveryWrap: {
    flex: 1,
    backgroundColor: '#F8F6FF',
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  discoveryHeader: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 24,
  },
  discoveryBackText: {
    fontSize: 16,
    color: '#7B61FF',
    fontWeight: '600',
    marginBottom: 18,
    letterSpacing: 0.05,
  },
  discoveryTitleBlock: {},
  discoveryTitleText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#1E1C35',
    letterSpacing: -0.7,
    lineHeight: 42,
  },
  discoverySubText: {
    fontSize: 16,
    color: '#8E8AA0',
    marginTop: 5,
    lineHeight: 22,
    fontWeight: '400',
  },

  // ── Carousel container ────────────────────────────────────────────────────────
  carouselContainer: {
    height: CARD_H,
  },

  // ── Card wrapper ──────────────────────────────────────────────────────────────
  cardWrapper: {
    width: CARD_W,
    height: CARD_H,
    shadowColor: '#1A0B3C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    borderRadius: 36,
    overflow: 'hidden',
  },

  // Blobs d'ambiance organiques
  cardBlob1: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 200,
    height: 155,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 52,
    borderBottomLeftRadius: 82,
    borderBottomRightRadius: 128,
    backgroundColor: 'rgba(255,255,255,0.20)',
    transform: [{ rotate: '-20deg' }],
  },
  cardBlob2: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 160,
    height: 122,
    borderTopLeftRadius: 58,
    borderTopRightRadius: 96,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '13deg' }],
  },

  // ── Contenu sans scroll — 2 zones : haut ancré en haut, bas ancré en bas ────
  cardContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 26,
    justifyContent: 'space-between',
  },

  // Zone 1 — « Je me sens »
  cardIntro: {
    fontFamily: 'Georgia',
    fontSize: 21,
    fontStyle: 'italic',
    marginBottom: 6,
  },

  // Zone 2 — Mot principal
  cardMainWord: {
    fontFamily: 'Georgia',
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 10,
  },

  // Zone 3 — Phrase miroir
  cardMirror: {
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 26,
    letterSpacing: 0.05,
  },

  // Séparateur éditorial
  cardSep: {
    height: 1,
    width: 36,
    borderRadius: 1,
    marginBottom: 16,
  },

  // 3 signes
  signsList: {
    gap: 14,
  },
  signRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  signNum: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    width: 24,
    paddingTop: 2,
    lineHeight: 17,
  },
  signText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 23,
    letterSpacing: 0.05,
  },

  // CTA — toujours en bas de la zone basse
  ctaCardBtn: {
    marginTop: 22,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  ctaCardBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },

  // ── Pagination ────────────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingTop: 18,
    paddingBottom: 6,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
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

  // Step 1 — header + centred content
  step1Wrap: {
    flex: 1,
    alignItems: 'center',
  },
  step1Header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  step1TagLine: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 18,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 14,
  },
  step1Content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 32,
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
