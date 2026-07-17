import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { Anchor, BatteryLow, BellOff, Cloud, DoorOpen, Feather, Heart, Layers, ListTodo, PanelLeftClose, Shirt, Sparkles, Sun, VolumeX, X } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayTask, useDayTasks } from '@/contexts/DayTasksContext';

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

type FlowStep = 1 | 2 | 3 | 4 | 5 | 6;
type TriageCategory = 'urgent' | 'pasMaintenant' | 'aClarifier' | 'emotion';
type TriageResult = Record<TriageCategory, string[]>;
type Step6Choice = 'recover' | 'continue' | 'postpone' | null;
type Step2View = 'cards' | 'timer' | 'help';

type CardData = {
  key: string;
  closedTitle: string;
  closedDesc: string;
  openContent: string;
  instructions?: string[];
  timerLabel: string;
  timerSecs: number;
  timerText: string;
  doneText: string;
};

type Step1ActionData = {
  key: string;
  IconComponent: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  description: string;
  message: string;
  btnLabel: string;
};

const STEP1_ACTIONS: Step1ActionData[] = [
  {
    key: 'dnd',
    IconComponent: BellOff,
    label: 'Activer Ne pas déranger',
    description: 'Pour couper les interruptions pendant quelques minutes.',
    message: "Bien. Les notifications ne peuvent plus t'atteindre pendant ce temps. Tu viens de créer une petite bulle autour de toi.",
    btnLabel: "C'est fait, j'ai coupé les notifications",
  },
  {
    key: 'lumiere',
    IconComponent: Sun,
    label: 'Baisser la lumière',
    description: "Pour réduire l'agression visuelle.",
    message: "Bien. Moins de lumière, c'est moins d'informations à traiter pour ton cerveau. On rend l'espace un peu plus doux.",
    btnLabel: "C'est fait, j'ai baissé la lumière",
  },
  {
    key: 'son',
    IconComponent: VolumeX,
    label: 'Couper un son',
    description: 'Pour enlever une source de bruit.',
    message: "Bien. Un son en moins, c'est déjà un peu d'espace en plus. Tu n'as pas besoin de tout rendre parfait, juste de réduire ce qui t'agresse.",
    btnLabel: "C'est fait, j'ai réduit le bruit",
  },
  {
    key: 'onglet',
    IconComponent: PanelLeftClose,
    label: 'Fermer un onglet',
    description: 'Pour fermer une porte mentale ouverte.',
    message: "Bien. Un onglet fermé, c'est une chose de moins qui tire ton attention. Tu aides ton cerveau à revenir ici.",
    btnLabel: "C'est fait, j'ai fermé un onglet",
  },
  {
    key: 'piece',
    IconComponent: DoorOpen,
    label: "Changer de pièce",
    description: "Pour sortir d'un environnement trop chargé.",
    message: "Bien. Parfois, changer d'espace suffit à changer un peu l'état intérieur. Tu n'es pas en train de fuir, tu te protèges.",
    btnLabel: "C'est fait, j'ai changé d'espace",
  },
  {
    key: 'tenue',
    IconComponent: Shirt,
    label: 'Mettre une tenue confortable',
    description: 'Pour retirer une gêne corporelle.',
    message: "Bien. Ton corps reçoit moins de signaux désagréables. Ce confort compte, surtout quand tout est déjà trop plein.",
    btnLabel: "C'est fait, je suis plus confortable",
  },
];

const STEP2_CARDS: CardData[] = [
  {
    key: 'respiration',
    closedTitle: 'Respiration lente',
    closedDesc: 'Pour ralentir doucement le rythme intérieur.',
    openContent: "Essaie simplement d'expirer un peu plus longtemps que tu n'inspires. Tu n'as pas besoin de \"bien respirer\" ou de te calmer parfaitement. On cherche juste à envoyer à ton corps le message : je peux ralentir.",
    instructions: [
      'Inspire pendant 4 secondes.',
      'Expire pendant 6 secondes.',
      'Répète pendant 2 minutes.',
    ],
    timerLabel: 'Lancer 2 minutes',
    timerSecs: 120,
    timerText: "Rien d'autre à faire. Inspire 4 secondes. Expire 6 secondes. Juste ça.",
    doneText: "En expirant plus longtemps que tu n'inspires, tu as activé ton système nerveux parasympathique. C'est lui qui dit à ton corps : le danger est passé, tu peux relâcher. Tu n'as pas juste respiré. Tu as envoyé un signal réel à ton cerveau pour faire baisser l'état d'alerte. C'est pour ça que ça aide.",
  },
  {
    key: 'eau',
    closedTitle: 'Eau froide',
    closedDesc: "Pour faire redescendre l'intensité rapidement.",
    openContent: "Si tu sens que tout monte trop fort, l'eau froide peut créer un petit reset physique. Ce n'est pas magique, mais ça peut aider ton système à sortir du trop-plein.\n\nPasse tes mains sous l'eau froide pendant 30 secondes. Ou pose un peu d'eau fraîche sur ton visage. Pendant ce temps, essaie juste de sentir la température.",
    timerLabel: 'Je vais le faire',
    timerSecs: 30,
    timerText: "Sens juste la température. Tu n'as rien d'autre à faire.",
    doneText: "Le contact de l'eau froide active le nerf vague et ralentit le rythme cardiaque en quelques secondes. C'est une réponse physique réelle. Ton système nerveux vient de recevoir un signal d'interruption. Comme un reset forcé. C'est exactement ce dont tu avais besoin.",
  },
  {
    key: 'pression',
    closedTitle: 'Pression profonde',
    closedDesc: 'Pour retrouver une sensation de sécurité.',
    openContent: "Quand tout est trop bruyant à l'intérieur, une pression douce peut aider ton corps à se sentir contenu. Tu peux utiliser une couverture, un coussin, ou simplement tes mains.\n\nEnroule-toi dans une couverture, serre un coussin contre toi, ou pose une main sur ta poitrine et une main sur ton ventre. Reste comme ça pendant une minute. Tu n'as rien à réussir. Tu laisses juste ton corps recevoir le poids.",
    timerLabel: 'Commencer 1 minute',
    timerSecs: 60,
    timerText: "Laisse ton corps être soutenu. Tu n'as rien à tenir ni à réussir.",
    doneText: "La pression sur le corps active les récepteurs sensoriels qui envoient un signal de sécurité au cerveau. C'est pour ça que les couvertures lourdes, les câlins, ou simplement poser les mains sur soi peuvent calmer une surcharge. Tu n'as pas rien fait. Tu as utilisé ton propre corps comme outil de régulation.",
  },
  {
    key: 'marche',
    closedTitle: 'Marche lente',
    closedDesc: 'Pour remettre ton système en mouvement, sans pression.',
    openContent: "Si tu te sens bloquée, agitée ou pleine à craquer, marcher doucement peut aider à faire circuler l'énergie. Pas besoin d'aller loin. Pas besoin de faire du sport. Juste bouger un peu.\n\nPose ton téléphone si tu peux. Marche lentement pendant 3 minutes. Regarde autour de toi, sens tes pieds au sol, et ne cherche pas à résoudre tes pensées.",
    timerLabel: 'Lancer 3 minutes',
    timerSecs: 180,
    timerText: "Tu n'es pas en train de fuir. Tu aides ton corps à relâcher un peu la pression.",
    doneText: "Marcher active un rythme bilatéral dans le cerveau. Gauche, droite, gauche, droite. Ce rythme aide à traiter les émotions et à sortir du mode figé. En plus, bouger libère un peu de dopamine. Tu n'as pas résolu tes problèmes en marchant. Mais tu as aidé ton cerveau à retrouver un peu de capacité pour les affronter.",
  },
  {
    key: 'douche',
    closedTitle: 'Douche rapide',
    closedDesc: "Pour un reset sensoriel complet, si tu es chez toi.",
    openContent: "Si tu peux prendre une douche, fais-la comme un reset, pas comme une vraie routine parfaite. L'idée, c'est simplement de laisser l'eau couper le bruit et t'aider à revenir dans ton corps.\n\nVa sous l'eau quelques minutes. Sens la température. Tu n'as pas besoin de régler tes pensées maintenant.",
    timerLabel: 'Je prends 5 minutes',
    timerSecs: 300,
    timerText: "Je t'attends ici. Reviens quand c'est fait. Pas besoin de te presser.",
    doneText: "L'eau change ton état sensoriel complètement. Elle coupe les stimuli qui t'envahissaient, elle régule la température corporelle, et elle crée une séparation physique entre l'avant et l'après. Beaucoup de personnes TDAH utilisent la douche comme reset naturel sans vraiment savoir pourquoi ça marche. Maintenant tu sais.",
  },
];

const STEP2_TECHNIQUES = [
  {
    key: 'respiration',
    label: 'Respiration',
    instruction: 'Inspire pendant 4 secondes, expire pendant 6 secondes. Répète pendant 2 à 3 minutes.',
  },
  {
    key: 'eau',
    label: 'Eau froide',
    instruction: "Passe tes mains sous l'eau froide, ou pose une compresse fraîche sur ton visage. Reste 30 secondes.",
  },
  {
    key: 'pression',
    label: 'Pression profonde',
    instruction: "Enroule-toi dans une couverture, serre un coussin, ou pose une main sur ta poitrine et une sur ton ventre.",
  },
  {
    key: 'mouvement',
    label: 'Mouvement lent',
    instruction: 'Marche lentement dans la pièce pendant 3 minutes. Sans téléphone, sans objectif.',
  },
  {
    key: 'douche',
    label: 'Douche',
    instruction: "Si tu peux, prends une douche rapide. C'est un reset sensoriel complet.",
  },
];

type Step3CardData = {
  key: string;
  IconComponent: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  placeholder: string;
  microMessage: string;
};

const STEP3_CARDS: Step3CardData[] = [
  {
    key: 'dois',
    IconComponent: ListTodo,
    title: 'Je dois penser à…',
    description: "Les choses que ton cerveau essaie de ne pas oublier.",
    placeholder: "répondre à quelqu'un, ranger, envoyer un document, acheter quelque chose…",
    microMessage: "Tu n'as pas besoin de tout faire. On les sort juste de ta tête.",
  },
  {
    key: 'peur',
    IconComponent: Cloud,
    title: "J'ai peur que…",
    description: "Les scénarios qui tournent en boucle, même s'ils ne sont pas sûrs.",
    placeholder: "être en retard, oublier, décevoir, ne pas y arriver…",
    microMessage: "Une peur n'est pas forcément une urgence. On la pose ici pour qu'elle arrête de tourner seule.",
  },
  {
    key: 'bloque',
    IconComponent: Anchor,
    title: 'Je bloque sur…',
    description: "Ce qui semble trop lourd à commencer maintenant.",
    placeholder: "ouvrir un message, ranger, choisir, commencer, répondre…",
    microMessage: "Le but n'est pas de te forcer. C'est de voir où ça coince.",
  },
  {
    key: 'trop',
    IconComponent: Layers,
    title: 'Il y a trop de…',
    description: "Ce qui déborde : pensées, bruit, choses, demandes, émotions.",
    placeholder: "bruit, idées, tâches, notifications, pression…",
    microMessage: "Quand tout est trop, nommer le trop aide déjà à le rendre moins flou.",
  },
  {
    key: 'culpabilise',
    IconComponent: Heart,
    title: 'Je culpabilise à propos de…',
    description: "Ce que tu te reproches, même si ce n'est pas forcément juste.",
    placeholder: "je n'ai pas répondu, j'ai procrastiné, je suis en retard…",
    microMessage: "La culpabilité prend beaucoup de place. On la sort de ta tête, sans la croire entièrement.",
  },
  {
    key: 'vide',
    IconComponent: BatteryLow,
    title: "Ce qui me vide, c'est…",
    description: "Les choses qui prennent ton énergie en arrière-plan.",
    placeholder: "le bruit, les messages, les choix, le désordre, les gens…",
    microMessage: "La fatigue a souvent une raison. On l'écoute sans forcément tout résoudre.",
  },
  {
    key: 'besoin',
    IconComponent: Sparkles,
    title: "Là, j'aurais juste besoin de…",
    description: "Pour trouver le besoin simple derrière la saturation.",
    placeholder: "silence, dormir, être seule, qu'on m'aide, manger, respirer…",
    microMessage: "Derrière le chaos, il y a souvent un besoin très simple.",
  },
  {
    key: 'autre',
    IconComponent: Feather,
    title: 'Autre chose à déposer',
    description: "Même si ça ne rentre dans aucune case.",
    placeholder: "écris ce qui vient, même si c'est confus…",
    microMessage: "Même si ce n'est pas clair, tu peux le déposer ici.",
  },
];

const STEP3_NOWORDS_OPTIONS = [
  { key: 'taches', label: 'Trop de tâches', desc: 'Tout semble urgent ou mélangé.' },
  { key: 'emotions', label: "Trop d'émotions", desc: 'Ça déborde à l\'intérieur.' },
  { key: 'bruit', label: 'Trop de bruit', desc: "Trop de sons, d'écrans, de monde ou de pensées." },
  { key: 'fatigue', label: 'Trop de fatigue', desc: 'La batterie est trop basse pour réfléchir.' },
  { key: 'saispasdont', label: 'Je ne sais pas', desc: "Je veux juste l'option la plus simple." },
];

const RECOVERY_SUGGESTIONS = [
  'Pause calme',
  'Repas',
  'Douche',
  'Marche',
  'Repos sans téléphone',
];

const CATEGORY_CONFIG: Record<TriageCategory, { label: string; color: string }> = {
  urgent: { label: 'Urgent réel', color: '#EF4444' },
  pasMaintenant: { label: 'Pas maintenant', color: '#F59E0B' },
  aClarifier: { label: 'À clarifier', color: '#3B82F6' },
  emotion: { label: 'Émotion / bruit mental', color: '#8B5CF6' },
};

const CATEGORIES: TriageCategory[] = ['urgent', 'pasMaintenant', 'aClarifier', 'emotion'];

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Requires EXPO_PUBLIC_ANTHROPIC_API_KEY in .env
async function callClaude(system: string, user: string): Promise<string> {
  const apiKey = (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '').trim();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function triageContent(items: string[], mode: string): Promise<TriageResult> {
  const isExpress = mode === 'Mode Express';
  const raw = await callClaude(
    'Tu es un assistant de tri cognitif ADHD. Réponds uniquement avec du JSON valide, sans texte avant ni après.',
    `L'utilisateur ADHD est en saturation. Voici ce qui tourne dans sa tête :
${items.map(i => `- ${i}`).join('\n')}

Trie ces éléments en 4 catégories. ${isExpress ? 'Sois rapide et direct.' : 'Classe avec précision.'}
Définitions :
- urgent : conséquence réelle aujourd'hui ou très bientôt
- pasMaintenant : compte, mais pas dans les 30 prochaines minutes
- aClarifier : je ne sais pas encore quelle action faire
- emotion : ce n'est pas une tâche, c'est un ressenti

Réponds UNIQUEMENT avec du JSON : {"urgent":[],"pasMaintenant":[],"aClarifier":[],"emotion":[]}
Ne modifie pas le texte des éléments. Catégories vides = [].`
  );
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON not found');
  return JSON.parse(match[0]);
}

async function suggestActions(urgentItems: string[], mode: string): Promise<string[]> {
  const isExpress = mode === 'Mode Express';
  const raw = await callClaude(
    'Tu es un assistant de planification ADHD. Réponds uniquement avec du JSON valide.',
    `L'utilisateur ADHD est en saturation. Urgences identifiées :
${urgentItems.map(i => `- ${i}`).join('\n')}

${isExpress
  ? 'Mode Express : propose EXACTEMENT 2 micro-actions (moins de 2 minutes chacune).'
  : 'Propose 2 ou 3 actions concrètes, faisables en moins de 5 minutes chacune.'}
Chaque action : concrète, à la première personne, commence par un verbe.
Réponds UNIQUEMENT avec du JSON : {"actions":["action 1","action 2"]}`
  );
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON not found');
  const parsed = JSON.parse(match[0]);
  return Array.isArray(parsed.actions) ? parsed.actions : [];
}

const timerScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  accompText: {
    fontSize: 16,
    color: C.textSub,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  timerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerDisplay: {
    fontSize: 80,
    fontWeight: '200',
    color: C.primary,
    letterSpacing: 4,
  },
  doneScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  doneText: {
    fontSize: 16,
    color: C.text,
    lineHeight: 26,
    marginBottom: 32,
    fontStyle: 'italic',
  },
  backBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  backBtnText: { fontSize: 14, color: C.textSub, textDecorationLine: 'underline' },
});

const cardRowStyles = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1.5, borderColor: C.border, overflow: 'hidden',
  },
  cardOpen: { borderColor: C.primary },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  titleOpen: { color: C.primary },
  closedDesc: { fontSize: 13, color: C.textSub, marginTop: 3, lineHeight: 18 },
  chevron: { fontSize: 22, color: C.primaryMuted, marginLeft: 8, transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  body: { backgroundColor: C.expandBg, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18 },
  bodyText: { fontSize: 14, color: C.textSub, lineHeight: 22, marginBottom: 10 },
  instructionsBlock: {
    backgroundColor: C.primaryLight, borderRadius: 10,
    padding: 12, marginBottom: 14, gap: 6,
  },
  instructionLine: { fontSize: 14, color: C.primary, fontWeight: '600', lineHeight: 20 },
  primaryBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  otherBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  otherBtnText: { fontSize: 13, color: C.textSub, textDecorationLine: 'underline' },
});

function CardRow({
  card,
  isOpen,
  onOpen,
  onClose,
  onLaunch,
}: {
  card: CardData;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLaunch: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spring = Animated.spring(anim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    });
    spring.start();
    return () => spring.stop();
  }, [isOpen, anim]);

  const maxHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 800] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] });

  return (
    <View style={[cardRowStyles.card, isOpen && cardRowStyles.cardOpen]}>
      <TouchableOpacity
        style={cardRowStyles.header}
        onPress={isOpen ? onClose : onOpen}
        activeOpacity={0.75}>
        <View style={{ flex: 1 }}>
          <Text style={[cardRowStyles.title, isOpen && cardRowStyles.titleOpen]}>
            {card.closedTitle}
          </Text>
          {!isOpen && <Text style={cardRowStyles.closedDesc}>{card.closedDesc}</Text>}
        </View>
        <Text style={[cardRowStyles.chevron, isOpen && cardRowStyles.chevronOpen]}>›</Text>
      </TouchableOpacity>

      <Animated.View style={{ maxHeight, overflow: 'hidden', opacity }}>
        <View style={cardRowStyles.body}>
          {card.openContent.split('\n\n').map((para, i) => (
            <Text key={i} style={cardRowStyles.bodyText}>{para}</Text>
          ))}
          {card.instructions && (
            <View style={cardRowStyles.instructionsBlock}>
              {card.instructions.map((line, i) => (
                <Text key={i} style={cardRowStyles.instructionLine}>→ {line}</Text>
              ))}
            </View>
          )}
          <TouchableOpacity style={cardRowStyles.primaryBtn} onPress={onLaunch} activeOpacity={0.82}>
            <Text style={cardRowStyles.primaryBtnText}>{card.timerLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={cardRowStyles.otherBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={cardRowStyles.otherBtnText}>Choisir autre chose</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const step3CardStyles = StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border, overflow: 'hidden',
  },
  cardOpen: { borderColor: C.primary },
  cardFilled: { borderColor: C.primaryMuted },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  titleBlock: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: C.text },
  titleOpen: { color: C.primary },
  desc: { fontSize: 13, color: C.textSub, marginTop: 2, lineHeight: 18 },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.primary, marginRight: 4,
  },
  chevron: { fontSize: 22, color: C.primaryMuted, transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  body: { backgroundColor: C.expandBg, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  input: {
    fontSize: 14, color: C.text, lineHeight: 22,
    paddingVertical: 4, paddingBottom: 8, minHeight: 40,
  },
  inputWrap: { position: 'relative', minHeight: 40 },
  placeholderOverlay: {
    fontSize: 14, lineHeight: 22, color: C.primaryMuted,
    paddingTop: 4, paddingBottom: 8,
  },
  inputAbsolute: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  saveRow: { alignItems: 'flex-end', marginTop: 4 },
  saveBtnText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  micro: { fontSize: 12, color: C.primary, marginTop: 8, lineHeight: 17, fontStyle: 'italic' },
  chipsWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 10,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primaryLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, gap: 6,
  },
  chipText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  chipX: { fontSize: 11, color: C.primaryMuted, fontWeight: '700' },
});

const capitalizeFirst = (s: string) => (s.length === 0 ? s : s[0].toLocaleUpperCase() + s.slice(1));

function BrainCard({
  card,
  values,
  onChange,
}: {
  card: Step3CardData;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const anim = useRef(new Animated.Value(0)).current;
  const hasContent = values.length > 0;

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    Animated.spring(anim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    }).start();
  };

  const addChip = () => {
    const text = capitalizeFirst(inputText.trim());
    if (!text) return;
    onChange([...values, text]);
    setInputText('');
  };

  const removeChip = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const maxHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 500] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] });

  return (
    <View
      style={[step3CardStyles.card, isOpen && step3CardStyles.cardOpen, !isOpen && hasContent && step3CardStyles.cardFilled]}>
      <TouchableOpacity style={step3CardStyles.header} onPress={toggle} activeOpacity={0.75}>
        <card.IconComponent size={24} color={isOpen || hasContent ? C.primary : C.textSub} strokeWidth={1.8} />
        <View style={step3CardStyles.titleBlock}>
          <Text style={[step3CardStyles.title, (isOpen || hasContent) && step3CardStyles.titleOpen]}>
            {card.title}
          </Text>
          {!isOpen && <Text style={step3CardStyles.desc}>{card.description}</Text>}
        </View>
        {hasContent && !isOpen && <View style={step3CardStyles.dot} />}
        <Text style={[step3CardStyles.chevron, isOpen && step3CardStyles.chevronOpen]}>›</Text>
      </TouchableOpacity>

      <Animated.View style={{ maxHeight, overflow: 'hidden', opacity }}>
        <View style={step3CardStyles.body}>
          {values.length > 0 && (
            <View style={step3CardStyles.chipsWrap}>
              {values.map((chip, i) => (
                <View key={i} style={step3CardStyles.chip}>
                  <Text style={step3CardStyles.chipText}>{chip}</Text>
                  <TouchableOpacity
                    onPress={() => removeChip(i)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.6}>
                    <Text style={step3CardStyles.chipX}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={step3CardStyles.inputWrap}>
            {!inputText && (
              <Text style={step3CardStyles.placeholderOverlay} pointerEvents="none">
                {values.length > 0 ? 'Ajouter un autre...' : capitalizeFirst(card.placeholder)}
              </Text>
            )}
            <TextInput
              style={[step3CardStyles.input, !inputText && step3CardStyles.inputAbsolute]}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={addChip}
              placeholder=""
              placeholderTextColor="transparent"
              autoCapitalize="none"
              returnKeyType="done"
              blurOnSubmit={false}
            />
          </View>
          {inputText.trim().length > 0 && (
            <View style={step3CardStyles.saveRow}>
              <TouchableOpacity
                onPress={addChip}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}>
                <Text style={step3CardStyles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={step3CardStyles.micro}>{card.microMessage}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

type Props = {
  timeChoice: 'Mode Express' | 'Mode Découverte';
  onComplete: () => void;
};

export default function SaturationFlow({ timeChoice, onComplete }: Props) {
  const { todayTasks, persistTodayTasks } = useDayTasks();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<FlowStep>(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);

  const [step2View, setStep2View] = useState<Step2View>('cards');
  const [openCard2, setOpenCard2] = useState<string | null>(null);
  const [activeTimerCardKey, setActiveTimerCardKey] = useState<string | null>(null);
  const [timer2Secs, setTimer2Secs] = useState(0);
  const [timer2Done, setTimer2Done] = useState(false);
  const timer2Ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const [brainFields, setBrainFields] = useState<Record<string, string[]>>({});
  const [step3ShowMore, setStep3ShowMore] = useState(false);
  const step3MoreAnim = useRef(new Animated.Value(0)).current;
  const [step3View, setStep3View] = useState<'main' | 'nowords'>('main');
  const [step3NoWordsChoice, setStep3NoWordsChoice] = useState<string | null>(null);
  const [step3MinimalSignal, setStep3MinimalSignal] = useState<string | null>(null);

  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ text: string; from: TriageCategory } | null>(null);

  const [actions, setActions] = useState<string[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [selectedFinalAction, setSelectedFinalAction] = useState<string | null>(null);

  const [step6Choice, setStep6Choice] = useState<Step6Choice>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);

  const advanceTo = useCallback((newStep: FlowStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(30);
      setStep(newStep);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const goBackTo = useCallback((newStep: FlowStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 30, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(-30);
      setStep(newStep);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleStep3NoWords = () => {
    if (step3NoWordsChoice) setStep3MinimalSignal(step3NoWordsChoice);
    setTriageLoading(true);
    setTriageError(null);
    setTriage(null);
    advanceTo(4);

    const empty: TriageResult = { urgent: [], pasMaintenant: [], aClarifier: [], emotion: [] };
    let result: TriageResult = empty;
    switch (step3NoWordsChoice) {
      case 'taches':
        result = { ...empty, aClarifier: ['Plusieurs choses se mélangent, difficile de dire quoi faire en premier'] };
        break;
      case 'emotions':
        result = { ...empty, emotion: ['Une vague émotionnelle forte, difficile à nommer'] };
        break;
      case 'bruit':
        result = { ...empty, emotion: ['Trop de stimulation sensorielle ou mentale'] };
        break;
      case 'fatigue':
        result = { ...empty, pasMaintenant: ["Fatigue qui empêche d'agir maintenant"] };
        break;
      case 'saispasdont':
        result = { ...empty, aClarifier: ["Signal pas clair, besoin d'aide pour clarifier"] };
        break;
    }

    setTriage(result);
    setTriageLoading(false);
  };

  const handleStep3Submit = async () => {
    // TODO: envoyer le contenu à l'IA pour le tri étape 4
    const items = STEP3_CARDS.flatMap(c =>
      (brainFields[c.key] || []).filter(item => item.trim()).map(item => item.trim())
    );

    setTriageLoading(true);
    setTriageError(null);
    setTriage(null);
    advanceTo(4);

    if (items.length === 0) {
      setTriage({ urgent: [], pasMaintenant: [], aClarifier: [], emotion: [] });
      setTriageLoading(false);
      return;
    }

    try {
      const result = await triageContent(items, timeChoice);
      setTriage(result);
    } catch {
      setTriageError("Le tri automatique n'a pas fonctionné. Les éléments sont dans Urgent réel par défaut.");
      setTriage({ urgent: items, pasMaintenant: [], aClarifier: [], emotion: [] });
    } finally {
      setTriageLoading(false);
    }
  };

  const handleShowMoreCards = useCallback(() => {
    setStep3ShowMore(true);
    Animated.spring(step3MoreAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 50,
      friction: 12,
    }).start();
  }, [step3MoreAnim]);

  const handleStep4Continue = async () => {
    const urgentItems = triage?.urgent || [];
    setActionsLoading(true);
    setActions([]);
    advanceTo(5);

    if (urgentItems.length === 0) {
      setActions(["Boire un verre d'eau", 'Faire 3 respirations profondes', "Écrire la première micro-étape"]);
      setActionsLoading(false);
      return;
    }

    try {
      const result = await suggestActions(urgentItems, timeChoice);
      setActions(result.length ? result : ["Répondre au plus urgent", "Faire une seule chose concrète"]);
    } catch {
      setActions(["Identifier la première toute petite action", "Écrire l'urgence en une phrase"]);
    } finally {
      setActionsLoading(false);
    }
  };

  const moveItem = useCallback((text: string, from: TriageCategory, to: TriageCategory) => {
    setTriage(prev => {
      if (!prev || from === to) return prev;
      return {
        ...prev,
        [from]: prev[from].filter(i => i !== text),
        [to]: [...prev[to], text],
      };
    });
    setEditingItem(null);
  }, []);

  const handleStep6Choice = (choice: Step6Choice) => {
    if (choice !== step6Choice) {
      setTaskAdded(false);
      setShowDatePicker(false);
    }
    setStep6Choice(prev => prev === choice ? null : choice);
  };

  const addToToday = useCallback(() => {
    if (!selectedFinalAction) return;
    // TODO: relier à la page Tâches
    const newTask: DayTask = {
      id: Date.now().toString(),
      title: selectedFinalAction,
      priority: 'normale',
      completed: false,
    };
    persistTodayTasks([...todayTasks, newTask]);
    setTaskAdded(true);
  }, [selectedFinalAction, todayTasks, persistTodayTasks]);

  const addToDate = useCallback(async () => {
    if (!selectedFinalAction) return;
    // TODO: relier à la page Tâches
    const key = `adhd_day_tasks_${toISO(selectedDate)}`;
    const raw = await AsyncStorage.getItem(key);
    const existing: DayTask[] = raw ? JSON.parse(raw) : [];
    const newTask: DayTask = {
      id: Date.now().toString(),
      title: selectedFinalAction,
      priority: 'normale',
      completed: false,
    };
    await AsyncStorage.setItem(key, JSON.stringify([...existing, newTask]));
    setTaskAdded(true);
  }, [selectedFinalAction, selectedDate]);

  // ── Step 2 — timer ───────────────────────────────────────────────

  React.useEffect(() => {
    return () => { if (timer2Ref.current) clearInterval(timer2Ref.current); };
  }, []);

  const launchTimer = useCallback((cardKey: string) => {
    const card = STEP2_CARDS.find(c => c.key === cardKey)!;
    if (timer2Ref.current) { clearInterval(timer2Ref.current); timer2Ref.current = null; }
    setActiveTimerCardKey(cardKey);
    setTimer2Done(false);
    setStep2View('timer');
    let remaining = card.timerSecs;
    setTimer2Secs(remaining);
    timer2Ref.current = setInterval(() => {
      remaining--;
      setTimer2Secs(remaining);
      if (remaining <= 0) {
        clearInterval(timer2Ref.current!);
        timer2Ref.current = null;
        setTimer2Done(true);
      }
    }, 1000);
  }, []);

  const backToCards = useCallback(() => {
    if (timer2Ref.current) { clearInterval(timer2Ref.current); timer2Ref.current = null; }
    setTimer2Done(false);
    setActiveTimerCardKey(null);
    setOpenCard2(null);
    setStep2View('cards');
  }, []);

  // ── Shared UI pieces ──────────────────────────────────────────────

  const renderBackBtn = (toStep: FlowStep) => (
    <TouchableOpacity
      onPress={() => goBackTo(toStep)}
      style={styles.backBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.65}>
      <Text style={styles.backText}>‹ Retour</Text>
    </TouchableOpacity>
  );

  const renderCloseBtn = () => (
    <TouchableOpacity
      onPress={onComplete}
      style={styles.closeBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.65}>
      <Text style={styles.closeText}>✕</Text>
    </TouchableOpacity>
  );

  const renderStepDots = (current: FlowStep) => (
    <View style={styles.stepDots}>
      {([1, 2, 3, 4, 5, 6] as FlowStep[]).map(n => (
        <View
          key={n}
          style={[
            styles.stepDot,
            n === current && styles.stepDotActive,
            n < current && styles.stepDotDone,
          ]}
        />
      ))}
    </View>
  );

  // ── Timer screen ──────────────────────────────────────────────────

  const renderTimerScreen = () => {
    const card = STEP2_CARDS.find(c => c.key === activeTimerCardKey);
    if (!card) return null;
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
      <SafeAreaView style={[timerScreenStyles.container, { paddingTop: insets.top + 8 }]} edges={[]}>

        <Text style={timerScreenStyles.title}>{card.closedTitle}</Text>
        {!timer2Done ? (
          <>
            <Text style={timerScreenStyles.accompText}>{card.timerText}</Text>
            <View style={timerScreenStyles.timerArea}>
              <Text style={timerScreenStyles.timerDisplay}>{fmt(timer2Secs)}</Text>
            </View>
            <TouchableOpacity style={timerScreenStyles.backBtn} onPress={backToCards} activeOpacity={0.75}>
              <Text style={timerScreenStyles.backBtnText}>Choisir autre chose</Text>
            </TouchableOpacity>
            {/* DEV ONLY — à supprimer avant la mise en production */}
            {activeTimerCardKey === 'eau' && (
              <TouchableOpacity
                onPress={() => { backToCards(); advanceTo(3); }}
                style={{ alignSelf: 'center', marginTop: 8 }}
                activeOpacity={0.7}>
                <Text style={{ fontSize: 12, color: C.textSub, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  ⚡ Skip → Étape 3
                </Text>
              </TouchableOpacity>
            )}
            {/* END DEV ONLY */}
          </>
        ) : (
          <ScrollView
            contentContainerStyle={timerScreenStyles.doneScrollContent}
            showsVerticalScrollIndicator={false}>
            <Text style={timerScreenStyles.doneText}>{card.doneText}</Text>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => advanceTo(3)} activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Continuer</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  };

  // ── Step renderers ────────────────────────────────────────────────

  const renderStep1 = () => {
    const selectedCard = selectedAction ? STEP1_ACTIONS.find(a => a.key === selectedAction) ?? null : null;

    const deselect = () => {
      setSelectedAction(null);
      setAutoSelected(false);
    };

    return (
      <TouchableWithoutFeedback onPress={deselect}>
        <View>
          {renderCloseBtn()}

          <View style={styles.progressWrap}>
            <Text style={styles.progressLabel}>Étape 1/6 · On coupe le trop-plein</Text>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
              <View style={{ flex: 5 }} />
            </View>
          </View>

          <Text style={styles.bigTitle}>Pause</Text>
          <Text style={styles.bigSub}>On coupe le trop-plein.</Text>
          <Text style={styles.bigDesc}>Ton cerveau reçoit trop de signaux. On en enlève juste un.</Text>

          <View style={styles.list}>
            {STEP1_ACTIONS.map(({ key, IconComponent, label, description }) => {
              const isSelected = selectedAction === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.iconCard, isSelected && styles.iconCardActive]}
                  onPress={() => {
                    setSelectedAction(isSelected ? null : key);
                    setAutoSelected(false);
                  }}
                  activeOpacity={0.75}>
                  <IconComponent
                    size={24}
                    color={isSelected ? C.primary : C.textSub}
                    strokeWidth={1.8}
                  />
                  <View style={styles.iconCardContent}>
                    <Text style={[styles.iconCardTitle, isSelected && styles.iconCardTitleActive]}>
                      {isSelected ? '✓ ' : ''}{label}
                    </Text>
                    <Text style={styles.iconCardDesc}>{description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {!selectedAction && !autoSelected && (
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() => { setAutoSelected(true); setSelectedAction(null); }}
              activeOpacity={0.75}>
              <Text style={styles.helpBtnText}>Je ne sais pas quoi choisir</Text>
            </TouchableOpacity>
          )}

          <Modal
            visible={Boolean(selectedCard || autoSelected)}
            transparent
            animationType="fade"
            onRequestClose={deselect}>
            <Pressable style={styles.validationBackdrop} onPress={deselect}>
              <BlurView
                intensity={18}
                tint="dark"
                style={StyleSheet.absoluteFill}
                experimentalBlurMethod="dimezisBlurView"
              />
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.12)' }]}
                pointerEvents="none"
              />
              <Pressable style={styles.validationModalCard} onPress={() => {}}>
                <TouchableOpacity
                  style={styles.validationModalClose}
                  onPress={deselect}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  activeOpacity={0.6}>
                  <X size={20} color={C.textSub} strokeWidth={2} />
                </TouchableOpacity>
                {autoSelected ? (
                  <>
                    <Text style={styles.validationSub}>
                      Pas grave. Quand choisir est déjà trop, on commence par le plus simple : couper les notifications pendant quelques minutes.
                    </Text>
                    <TouchableOpacity
                      style={[styles.ctaBtn, { marginTop: 14 }]}
                      onPress={() => { setSelectedAction('dnd'); setAutoSelected(false); }}
                      activeOpacity={0.82}>
                      <Text style={styles.ctaBtnText}>Ok, je commence par ça</Text>
                    </TouchableOpacity>
                  </>
                ) : selectedCard ? (
                  <>
                    <Text style={styles.validationSub}>{selectedCard.message}</Text>
                    <TouchableOpacity
                      style={[styles.ctaBtn, { marginTop: 14 }]}
                      onPress={() => advanceTo(2)}
                      activeOpacity={0.82}>
                      <Text style={styles.ctaBtnText}>{selectedCard.btnLabel}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const renderStep2 = () => {
    const progressBar = (
      <View style={styles.progressWrap}>
        <Text style={styles.progressLabel}>Étape 2/6 · Ancrage</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: 2 }]} />
          <View style={{ flex: 4 }} />
        </View>
      </View>
    );

    if (step2View === 'help') {
      return (
        <View>
          {renderBackBtn(1)}
          {progressBar}
          <View style={styles.step2HelpScreen}>
            <Text style={styles.step2HelpTitle}>
              Pas grave. Quand choisir est déjà trop, on fait au plus simple.
            </Text>
            <Text style={styles.step2HelpLine}>Si tu es chez toi et que tu peux bouger : marche lente.</Text>
            <Text style={styles.step2HelpLine}>Si tu veux quelque chose de très rapide : eau froide.</Text>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => launchTimer('marche')} activeOpacity={0.82}>
              <Text style={styles.ctaBtnText}>Faire la marche lente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctaBtnOutline, { marginTop: 12 }]} onPress={() => launchTimer('eau')} activeOpacity={0.82}>
              <Text style={styles.ctaBtnOutlineText}>Faire l'eau froide</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View>
        {renderBackBtn(1)}
        {progressBar}

        <Text style={styles.bigTitle}>On revient au corps.</Text>
        <Text style={styles.step2Para}>
          Là, ton cerveau porte trop d'informations d'un coup. Tu n'as pas besoin de tout comprendre maintenant. On va juste aider ton corps à redescendre un peu.
        </Text>
        <Text style={styles.step2Mini}>Choisis ce qui te semble le plus faisable. Une seule option suffit.</Text>

        <View style={styles.list}>
          {STEP2_CARDS.map(card => (
            <CardRow
              key={card.key}
              card={card}
              isOpen={openCard2 === card.key}
              onOpen={() => setOpenCard2(card.key)}
              onClose={() => setOpenCard2(null)}
              onLaunch={() => launchTimer(card.key)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => setStep2View('help')}
          activeOpacity={0.75}>
          <Text style={styles.helpBtnText}>Je ne sais pas quoi choisir</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep3NoWords = () => (
    <View>
      {renderBackBtn(2)}
      <View style={styles.progressWrap}>
        <Text style={styles.progressLabel}>Étape 3/6 · Décharge</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: 3 }]} />
          <View style={{ flex: 3 }} />
        </View>
      </View>

      <Text style={styles.bigTitle}>Pas grave. Tu n'as pas besoin d'expliquer.</Text>
      <Text style={styles.step2Para}>Choisis juste ce qui prend le plus de place maintenant.</Text>

      <View style={styles.list}>
        {STEP3_NOWORDS_OPTIONS.map(opt => {
          const isSelected = step3NoWordsChoice === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.nowordsCard, isSelected && styles.nowordsCardActive]}
              onPress={() => setStep3NoWordsChoice(isSelected ? null : opt.key)}
              activeOpacity={0.75}>
              <Text style={[styles.nowordsLabel, isSelected && styles.nowordsLabelActive]}>
                {isSelected ? '✓ ' : ''}{opt.label}
              </Text>
              <Text style={styles.nowordsDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {step3NoWordsChoice && (
        <TouchableOpacity style={styles.ctaBtn} onPress={handleStep3NoWords} activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Continuer avec ça</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep3 = () => {
    if (step3View === 'nowords') return renderStep3NoWords();

    const filledCount = STEP3_CARDS.filter(c => (brainFields[c.key] || []).length > 0).length;
    const counterText =
      filledCount === 0 ? 'Une carte suffit.' :
      filledCount === 1 ? '1 pensée déposée. C\'est déjà suffisant.' :
      filledCount === 2 ? '2 pensées déposées. Tu peux continuer ou t\'arrêter là.' :
      '3 pensées déposées. On peut trier après.';

    const moreMaxH = step3MoreAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2000] });
    const moreOpacity = step3MoreAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

    return (
      <View>
        {renderBackBtn(2)}

        {/* DEV ONLY — à supprimer avant la mise en production */}
        <TouchableOpacity
          onPress={() => advanceTo(4)}
          style={{ alignSelf: 'flex-end', marginBottom: 8 }}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 12, color: C.textSub, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
            ⚡ Skip → Étape 4
          </Text>
        </TouchableOpacity>
        {/* END DEV ONLY */}

        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>Étape 3/6 · Décharge</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { flex: 3 }]} />
            <View style={{ flex: 3 }} />
          </View>
        </View>

        <Text style={styles.bigTitle}>Dépose ici ce qui tourne dans ta tête.</Text>
        <Text style={styles.step2Para}>
          Ton cerveau essaie peut-être de tout garder ouvert en même temps. Ici, tu peux poser ce qui prend de la place, même si c'est flou, répétitif ou désordonné. Pas besoin de vider toute ta vie. Quelques mots suffisent.
        </Text>
        <Text style={styles.step2Mini}>Choisis une phrase qui te parle.</Text>

        <Text style={styles.step3Counter}>{counterText}</Text>

        <View style={styles.list}>
          {STEP3_CARDS.slice(0, 4).map(card => (
            <BrainCard
              key={card.key}
              card={card}
              values={brainFields[card.key] || []}
              onChange={vals => setBrainFields(prev => ({ ...prev, [card.key]: vals }))}
            />
          ))}
        </View>

        {!step3ShowMore && (
          <TouchableOpacity style={styles.showMoreBtn} onPress={handleShowMoreCards} activeOpacity={0.75}>
            <Text style={styles.showMoreBtnText}>Voir d'autres phrases</Text>
          </TouchableOpacity>
        )}

        <Animated.View style={{ maxHeight: moreMaxH, overflow: 'hidden', opacity: moreOpacity }}>
          <View style={[styles.list, { marginTop: 0 }]}>
            {STEP3_CARDS.slice(4).map(card => (
              <BrainCard
                key={card.key}
                card={card}
                values={brainFields[card.key] || []}
                onChange={vals => setBrainFields(prev => ({ ...prev, [card.key]: vals }))}
              />
            ))}
          </View>
        </Animated.View>

        <TouchableOpacity style={[styles.ctaBtn, { marginTop: 24 }]} onPress={handleStep3Submit} activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>Voilà ce que j'ai</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => setStep3View('nowords')}
          activeOpacity={0.75}>
          <Text style={styles.helpBtnText}>Je n'ai pas les mots, continuer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep4 = () => (
    <View>
      {renderBackBtn(3)}
      <View style={styles.progressWrap}>
        <Text style={styles.progressLabel}>Étape 4/6 · Tri</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: 4 }]} />
          <View style={{ flex: 2 }} />
        </View>
      </View>

      <Text style={styles.bigTitle}>On fait le tri.</Text>
      <Text style={styles.step2Para}>Ce n'est pas tout urgent. Regarde ce qui compte vraiment maintenant.</Text>

      {triageLoading && (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Tri en cours…</Text>
        </View>
      )}

      {!triageLoading && triage && (
        <View>
          {triageError && <Text style={styles.errorText}>{triageError}</Text>}

          {CATEGORIES.map(cat => {
            const items = triage[cat];
            if (items.length === 0) return null;
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <View key={cat} style={[styles.triageSection, { borderLeftColor: cfg.color }]}>
                <Text style={[styles.triageSectionTitle, { color: cfg.color }]}>{cfg.label}</Text>
                {items.map(item => (
                  <View key={item}>
                    <TouchableOpacity
                      style={styles.triageItem}
                      onPress={() =>
                        setEditingItem(prev =>
                          prev?.text === item && prev.from === cat ? null : { text: item, from: cat }
                        )
                      }
                      activeOpacity={0.75}>
                      <Text style={styles.triageItemText}>{item}</Text>
                      <Text style={styles.triageItemArrow}>↕</Text>
                    </TouchableOpacity>
                    {editingItem?.text === item && editingItem.from === cat && (
                      <View style={styles.categoryPicker}>
                        <Text style={styles.categoryPickerLabel}>Déplacer vers :</Text>
                        <View style={styles.categoryPickerRow}>
                          {CATEGORIES.filter(c => c !== cat).map(c => (
                            <TouchableOpacity
                              key={c}
                              style={[styles.categoryChip, { borderColor: CATEGORY_CONFIG[c].color }]}
                              onPress={() => moveItem(item, cat, c)}
                              activeOpacity={0.75}>
                              <Text style={[styles.categoryChipText, { color: CATEGORY_CONFIG[c].color }]}>
                                {CATEGORY_CONFIG[c].label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          })}

          {CATEGORIES.every(cat => triage[cat].length === 0) && (
            <Text style={styles.emptyText}>Rien à trier — ton esprit est déjà plus calme.</Text>
          )}

          <Text style={styles.triageQuote}>"Tout est bruyant, mais tout n'est pas urgent."</Text>

          <TouchableOpacity style={styles.ctaBtn} onPress={handleStep4Continue} activeOpacity={0.82}>
            <Text style={styles.ctaBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStep5 = () => (
    <View>
      {renderBackBtn(4)}
      <View style={styles.progressWrap}>
        <Text style={styles.progressLabel}>Étape 5/6 · Action</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: 5 }]} />
          <View style={{ flex: 1 }} />
        </View>
      </View>
      <Text style={styles.bigTitle}>Une seule action.</Text>
      <Text style={styles.step2Para}>Pas une mission. Choisis celle qui te semble la plus légère.</Text>

      {actionsLoading && (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Génération des actions…</Text>
        </View>
      )}

      {!actionsLoading && actions.length > 0 && (
        <View style={styles.list}>
          {actions.map(action => (
            <TouchableOpacity
              key={action}
              style={[styles.actionCard, selectedFinalAction === action && styles.actionCardActive]}
              onPress={() => setSelectedFinalAction(action)}
              activeOpacity={0.75}>
              <Text style={[styles.actionCardText, selectedFinalAction === action && styles.actionCardTextActive]}>
                {action}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedFinalAction && (
        <TouchableOpacity style={styles.ctaBtn} onPress={() => advanceTo(6)} activeOpacity={0.82}>
          <Text style={styles.ctaBtnText}>C'est celle-là</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStep6 = () => (
    <View>
      {renderStepDots(6)}
      <Text style={styles.stepTitle}>Tu as fait redescendre le volume. Maintenant, tu choisis la suite.</Text>

      <View style={styles.list}>
        {/* Carte 1 — Récupère */}
        <View style={[styles.step6Card, step6Choice === 'recover' && styles.step6CardActive]}>
          <TouchableOpacity
            style={styles.step6CardHeader}
            onPress={() => handleStep6Choice('recover')}
            activeOpacity={0.75}>
            <View style={{ flex: 1 }}>
              <Text style={styles.step6CardTitle}>Je récupère</Text>
              <Text style={styles.step6CardSub}>Tu es encore fragile. C'est ok.</Text>
            </View>
            <Text style={[styles.chevron, step6Choice === 'recover' && styles.chevronOpen]}>›</Text>
          </TouchableOpacity>
          {step6Choice === 'recover' && (
            <View style={styles.step6Body}>
              <View style={styles.recoverList}>
                {RECOVERY_SUGGESTIONS.map(s => (
                  <View key={s} style={styles.recoverRow}>
                    <Text style={styles.recoverBullet}>•</Text>
                    <Text style={styles.recoverText}>{s}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
                <Text style={styles.ctaBtnText}>Ok, je récupère</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Carte 2 — Continue doucement */}
        <View style={[styles.step6Card, step6Choice === 'continue' && styles.step6CardActive]}>
          <TouchableOpacity
            style={styles.step6CardHeader}
            onPress={() => handleStep6Choice('continue')}
            activeOpacity={0.75}>
            <View style={{ flex: 1 }}>
              <Text style={styles.step6CardTitle}>Je continue doucement</Text>
              <Text style={styles.step6CardSub}>Tu vas un peu mieux.</Text>
            </View>
            <Text style={[styles.chevron, step6Choice === 'continue' && styles.chevronOpen]}>›</Text>
          </TouchableOpacity>
          {step6Choice === 'continue' && (
            <View style={styles.step6Body}>
              {!taskAdded ? (
                <>
                  <View style={styles.actionReminder}>
                    <Text style={styles.actionReminderText}>"{selectedFinalAction}"</Text>
                  </View>
                  <Text style={styles.step6Question}>Veux-tu ajouter cette action à ta liste du jour ?</Text>
                  <TouchableOpacity style={styles.ctaBtn} onPress={addToToday} activeOpacity={0.82}>
                    <Text style={styles.ctaBtnText}>Ajouter à aujourd'hui</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.skipBtn} onPress={onComplete} activeOpacity={0.75}>
                    <Text style={styles.skipBtnText}>Non merci</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.successText}>✓ Ajouté à ta liste du jour !</Text>
                  <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
                    <Text style={styles.ctaBtnText}>Terminé</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Carte 3 — Reporte proprement */}
        <View style={[styles.step6Card, step6Choice === 'postpone' && styles.step6CardActive]}>
          <TouchableOpacity
            style={styles.step6CardHeader}
            onPress={() => handleStep6Choice('postpone')}
            activeOpacity={0.75}>
            <View style={{ flex: 1 }}>
              <Text style={styles.step6CardTitle}>Je reporte proprement</Text>
              <Text style={styles.step6CardSub}>C'est trop lourd pour maintenant.</Text>
            </View>
            <Text style={[styles.chevron, step6Choice === 'postpone' && styles.chevronOpen]}>›</Text>
          </TouchableOpacity>
          {step6Choice === 'postpone' && (
            <View style={styles.step6Body}>
              {!taskAdded ? (
                <>
                  <View style={styles.actionReminder}>
                    <Text style={styles.actionReminderText}>"{selectedFinalAction}"</Text>
                  </View>
                  <Text style={styles.step6Question}>Quand veux-tu reprendre ?</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={(_, date) => { if (date) setSelectedDate(date); }}
                      minimumDate={new Date()}
                      locale="fr-FR"
                      style={styles.datePicker}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.datePickerBtn}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.75}>
                        <Text style={styles.datePickerBtnText}>{formatDate(selectedDate)}</Text>
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={selectedDate}
                          mode="date"
                          display="default"
                          onChange={(_, date) => {
                            setShowDatePicker(false);
                            if (date) setSelectedDate(date);
                          }}
                          minimumDate={new Date()}
                        />
                      )}
                    </>
                  )}
                  <Text style={styles.step6Question}>
                    Ajouter cette tâche à ma liste du {formatDate(selectedDate)} ?
                  </Text>
                  <TouchableOpacity style={styles.ctaBtn} onPress={addToDate} activeOpacity={0.82}>
                    <Text style={styles.ctaBtnText}>Confirmer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.skipBtn} onPress={onComplete} activeOpacity={0.75}>
                    <Text style={styles.skipBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.successText}>✓ Ajouté à ta liste du {formatDate(selectedDate)} !</Text>
                  <TouchableOpacity style={styles.ctaBtn} onPress={onComplete} activeOpacity={0.82}>
                    <Text style={styles.ctaBtnText}>Terminé</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (step === 2 && step2View === 'timer') {
    return renderTimerScreen() ?? null;
  }

  if (step === 3) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <KeyboardAwareScrollView
          ref={scrollRef as any}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          enableOnAndroid={true}
          extraScrollHeight={80}
          enableResetScrollToCoords={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: insets.top + 8 }}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
            {renderStep3()}
          </Animated.View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {step === 6 && renderStep6()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  backBtn: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { fontSize: 16, color: C.primary, fontWeight: '600' },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  closeText: { fontSize: 18, color: C.textSub },

  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 28 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  stepDotActive: { backgroundColor: C.primary, width: 20 },
  stepDotDone: { backgroundColor: C.primaryMuted },

  stepTitle: {
    fontSize: 22, fontWeight: '800', color: C.text,
    marginBottom: 8, letterSpacing: -0.3, lineHeight: 30,
  },
  stepSub: { fontSize: 14, color: C.textSub, marginBottom: 24, lineHeight: 20 },

  list: { gap: 10, marginBottom: 24 },

  // Step 1 — barre de progression
  progressWrap: { marginBottom: 20 },
  progressLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 8 },
  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden', flexDirection: 'row' },
  progressFill: { flex: 1, backgroundColor: C.primary, borderRadius: 2 },

  // Step 1 — titres
  bigTitle: {
    fontSize: 36, fontWeight: '900', color: C.text,
    letterSpacing: -0.8, marginBottom: 4,
  },
  bigSub: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 10 },
  bigDesc: { fontSize: 15, color: C.textSub, lineHeight: 22, marginBottom: 24 },

  // Step 1 — cartes avec icône
  iconCard: {
    backgroundColor: C.surface, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  iconCardActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  iconCardContent: { flex: 1 },
  iconCardTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  iconCardTitleActive: { color: C.primary },
  iconCardDesc: { fontSize: 13, color: C.textSub, marginTop: 3, lineHeight: 18 },

  // Step 1 — bouton secondaire
  helpBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  helpBtnText: { fontSize: 14, color: C.textSub, textDecorationLine: 'underline' },

  // Step 1 — carte de validation (modal overlay centré + blur)
  validationSub: { fontSize: 14, color: C.textSub, lineHeight: 22 },
  validationBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  validationModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  validationModalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    zIndex: 2,
  },

  // Step 2 — technique cards
  techniqueCard: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, overflow: 'hidden',
  },
  techniqueCardActive: { borderColor: C.primary },
  techniqueHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
  },
  techniqueLabel: { fontSize: 15, fontWeight: '600', color: C.textSub },
  techniqueLabelActive: { color: C.primary },
  techniqueBody: { backgroundColor: C.expandBg, paddingHorizontal: 16, paddingVertical: 12 },
  techniqueInstruction: { fontSize: 14, color: C.text, lineHeight: 22 },

  chevron: { fontSize: 22, color: C.primaryMuted, transform: [{ rotate: '0deg' }], marginLeft: 8 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },

  // Step 3
  step3Counter: {
    fontSize: 13, color: C.textSub, textAlign: 'center',
    marginBottom: 14, fontStyle: 'italic',
  },
  showMoreBtn: { alignItems: 'center', paddingVertical: 12 },
  showMoreBtnText: { fontSize: 14, color: C.primary, fontWeight: '600', textDecorationLine: 'underline' },
  nowordsCard: {
    backgroundColor: C.surface, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: C.border,
  },
  nowordsCardActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  nowordsLabel: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  nowordsLabelActive: { color: C.primary },
  nowordsDesc: { fontSize: 13, color: C.textSub, lineHeight: 18 },

  // Loading
  loadingBlock: { alignItems: 'center', paddingVertical: 48, gap: 14 },
  loadingText: { fontSize: 15, color: C.textSub },
  errorText: { fontSize: 13, color: '#EF4444', marginBottom: 12, fontStyle: 'italic' },

  // Step 4 — triage
  triageSection: { marginBottom: 20, borderLeftWidth: 3, paddingLeft: 12 },
  triageSectionTitle: {
    fontSize: 12, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 8,
  },
  triageItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4,
    borderWidth: 1, borderColor: C.border,
  },
  triageItemText: { flex: 1, fontSize: 14, color: C.text, lineHeight: 20 },
  triageItemArrow: { fontSize: 14, color: C.primaryMuted, marginLeft: 8 },
  categoryPicker: { backgroundColor: C.expandBg, borderRadius: 10, padding: 10, marginBottom: 4 },
  categoryPickerLabel: { fontSize: 12, color: C.textSub, marginBottom: 8 },
  categoryPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  categoryChipText: { fontSize: 12, fontWeight: '600' },
  emptyText: { fontSize: 14, color: C.textSub, textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
  triageQuote: {
    fontSize: 15, color: C.primary, fontWeight: '600', fontStyle: 'italic',
    textAlign: 'center', marginVertical: 20, paddingHorizontal: 20,
  },

  // Step 5 — action cards
  actionCard: {
    backgroundColor: C.surface, borderRadius: 14,
    paddingVertical: 18, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center',
  },
  actionCardActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  actionCardText: { fontSize: 15, color: C.textSub, fontWeight: '600', textAlign: 'center' },
  actionCardTextActive: { color: C.primary },

  // Step 6 — cards
  step6Card: {
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  step6CardActive: { borderColor: C.primary },
  step6CardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  step6CardTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  step6CardSub: { fontSize: 13, color: C.textSub, marginTop: 2 },
  step6Body: { backgroundColor: C.expandBg, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18 },
  recoverList: { gap: 8, marginBottom: 16 },
  recoverRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recoverBullet: { fontSize: 14, color: C.primaryMuted },
  recoverText: { fontSize: 14, color: C.textSub },
  step6Question: { fontSize: 15, color: C.text, fontWeight: '600', marginBottom: 14, marginTop: 4 },
  actionReminder: { backgroundColor: C.primaryLight, borderRadius: 10, padding: 12, marginBottom: 12 },
  actionReminderText: { fontSize: 14, color: C.primary, fontWeight: '600', fontStyle: 'italic' },
  successText: { fontSize: 16, color: '#10B981', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  skipBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  skipBtnText: { fontSize: 14, color: C.textSub, fontWeight: '500' },

  // Date picker
  datePicker: { height: 120, marginVertical: 8 },
  datePickerBtn: {
    backgroundColor: C.primaryLight, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginBottom: 12,
  },
  datePickerBtnText: { fontSize: 15, color: C.primary, fontWeight: '600' },

  // CTA
  ctaBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  ctaBtnOutline: {
    backgroundColor: C.primaryLight, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 12, borderWidth: 1.5, borderColor: C.primary,
  },
  ctaBtnOutlineText: { color: C.primary, fontSize: 16, fontWeight: '700' },

  // Step 2
  step2Para: { fontSize: 15, color: C.textSub, lineHeight: 23, marginBottom: 12 },
  step2Mini: { fontSize: 14, color: C.primary, fontWeight: '600', marginBottom: 24 },
  step2HelpScreen: { paddingTop: 8 },
  step2HelpTitle: { fontSize: 18, fontWeight: '700', color: C.text, lineHeight: 26, marginBottom: 20 },
  step2HelpLine: { fontSize: 15, color: C.textSub, lineHeight: 22, marginBottom: 10 },
});
