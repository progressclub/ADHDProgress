import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  Modal,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, Activity, Zap, RefreshCw, Shield, X, Check, Volume2, BatteryLow, Smartphone, Settings, Users } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubView = 'hub' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5';
type SignalStatus = 'frequent' | 'today';
type SignalsMap = Record<string, SignalStatus>;
type TriggersMap = Record<string, 'frequent' | 'today'>;
type ReflexStatus = 'recognized' | 'not_me';
type ReflexesMap = Record<string, ReflexStatus>;

type Props = {
  onBack: () => void;
  onExpressFlow: () => void;
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const SK = {
  step1Read: 'saturation_step1_read',
  signals: 'saturation_signals',
  triggers: 'saturation_triggers',
  reflexes: 'saturation_reflexes',
  firstAction: 'saturation_first_action',
  phrase: 'saturation_phrase',
  protection: 'saturation_protection',
};

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
  warning: '#F59E0B',
  green: '#16A34A',
};

const S1 = {
  bg: '#FAFAF7',
  text: '#1A1A1A',
  accent: '#7B5EA7',
  line: '#E0DDD5',
  muted: '#999999',
  brown: '#2A1A0E',
};

// ─── Step 1 data ──────────────────────────────────────────────────────────────

const STEP1_SECONDARY = [
  { key: 'urgent',    label: 'Pourquoi tout semble urgent ?' },
  { key: 'choisir',  label: "Pourquoi tu n'arrives plus à choisir ?" },
  { key: 'todo',     label: 'Pourquoi une to-do list empire les choses' },
  { key: 'irritable',label: 'Pourquoi tu deviens irritable' },
  { key: 'telephone',label: 'Pourquoi tu cherches ton téléphone' },
  { key: 'annuler',  label: 'Pourquoi tu veux tout annuler' },
];

// ─── Signals ─────────────────────────────────────────────────────────────────

type SignalData = {
  key: string;
  label: string;
  category: string;
  phraseMiroir: string;
  ceQueVeutDire: string;
  ceQuiAggrave: string;
  aEssayer: string;
  phrase: string;
};

const SIGNALS: SignalData[] = [
  {
    key: 'urgent',
    label: 'Tout me paraît urgent',
    category: 'mental',
    phraseMiroir: "Une tâche, une notification, un objet au sol et une pensée anxieuse prennent tous la même place dans ta tête.",
    ceQueVeutDire: "Ton système de tri est débordé. Ce n'est pas que tout est urgent — c'est que tout est devenu bruyant.",
    ceQuiAggrave: "Faire une énorme to-do list ou essayer de tout résoudre d'un coup.",
    aEssayer: "Séparer en deux seulement — maintenant / pas maintenant.",
    phrase: "Tout est bruyant, mais tout n'est pas urgent.",
  },
  {
    key: 'commencer',
    label: 'Je ne sais plus par quoi commencer',
    category: 'mental',
    phraseMiroir: "Même une petite tâche semble demander trop d'étapes avant de pouvoir commencer.",
    ceQueVeutDire: "Ton cerveau n'a pas besoin d'un grand plan. Il a besoin d'une première action physique très petite.",
    ceQuiAggrave: "Chercher la meilleure priorité pendant 30 minutes.",
    aEssayer: "Une action de moins de 2 minutes — ouvrir le document, boire, écrire le premier mot.",
    phrase: "Je ne choisis pas toute ma journée. Je choisis le prochain mouvement.",
  },
  {
    key: 'pensees',
    label: "J'ai trop de pensées en même temps",
    category: 'mental',
    phraseMiroir: "Tu as l'impression d'avoir 40 onglets ouverts dans ta tête, tous actifs en même temps.",
    ceQueVeutDire: "Ta mémoire de travail est surchargée. Tu as besoin de sortir les pensées, pas de les organiser.",
    ceQuiAggrave: "Essayer de tout retenir mentalement.",
    aEssayer: "Brain dump rapide — écrire ou dicter tout ce qui tourne sans chercher à trier.",
    phrase: "Je n'ai pas besoin de porter ça uniquement dans ma tête.",
  },
  {
    key: 'relis',
    label: 'Je relis sans comprendre',
    category: 'mental',
    phraseMiroir: "Tes yeux passent sur les mots mais ton cerveau ne les reçoit plus vraiment.",
    ceQueVeutDire: "Ce n'est pas un manque d'effort. C'est un signe que la charge mentale est trop élevée.",
    ceQuiAggrave: "Forcer la lecture en boucle et se juger.",
    aEssayer: "Fermer le document 2 minutes, bouger, puis revenir avec une seule question en tête.",
    phrase: "Si je relis sans comprendre, je dois baisser la charge, pas forcer plus fort.",
  },
  {
    key: 'annuler',
    label: 'Je veux tout annuler',
    category: 'mental',
    phraseMiroir: "Tu as envie de tout supprimer, tout recommencer, tout couper d'un coup.",
    ceQueVeutDire: "Ton cerveau cherche une sortie rapide au trop-plein. Mais ce n'est pas forcément une décision à prendre maintenant.",
    ceQuiAggrave: "Envoyer un message impulsif ou supprimer un projet sous pression.",
    aEssayer: "Noter la décision et attendre 30 minutes ou le lendemain.",
    phrase: "Je peux réduire maintenant, décider plus tard.",
  },
  {
    key: 'nulle',
    label: 'Je me sens nulle / en retard',
    category: 'mental',
    phraseMiroir: "La saturation se transforme en jugement global sur toi-même.",
    ceQueVeutDire: "La honte s'ajoute au trop-plein. Saturer ne dit rien sur ta valeur.",
    ceQuiAggrave: "Comparer ta saturation à la productivité des autres.",
    aEssayer: "Nommer l'état — \"je suis en saturation, pas en échec.\"",
    phrase: "Ce que je vis est un état, pas mon identité.",
  },
  {
    key: 'bruits',
    label: 'Les bruits deviennent insupportables',
    category: 'corporel',
    phraseMiroir: "Des sons normaux semblent soudain trop forts, trop proches, trop agressifs.",
    ceQueVeutDire: "Ton seuil sensoriel est abaissé. Ton cerveau filtre moins bien parce qu'il est déjà trop chargé.",
    ceQuiAggrave: "Rester dans le bruit pour tenir.",
    aEssayer: "Casque, bouchons, changer de pièce ou 2 minutes de silence.",
    phrase: "Ce n'est pas moi qui suis trop sensible. C'est mon système qui est trop plein.",
  },
  {
    key: 'lumiere',
    label: "La lumière ou les écrans m'agressent",
    category: 'corporel',
    phraseMiroir: "La luminosité, les contrastes ou les mouvements à l'écran te semblent épuisants.",
    ceQueVeutDire: "Ton cerveau demande moins d'informations visuelles.",
    ceQuiAggrave: "Continuer à scroller, garder une lumière blanche forte.",
    aEssayer: "Baisser la luminosité, mode sombre, fermer des onglets, tamiser la pièce.",
    phrase: "Je peux rendre l'espace plus doux avant de réfléchir.",
  },
  {
    key: 'tension',
    label: 'Mon corps est tendu',
    category: 'corporel',
    phraseMiroir: "Mâchoire serrée, épaules hautes, ventre noué — ton corps est en alerte.",
    ceQueVeutDire: "Ton corps détecte le trop-plein avant ta tête. Tu as besoin de régulation corporelle avant d'être logique.",
    ceQuiAggrave: "Ignorer le corps et continuer à forcer mentalement.",
    aEssayer: "Expirer lentement, relâcher la mâchoire, mettre les pieds au sol.",
    phrase: "Mon corps me prévient avant le crash.",
  },
  {
    key: 'larmes',
    label: "J'ai envie de pleurer sans raison",
    category: 'corporel',
    phraseMiroir: "Les larmes arrivent sans événement précis, comme si quelque chose débordait.",
    ceQueVeutDire: "Ce n'est pas une réaction à un seul événement mais à une accumulation. Ton système demande une sortie de pression.",
    ceQuiAggrave: "Se dire \"je suis ridicule\" ou chercher une raison parfaite.",
    aEssayer: "S'isoler, laisser sortir, écrire une phrase sur ce qui pèse.",
    phrase: "Je n'ai pas besoin de justifier chaque larme.",
  },
  {
    key: 'epuisee',
    label: "Je suis épuisée d'un coup",
    category: 'corporel',
    phraseMiroir: "Tu passes de 'ça va' à 'je ne peux plus rien' sans transition.",
    ceQueVeutDire: "Ton cerveau a dépensé beaucoup d'énergie à filtrer, masquer et décider. La batterie tombe.",
    ceQuiAggrave: "Se forcer à fonctionner comme si la batterie était pleine.",
    aEssayer: "Mode économie — manger, boire, s'allonger, réduire à une seule tâche.",
    phrase: "Si ma batterie est basse, ma stratégie doit devenir plus petite.",
  },
  {
    key: 'scroll',
    label: 'Je scrolle sans plaisir',
    category: 'comportemental',
    phraseMiroir: "Tu vas sur ton téléphone sans vraiment savoir pourquoi, sans que ça t'apporte quelque chose.",
    ceQueVeutDire: "Tu cherches une sortie au trop-plein, pas du divertissement.",
    ceQuiAggrave: "Scroller jusqu'à se sentir mieux, sans limite.",
    aEssayer: "Timer 3 minutes puis action sensorielle — eau froide, marche, silence.",
    phrase: "Je ne cherche pas mon téléphone. Je cherche du soulagement.",
  },
  {
    key: 'commence',
    label: 'Je commence tout sans rien finir',
    category: 'comportemental',
    phraseMiroir: "Tu passes d'une tâche à l'autre, chacune en rappelle une autre, rien n'avance vraiment.",
    ceQueVeutDire: "Ton cerveau a besoin d'une seule piste visible.",
    ceQuiAggrave: "Essayer de profiter de l'énergie pour tout faire.",
    aEssayer: "Écrire les autres tâches dans un \"parking\" et choisir une seule action de 5 minutes.",
    phrase: "Je ne ferme pas tout. Je ferme juste une boucle.",
  },
  {
    key: 'figee',
    label: 'Je reste figée',
    category: 'comportemental',
    phraseMiroir: "Tu sais ce que tu dois faire mais tu ne bouges pas. Ton corps et ta tête semblent bloqués.",
    ceQueVeutDire: "Ce n'est pas de la paresse. C'est une réponse de protection face à trop d'options ou de pression.",
    ceQuiAggrave: "Se crier dessus intérieurement.",
    aEssayer: "Micro-action physique — poser les pieds au sol, se lever, prendre un verre.",
    phrase: "Si je suis figée, l'action doit devenir minuscule.",
  },
  {
    key: 'ranger',
    label: "Je veux tout ranger d'un coup",
    category: 'comportemental',
    phraseMiroir: "Soudain tu veux nettoyer, réorganiser, remettre tout à zéro immédiatement.",
    ceQueVeutDire: "Tu as besoin d'un espace moins bruyant, pas forcément d'un grand ménage.",
    ceQuiAggrave: "Transformer le reset en mission énorme.",
    aEssayer: "Une seule catégorie — poubelle, linge, vaisselle ou surface.",
    phrase: "Je ne range pas tout. Je baisse le bruit visuel.",
  },
  {
    key: 'repousse',
    label: 'Je repousse tout',
    category: 'comportemental',
    phraseMiroir: "Même les choses simples semblent impossibles à commencer.",
    ceQueVeutDire: "La tâche est probablement trop grosse dans ta tête.",
    ceQuiAggrave: "La laisser comme une masse vague.",
    aEssayer: "La réduire à une première action visible — ouvrir, cliquer, écrire, préparer.",
    phrase: "Je ne fais pas la tâche. Je fais l'entrée dans la tâche.",
  },
  {
    key: 'messages',
    label: 'Je vérifie mes messages en boucle',
    category: 'numérique',
    phraseMiroir: "Tu reviens sans cesse voir si quelqu'un a répondu, même si tu viens de regarder.",
    ceQueVeutDire: "Tu cherches à réduire une tension émotionnelle, pas une information.",
    ceQuiAggrave: "Relire, attendre, interpréter, imaginer.",
    aEssayer: "Notifications coupées, écrire une réponse dans Notes sans l'envoyer maintenant.",
    phrase: "Je n'ai pas besoin de vérifier pour être en sécurité.",
  },
  {
    key: 'notifs',
    label: 'Les notifications me stressent',
    category: 'numérique',
    phraseMiroir: "Chaque vibration ou son de notification crée une mini-tension.",
    ceQueVeutDire: "Chaque notification est vécue comme une nouvelle demande sur un système déjà plein.",
    ceQuiAggrave: "Garder toutes les notifications actives au cas où.",
    aEssayer: "Ne pas déranger, sons coupés, notifications groupées.",
    phrase: "Je peux être joignable plus tard. Là, je protège mon espace mental.",
  },
  {
    key: 'telephone',
    label: "J'ouvre mon téléphone sans raison",
    category: 'numérique',
    phraseMiroir: "Tu le prends automatiquement sans savoir ce que tu cherches.",
    ceQueVeutDire: "C'est un signal de tension intérieure, pas juste une mauvaise habitude.",
    ceQuiAggrave: "Ouvrir le téléphone sans intention.",
    aEssayer: "Avant de déverrouiller, demander \"je cherche quoi ?\" — si tu ne sais pas, poser le téléphone.",
    phrase: "Si je ne sais pas ce que je cherche, je cherche probablement à fuir le trop-plein.",
  },
  {
    key: 'sechement',
    label: 'Je réponds sèchement',
    category: 'social',
    phraseMiroir: "Une demande normale sort trop fort — tu le remarques après.",
    ceQueVeutDire: "Tu as besoin d'une pause avant de répondre, pas d'une meilleure réponse.",
    ceQuiAggrave: "Continuer la conversation quand tu sens que ça monte.",
    aEssayer: "\"Je suis saturée, je risque de répondre mal. Je reviens dans 20 minutes.\"",
    phrase: "Je peux poser une limite sans exploser.",
  },
  {
    key: 'isoler',
    label: "Je veux m'isoler brutalement",
    category: 'social',
    phraseMiroir: "Tu veux disparaître, ne plus répondre, couper tout contact.",
    ceQueVeutDire: "Tu as besoin d'une pause relationnelle. Ce besoin est légitime.",
    ceQuiAggrave: "Couper tout puis culpabiliser en silence.",
    aEssayer: "Envoyer une phrase simple — \"je suis saturée, j'ai besoin d'un moment, je reviens.\"",
    phrase: "Je peux m'isoler sans disparaître.",
  },
  {
    key: 'dette',
    label: 'Les messages non répondus deviennent une dette',
    category: 'social',
    phraseMiroir: "Plus tu attends pour répondre, plus répondre semble énorme et chargé.",
    ceQueVeutDire: "Chaque message non répondu accumule honte, peur du jugement et pression.",
    ceQuiAggrave: "Vouloir faire une réponse parfaite qui explique tout.",
    aEssayer: "Message tampon — \"j'ai vu ton message, je te réponds mieux plus tard.\"",
    phrase: "Une réponse imparfaite peut rouvrir le lien.",
  },
];

const SIGNAL_CATS: { key: string; label: string }[] = [
  { key: 'mental', label: 'Dans ma tête' },
  { key: 'corporel', label: 'Dans mon corps' },
  { key: 'comportemental', label: 'Dans mes comportements' },
  { key: 'numérique', label: 'Avec mon téléphone' },
  { key: 'social', label: 'Avec les autres' },
];

// ─── Trigger families ─────────────────────────────────────────────────────────

type TriggerItem = {
  key: string;
  label: string;
  ceQueFaCeFait: string;
  pourquoiCaSature: string;
  protection: string;
};
type TriggerFamily = {
  key: string;
  label: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  triggers: TriggerItem[];
};

const TRIGGER_FAMILIES: TriggerFamily[] = [
  {
    key: 'env',
    label: 'Autour de moi',
    color: '#EFF6FF',
    Icon: Volume2,
    triggers: [
      {
        key: 'trig_bruit', label: 'Le bruit',
        ceQueFaCeFait: "Les sons continus ou imprévisibles activent ton système d'alerte en permanence.",
        pourquoiCaSature: "Ton cerveau filtre moins bien les autres informations quand il surveille les sons en arrière-plan.",
        protection: "Casque, bouchons ou changer de pièce avant de démarrer une tâche cognitive.",
      },
      {
        key: 'trig_lumiere', label: 'La lumière forte',
        ceQueFaCeFait: "Les écrans lumineux ou la lumière crue augmentent la charge visuelle et cognitive.",
        pourquoiCaSature: "Traiter une lumière intense consomme de l'énergie que ton cerveau ne peut pas dédier ailleurs.",
        protection: "Baisser la luminosité, mode sombre, tamiser la pièce.",
      },
      {
        key: 'trig_desordre', label: 'Le désordre visuel',
        ceQueFaCeFait: "Un espace encombré crée une charge visuelle permanente même sans que tu t'en rendes compte.",
        pourquoiCaSature: "Ton cerveau enregistre chaque objet comme une information à traiter.",
        protection: "Dégager une seule surface de travail avant de commencer.",
      },
      {
        key: 'trig_foule', label: 'La foule',
        ceQueFaCeFait: "Trop de monde crée une stimulation sensorielle intense et imprévisible.",
        pourquoiCaSature: "Les mouvements, les sons et les présences simultanées épuisent le filtrage.",
        protection: "Planifier une période calme après une sortie en public.",
      },
      {
        key: 'trig_espace', label: "L'espace chargé",
        ceQueFaCeFait: "Trop d'objets ou de stimuli visuels autour de toi te maintiennent en état d'alerte de fond.",
        pourquoiCaSature: "Le cerveau ne peut pas décider quoi ignorer, alors il ne ignore rien.",
        protection: "Créer un espace minimaliste pour les moments de travail intense.",
      },
    ],
  },
  {
    key: 'body',
    label: 'Mon énergie',
    color: '#FFF7ED',
    Icon: BatteryLow,
    triggers: [
      {
        key: 'trig_faim', label: 'La faim',
        ceQueFaCeFait: "Une glycémie basse réduit directement ta capacité à filtrer et prioriser.",
        pourquoiCaSature: "Le cerveau manque de carburant pour gérer les fonctions exécutives.",
        protection: "Manger quelque chose de solide avant les tâches cognitives importantes.",
      },
      {
        key: 'trig_fatigue', label: 'La fatigue',
        ceQueFaCeFait: "Tes ressources cognitives sont réduites depuis le départ de la journée.",
        pourquoiCaSature: "Moins d'énergie disponible signifie moins de marge avant le trop-plein.",
        protection: "Commencer par les tâches prioritaires quand tu es encore frais.",
      },
      {
        key: 'trig_sommeil', label: 'Le manque de sommeil',
        ceQueFaCeFait: "Le cerveau régule beaucoup moins bien les émotions et les informations.",
        pourquoiCaSature: "La nuit répare les fonctions exécutives. Sans elle, elles démarrent déjà dégradées.",
        protection: "Réduire les attentes de la journée si tu as mal dormi.",
      },
      {
        key: 'trig_pause', label: 'Le manque de pauses',
        ceQueFaCeFait: "Le système tourne en continu sans jamais se réinitialiser.",
        pourquoiCaSature: "Sans pause, la charge s'accumule sans possibilité de libérer de la mémoire de travail.",
        protection: "Pause de 5 minutes toutes les 45 à 60 minutes, sans écran.",
      },
      {
        key: 'trig_tension', label: 'La tension physique',
        ceQueFaCeFait: "Corps en alerte signifie cerveau en mode surveillance permanente.",
        pourquoiCaSature: "La tension physique consomme de l'énergie cognitive sans que tu t'en rendes compte.",
        protection: "Expirer lentement, relâcher la mâchoire, poser les pieds au sol.",
      },
    ],
  },
  {
    key: 'phone',
    label: 'Mon téléphone',
    color: '#F5F3FF',
    Icon: Smartphone,
    triggers: [
      {
        key: 'trig_notifs', label: 'Les notifications',
        ceQueFaCeFait: "Chaque alerte est vécue comme une nouvelle demande sur ton système déjà occupé.",
        pourquoiCaSature: "L'interruption constante empêche ton cerveau d'entrer dans un mode de traitement profond.",
        protection: "Ne pas déranger activé, notifications groupées ou désactivées pendant le travail.",
      },
      {
        key: 'trig_messages', label: 'Les messages non répondus',
        ceQueFaCeFait: "Chaque message en attente accumule une pression émotionnelle sous-jacente.",
        pourquoiCaSature: "La dette relationnelle tourne en fond même quand tu fais autre chose.",
        protection: "'J'ai vu, je réponds plus tard' — un message tampon libère la boucle ouverte.",
      },
      {
        key: 'trig_onglets', label: "Trop d'onglets",
        ceQueFaCeFait: "Chaque onglet ouvert représente une boucle non fermée dans ta tête.",
        pourquoiCaSature: "La sensation de devoir ne rien rater mobilise de l'attention en permanence.",
        protection: "Fermer tout ce qui ne sert pas à la tâche en cours.",
      },
      {
        key: 'trig_infos', label: "Le flux d'informations",
        ceQueFaCeFait: "Le cerveau reçoit plus d'informations qu'il ne peut en traiter.",
        pourquoiCaSature: "L'information non traitée s'accumule et alourdit la mémoire de travail.",
        protection: "Coupure numérique de 20 minutes avant une tâche cognitive importante.",
      },
      {
        key: 'trig_scroll', label: 'Le scroll prolongé',
        ceQueFaCeFait: "Stimulation continue sans décision ni fin clairement définie.",
        pourquoiCaSature: "Le cerveau reste en mode réception sans jamais traiter ni clore.",
        protection: "Timer 5 minutes puis action physique avant de reprendre le travail.",
      },
    ],
  },
  {
    key: 'mental',
    label: 'Ma charge mentale',
    color: '#EDE9FE',
    Icon: Settings,
    triggers: [
      {
        key: 'trig_deadlines', label: 'Les deadlines',
        ceQueFaCeFait: "La pression temporelle réelle ou imaginée maintient le cerveau en mode urgence.",
        pourquoiCaSature: "L'état d'urgence chronique épuise les réserves de régulation émotionnelle.",
        protection: "Externaliser la deadline — noter avec une heure précise plutôt que garder en tête.",
      },
      {
        key: 'trig_choix', label: 'Trop de choix',
        ceQueFaCeFait: "Chaque décision coûte de l'énergie cognitive, même les petites.",
        pourquoiCaSature: "L'épuisement décisionnel réduit la qualité de toutes les décisions suivantes.",
        protection: "Réduire à deux options maximum et décider rapidement.",
      },
      {
        key: 'trig_taches', label: 'Les tâches ouvertes',
        ceQueFaCeFait: "Chaque tâche non terminée reste active en arrière-plan comme une boucle ouverte.",
        pourquoiCaSature: "Plusieurs boucles ouvertes simultanément saturent la mémoire de travail.",
        protection: "Parking — écrire toutes les tâches ouvertes et n'en garder qu'une active.",
      },
      {
        key: 'trig_imprevus', label: 'Les imprévus',
        ceQueFaCeFait: "Une rupture de plan force ton cerveau à recalculer tout depuis le début.",
        pourquoiCaSature: "Le cerveau TDAH s'appuie sur la routine pour économiser de l'énergie. Sans elle, le coût est élevé.",
        protection: "Buffer de 15 minutes dans chaque journée pour absorber l'inattendu.",
      },
      {
        key: 'trig_floue', label: 'Les tâches floues',
        ceQueFaCeFait: "Sans début clair, le cerveau ne peut pas démarrer et tourne en rond.",
        pourquoiCaSature: "L'effort de définir la tâche s'ajoute à l'effort de la faire.",
        protection: "Reformuler la tâche en action physique : ouvrir, écrire, cliquer, appeler.",
      },
    ],
  },
  {
    key: 'social',
    label: 'Les autres',
    color: '#FFF0F3',
    Icon: Users,
    triggers: [
      {
        key: 'trig_conflits', label: 'Les conflits',
        ceQueFaCeFait: "La tension relationnelle non résolue occupe de l'espace mental en permanence.",
        pourquoiCaSature: "Le cerveau revient en boucle sur les conflits pour tenter de les résoudre.",
        protection: "Écrire ce qui pèse dans la relation avant de tenter une conversation.",
      },
      {
        key: 'trig_pression', label: 'La pression sociale',
        ceQueFaCeFait: "Les attentes perçues des autres créent une surveillance constante de toi-même.",
        pourquoiCaSature: "Monitorer ce que les autres pensent épuise de l'énergie cognitive sans fin.",
        protection: "Identifier une attente réelle vs une attente que tu t'inventes.",
      },
      {
        key: 'trig_comparaison', label: 'La comparaison',
        ceQueFaCeFait: "Se mesurer aux autres active un état émotionnel négatif qui s'ajoute à la charge.",
        pourquoiCaSature: "La comparaison crée une dissonance qui demande à être résolue, sans solution possible.",
        protection: "Nommer : 'je compare, pas je mesure.' Ce n'est pas la même chose.",
      },
      {
        key: 'trig_decevoir', label: 'La peur de décevoir',
        ceQueFaCeFait: "Anticiper le jugement des autres monopolise de l'attention et de l'énergie.",
        pourquoiCaSature: "La vigilance émotionnelle constante est épuisante, même quand rien ne se passe.",
        protection: "Se poser : 'qu'est-ce que je ferais si je n'avais pas peur de décevoir ?'",
      },
      {
        key: 'trig_ambigu', label: 'Les messages ambigus',
        ceQueFaCeFait: "Un message dont tu n'es pas sûr du sens génère de l'interprétation en boucle.",
        pourquoiCaSature: "L'incertitude émotionnelle est une charge cognitive comme une autre.",
        protection: "Demander directement si possible. Sinon, noter et laisser reposer 24h.",
      },
    ],
  },
];

function getComboText(triggersMap: TriggersMap): string {
  const selectedKeys = Object.keys(triggersMap);
  const actFam = new Set(
    TRIGGER_FAMILIES
      .filter(f => f.triggers.some(t => selectedKeys.includes(t.key)))
      .map(f => f.key),
  );
  if (actFam.size >= 4)
    return "Quatre familles ou plus actives en même temps. Ton système est en mode survie. Réduire le volume sur au moins deux fronts avant de tenter quoi que ce soit d'autre.";
  if (actFam.has('body') && actFam.has('mental') && actFam.has('social'))
    return "Énergie basse, pression mentale et tension relationnelle : les trois ensemble réduisent presque tout ton espace. Commence par le corps — même 10 minutes changent la capacité à filtrer.";
  if (actFam.has('body') && actFam.has('phone'))
    return "Fatigue et surcharge numérique : ton cerveau reçoit trop avec moins de ressources pour filtrer. Couper les notifications aide souvent plus que de forcer la concentration.";
  if (actFam.has('env') && actFam.has('mental'))
    return "Environnement chargé et pression mentale : deux sources de bruit simultanées. Même changer de pièce peut réduire la charge globale.";
  if (actFam.has('social') && actFam.has('mental'))
    return "Pression relationnelle et mentale ensemble peuvent amplifier le sentiment d'être dépassée. Différer une réponse ou une décision de 30 minutes aide souvent.";
  if (actFam.has('body') && actFam.has('env'))
    return "Énergie basse et environnement chargé. Ta marge est réduite dès le départ. Un espace plus calme aide ton système à filtrer.";
  if (actFam.has('phone') && actFam.has('mental'))
    return "Trop d'informations et trop de pression mentale : ton cerveau ne sait plus quoi traiter en premier. Réduire les entrées numériques libère de l'espace pour la réflexion.";
  return "Ces éléments ensemble réduisent ta marge de tolérance. Les jours comme ça, moins d'options et moins de stimulation aident avant toute décision.";
}

const PROTECTION_ACTIONS: Record<string, { title: string; desc: string }[]> = {
  env: [
    { title: "Changer d'espace", desc: "Passer dans une pièce plus calme ou réduire les stimuli autour de toi." },
    { title: "Casque ou silence", desc: "Couper le bruit ambiant, même 10 minutes." },
    { title: "Dégager une surface", desc: "Libérer l'espace de travail de tout ce qui n'est pas nécessaire." },
  ],
  body: [
    { title: "Manger quelque chose", desc: "Glycémie basse réduit le filtrage. Prioriser avant toute décision." },
    { title: "Pause sans écran", desc: "5 minutes assis, dehors ou allongé, sans stimulation." },
    { title: "Relâcher le corps", desc: "Expirer, dénouer les épaules, poser les pieds à plat." },
  ],
  phone: [
    { title: "Couper les notifications", desc: "Ne pas déranger activé pour au moins une heure." },
    { title: "Fermer les onglets", desc: "Garder uniquement ce qui sert à la tâche en cours." },
    { title: "Message tampon", desc: "'J'ai vu, je reviens plus tard' — libère la pression des messages en attente." },
  ],
  mental: [
    { title: "Parking des tâches", desc: "Écrire toutes les tâches ouvertes et n'en garder qu'une visible." },
    { title: "Réduire à 2 options", desc: "Face à trop de choix, limiter à deux options et décider vite." },
    { title: "Définir la prochaine action", desc: "Reformuler la tâche floue en geste physique concret." },
  ],
  social: [
    { title: "Poser une limite simple", desc: "'Je suis saturée, je reviens dans 30 minutes.' Envoyer et couper." },
    { title: "Différer la réponse", desc: "Ne pas répondre à un message ambigu sous pression. Laisser reposer." },
    { title: "Écrire ce qui pèse", desc: "Mettre sur papier la tension relationnelle avant d'en parler." },
  ],
};

function getProtectionActions(triggersMap: TriggersMap): { title: string; desc: string }[] {
  const activeFamilies = TRIGGER_FAMILIES
    .filter(f => f.triggers.some(t => triggersMap[t.key]))
    .map(f => f.key);
  const actions: { title: string; desc: string }[] = [];
  for (const famKey of activeFamilies) {
    if (actions.length >= 3) break;
    const famActions = PROTECTION_ACTIONS[famKey] ?? [];
    if (famActions.length > 0) actions.push(famActions[0]);
  }
  return actions;
}

const PROTECTION_PHRASES = [
  "Je baisse le volume avant de chercher une solution.",
  "Ce n'est pas le moment de décider. C'est le moment de décompresser.",
  "Je réduis d'abord, je reprends après.",
  "Une seule chose suffit maintenant.",
];

// ─── Reflexes ─────────────────────────────────────────────────────────────────

type ReflexData = {
  key: string;
  title: string;
  phraseMiroir: string;
  ceTonCerveauCherche: string;
  ceQuiPeutAggraver: string;
  alternativePlusDouce: string;
  phrase: string;
};

const REFLEXES: ReflexData[] = [
  {
    key: 'scroll',
    title: 'Je scrolle sans plaisir',
    phraseMiroir: "Tu ouvres ton téléphone sans savoir ce que tu cherches, et tu scrolles sans te souvenir de ce que tu viens de voir.",
    ceTonCerveauCherche: "Stimulation simple, immédiate, sans décision à prendre.",
    ceQuiPeutAggraver: "Plus d'images, de sons, de comparaisons — le cerveau reçoit plus alors qu'il est déjà plein.",
    alternativePlusDouce: "Timer 3 minutes. Puis poser le téléphone et faire une action sensorielle : eau froide, 2 minutes dehors, ou s'allonger.",
    phrase: "Je ne cherche pas mon téléphone. Je cherche du soulagement.",
  },
  {
    key: 'isole',
    title: "Je m'isole brutalement",
    phraseMiroir: "Tu disparais sans prévenir, tu coupes les conversations, tu veux ne plus exister dans l'espace des autres.",
    ceTonCerveauCherche: "Réduire les demandes sociales et reprendre de l'espace mental.",
    ceQuiPeutAggraver: "Couper sans dire pourquoi génère culpabilité et incompréhension, ce qui ajoute de la charge.",
    alternativePlusDouce: "Envoyer un message court avant de disparaître : \"j'ai besoin d'un moment, je reviens.\"",
    phrase: "Je peux m'isoler sans disparaître.",
  },
  {
    key: 'seche',
    title: 'Je réponds sèchement',
    phraseMiroir: "Une question normale sort trop fort — un mot de trop, un ton trop brusque. Tu le remarques souvent après.",
    ceTonCerveauCherche: "Économiser de l'énergie et réduire la charge relationnelle.",
    ceQuiPeutAggraver: "Tension relationnelle et culpabilité après, qui s'ajoutent à ce qui est déjà là.",
    alternativePlusDouce: "Ne pas répondre maintenant. Écrire \"je reviens dans 20 min\" ou ne rien dire du tout.",
    phrase: "Je peux poser une limite sans exploser.",
  },
  {
    key: 'figee',
    title: 'Je reste figée',
    phraseMiroir: "Tu sais ce que tu dois faire, tu le vois, mais rien ne démarre. Ton corps et ta tête sont comme bloqués.",
    ceTonCerveauCherche: "Ne pas aggraver une situation déjà instable en agissant sous pression.",
    ceQuiPeutAggraver: "Se forcer mentalement et se juger d'être immobile augmente la pression sans aider à bouger.",
    alternativePlusDouce: "Micro-action physique : poser les pieds à plat, se lever, boire quelque chose. Le mouvement du corps précède souvent celui de la tête.",
    phrase: "Si je suis figée, l'action doit devenir minuscule.",
  },
  {
    key: 'ranger',
    title: "Je veux tout ranger d'un coup",
    phraseMiroir: "Soudain tu veux tout réorganiser, tout recommencer, remettre la maison ou la vie à zéro — maintenant.",
    ceTonCerveauCherche: "Retrouver du contrôle sur un environnement perçu comme trop chargé.",
    ceQuiPeutAggraver: "Le projet devient trop grand, il échoue, et l'échec ajoute à l'épuisement.",
    alternativePlusDouce: "Une seule surface. Cinq minutes. Pas tout.",
    phrase: "Je ne range pas tout. Je baisse le bruit visuel.",
  },
  {
    key: 'dort',
    title: 'Je dors pour fuir',
    phraseMiroir: "Tu n'es pas vraiment fatiguée — ou peut-être que si, mais surtout tu veux que tout s'arrête le temps d'un sommeil.",
    ceTonCerveauCherche: "Couper toute entrée d'informations et mettre le système en pause.",
    ceQuiPeutAggraver: "Sans alarme ni intention notée, se réveiller face à tout ce qui n'a pas bougé peut amplifier la saturation.",
    alternativePlusDouce: "Repos volontaire de 20 minutes avec alarme. Avant de dormir, noter une seule phrase : la prochaine action à faire quand tu te réveilles.",
    phrase: "Je peux faire une pause intentionnelle plutôt que fuir.",
  },
  {
    key: 'mille',
    title: 'Je fais mille choses à la fois',
    phraseMiroir: "Tu passes d'une tâche à l'autre, tu ouvres des onglets, tu commences sans finir — tu as l'impression d'avancer.",
    ceTonCerveauCherche: "Avoir l'impression de gérer et de ne pas rater quelque chose d'important.",
    ceQuiPeutAggraver: "L'énergie se disperse, rien n'avance vraiment, et la confusion augmente.",
    alternativePlusDouce: "Choisir une seule tâche physique et visible. Écrire les autres dans un parking à regarder plus tard.",
    phrase: "Je ne ferme pas tout. Je ferme juste une boucle.",
  },
  {
    key: 'repousse',
    title: 'Je repousse tout',
    phraseMiroir: "Même les tâches simples semblent impossibles à commencer. Tu les vois, mais rien ne démarre.",
    ceTonCerveauCherche: "Éviter une nouvelle pression sur un système déjà débordé.",
    ceQuiPeutAggraver: "La tâche reste vague et grande dans la tête, ce qui l'alourdit encore plus.",
    alternativePlusDouce: "Réduire la tâche à une première action visible : ouvrir, cliquer, écrire un mot, préparer le document.",
    phrase: "Je ne fais pas la tâche. Je fais l'entrée dans la tâche.",
  },
];

// ─── Suggested phrases ────────────────────────────────────────────────────────

const SUGGESTED_PHRASES = [
  "Tout est bruyant, mais tout n'est pas urgent.",
  "Je baisse le volume avant de chercher une solution.",
  "Je peux faire une seule chose.",
  "Mon cerveau a besoin d'espace, pas de pression.",
];

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: Array<{ key: SubView; label: string; index: number }> = [
  { key: 'step1', label: 'Comprendre', index: 1 },
  { key: 'step2', label: 'Repérer', index: 2 },
  { key: 'step3', label: 'Identifier', index: 3 },
  { key: 'step4', label: 'Observer', index: 4 },
  { key: 'step5', label: 'Construire', index: 5 },
];

const NEXT_STEP: Partial<Record<SubView, SubView>> = {
  step1: 'step2',
  step2: 'step3',
  step3: 'step4',
  step4: 'step5',
};

const NEXT_LABEL: Partial<Record<SubView, string>> = {
  step1: 'Repérer',
  step2: 'Identifier',
  step3: 'Observer',
  step4: 'Construire',
};

const STEP_LABELS: Partial<Record<SubView, string>> = {
  step1: 'Comprendre · Étape 1/5',
  step2: 'Repérer · Étape 2/5',
  step3: 'Identifier · Étape 3/5',
  step4: 'Observer · Étape 4/5',
  step5: 'Construire · Étape 5/5',
};

const STEP_SHORT_TITLES: Partial<Record<SubView, string>> = {
  step1: 'Le trop-plein expliqué',
  step2: 'Mes signaux de saturation',
  step3: 'Mes déclencheurs',
  step4: 'Mes réflexes automatiques',
  step5: 'Mon plan anti-saturation',
};

// ─── EyeAnimation ─────────────────────────────────────────────────────────────

const EYE_W = 72;
const EYE_H = 40;

function SignalEye() {
  const lidAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(lidAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(lidAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]).start();
  }, []);

  const lidH = lidAnim.interpolate({ inputRange: [0, 1], outputRange: [0, EYE_H] });

  return (
    <View style={s.eyeWrap}>
      <View style={s.eyeOuter}>
        <View style={s.eyeIris}>
          <View style={s.eyePupil} />
        </View>
        <Animated.View style={[s.eyeLid, { height: lidH }]} />
      </View>
    </View>
  );
}

// ─── SignalModal ──────────────────────────────────────────────────────────────

type SignalModalProps = {
  signal: SignalData;
  currentStatus: SignalStatus | undefined;
  onClose: () => void;
  onSave: (key: string, status: SignalStatus) => void;
};

function SignalModal({ signal, currentStatus, onClose, onSave }: SignalModalProps) {
  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity activeOpacity={1} style={s.modalBackdrop} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalCard} onPress={() => {}}>
          <TouchableOpacity style={s.modalX} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={C.textSub} />
          </TouchableOpacity>
          <SignalEye />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
            <Text style={s.modalTitle}>{signal.label}</Text>
            <Text style={s.modalMiroir}>{signal.phraseMiroir}</Text>
            <ModalBlock label="CE QUE ÇA PEUT VOULOIR DIRE" text={signal.ceQueVeutDire} />
            <ModalBlock label="CE QUI PEUT AGGRAVER" text={signal.ceQuiAggrave} color={C.warning} />
            <ModalBlock label="À ESSAYER MAINTENANT" text={signal.aEssayer} color={C.green} />
            <View style={s.modalPhraseBlock}>
              <Text style={s.modalPhraseText}>{signal.phrase}</Text>
            </View>
          </ScrollView>
          <View style={s.modalBtns}>
            <TouchableOpacity
              style={[s.modalBtn, currentStatus === 'frequent' && s.modalBtnActive]}
              onPress={() => onSave(signal.key, 'frequent')}
              activeOpacity={0.8}>
              <Text style={[s.modalBtnText, currentStatus === 'frequent' && s.modalBtnTextActive]}>
                Ça m'arrive souvent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalBtn, currentStatus === 'today' && s.modalBtnActive]}
              onPress={() => onSave(signal.key, 'today')}
              activeOpacity={0.8}>
              <Text style={[s.modalBtnText, currentStatus === 'today' && s.modalBtnTextActive]}>
                Ça m'arrive aujourd'hui
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalGhost} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.modalGhostText}>Pas moi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── ReflexModal ──────────────────────────────────────────────────────────────

type ReflexModalProps = {
  reflex: ReflexData;
  status: ReflexStatus | null;
  onClose: () => void;
  onToggle: (key: string, action: ReflexStatus) => void;
};

function ReflexModal({ reflex, status, onClose, onToggle }: ReflexModalProps) {
  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity activeOpacity={1} style={s.modalBackdrop} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalCard} onPress={() => {}}>
          <TouchableOpacity style={s.modalX} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={C.textSub} />
          </TouchableOpacity>
          <SignalEye />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
            <Text style={s.modalTitle}>{reflex.title}</Text>
            <Text style={s.modalMiroir}>{reflex.phraseMiroir}</Text>
            <ModalBlock label="CE QUE TON CERVEAU CHERCHE" text={reflex.ceTonCerveauCherche} />
            <ModalBlock label="POURQUOI ÇA PEUT AGGRAVER" text={reflex.ceQuiPeutAggraver} color={C.warning} />
            <ModalBlock label="ALTERNATIVE PLUS DOUCE" text={reflex.alternativePlusDouce} color={C.green} />
            <View style={s.modalPhraseBlock}>
              <Text style={s.modalPhraseText}>{reflex.phrase}</Text>
            </View>
          </ScrollView>
          <View style={s.modalBtns}>
            <TouchableOpacity
              style={[s.modalBtn, status === 'recognized' && s.modalBtnActive]}
              onPress={() => onToggle(reflex.key, 'recognized')}
              activeOpacity={0.8}>
              <Text style={[s.modalBtnText, status === 'recognized' && s.modalBtnTextActive]}>
                {status === 'recognized' ? 'Reconnu ✓' : 'Je me reconnais là'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalBtn, status === 'not_me' && s.modalBtnActive]}
              onPress={() => onToggle(reflex.key, 'not_me')}
              activeOpacity={0.8}>
              <Text style={[s.modalBtnText, status === 'not_me' && s.modalBtnTextActive]}>
                Pas moi
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function ModalBlock({ label, text, color = C.primary }: { label: string; text: string; color?: string }) {
  return (
    <View style={s.modalBlock}>
      <Text style={[s.modalBlockLabel, { color }]}>{label}</Text>
      <Text style={s.modalBlockText}>{text}</Text>
    </View>
  );
}

// ─── TriggerDrop ──────────────────────────────────────────────────────────────

function TriggerDrop() {
  const dropY = useRef(new Animated.Value(0)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const runLoop = () => {
      dropY.setValue(0);
      fillOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(dropY, { toValue: 28, duration: 500, useNativeDriver: true }),
        Animated.timing(fillOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(380),
        Animated.timing(fillOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start(() => { timeoutId = setTimeout(runLoop, 650); });
    };
    timeoutId = setTimeout(runLoop, 250);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <View style={s.dropWrap}>
      <Animated.View style={[s.dropTear, { transform: [{ translateY: dropY }] }]} />
      <View style={s.dropCircle}>
        <Animated.View style={[s.dropCircleFill, { opacity: fillOpacity }]} />
      </View>
    </View>
  );
}

// ─── TriggerModal ─────────────────────────────────────────────────────────────

type TriggerModalProps = {
  item: TriggerItem;
  currentStatus: 'frequent' | 'today' | undefined;
  onClose: () => void;
  onStatus: (key: string, status: 'frequent' | 'today' | null) => void;
};

function TriggerModal({ item, currentStatus, onClose, onStatus }: TriggerModalProps) {
  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity activeOpacity={1} style={s.modalBackdrop} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalCard} onPress={() => {}}>
          <TouchableOpacity style={s.modalX} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={C.textSub} />
          </TouchableOpacity>
          <TriggerDrop />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
            <Text style={s.modalTitle}>{item.label}</Text>
            <ModalBlock label="CE QUE ÇA FAIT" text={item.ceQueFaCeFait} />
            <ModalBlock label="POURQUOI ÇA SATURE" text={item.pourquoiCaSature} color={C.warning} />
            <ModalBlock label="PROTECTION" text={item.protection} color={C.green} />
          </ScrollView>
          <View style={s.modalBtns}>
            <TouchableOpacity
              style={[s.modalBtn, currentStatus === 'frequent' && s.modalBtnActive]}
              onPress={() => { onStatus(item.key, 'frequent'); onClose(); }}
              activeOpacity={0.8}>
              <Text style={[s.modalBtnText, currentStatus === 'frequent' && s.modalBtnTextActive]}>
                Ça me déclenche souvent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalBtn, currentStatus === 'today' && s.modalBtnActive]}
              onPress={() => { onStatus(item.key, 'today'); onClose(); }}
              activeOpacity={0.8}>
              <Text style={[s.modalBtnText, currentStatus === 'today' && s.modalBtnTextActive]}>
                {"C'est surtout aujourd'hui"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalGhost}
              onPress={() => { onStatus(item.key, null); onClose(); }}
              activeOpacity={0.7}>
              <Text style={s.modalGhostText}>Pas vraiment moi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── ProtectionPage ───────────────────────────────────────────────────────────

type ProtectionPageProps = {
  triggers: TriggersMap;
  protectionActions: { title: string; desc: string }[];
  phrase: string;
  setPhrase: (s: string) => void;
  savedMsg: boolean;
  onSave: () => void;
  onClose: () => void;
};

function ProtectionPage({ triggers, protectionActions, phrase, setPhrase, savedMsg, onSave, onClose }: ProtectionPageProps) {
  const combo = getComboText(triggers);
  return (
    <>
      <View style={s.protectionHandle} />
      <TouchableOpacity style={s.protectionCloseBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={18} color={C.textSub} />
      </TouchableOpacity>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.protectionScroll} keyboardShouldPersistTaps="handled">
        <Text style={s.protectionTitle}>Mes protections</Text>
        <Text style={s.protectionCombo}>{combo}</Text>

        {protectionActions.map((action, i) => (
          <View key={i} style={s.protectionAction}>
            <Text style={s.protectionActionTitle}>{action.title}</Text>
            <Text style={s.protectionActionDesc}>{action.desc}</Text>
          </View>
        ))}

        <View style={s.protectionInputBlock}>
          <Text style={s.protectionInputLabel}>Ma phrase de protection :</Text>
          <TextInput
            style={s.protectionInput}
            multiline
            placeholder="Ce que je me dis quand ça commence..."
            placeholderTextColor={C.textSub}
            value={phrase}
            onChangeText={text => setPhrase(text.charAt(0).toUpperCase() + text.slice(1))}
            autoCapitalize="none"
          />
          <Text style={s.suggestLabel}>Suggestions :</Text>
          {PROTECTION_PHRASES.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[s.suggestRow, i < PROTECTION_PHRASES.length - 1 && s.suggestRowBorder]}
              onPress={() => setPhrase(p)}>
              <Text style={s.suggestText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[s.protectionSaveBtn, savedMsg && s.protectionSaveBtnDone]}
          onPress={onSave}
          activeOpacity={0.82}>
          <Text style={s.protectionSaveBtnText}>
            {savedMsg ? 'Ajouté à mon plan ✓' : 'Ajouter à mon plan'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

// ─── StepNav ──────────────────────────────────────────────────────────────────

function StepNav({
  current,
  onNavigate,
}: {
  current: SubView;
  onNavigate: (v: SubView) => void;
}) {
  const activeIndex = STEPS.findIndex(s => s.key === current);
  return (
    <View style={s.stepNavWrap}>
      <View style={s.stepCirclesRow}>
        {STEPS.map((step, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <React.Fragment key={step.key}>
              {i > 0 && <View style={[s.stepLine, isPast && s.stepLineDone]} />}
              <TouchableOpacity
                style={[s.stepCircle, (isActive || isPast) && s.stepCircleActive]}
                onPress={() => onNavigate(step.key)}
                activeOpacity={0.75}>
                {isPast ? (
                  <Check size={12} color="#fff" />
                ) : (
                  <Text style={[s.stepCircleNum, isActive && s.stepCircleNumActive]}>{step.index}</Text>
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

// ─── PortraitCard ─────────────────────────────────────────────────────────────

function PortraitCard({
  frequentSignals,
  triggers,
  reflexes,
  firstAction,
}: {
  frequentSignals: string[];
  triggers: TriggersMap;
  reflexes: ReflexesMap;
  firstAction: string;
}) {
  const allTriggers = TRIGGER_FAMILIES.flatMap(f => f.triggers);
  const triggerKeys = Object.keys(triggers);
  const recognizedReflexKeys = Object.entries(reflexes)
    .filter(([, v]) => v === 'recognized')
    .map(([k]) => k);

  return (
    <View style={s.portrait}>
      <Text style={s.portraitTitle}>Mon portrait de saturation</Text>
      <PortraitRow label="Quand ça commence :">
        {frequentSignals.length === 0 ? (
          <Text style={s.portraitDash}>—</Text>
        ) : (
          <View style={s.portraitChips}>
            {frequentSignals.slice(0, 4).map(k => {
              const sig = SIGNALS.find(s => s.key === k);
              return sig ? (
                <View key={k} style={s.portraitChip}>
                  <Text style={s.portraitChipText}>{sig.label}</Text>
                </View>
              ) : null;
            })}
            {frequentSignals.length > 4 && (
              <Text style={s.portraitMore}>+{frequentSignals.length - 4}</Text>
            )}
          </View>
        )}
      </PortraitRow>
      <PortraitRow label="Ce qui me fait basculer :">
        {triggerKeys.length === 0 ? (
          <Text style={s.portraitDash}>—</Text>
        ) : (
          <View style={s.portraitChips}>
            {triggerKeys.slice(0, 4).map(k => {
              const t = allTriggers.find(t => t.key === k);
              return t ? (
                <View key={k} style={s.portraitChip}>
                  <Text style={s.portraitChipText}>{t.label}</Text>
                </View>
              ) : null;
            })}
            {triggerKeys.length > 4 && (
              <Text style={s.portraitMore}>+{triggerKeys.length - 4}</Text>
            )}
          </View>
        )}
      </PortraitRow>
      <PortraitRow label="Ce que je fais automatiquement :">
        {recognizedReflexKeys.length === 0 ? (
          <Text style={s.portraitDash}>—</Text>
        ) : (
          <View style={s.portraitChips}>
            {recognizedReflexKeys.map(k => {
              const r = REFLEXES.find(r => r.key === k);
              return r ? (
                <View key={k} style={s.portraitChip}>
                  <Text style={s.portraitChipText}>{r.title}</Text>
                </View>
              ) : null;
            })}
          </View>
        )}
      </PortraitRow>
      <PortraitRow label="Ce qui m'aide :" last>
        {firstAction.trim() === '' ? (
          <Text style={s.portraitDash}>—</Text>
        ) : (
          <Text style={s.portraitValue}>{firstAction}</Text>
        )}
      </PortraitRow>
    </View>
  );
}

function PortraitRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={[s.portraitRow, !last && s.portraitRowBorder]}>
      <Text style={s.portraitRowLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ─── HubEntryCard ─────────────────────────────────────────────────────────────

function HubEntryCard({
  icon,
  title,
  desc,
  tags,
  status,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tags: string[];
  status: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.hubCard} onPress={onPress} activeOpacity={0.75}>
      <View style={s.hubCardRow}>
        <View style={s.hubCardIcon}>{icon}</View>
        <View style={s.hubCardBody}>
          <Text style={s.hubCardTitle}>{title}</Text>
          <Text style={s.hubCardDesc}>{desc}</Text>
          <View style={s.hubCardTags}>
            {tags.map(tag => (
              <View key={tag} style={s.hubTag}>
                <Text style={s.hubTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={s.hubCardFooter}>
        <Text style={s.hubCardStatus}>{status}</Text>
        <Text style={s.hubCardChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SaturationDiscovery({ onBack, onExpressFlow }: Props) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<SubView>('hub');

  // Step 1
  const [step1Read, setStep1Read] = useState(false);
  const [step1Modal, setStep1Modal] = useState(false);
  const [step1SubPage, setStep1SubPage] = useState<string | null>(null);
  const [hasUnderstoodIntro, setHasUnderstoodIntro] = useState(false);
  const step1ArrowX = useRef(new Animated.Value(0)).current;
  const step1ModalAnim = useRef(new Animated.Value(0)).current;
  const step1ListAnim = useRef(new Animated.Value(0)).current;

  // Step 2
  const [signals, setSignals] = useState<SignalsMap>({});
  const [selectedSignal, setSelectedSignal] = useState<SignalData | null>(null);
  const [openStep2Cats, setOpenStep2Cats] = useState<string[]>([]);

  // Step 3
  const [triggers, setTriggers] = useState<TriggersMap>({});
  const [openFamily, setOpenFamily] = useState<string | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<{ item: TriggerItem; familyKey: string } | null>(null);
  const [showProtection, setShowProtection] = useState(false);
  const [protectionActions, setProtectionActions] = useState<{ title: string; desc: string }[]>([]);
  const [protectionPhrase, setProtectionPhrase] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);
  const comboAnim = useRef(new Animated.Value(0)).current;
  const protectionSlide = useRef(new Animated.Value(800)).current;

  // Step nav visibility
  const stepNavOpacity = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 4
  const [reflexes, setReflexes] = useState<ReflexesMap>({});
  const [selectedReflex, setSelectedReflex] = useState<ReflexData | null>(null);

  // Step 5
  const [firstAction, setFirstAction] = useState('');
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [[, s1], [, sig], [, tri], [, ref], [, fa], [, ph], [, prot]] =
          await AsyncStorage.multiGet([
            SK.step1Read, SK.signals, SK.triggers, SK.reflexes, SK.firstAction, SK.phrase, SK.protection,
          ]);
        if (s1 === 'true') setStep1Read(true);
        if (sig) setSignals(JSON.parse(sig));
        if (tri) {
          const parsed = JSON.parse(tri);
          if (Array.isArray(parsed)) {
            const converted: TriggersMap = {};
            (parsed as string[]).forEach(k => { converted[k] = 'today'; });
            setTriggers(converted);
          } else {
            setTriggers(parsed as TriggersMap);
          }
        }
        if (ref) {
          const parsedRef = JSON.parse(ref);
          if (Array.isArray(parsedRef)) {
            const converted: ReflexesMap = {};
            (parsedRef as string[]).forEach(k => { converted[k] = 'recognized'; });
            setReflexes(converted);
          } else {
            setReflexes(parsedRef as ReflexesMap);
          }
        }
        if (fa) setFirstAction(fa);
        if (ph) setPhrase(ph);
        if (prot) {
          const p = JSON.parse(prot);
          if (p.phrase) setProtectionPhrase(p.phrase);
        }
      } catch (_) {}
    };
    load();
  }, []);

  const triggerCount = Object.keys(triggers).length;
  useEffect(() => {
    Animated.spring(comboAnim, {
      toValue: triggerCount >= 2 ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [triggerCount]);

  // Derived
  const frequentSignals = Object.entries(signals)
    .filter(([, status]) => status === 'frequent')
    .map(([key]) => key);

  const planProgress =
    (step1Read ? 20 : 0) +
    (frequentSignals.length >= 3 ? 20 : 0) +
    (triggerCount >= 3 ? 20 : 0) +
    (Object.keys(reflexes).length >= 2 ? 20 : 0) +
    (firstAction.trim() && phrase.trim() ? 20 : 0);

  const completedSteps = new Set<SubView>([
    ...(step1Read ? ['step1' as SubView] : []),
    ...(Object.keys(signals).length > 0 ? ['step2' as SubView] : []),
    ...(triggerCount > 0 ? ['step3' as SubView] : []),
    ...(Object.keys(reflexes).length > 0 ? ['step4' as SubView] : []),
    ...(firstAction.trim() || phrase.trim() ? ['step5' as SubView] : []),
  ]);

  // Handlers
  const saveSignal = (key: string, status: SignalStatus) => {
    setSignals(prev => {
      const next = { ...prev, [key]: status };
      AsyncStorage.setItem(SK.signals, JSON.stringify(next));
      return next;
    });
    setSelectedSignal(null);
  };

  const setTriggerStatus = (key: string, status: 'frequent' | 'today' | null) => {
    setTriggers(prev => {
      let next: TriggersMap;
      if (status === null) {
        const { [key]: _, ...rest } = prev;
        next = rest;
      } else {
        next = { ...prev, [key]: status };
      }
      AsyncStorage.setItem(SK.triggers, JSON.stringify(next));
      return next;
    });
  };

  const showProtectionFn = () => {
    protectionSlide.setValue(800);
    setProtectionActions(getProtectionActions(triggers));
    setShowProtection(true);
    setTimeout(() => {
      Animated.spring(protectionSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }).start();
    }, 0);
  };

  const hideProtectionFn = () => {
    Animated.timing(protectionSlide, {
      toValue: 800,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setShowProtection(false));
  };

  const saveProtection = () => {
    AsyncStorage.setItem(SK.protection, JSON.stringify({
      actions: protectionActions.map(a => a.title),
      phrase: protectionPhrase,
    }));
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const toggleReflex = (key: string, action: ReflexStatus) => {
    setReflexes(prev => {
      const next = { ...prev };
      if (next[key] === action) {
        delete next[key];
      } else {
        next[key] = action;
      }
      AsyncStorage.setItem(SK.reflexes, JSON.stringify(next));
      return next;
    });
    setSelectedReflex(null);
  };

  // Modal open animation
  useEffect(() => {
    if (step1Modal) {
      step1ModalAnim.setValue(0);
      Animated.spring(step1ModalAnim, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }).start();
    }
  }, [step1Modal]);

  const closeStep1Modal = (understood = false) => {
    Animated.timing(step1ModalAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep1Modal(false);
      if (understood && !hasUnderstoodIntro) {
        setHasUnderstoodIntro(true);
        Animated.timing(step1ListAnim, {
          toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true,
        }).start();
      }
    });
  };

  const animateArrowThenOpenModal = () => {
    Animated.timing(step1ArrowX, { toValue: 4, duration: 200, useNativeDriver: true }).start(() => {
      step1ArrowX.setValue(0);
      setStep1Modal(true);
    });
  };

  const handleStepNavScroll = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    Animated.timing(stepNavOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    hideTimeout.current = setTimeout(() => {
      Animated.timing(stepNavOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 2000);
  }, []);

  const handleStep1Scroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (step1Read) return;
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
        setStep1Read(true);
        AsyncStorage.setItem(SK.step1Read, 'true');
      }
    },
    [step1Read],
  );

  const goTo = (v: SubView) => {
    setView(v);
    if (v !== 'step1') {
      setStep1Modal(false);
      setStep1SubPage(null);
    }
  };

  // ── Hub ───────────────────────────────────────────────────────────────────

  const renderHub = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[s.hubScroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}>
      <View style={s.hubHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>{'< Retour'}</Text>
        </TouchableOpacity>
        <Text style={s.hubTitle}>Comprendre ma saturation</Text>
        <View style={s.backBtn} />
      </View>
      <Text style={s.hubSubtitle}>
        Un espace pour reconnaître ton trop-plein, repérer tes signaux, et construire ton portrait.
      </Text>

      <View style={s.urgencyBlock}>
        <Text style={s.urgencyQ}>Tu es en train de saturer maintenant ?</Text>
        <TouchableOpacity style={s.urgencyBtn} onPress={onExpressFlow} activeOpacity={0.82}>
          <Text style={s.urgencyBtnText}>M'aider maintenant</Text>
        </TouchableOpacity>
      </View>

      <PortraitCard
        frequentSignals={frequentSignals}
        triggers={triggers}
        reflexes={reflexes}
        firstAction={firstAction}
      />

      <HubEntryCard
        icon={<Brain size={22} color={C.primary} />}
        title="Comprendre"
        desc="Ce qui se passe dans ton cerveau quand tout devient trop."
        tags={['surcharge', 'tri', 'volonté']}
        status={step1Read ? 'Lu ✓' : 'À explorer'}
        onPress={() => goTo('step1')}
      />
      <HubEntryCard
        icon={<Activity size={22} color={C.primary} />}
        title="Repérer"
        desc="Les signaux qui apparaissent avant que tout déborde."
        tags={['corps', 'tête', 'comportements']}
        status={frequentSignals.length > 0 ? `${frequentSignals.length} repérés` : 'À explorer'}
        onPress={() => goTo('step2')}
      />
      <HubEntryCard
        icon={<Zap size={22} color={C.primary} />}
        title="Identifier"
        desc="Ce qui remplit ton système jusqu'au trop-plein."
        tags={['fatigue', 'bruit', 'pression']}
        status={triggerCount > 0 ? `${triggerCount} identifiés` : 'À explorer'}
        onPress={() => goTo('step3')}
      />
      <HubEntryCard
        icon={<RefreshCw size={22} color={C.primary} />}
        title="Observer"
        desc="Ce que tu fais automatiquement quand tu satures."
        tags={['réflexes', 'évitement', 'alternatives']}
        status={Object.keys(reflexes).length > 0 ? `${Object.values(reflexes).filter(v => v === 'recognized').length} reconnus` : 'À explorer'}
        onPress={() => goTo('step4')}
      />
      <HubEntryCard
        icon={<Shield size={22} color={C.primary} />}
        title="Construire"
        desc="Ton plan personnel pour reconnaître et faire redescendre la saturation."
        tags={['profil', 'prévention', 'actions']}
        status={`${planProgress}% prêt`}
        onPress={() => goTo('step5')}
      />
    </ScrollView>
  );

  // ── Step layout wrapper ───────────────────────────────────────────────────

  const StepShell = ({
    children,
    scrollable = true,
    onScroll,
    nextLabel,
    nextView,
    footerExtra,
  }: {
    children: React.ReactNode;
    scrollable?: boolean;
    onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    nextLabel?: string;
    nextView?: SubView;
    footerExtra?: React.ReactNode;
  }) => (
    <View style={{ flex: 1 }}>
      <BlurView intensity={18} tint="light" style={[s.stickyHeader, { paddingTop: insets.top + 8 }]}>
        <View style={s.stickyHeaderRow}>
          <TouchableOpacity
            onPress={() => goTo('hub')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.backText}>{'‹ Retour au hub'}</Text>
          </TouchableOpacity>
          {STEP_LABELS[view] && <Text style={s.stickyLabel}>{STEP_LABELS[view]}</Text>}
        </View>
        {STEP_SHORT_TITLES[view] && (
          <Text style={s.stickyTitle} numberOfLines={1}>{STEP_SHORT_TITLES[view]}</Text>
        )}
      </BlurView>
      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.stepScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={e => { handleStepNavScroll(); onScroll?.(e); }}
          scrollEventThrottle={16}>
          {children}
          {footerExtra}
          <StepFooter nextLabel={nextLabel} nextView={nextView} onGoTo={goTo} />
        </ScrollView>
      ) : (
        <>
          <View style={{ flex: 1 }}>{children}</View>
          {footerExtra}
          {nextLabel && nextView && (
            <StepFooter nextLabel={nextLabel} nextView={nextView} onGoTo={goTo} bottomPad={insets.bottom} />
          )}
        </>
      )}
    </View>
  );

  // ── Step 1 — Comprendre ───────────────────────────────────────────────────

  const renderStep1Sub = (key: string) => {
    const titles: Record<string, string> = {
      urgent:    'Pourquoi tout semble urgent ?',
      choisir:   "Pourquoi tu n'arrives plus à choisir ?",
      todo:      'Pourquoi une to-do list peut empirer',
      irritable: 'Pourquoi tu deviens irritable',
      telephone: 'Pourquoi tu cherches ton téléphone',
      annuler:   'Pourquoi tu veux tout annuler',
    };
    const title = titles[key] ?? key;

    const renderUrgent = () => (
      <>
        <Text style={s.s1Para}>
          {'Quand tu es en '}
          <Text style={s.s1Accent}>saturation</Text>
          {", ton cerveau peut perdre sa capacité à faire le tri finement. Une tâche importante, une notification, un message non répondu, une assiette dans l'évier, une pensée anxieuse ou une deadline peuvent toutes donner la même sensation intérieure : "}
          <Text style={s.s1Italic}>{'« il faut gérer ça maintenant ».'}</Text>
        </Text>
        <Text style={s.s1Para}>
          {"Le problème, ce n'est pas forcément qu'il y a une vraie urgence partout. C'est que ton système de tri est "}
          <Text style={s.s1Accent}>débordé.</Text>
          {' Il '}
          <Text style={s.s1Underline}>{"n'arrive plus à classer"}</Text>
          {" les choses entre 'urgent', 'important', 'peut attendre', 'juste une pensée' ou 'émotion du moment'."}
        </Text>
        <Text style={s.s1Para}>
          {"C'est pour ça que tu peux te retrouver à vouloir répondre à tous tes messages, ranger toute ta chambre, refaire ton planning, résoudre ton avenir, envoyer un mail, manger, annuler un truc et ouvrir l'application météo… tout ça dans la même minute."}
        </Text>
        <View style={s.s1SubDivider} />
        <View style={s.s1Box}>
          <Text style={s.s1BoxText}>{"La bonne question n'est pas :"}</Text>
          <Text style={s.s1BoxQuote}>{"Qu'est-ce que je dois absolument tout régler ?"}</Text>
          <Text style={s.s1BoxText}>{'La bonne question devient :'}</Text>
          <Text style={s.s1BoxQuote}>{"Qu'est-ce qui a une vraie conséquence si je ne le fais pas maintenant ?"}</Text>
        </View>
        <Text style={[s.s1Para, { marginTop: 20, marginHorizontal: 24 }]}>
          {'Souvent, la réponse est beaucoup plus petite que ce que ton cerveau saturé te fait croire.'}
        </Text>
        <View style={[s.s1Box, { marginTop: 16 }]}>
          <Text style={s.s1BoxReteTitle}>À retenir</Text>
          <Text style={s.s1BoxReteItem}>{"Tout semble prioritaire parce que mon cerveau n'arrive plus à classer. Je commence par choisir ce qui demande vraiment mon attention en premier."}</Text>
          <Text style={[s.s1BoxReteItem, { marginBottom: 0 }]}>{"Ce n'est pas parce qu'une chose revient dans ma tête qu'elle doit être réglée tout de suite."}</Text>
        </View>
      </>
    );

    return (
      <View style={{ flex: 1, backgroundColor: S1.bg }}>
        <View style={[s.s1SubHeaderWrap, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => setStep1SubPage(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}>
            <Text style={s.s1SubBack}>{'← Retour'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleStepNavScroll}
          scrollEventThrottle={16}>
          <Text style={s.s1SubTitle}>{title}</Text>
          <View style={s.s1SubTitleLine} />
          {key === 'urgent' ? renderUrgent() : (
            <Text style={[s.s1Para, { paddingHorizontal: 24 }]}>À venir.</Text>
          )}
          <TouchableOpacity onPress={() => setStep1SubPage(null)} style={s.s1SubBackBtn} activeOpacity={0.7}>
            <Text style={s.s1SubBackBtnText}>{'← Retour à Comprendre'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderStep1 = () => {
    if (step1SubPage) return renderStep1Sub(step1SubPage);

    const listOpacity = step1ListAnim;
    const listTransY = step1ListAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

    return (
      <View style={{ flex: 1, backgroundColor: S1.bg }}>
        {/* Minimal header */}
        <View style={[s.s1HeaderWrap, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => goTo('hub')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}>
            <Text style={s.s1HeaderBack}>{'< Retour au hub'}</Text>
          </TouchableOpacity>
          <Text style={s.s1HeaderStep}>{'Étape 1/5'}</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={e => { handleStep1Scroll(e); handleStepNavScroll(); }}
          scrollEventThrottle={16}>

          {/* Page title */}
          <Text style={s.s1MainTitle}>
            <Text style={{ color: S1.text }}>{'Le trop-plein '}</Text>
            <Text style={{ color: S1.accent }}>{'expliqué'}</Text>
          </Text>

          {/* Hero block */}
          <Text style={s.s1HeroQ}>{'Pourquoi tout devient trop ?'}</Text>
          <TouchableOpacity
            onPress={animateArrowThenOpenModal}
            activeOpacity={0.7}
            style={s.s1HeroLinkRow}>
            <Text style={s.s1HeroLinkText}>{'Comprendre '}</Text>
            <Animated.View style={{ transform: [{ translateX: step1ArrowX }] }}>
              <Text style={s.s1HeroLinkText}>{'→'}</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Separator + list + continue — only after modal understood */}
          {hasUnderstoodIntro && <View style={s.s1Sep} />}

          {hasUnderstoodIntro && (
            <Animated.View style={{ opacity: listOpacity, transform: [{ translateY: listTransY }] }}>
              {STEP1_SECONDARY.map(q => (
                <TouchableOpacity
                  key={q.key}
                  style={s.s1ListRow}
                  onPress={() => setStep1SubPage(q.key)}
                  activeOpacity={0.7}>
                  <Text
                    style={s.s1ListLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {q.label}
                  </Text>
                  <Text style={s.s1ListArrow}>{'→'}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          {hasUnderstoodIntro && (
            <TouchableOpacity onPress={() => goTo('step2')} style={s.s1ContinueWrap} activeOpacity={0.6}>
              <Text style={s.s1ContinueText}>{'Continuer vers Repérer →'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  // ── Step 2 — Repérer ──────────────────────────────────────────────────────

  const renderStep2 = () => (
    <>
      <StepShell scrollable={false}>
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={[s.stepScroll, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleStepNavScroll}
          scrollEventThrottle={16}>
          <Text style={s.stepTitle}>Comment je sais que je commence à saturer ?</Text>
          <Text style={s.stepSubtitle}>
            Ces signaux apparaissent parfois avant que tu comprennes ce qui se passe. Explore ceux qui te ressemblent.
          </Text>

          {SIGNAL_CATS.map(cat => {
            const catSignals = SIGNALS.filter(sig => sig.category === cat.key);
            const isOpen = openStep2Cats.includes(cat.key);
            const checkedCount = catSignals.filter(sig => signals[sig.key]).length;
            return (
              <View key={cat.key} style={s.accordion}>
                <TouchableOpacity
                  style={s.accordionHeader}
                  onPress={() => setOpenStep2Cats(prev =>
                    prev.includes(cat.key) ? prev.filter(k => k !== cat.key) : [...prev, cat.key],
                  )}
                  activeOpacity={0.75}>
                  <Text style={s.accordionLabel}>{cat.label}</Text>
                  <View style={s.accordionRight}>
                    {checkedCount > 0 && (
                      <View style={s.catBadge}>
                        <Text style={s.catBadgeText}>{checkedCount}</Text>
                      </View>
                    )}
                    <Text style={[s.chevron, isOpen && s.chevronOpen]}>›</Text>
                  </View>
                </TouchableOpacity>
                {isOpen && (
                  <View style={s.accordionBody}>
                    {catSignals.map(sig => {
                      const status = signals[sig.key];
                      return (
                        <TouchableOpacity
                          key={sig.key}
                          style={s.sigCard}
                          onPress={() => setSelectedSignal(sig)}
                          activeOpacity={0.75}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.sigLabel}>{sig.label}</Text>
                            <Text style={s.sigMiroir} numberOfLines={2}>{sig.phraseMiroir}</Text>
                          </View>
                          {status ? (
                            <View style={[s.sigStatus, status === 'frequent' && s.sigStatusFrequent]}>
                              <Text style={s.sigStatusText}>
                                {status === 'frequent' ? 'fréquent' : "aujourd'hui"}
                              </Text>
                            </View>
                          ) : (
                            <Text style={s.sigChevron}>›</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          {frequentSignals.length > 0 && (
            <View style={s.step2Summary}>
              <Text style={s.step2SummaryTitle}>Tes signaux fréquents</Text>
              <View style={s.chipsRow}>
                {frequentSignals.map(k => {
                  const sig = SIGNALS.find(s => s.key === k);
                  return sig ? (
                    <View key={k} style={s.chip}>
                      <Text style={s.chipText}>{sig.label}</Text>
                    </View>
                  ) : null;
                })}
              </View>
              <Text style={s.step2SummaryNote}>
                Ces signaux seront utilisés pour adapter ton mode express.
              </Text>
            </View>
          )}
          <StepFooter nextLabel="Identifier" nextView="step3" onGoTo={goTo} />
        </ScrollView>
      </StepShell>

      {selectedSignal && (
        <SignalModal
          signal={selectedSignal}
          currentStatus={signals[selectedSignal.key]}
          onClose={() => setSelectedSignal(null)}
          onSave={saveSignal}
        />
      )}
    </>
  );

  // ── Step 3 — Identifier ───────────────────────────────────────────────────

  const renderStep3 = () => {
    const allTrigItems = TRIGGER_FAMILIES.flatMap(f => f.triggers);
    const trigKeys = Object.keys(triggers);

    return (
      <StepShell nextLabel="Observer" nextView="step4">
        <Text style={s.stepTitle}>Qu'est-ce qui remplit mon système ?</Text>
        <Text style={s.stepSubtitle}>
          Touche pour sélectionner. Appuie longuement pour explorer en profondeur.
        </Text>

        {/* Live card */}
        <View style={s.liveCard}>
          <Text style={s.liveCardTitle}>Ton système se remplit surtout par :</Text>
          {trigKeys.length === 0 ? (
            <Text style={s.liveCardEmpty}>Explore les familles ci-dessous</Text>
          ) : (
            <View style={s.liveBubbles}>
              {trigKeys.map(k => {
                const item = allTrigItems.find(t => t.key === k);
                const isFrequent = triggers[k] === 'frequent';
                return item ? (
                  <View key={k} style={[s.liveBubble, isFrequent && s.liveBubbleFrequent]}>
                    <Text style={[s.liveBubbleText, isFrequent && s.liveBubbleTextFrequent]}>
                      {item.label}
                    </Text>
                  </View>
                ) : null;
              })}
            </View>
          )}
        </View>

        {/* Family accordions */}
        {TRIGGER_FAMILIES.map(family => {
          const FamilyIcon = family.Icon;
          const isOpen = openFamily === family.key;
          const familyCount = family.triggers.filter(t => triggers[t.key]).length;
          return (
            <View key={family.key} style={[s.famCard, { backgroundColor: family.color }]}>
              <TouchableOpacity
                style={s.famHeader}
                onPress={() => setOpenFamily(isOpen ? null : family.key)}
                activeOpacity={0.75}>
                <FamilyIcon size={18} color={C.primary} />
                <Text style={s.famLabel}>{family.label}</Text>
                <View style={{ flex: 1 }} />
                {familyCount > 0 && (
                  <View style={s.famBadge}>
                    <Text style={s.famBadgeText}>{familyCount}</Text>
                  </View>
                )}
                <Text style={[s.chevron, isOpen && s.chevronOpen]}>›</Text>
              </TouchableOpacity>
              {isOpen && (
                <View style={s.famBody}>
                  {family.triggers.map(trig => {
                    const status = triggers[trig.key];
                    return (
                      <TouchableOpacity
                        key={trig.key}
                        style={[
                          s.trigItem,
                          !!status && s.trigItemSelected,
                          status === 'frequent' && s.trigItemFrequent,
                        ]}
                        onPress={() => setTriggerStatus(trig.key, status ? null : 'today')}
                        onLongPress={() => setSelectedTrigger({ item: trig, familyKey: family.key })}
                        activeOpacity={0.8}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.trigItemLabel, !!status && s.trigItemLabelSelected]}>
                            {trig.label}
                          </Text>
                        </View>
                        {status && (
                          <View style={[s.trigItemPill, status === 'frequent' && s.trigItemPillFrequent]}>
                            <Text style={s.trigItemPillText}>
                              {status === 'frequent' ? 'fréquent' : "aujourd'hui"}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Combo card */}
        {trigKeys.length >= 2 && (
          <Animated.View style={[s.comboCard, {
            opacity: comboAnim,
            transform: [{ scale: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
          }]}>
            <Text style={s.comboTitle}>Ton combo à risque :</Text>
            <Text style={s.comboText}>{getComboText(triggers)}</Text>
            <TouchableOpacity style={s.protectionBtn} onPress={showProtectionFn} activeOpacity={0.82}>
              <Text style={s.protectionBtnText}>Voir mes protections</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </StepShell>
    );
  };

  // ── Step 4 — Observer ─────────────────────────────────────────────────────

  const renderStep4 = () => (
    <>
      <StepShell scrollable={false}>
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={[s.stepScroll, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleStepNavScroll}
          scrollEventThrottle={16}>
          <Text style={s.stepTitle}>Qu'est-ce que je fais quand je sature ?</Text>
          <Text style={s.stepSubtitle}>
            Ces réflexes ne sont pas des défauts. Ce sont des tentatives de protection. Certains soulagent sur le moment, mais peuvent aggraver après.
          </Text>
          {REFLEXES.map(reflex => {
            const status = reflexes[reflex.key] ?? null;
            return (
              <TouchableOpacity
                key={reflex.key}
                style={[s.reflexCard, status === 'recognized' && s.reflexCardRecognized, status === 'not_me' && s.reflexCardNotMe]}
                onPress={() => setSelectedReflex(reflex)}
                activeOpacity={0.75}>
                <View style={{ flex: 1 }}>
                  <Text style={s.reflexTitle}>{reflex.title}</Text>
                  <Text style={s.reflexMiroir} numberOfLines={2}>{reflex.phraseMiroir}</Text>
                </View>
                {status === 'recognized' ? (
                  <View style={s.reflexBadge}>
                    <Text style={s.reflexBadgeText}>reconnu</Text>
                  </View>
                ) : status === 'not_me' ? (
                  <View style={s.reflexBadgeNotMe}>
                    <Text style={s.reflexBadgeNotMeText}>pas moi</Text>
                  </View>
                ) : (
                  <Text style={s.sigChevron}>›</Text>
                )}
              </TouchableOpacity>
            );
          })}
          <StepFooter nextLabel="Construire" nextView="step5" onGoTo={goTo} />
        </ScrollView>
      </StepShell>

      {selectedReflex && (
        <ReflexModal
          reflex={selectedReflex}
          status={reflexes[selectedReflex.key] ?? null}
          onClose={() => setSelectedReflex(null)}
          onToggle={toggleReflex}
        />
      )}
    </>
  );

  // ── Step 5 — Construire ───────────────────────────────────────────────────

  const renderStep5 = () => (
    <StepShell>
      <Text style={s.stepTitle}>Mon plan anti-saturation</Text>
      <Text style={s.stepSubtitle}>Ce que tu as appris sur toi, en un seul endroit.</Text>

      <PortraitCard
        frequentSignals={frequentSignals}
        triggers={triggers}
        reflexes={reflexes}
        firstAction={firstAction}
      />

      <View style={s.planBlock}>
        <Text style={s.planBlockTitle}>Mon premier geste</Text>
        <TextInput
          style={s.planInput}
          multiline
          placeholder="Ex : couper les notifications et changer de pièce."
          placeholderTextColor={C.textSub}
          value={firstAction}
          onChangeText={text => setFirstAction(text.charAt(0).toUpperCase() + text.slice(1))}
          onBlur={() => AsyncStorage.setItem(SK.firstAction, firstAction)}
          autoCapitalize="none"
        />
      </View>

      <View style={s.planBlock}>
        <Text style={s.planBlockTitle}>Ma phrase</Text>
        <TextInput
          style={[s.planInput, { minHeight: 44 }]}
          placeholder="Ex : Je ne règle rien maintenant. Je fais redescendre."
          placeholderTextColor={C.textSub}
          value={phrase}
          onChangeText={text => setPhrase(text.charAt(0).toUpperCase() + text.slice(1))}
          onBlur={() => AsyncStorage.setItem(SK.phrase, phrase)}
          autoCapitalize="none"
        />
        <Text style={s.suggestLabel}>Suggestions :</Text>
        {SUGGESTED_PHRASES.map((p, i) => (
          <TouchableOpacity
            key={i}
            style={[s.suggestRow, i < SUGGESTED_PHRASES.length - 1 && s.suggestRowBorder]}
            onPress={() => {
              setPhrase(p);
              AsyncStorage.setItem(SK.phrase, p);
            }}>
            <Text style={s.suggestText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.expressBtn} onPress={onExpressFlow} activeOpacity={0.82}>
        <Text style={s.expressBtnText}>Lancer mon mode express</Text>
      </TouchableOpacity>
    </StepShell>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {view === 'hub' && renderHub()}
      {view === 'step1' && renderStep1()}
      {view === 'step2' && renderStep2()}
      {view === 'step3' && renderStep3()}
      {view === 'step4' && renderStep4()}
      {view === 'step5' && renderStep5()}

      {view !== 'hub' && view !== 'step1' && (
        <Animated.View
          style={[s.floatingStepNav, { opacity: stepNavOpacity, backgroundColor: 'transparent' }]}
          pointerEvents="box-none">
          <StepNav current={view} onNavigate={goTo} />
        </Animated.View>
      )}

      {selectedTrigger && (
        <TriggerModal
          item={selectedTrigger.item}
          currentStatus={triggers[selectedTrigger.item.key]}
          onClose={() => setSelectedTrigger(null)}
          onStatus={setTriggerStatus}
        />
      )}

      {step1Modal && (
        <TouchableOpacity style={s.s1ModalLayer} activeOpacity={1} onPress={() => closeStep1Modal(false)}>
          <BlurView intensity={50} tint="light" style={s.s1AbsFill} />
          <View style={s.s1WarmOverlay} />
          <TouchableOpacity activeOpacity={1} style={s.s1ModalCardOuter} onPress={() => {}}>
            <Animated.View style={{
              borderRadius: 30,
              overflow: 'hidden',
              opacity: step1ModalAnim,
              transform: [
                { scale: step1ModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                { translateY: step1ModalAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            }}>
              <LinearGradient
                colors={['#F4B38C', '#F6C8AD', '#FDEADF']}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={s.s1ModalCard}>
                {/* X fixe hors du scroll */}
                <TouchableOpacity
                  onPress={() => closeStep1Modal(false)}
                  style={s.s1ModalClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}>
                  <Text style={s.s1ModalCloseText}>{'✕'}</Text>
                </TouchableOpacity>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.s1ModalScroll}>
                  <Text style={s.s1ModalTitle}>{'Pourquoi tout devient trop ?'}</Text>
                  <View style={s.s1ModalTitleLine} />
                  <Text style={s.s1ModalPara}>
                    {"Quand tu satures, ce n'est pas simplement parce que tu es stressé, désorganisé ou 'pas assez motivé'."}
                  </Text>
                  <Text style={s.s1ModalPara}>
                    {'Chez une personne '}
                    <Text style={s.s1ModalAccent}>{'TDAH'}</Text>
                    {", le cerveau peut recevoir trop de signaux en même temps : une tâche à faire, une notification, un bruit, une lumière, une pensée anxieuse, un message non répondu, un objet qui traîne, une décision à prendre. Séparément, chacun de ces éléments peut sembler petit. Mais ensemble, ils peuvent prendre "}
                    <Text style={s.s1ModalItalicBold}>{'toute la place.'}</Text>
                  </Text>
                  <Text style={[s.s1ModalPara, { marginBottom: 0 }]}>
                    {'Dans ces moments-là, ton système de tri est '}
                    <Text style={s.s1ModalAccent}>{'débordé.'}</Text>
                    {" Ton cerveau a plus de mal à distinguer ce qui est vraiment urgent, ce qui peut attendre, ce qui est juste une pensée, et ce qui est une émotion. Tout se mélange. Tout devient bruyant. Tout paraît important."}
                  </Text>
                  {/* Bouton en fin de contenu scrollable */}
                  <TouchableOpacity onPress={() => closeStep1Modal(true)} style={s.s1ModalSeeBtn} activeOpacity={0.7}>
                    <Text style={s.s1ModalSeeBtnText}>{"J'ai compris →"}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {showProtection && (
        <View style={s.protectionOverlay}>
          <TouchableOpacity
            style={s.protectionBackdrop}
            onPress={hideProtectionFn}
            activeOpacity={1}
          />
          <Animated.View style={[s.protectionSheet, { transform: [{ translateY: protectionSlide }] }]}>
            <ProtectionPage
              triggers={triggers}
              protectionActions={protectionActions}
              phrase={protectionPhrase}
              setPhrase={setProtectionPhrase}
              savedMsg={savedMsg}
              onSave={saveProtection}
              onClose={hideProtectionFn}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─── StepFooter ───────────────────────────────────────────────────────────────

function StepFooter({
  nextLabel,
  nextView,
  onGoTo,
  bottomPad = 0,
}: {
  nextLabel?: string;
  nextView?: SubView;
  onGoTo: (v: SubView) => void;
  bottomPad?: number;
}) {
  return (
    <View style={[s.stepFooter, { paddingBottom: bottomPad + 16 }]}>
      {nextView && nextLabel && (
        <TouchableOpacity
          style={s.continueBtn}
          onPress={() => onGoTo(nextView)}
          activeOpacity={0.82}>
          <Text style={s.continueBtnText}>Continuer vers {nextLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Hub
  hubScroll: { paddingHorizontal: 16 },
  hubHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  hubTitle: { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center', flex: 1 },
  hubSubtitle: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 20, paddingHorizontal: 8 },
  urgencyBlock: { backgroundColor: C.primaryLight, borderRadius: 16, padding: 16, marginBottom: 20 },
  urgencyQ: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
  urgencyBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  urgencyBtnText: { color: C.surface, fontWeight: '700', fontSize: 15 },
  hubCard: {
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    padding: 16, marginBottom: 12,
    shadowColor: '#7C6CF2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  hubCardRow: { flexDirection: 'row', gap: 12 },
  hubCardIcon: { marginTop: 2 },
  hubCardBody: { flex: 1 },
  hubCardTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 3 },
  hubCardDesc: { fontSize: 13, color: C.textSub, lineHeight: 19, marginBottom: 8 },
  hubCardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hubTag: { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  hubTagText: { fontSize: 11, color: C.primary },
  hubCardFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, gap: 4 },
  hubCardStatus: { fontSize: 12, color: C.textSub },
  hubCardChevron: { fontSize: 16, color: C.textSub },

  // Portrait
  portrait: {
    backgroundColor: C.surface, borderRadius: 18, borderWidth: 1.5, borderColor: C.border,
    overflow: 'hidden', marginBottom: 20,
    shadowColor: '#7C6CF2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  portraitTitle: { fontSize: 15, fontWeight: '700', color: C.text, padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  portraitRow: { paddingHorizontal: 16, paddingVertical: 12 },
  portraitRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  portraitRowLabel: { fontSize: 12, color: C.textSub, fontWeight: '600', marginBottom: 6 },
  portraitDash: { fontSize: 14, color: '#D1D5DB' },
  portraitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  portraitChip: { backgroundColor: C.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  portraitChipText: { fontSize: 12, color: C.primary },
  portraitMore: { fontSize: 12, color: C.textSub, fontStyle: 'italic' },
  portraitValue: { fontSize: 14, color: C.text, lineHeight: 20 },

  // Back / navigation
  backBtn: { minWidth: 80 },
  backText: { fontSize: 15, color: C.primary, fontWeight: '600' },
  // Sticky step header (BlurView)
  stickyHeader: {
    backgroundColor: 'rgba(237,233,254,0.82)',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stickyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stickyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E85C0',
  },
  stickyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },

  // Step nav — floating pill
  floatingStepNav: { position: 'absolute', bottom: 36, left: 0, right: 0, alignItems: 'center', zIndex: 90, backgroundColor: 'transparent' },
  stepNavWrap: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  stepCirclesRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  stepLine: { width: 28, height: 1.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  stepLineDone: { backgroundColor: 'rgba(255,255,255,0.7)' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: C.primary, borderWidth: 2, borderColor: 'white' },
  stepCircleNum: { fontSize: 12, fontWeight: '700', color: 'white' },
  stepCircleNumActive: { color: 'white' },

  // Step shared
  stepScroll: { paddingHorizontal: 16, paddingTop: 20 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 10, letterSpacing: -0.3, lineHeight: 28 },
  stepSubtitle: { fontSize: 14, color: C.textSub, lineHeight: 22, marginBottom: 24 },
  // ── Step 1 — main page ──────────────────────────────────────────────────────
  s1HeaderWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  s1HeaderBack: { fontSize: 13, color: S1.muted },
  s1HeaderStep: { fontSize: 13, color: S1.muted },
  s1MainTitle: { fontSize: 26, fontWeight: '700', paddingHorizontal: 24, marginTop: 20, marginBottom: 0, lineHeight: 34 },
  s1HeroQ: { fontFamily: 'Georgia', fontSize: 27, fontWeight: '400', letterSpacing: 0.2, color: S1.text, textAlign: 'center', marginTop: 32, paddingHorizontal: 28, lineHeight: 36 },
  s1HeroLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  s1HeroLinkText: { fontSize: 14, color: S1.accent, textDecorationLine: 'underline' },
  s1Sep: { height: 0.5, backgroundColor: S1.line, marginVertical: 32, marginHorizontal: 24 },
  s1ListRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.13)' },
  s1ListLabel: { fontSize: 15, fontWeight: '400', lineHeight: 20, flexShrink: 1, flexWrap: 'nowrap' },
  s1ListArrow: { fontSize: 16, color: '#CCCCCC', marginLeft: 12 },
  s1ContinueWrap: { alignItems: 'center', paddingBottom: 32, paddingTop: 24 },
  s1ContinueText: { fontSize: 13, color: '#BBBBBB' },
  // ── Step 1 — sub-pages ──────────────────────────────────────────────────────
  s1SubHeaderWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  s1SubBack: { fontSize: 13, color: S1.muted },
  s1SubTitle: { fontFamily: 'Georgia', fontSize: 22, color: S1.text, textAlign: 'center', paddingHorizontal: 24, marginTop: 20, lineHeight: 30 },
  s1SubTitleLine: { width: 80, height: 1, backgroundColor: S1.line, alignSelf: 'center', marginTop: 10, marginBottom: 28 },
  s1Para: { fontSize: 15, color: S1.text, lineHeight: 25, marginBottom: 18, paddingHorizontal: 24 },
  s1Accent: { fontWeight: '600', color: S1.accent },
  s1Italic: { fontStyle: 'italic' },
  s1Underline: { textDecorationLine: 'underline' },
  s1SubDivider: { height: 0.5, backgroundColor: S1.line, marginVertical: 24, marginHorizontal: 24 },
  s1Box: { backgroundColor: '#F5F0E8', borderRadius: 14, borderLeftWidth: 2, borderLeftColor: S1.accent, padding: 18, marginHorizontal: 24 },
  s1BoxText: { fontSize: 15, color: S1.text, lineHeight: 24, marginBottom: 6 },
  s1BoxQuote: { fontSize: 15, color: S1.text, fontStyle: 'italic', textAlign: 'center', lineHeight: 24, marginBottom: 12 },
  s1BoxReteTitle: { fontSize: 12, fontWeight: '700', color: S1.accent, marginBottom: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  s1BoxReteItem: { fontSize: 14, color: S1.text, lineHeight: 22, marginBottom: 10 },
  s1SubBackBtn: { alignItems: 'center', paddingVertical: 24 },
  s1SubBackBtnText: { fontSize: 13, color: S1.muted },
  // ── Step 1 — modal overlay ───────────────────────────────────────────────────
  s1ModalLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  s1AbsFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  s1WarmOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20, 10, 5, 0.45)' },
  s1ModalCardOuter: { width: '88%', maxHeight: '78%', borderRadius: 30, shadowColor: '#8B4A2A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12 },
  s1ModalCard: {},
  s1ModalScroll: { paddingHorizontal: 24, paddingBottom: 8 },
  s1ModalClose: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 20, padding: 7, margin: 14, marginBottom: 0 },
  s1ModalCloseText: { fontSize: 13, color: S1.brown },
  s1ModalTitle: { fontFamily: 'Georgia', fontSize: 18, color: S1.text, textAlign: 'center', lineHeight: 26 },
  s1ModalTitleLine: { width: 60, height: 1, backgroundColor: '#C4845A', alignSelf: 'center', marginTop: 8, marginBottom: 20 },
  s1ModalPara: { fontSize: 15, lineHeight: 24, color: S1.brown, marginBottom: 14 },
  s1ModalAccent: { color: S1.accent, fontWeight: '600' },
  s1ModalItalicBold: { fontStyle: 'italic', fontWeight: '600' },
  s1ModalSeeBtn: { marginTop: 24, marginBottom: 16, alignItems: 'center' },
  s1ModalSeeBtnText: { fontSize: 14, color: '#5A3A2A' },
  stepFooter: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  continueBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  continueBtnText: { color: C.surface, fontSize: 16, fontWeight: '700' },
  hubBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.border },
  hubBtnText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  expressBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  expressBtnText: { color: C.surface, fontSize: 16, fontWeight: '700' },

  // Step 2 — accordion
  accordion: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  accordionLabel: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
  accordionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accordionBody: { borderTopWidth: 1, borderTopColor: C.border },
  catBadge: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  catBadgeText: { fontSize: 11, color: C.surface, fontWeight: '700' },
  sigCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 10 },
  sigLabel: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
  sigMiroir: { fontSize: 12, color: C.textSub, lineHeight: 18 },
  sigStatus: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  sigStatusFrequent: { backgroundColor: C.primaryLight },
  sigStatusText: { fontSize: 11, color: C.text, fontWeight: '600' },
  sigChevron: { fontSize: 20, color: C.primaryMuted },
  step2Summary: { backgroundColor: C.primaryLight, borderRadius: 14, padding: 16, marginTop: 8 },
  step2SummaryTitle: { fontSize: 14, fontWeight: '700', color: C.primary, marginBottom: 10 },
  step2SummaryNote: { fontSize: 12, color: C.primary, marginTop: 10, fontStyle: 'italic' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.primaryMuted },
  chipText: { fontSize: 12, color: C.primary },

  // Step 3 — live card
  liveCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  liveCardTitle: { fontSize: 13, fontWeight: '700', color: C.textSub, marginBottom: 10 },
  liveCardEmpty: { fontSize: 13, color: C.textSub, fontStyle: 'italic' },
  liveBubbles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  liveBubble: { backgroundColor: C.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  liveBubbleFrequent: { backgroundColor: C.primary },
  liveBubbleText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  liveBubbleTextFrequent: { color: C.surface },

  // Step 3 — family accordion
  famCard: { borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  famHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  famLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  famBadge: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  famBadgeText: { fontSize: 11, color: C.surface, fontWeight: '700' },
  famBody: { borderTopWidth: 1, borderTopColor: C.border },
  trigItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: 'transparent',
  },
  trigItemSelected: { backgroundColor: 'rgba(124,108,242,0.06)' },
  trigItemFrequent: { backgroundColor: 'rgba(124,108,242,0.12)' },
  trigItemLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  trigItemLabelSelected: { color: C.primary },
  trigItemPill: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  trigItemPillFrequent: { backgroundColor: C.primaryLight },
  trigItemPillText: { fontSize: 11, color: C.text, fontWeight: '600' },

  // Step 3 — combo card
  comboCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5, borderColor: C.primaryMuted, padding: 16, marginTop: 4 },
  comboTitle: { fontSize: 13, fontWeight: '700', color: C.primary, marginBottom: 8 },
  comboText: { fontSize: 13, color: C.textSub, lineHeight: 20 },
  protectionBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  protectionBtnText: { color: C.surface, fontSize: 14, fontWeight: '700' },

  // TriggerDrop
  dropWrap: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  dropTear: { width: 12, height: 18, borderRadius: 6, backgroundColor: C.primary },
  dropCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: C.primary,
    overflow: 'hidden', backgroundColor: C.surface,
    marginTop: 6,
  },
  dropCircleFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.primaryLight },

  // Protection overlay
  protectionOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  protectionBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  protectionSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: '88%',
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  protectionHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  protectionCloseBtn: { position: 'absolute', top: 14, right: 16, zIndex: 10, padding: 6 },
  protectionScroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  protectionTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.3 },
  protectionCombo: { fontSize: 13, color: C.textSub, lineHeight: 20, marginBottom: 20, fontStyle: 'italic' },
  protectionAction: { backgroundColor: C.expandBg, borderRadius: 14, padding: 14, marginBottom: 10 },
  protectionActionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  protectionActionDesc: { fontSize: 13, color: C.textSub, lineHeight: 20 },
  protectionInputBlock: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginTop: 8, marginBottom: 16 },
  protectionInputLabel: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 },
  protectionInput: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 14, color: C.text, minHeight: 56, textAlignVertical: 'top' },
  protectionSaveBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  protectionSaveBtnDone: { backgroundColor: C.green },
  protectionSaveBtnText: { color: C.surface, fontSize: 16, fontWeight: '700' },

  // Step 4 — reflexes
  reflexCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, gap: 10 },
  reflexCardRecognized: { backgroundColor: C.primaryLight, borderColor: C.primaryMuted },
  reflexCardNotMe: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  reflexTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  reflexMiroir: { fontSize: 12, color: C.textSub, lineHeight: 18 },
  reflexBadge: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  reflexBadgeText: { fontSize: 11, color: C.surface, fontWeight: '600' },
  reflexBadgeNotMe: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  reflexBadgeNotMeText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  // Step 5 — plan
  planBlock: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  planBlockTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  planInput: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 14, color: C.text, minHeight: 60, textAlignVertical: 'top' },
  suggestLabel: { fontSize: 12, color: C.textSub, marginTop: 12, marginBottom: 4 },
  suggestRow: { paddingVertical: 10 },
  suggestRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  suggestText: { fontSize: 14, color: C.text },

  // Eye animation
  eyeWrap: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  eyeOuter: { width: EYE_W, height: EYE_H, borderRadius: EYE_H / 2, borderWidth: 2, borderColor: C.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  eyeIris: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  eyePupil: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1C1B33' },
  eyeLid: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.primaryMuted },

  // Modal shared
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: C.surface, borderRadius: 24, width: '100%', maxHeight: '88%', overflow: 'hidden' },
  modalX: { position: 'absolute', top: 14, right: 14, zIndex: 10, padding: 6 },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 8, paddingHorizontal: 28 },
  modalMiroir: { fontSize: 14, color: C.primary, fontStyle: 'italic', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalBlock: { marginBottom: 16 },
  modalBlockLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  modalBlockText: { fontSize: 14, color: C.text, lineHeight: 22 },
  modalPhraseBlock: { backgroundColor: C.primaryLight, borderRadius: 12, padding: 14, marginBottom: 8 },
  modalPhraseText: { fontSize: 14, color: C.primary, fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },
  modalBtns: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: C.border },
  modalBtn: { backgroundColor: C.primaryLight, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalBtnActive: { backgroundColor: C.primary },
  modalBtnText: { fontSize: 15, fontWeight: '600', color: C.primary },
  modalBtnTextActive: { color: C.surface },
  modalGhost: { paddingVertical: 10, alignItems: 'center' },
  modalGhostText: { fontSize: 14, color: C.textSub },

  // Shared
  chevron: { fontSize: 18, color: C.textSub, fontWeight: '600' },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
});
